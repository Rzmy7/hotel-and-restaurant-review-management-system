import psutil
import os
import time
import threading

class ResourceMonitor:
    """Monitors CPU and RAM usage of the current process and its children (browsers)."""
    
    def __init__(self, interval=0.5):
        self.interval = interval
        self.process = psutil.Process(os.getpid())
        self.peak_memory = 0
        self.peak_cpu = 0
        self.running = False
        self.thread = None
        self.history = []

    def _monitor(self):
        while self.running:
            try:
                # Include child processes (Chromium)
                total_mem = self.process.memory_info().rss
                total_cpu = self.process.cpu_percent(interval=None)
                
                for child in self.process.children(recursive=True):
                    try:
                        total_mem += child.memory_info().rss
                        total_cpu += child.cpu_percent(interval=None)
                    except (psutil.NoSuchProcess, psutil.AccessDenied):
                        continue
                
                # Convert to MB
                total_mem_mb = total_mem / (1024 * 1024)
                
                self.peak_memory = max(self.peak_memory, total_mem_mb)
                self.peak_cpu = max(self.peak_cpu, total_cpu)
                self.history.append({"mem": total_mem_mb, "cpu": total_cpu, "time": time.time()})
                
            except Exception as e:
                print(f"Monitor error: {e}")
            
            time.sleep(self.interval)

    def start(self):
        self.running = True
        self.thread = threading.Thread(target=self._monitor)
        self.thread.daemon = True
        self.thread.start()

    def stop(self):
        self.running = False
        if self.thread:
            self.thread.join(timeout=2)
        return {
            "peak_memory_mb": self.peak_memory,
            "peak_cpu_percent": self.peak_cpu,
            "avg_memory_mb": sum(h["mem"] for h in self.history) / len(self.history) if self.history else 0,
            "samples": len(self.history)
        }
