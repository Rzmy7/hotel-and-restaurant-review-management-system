import subprocess
import sys

print("Installing PyInstaller...")
subprocess.run([sys.executable, "-m", "pip", "install", "pyinstaller"], check=True)

print("Building unified launcher.exe...")
# We use --onefile for a single executable, and --console so we can see the logs
command = [
    sys.executable,
    "-m",
    "PyInstaller",
    "--onefile",
    "--console",
    "--name",
    "System-Launcher",
    "--icon=NONE",  # Can provide an icon path here later
    "launcher.py",
]

subprocess.run(command, check=True)

print("\nBuild complete. Executable is located in the 'dist' folder.")
