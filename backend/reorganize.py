import os
import shutil

base_dir = r"d:\New folder\hotel-and-restaurant-review-management-system\backend\app"

directories = [
    "core/exceptions",
    "core/validators",
    "core/scripts",
    "core/models",
    "modules/auth/routes",
    "modules/auth/models",
    "modules/auth/schemas",
    "modules/auth/services",
    "modules/auth/repositories",
    "modules/auth/dependencies",
    "modules/auth/utils",
    "modules/auth/constants",
    "modules/user/routes",
    "modules/user/models",
    "modules/user/schemas",
    "modules/user/repositories",
    "modules/user/services",
    "modules/organization/routes",
    "modules/organization/models",
    "modules/organization/schemas",
    "modules/organization/services",
]

for d in directories:
    os.makedirs(os.path.join(base_dir, d), exist_ok=True)

moves = [
    ("db.py", "core/database.py"),
    ("exceptions/custom_exceptions.py", "core/exceptions/custom_exceptions.py"),
    ("validators/file_validator.py", "core/validators/file_validator.py"),
    ("scripts/seed_roles.py", "core/scripts/seed_roles.py"),
    ("main_backup.py", "core/main_backup.py"),
    ("email_utils.py", "modules/auth/utils/email_utils.py"),
    ("auth_utils.py", "modules/auth/utils/auth_utils.py"),
    ("oauth.py", "modules/auth/routes/oauth_routes.py"),
    ("constants/roles.py", "modules/auth/constants/roles.py"),
    ("rbac/roles_model.py", "modules/auth/schemas/roles_schema.py"),
    ("auth/auth_dependencies.py", "modules/auth/dependencies/auth_dependencies.py"),
    ("auth/auth_permissions.py", "modules/auth/dependencies/auth_permissions.py"),
    ("auth/auth_service.py", "modules/auth/services/auth_service.py"),
    ("auth/jwt_service.py", "modules/auth/services/jwt_service.py"),
    ("auth/password_utils.py", "modules/auth/utils/password_utils.py"),
    ("api/user_api.py", "modules/user/routes/user_routes.py"),
    ("api/profile_routes.py", "modules/user/routes/profile_routes.py"),
    ("repositories/users_repo.py", "modules/user/repositories/users_repo.py"),
    ("schemas/user_schema.py", "modules/user/schemas/user_schema.py"),
    ("schemas/profile_schema.py", "modules/user/schemas/profile_schema.py"),
    ("services/profile_service.py", "modules/user/services/profile_service.py"),
    ("users.json", "modules/user/users.json"),
    ("api/organization_api.py", "modules/organization/routes/organization_routes.py"),
    ("api/user_organization_api.py", "modules/organization/routes/user_organization_routes.py"),
    ("api/onboarding_api.py", "modules/organization/routes/onboarding_routes.py"),
    ("api/source_api.py", "modules/organization/routes/source_routes.py"),
    ("schemas/organization_schema.py", "modules/organization/schemas/organization_schema.py"),
    ("schemas/source_schema.py", "modules/organization/schemas/source_schema.py"),
    ("services/organization_service.py", "modules/organization/services/organization_service.py"),
    ("repositories/roles_repo.py", "modules/auth/repositories/roles_repo.py"),
]

for src, dst in moves:
    src_path = os.path.join(base_dir, src)
    dst_path = os.path.join(base_dir, dst)
    if os.path.exists(src_path) and not os.path.exists(dst_path):
        print(f"Moving {src} to {dst}")
        shutil.move(src_path, dst_path)

print("Done")
