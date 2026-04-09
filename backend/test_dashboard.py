import pyodbc
from app.core.db_utils import get_connection_string
from app.modules.admin.services.dashboard_service import build_dashboard_stats, build_system_alerts, build_recent_activity

def test():
    with open("test_out.txt", "w", encoding="utf-8") as f:
        with pyodbc.connect(get_connection_string()) as conn:
            cursor = conn.cursor()
            f.write("Testing build_dashboard_stats...\n")
            try:
                build_dashboard_stats(cursor)
            except Exception as e:
                import traceback
                f.write(traceback.format_exc() + "\n")

            f.write("Testing build_system_alerts...\n")
            try:
                build_system_alerts(cursor)
            except Exception as e:
                import traceback
                f.write(traceback.format_exc() + "\n")

            f.write("Testing build_recent_activity...\n")
            try:
                build_recent_activity(cursor)
            except Exception as e:
                import traceback
                f.write(traceback.format_exc() + "\n")

if __name__ == "__main__":
    test()
