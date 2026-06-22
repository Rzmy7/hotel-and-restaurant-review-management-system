import json
import os
import datetime

def migrate():
    # Paths relative to this script
    script_dir = os.path.dirname(os.path.abspath(__file__))
    persistence_file = os.path.join(script_dir, "..", "jobs_state.json")

    if not os.path.exists(persistence_file):
        print(f"Persistence file not found at {persistence_file}")
        return

    try:
        with open(persistence_file, "r", encoding="utf-8") as f:
            jobs = json.load(f)
    except Exception as e:
        print(f"Failed to load jobs: {e}")
        return

    updated_count = 0
    for jid, job in jobs.items():
        for field in ["created_at", "ended_at"]:
            val = job.get(field)
            if val and isinstance(val, str):
                try:
                    dt = datetime.datetime.fromisoformat(val)
                    # If it's naive, assume it's local time and convert to UTC
                    if dt.tzinfo is None:
                        # astimezone() without arguments converts to local time then to the specified timezone
                        # If we assume it WAS local time, we attach local then convert to UTC
                        dt = dt.astimezone(datetime.timezone.utc)
                        job[field] = dt.isoformat()
                        updated_count += 1
                except ValueError:
                    continue

    if updated_count > 0:
        try:
            with open(persistence_file, "w", encoding="utf-8") as f:
                json.dump(jobs, f, indent=4)
            print(f"Successfully migrated {updated_count} timestamps in {persistence_file}")
        except Exception as e:
            print(f"Failed to save migrated jobs: {e}")
    else:
        print("No naive timestamps found to migrate.")

if __name__ == "__main__":
    migrate()
