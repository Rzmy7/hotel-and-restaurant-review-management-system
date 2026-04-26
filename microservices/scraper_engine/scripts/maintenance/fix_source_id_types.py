import os
import glob
import re

base_dir = r"e:\L2 Project\hotel-and-restaurant-review-management-system\microservices\scraper_engine"

# Update models
models_path = os.path.join(base_dir, "core", "models.py")
with open(models_path, "r", encoding="utf-8") as f:
    models_content = f.read()

models_content = models_content.replace(
    "source_id   = Column(Integer, primary_key=True, autoincrement=False)",
    "source_id   = Column(String(36), primary_key=True)",
)
models_content = models_content.replace(
    "source_id  = Column(Integer, ForeignKey('sources.source_id', ondelete='CASCADE'), nullable=False)",
    "source_id  = Column(String(36), ForeignKey('sources.source_id', ondelete='CASCADE'), nullable=False)",
)

with open(models_path, "w", encoding="utf-8") as f:
    f.write(models_content)

# Update api endpoints and logic files
files_to_update = []
files_to_update.extend(glob.glob(os.path.join(base_dir, "api", "endpoints", "*.py")))
files_to_update.extend(glob.glob(os.path.join(base_dir, "platforms", "*", "logic.py")))
files_to_update.extend(glob.glob(os.path.join(base_dir, "platforms", "*", "models.py")))

for filepath in files_to_update:
    with open(filepath, "r", encoding="utf-8") as f:
        content = f.read()

    # Replace parameter signatures and basemodel types
    new_content = re.sub(r"source_id:\s*int", "source_id: str", content)
    # Also replace target_id=int(source_id) or str(source_id) if any in logic files - audit logs are fine if cast to str

    if new_content != content:
        with open(filepath, "w", encoding="utf-8") as f:
            f.write(new_content)
        print(f"Updated {filepath}")

print("Done updating source_id type.")
