import sys
import traceback

with open("loader_trace.txt", "w") as f:
    try:
        from app.main import app
        f.write("Backend loaded successfully\\n")
    except Exception as e:
        traceback.print_exc(file=f)
