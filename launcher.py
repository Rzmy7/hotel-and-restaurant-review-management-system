import os
import subprocess
import threading
import sys
import time
import webbrowser
import argparse

# Parse arguments first
parser = argparse.ArgumentParser(description="System Launcher")
parser.add_argument("--prod", action="store_true", help="Run in production mode (minimized logging, built assets)")
args = parser.parse_args()
IS_PROD = args.prod

# Define the components and their configurations
COMPONENTS = [
    {
        "name": "BACKEND",
        "dir": "backend",
        "install_cmd": "python -m venv venv && venv\\Scripts\\python -m pip install -r requirements.txt",
        "check_path": "venv",
        "run_cmd": f"venv\\Scripts\\python -m uvicorn app.main:app --host 0.0.0.0 --port 8000{' --no-access-log --log-level warning' if IS_PROD else ''}",
        "color": "\033[94m",  # Blue
    },
    {
        "name": "FRONTEND",
        "dir": "frontend",
        "install_cmd": "npm install",
        "check_path": "node_modules/vite",
        "run_cmd": f"npm run {'preview' if IS_PROD else 'dev'} -- --port 5173",
        "color": "\033[92m",  # Green
    },
    {
        "name": "ADMIN-UI",
        "dir": "admin-frontend",
        "install_cmd": "npm install",
        "check_path": "node_modules/vite",
        "run_cmd": f"npm run {'preview' if IS_PROD else 'dev'} -- --port 5174",
        "color": "\033[93m",  # Yellow
    },
    {
        "name": "SCRAPER",
        "dir": "microservices/scraper_engine",
        "install_cmd": "python -m venv venv && venv\\Scripts\\python -m pip install -r requirements.txt && venv\\Scripts\\python -m playwright install chromium",
        "check_path": "venv",
        "run_cmd": f"venv\\Scripts\\python api/main.py{' --prod' if IS_PROD else ''}",
        "color": "\033[95m",  # Magenta
    },
    {
        "name": "EMBEDDING",
        "dir": "microservices/embedding-service",
        "install_cmd": "python -m venv venv && venv\\Scripts\\python -m pip install -r requirements.txt",
        "check_path": "venv",
        "run_cmd": f"venv\\Scripts\\python -m uvicorn app.main:app --host 0.0.0.0 --port 8002{' --no-access-log --log-level warning' if IS_PROD else ''}",
        "color": "\033[96m",  # Cyan
    },
]

RESET_COLOR = "\033[0m"
processes = []


def print_prefixed(prefix, color, text):
    """Print text with a colored prefix."""
    for line in text.splitlines():
        if line.strip():
            try:
                print(f"{color}[{prefix}]{RESET_COLOR} {line}")
            except UnicodeEncodeError:
                # Fallback for terminals that don't support certain characters (like arrow symbols)
                clean_line = line.encode(sys.stdout.encoding, errors='replace').decode(sys.stdout.encoding)
                print(f"{color}[{prefix}]{RESET_COLOR} {clean_line}")


def stream_output(process, prefix, color):
    """Read output from a process and print it with a prefix."""
    for line in iter(process.stdout.readline, ""):
        # In prod, we might want to skip some lines even if they come from stdout
        # But generally uvicorn --no-access-log handles it.
        print_prefixed(prefix, color, line)


def get_base_dir():
    """Get the correct root directory regardless of whether this is a script or a PyInstaller executable."""
    if getattr(sys, "frozen", False):
        # Running as PyInstaller executable
        exe_dir = os.path.dirname(sys.executable)
        # If the exe is still in the default 'dist' folder, return the parent directory
        if os.path.basename(exe_dir).lower() == "dist":
            return os.path.dirname(exe_dir)
        return exe_dir
    # Running as a normal python script
    return os.path.dirname(os.path.abspath(__file__))


def check_and_install_dependencies():
    """Verify missing dependencies and install them automatically."""
    print(f"\033[1m=== Checking Dependencies ==={RESET_COLOR}")
    base_dir = get_base_dir()

    for comp in COMPONENTS:
        cwd = os.path.join(base_dir, comp["dir"])

        # Calculate target check path dynamically for cross-platform support
        path_str = comp["check_path"]
        if comp["check_path"] == "venv":
            # For Python projects, we verify the presence of key binaries, not just the venv folder
            if "uvicorn" in comp["run_cmd"]:
                db_path = "Scripts/uvicorn.exe" if os.name == "nt" else "bin/uvicorn"
            elif comp["name"] == "SCRAPER":
                db_path = (
                    "Scripts/playwright.exe" if os.name == "nt" else "bin/playwright"
                )
            else:
                db_path = "Scripts/python.exe" if os.name == "nt" else "bin/python"
            target_path = os.path.join(cwd, "venv", db_path)
        else:
            # Handle node_modules/vite or similar unix paths safely on Windows
            target_path = os.path.join(cwd, os.path.normpath(path_str))

        if not os.path.exists(target_path):
            print_prefixed(
                "SYSTEM",
                "\033[91m",
                f"Dependencies missing for {comp['name']}. Running installation...",
            )
            try:
                # Use platform specific path for venv
                cwd = os.path.join(base_dir, comp["dir"])
                if comp["check_path"] == "venv":
                    # Create virtual environment explicitly
                    subprocess.run(
                        [sys.executable, "-m", "venv", "venv"], cwd=cwd, check=True
                    )
                    # Get path to the venv python executable
                    venv_python = (
                        os.path.join(cwd, "venv", "Scripts", "python.exe")
                        if os.name == "nt"
                        else os.path.join(cwd, "venv", "bin", "python")
                    )
                    # Install requirements
                    subprocess.run(
                        [venv_python, "-m", "pip", "install", "-r", "requirements.txt"],
                        cwd=cwd,
                        check=True,
                    )

                    if comp["name"] == "SCRAPER":
                        # Install playwright browsers
                        subprocess.run(
                            [venv_python, "-m", "playwright", "install", "chromium"],
                            cwd=cwd,
                            check=True,
                        )
                else:
                    # For Node components (FRONTEND, ADMIN-UI)
                    subprocess.run("npm install", shell=True, cwd=cwd, check=True)

                print_prefixed(
                    "SYSTEM",
                    "\033[92m",
                    f"Successfully installed dependencies for {comp['name']}.",
                )
            except subprocess.CalledProcessError:
                print_prefixed(
                    "SYSTEM",
                    "\033[91m",
                    f"Failed to install dependencies for {comp['name']}. Exiting...",
                )
                sys.exit(1)
        else:
            print_prefixed(
                "SYSTEM",
                "\033[90m",
                f"{comp['name']} dependencies found. Skipping install.",
            )

        # In production mode, we MUST ensure the frontend is built
        if IS_PROD and comp["name"] in ["FRONTEND", "ADMIN-UI"]:
            print_prefixed("SYSTEM", "\033[94m", f"Building {comp['name']} for production...")
            subprocess.run("npm run build", shell=True, cwd=cwd, check=True)


def start_services():
    """Start all services in parallel threads."""
    print(f"\n\033[1m=== Starting Services ({'PROD' if IS_PROD else 'DEV'} mode) ==={RESET_COLOR}")
    base_dir = get_base_dir()

    for comp in COMPONENTS:
        cwd = os.path.join(base_dir, comp["dir"])
        
        # Set environment variables for the child process
        env = os.environ.copy()
        if IS_PROD:
            env["PROD_MODE"] = "true"

        # We use shell=True for windows cross-compatibility and complex commands
        process = subprocess.Popen(
            comp["run_cmd"],
            cwd=cwd,
            shell=True,
            stdout=subprocess.PIPE,
            stderr=subprocess.STDOUT,
            text=True,
            bufsize=1,  # Line-buffered
            encoding="utf-8",
            errors="replace",
            env=env
        )
        processes.append(process)

        # Start a thread to read the output
        threading.Thread(
            target=stream_output,
            args=(process, comp["name"], comp["color"]),
            daemon=True,
        ).start()


def open_browsers():
    """Wait for servers to start, then open the URLs in default browser."""
    wait_time = 8 if IS_PROD else 6
    print(
        f"\n\033[96m[SYSTEM]\033[0m Waiting {wait_time} seconds for servers to boot before opening browser tabs..."
    )
    time.sleep(wait_time)
    urls = [
        "http://localhost:5173",  # User Frontend
        "http://localhost:5174",  # Admin Panel
    ]
    if not IS_PROD:
        urls.extend([
            "http://127.0.0.1:8000/docs",  # Backend swagger
            "http://127.0.0.1:8001/docs",  # Scraper swagger
            "http://127.0.0.1:8002/docs",  # Embedding swagger
        ])
    
    for url in urls:
        try:
            webbrowser.open(url)
        except Exception as e:
            print(f"\033[91m[SYSTEM]\033[0m Failed to open {url}: {e}")


def main():
    try:
        check_and_install_dependencies()
        start_services()

        # Start a thread to open the browsers automatically
        threading.Thread(target=open_browsers, daemon=True).start()

        # Keep the main thread alive
        while True:
            time.sleep(1)

    except KeyboardInterrupt:
        print(f"\n{RESET_COLOR}\033[1m=== Shutting down services ==={RESET_COLOR}")
        for process in processes:
            # Taskkill is more reliable for shell=True processes on Windows
            subprocess.run(
                ["taskkill", "/F", "/T", "/PID", str(process.pid)],
                stdout=subprocess.DEVNULL,
                stderr=subprocess.DEVNULL,
            )
        print("All processes terminated. Goodbye!")
        sys.exit(0)
    except Exception as e:
        print(f"\n\033[91m[FATAL LAUNCHER ERROR]\033[0m {e}")
        input("\nPress Enter to exit...")
        sys.exit(1)


if __name__ == "__main__":
    main()
