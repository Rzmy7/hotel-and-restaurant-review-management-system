import os
import re

base_dir = r"d:\New folder\hotel-and-restaurant-review-management-system\backend\app"

replacements = [
    # General core migrations
    (r"from app\.db import", r"from app.core.database import"),
    (r"import app\.db", r"import app.core.database as db"),
    (r"from app\.exceptions\.custom_exceptions import", r"from app.core.exceptions.custom_exceptions import"),
    (r"from app\.validators\.file_validator import", r"from app.core.validators.file_validator import"),
    
    # Models are re-exported in app.models so existing imports work, but let's change them where easy.
    # No, let's leave app.models imports alone since they continue to function via the re-export!
    
    # Auth module
    (r"from app\.auth_utils import", r"from app.modules.auth.utils.auth_utils import"),
    (r"from app\.email_utils import", r"from app.modules.auth.utils.email_utils import"),
    (r"from app\.oauth import", r"from app.modules.auth.routes.oauth_routes import"),
    (r"from app\.constants\.roles import", r"from app.modules.auth.constants.roles import"),
    (r"from app\.rbac\.roles_model import", r"from app.modules.auth.schemas.roles_schema import"),
    (r"from app\.auth\.auth_dependencies import", r"from app.modules.auth.dependencies.auth_dependencies import"),
    (r"from app\.auth\.auth_permissions import", r"from app.modules.auth.dependencies.auth_permissions import"),
    (r"from app\.auth\.auth_service import", r"from app.modules.auth.services.auth_service import"),
    (r"from app\.auth\.jwt_service import", r"from app.modules.auth.services.jwt_service import"),
    (r"from app\.auth\.password_utils import", r"from app.modules.auth.utils.password_utils import"),
    (r"from app\.repositories\.roles_repo import", r"from app.modules.auth.repositories.roles_repo import"),

    # User module
    (r"from app\.api\.user_api import", r"from app.modules.user.routes.user_routes import"),
    (r"from app\.api\.profile_routes import", r"from app.modules.user.routes.profile_routes import"),
    (r"from app\.repositories\.users_repo import", r"from app.modules.user.repositories.users_repo import"),
    (r"from app\.schemas\.user_schema import", r"from app.modules.user.schemas.user_schema import"),
    (r"from app\.schemas\.profile_schema import", r"from app.modules.user.schemas.profile_schema import"),
    (r"from app\.services\.profile_service import", r"from app.modules.user.services.profile_service import"),
    
    # Organization module
    (r"from app\.api\.organization_api import", r"from app.modules.organization.routes.organization_routes import"),
    (r"from app\.api\.user_organization_api import", r"from app.modules.organization.routes.user_organization_routes import"),
    (r"from app\.api\.onboarding_api import", r"from app.modules.organization.routes.onboarding_routes import"),
    (r"from app\.api\.source_api import", r"from app.modules.organization.routes.source_routes import"),
    (r"from app\.schemas\.organization_schema import", r"from app.modules.organization.schemas.organization_schema import"),
    (r"from app\.schemas\.source_schema import", r"from app.modules.organization.schemas.source_schema import"),
    (r"from app\.services\.organization_service import", r"from app.modules.organization.services.organization_service import"),
]

for root, _, files in os.walk(base_dir):
    for file in files:
        if file.endswith(".py"):
            path = os.path.join(root, file)
            try:
                with open(path, "r", encoding="utf-8") as f:
                    content = f.read()
                
                original_content = content
                for old, new in replacements:
                    content = re.sub(old, new, content)
                
                if content != original_content:
                    with open(path, "w", encoding="utf-8") as f:
                        f.write(content)
                    print(f"Updated {path}")
            except Exception as e:
                print(f"Failed {path}: {e}")

print("Refactor complete.")
