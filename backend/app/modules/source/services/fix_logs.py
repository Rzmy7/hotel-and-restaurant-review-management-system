import uuid
from datetime import datetime, timezone
from sqlalchemy import create_engine
from sqlalchemy.orm import sessionmaker
from app.modules.auth.models import User, Role  # noqa
from app.modules.source.models import SyncLog, Source, Platform, Tenant, Organization, SyncFrequency # noqa
from app.core.db_utils import get_connection_string

def repair_logs():
    engine = create_engine(f"mssql+pyodbc:///?odbc_connect={get_connection_string()}")
    Session = sessionmaker(bind=engine)
    db = Session()

    try:
        # 1. Fetch logs where activity_type or activity_details are NULL
        logs_to_fix = db.query(SyncLog).filter(
            (SyncLog.activity_type == None) | (SyncLog.activity_details == None)
        ).all()

        print(f"Found {len(logs_to_fix)} logs to repair.")

        for log in logs_to_fix:
            # Get platform name for better details
            source = db.query(Source).filter(Source.source_id == log.source_id).first()
            platform_name = "Unknown Platform"
            if source:
                platform = db.query(Platform).filter(Platform.platform_id == source.platform_id).first()
                if platform:
                    platform_name = platform.platform_name

            # Determine type if missing
            if not log.activity_type:
                if log.status == "Success":
                    log.activity_type = "SYNC_COMPLETED"
                elif log.status == "Failed":
                    log.activity_type = "SYNC_FAILED"
                elif log.status == "In Progress":
                    log.activity_type = "SYNC_STARTED"
                else:
                    log.activity_type = "SYNC_ACTIVITY"

            # Generate details if missing
            if not log.activity_details:
                if log.activity_type == "SYNC_COMPLETED":
                    log.activity_details = f"Synchronization successfully finished for {platform_name}. {log.reviews_fetched or 0} reviews were detected."
                elif log.activity_type == "SYNC_FAILED":
                    log.activity_details = f"Synchronization failed for {platform_name}. Error: {log.error_message or 'Unknown error'}"
                elif log.activity_type == "SYNC_STARTED":
                    log.activity_details = f"Synchronization process initiated for {platform_name}."
                elif log.activity_type == "SYNC_QUEUED":
                    log.activity_details = f"Source {platform_name} placed in high-priority sync queue."
                elif log.activity_type == "INGESTION_COMPLETED":
                    log.activity_details = f"Successfully ingested {log.reviews_fetched or 0} reviews from {platform_name}."
                elif log.activity_type == "AI_ANALYSIS_COMPLETED":
                    log.activity_details = f"AI analysis completed for {log.reviews_fetched or 0} reviews."
                else:
                    log.activity_details = f"Activity recorded for {platform_name}."

        db.commit()
        print("Repair completed successfully.")

    except Exception as e:
        print(f"Error during repair: {e}")
        db.rollback()
    finally:
        db.close()

if __name__ == "__main__":
    repair_logs()
