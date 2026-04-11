import traceback
try:
    from app.main import app
    print("Backend loaded successfully")
except Exception as e:
    traceback.print_exc()
