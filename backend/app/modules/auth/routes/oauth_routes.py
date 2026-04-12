from fastapi import APIRouter, Depends, HTTPException, Request
from fastapi.responses import RedirectResponse
from sqlalchemy.orm import Session
import os

from app.database.session import get_db
from app.modules.user.repositories.users_repo import get_user_by_email, create_user
from app.modules.auth.repositories.roles_repo import assign_role_to_user, get_user_role_names

# Assuming oauth is configured in this same file or imported from an oauth config file.
# The refactor script moved app/oauth.py to app/modules/auth/routes/oauth_routes.py
# Let's import the oauth instance from wherever it is.
# Actually, if the previous script moved oauth.py to oauth_routes.py, it overwrote oauth_routes.py.
# So I should read what's in oauth_routes.py or just recreate it properly.
# Let's read what oauth_routes actually has by importing it inline, or better, writing the whole thing:

from authlib.integrations.starlette_client import OAuth
from starlette.config import Config
import os
from dotenv import load_dotenv

load_dotenv()
config = Config(environ=os.environ)
oauth = OAuth(config)

oauth.register(
    name="google",
    client_id=os.getenv("GOOGLE_CLIENT_ID"),
    client_secret=os.getenv("GOOGLE_CLIENT_SECRET"),
    server_metadata_url="https://accounts.google.com/.well-known/openid-configuration",
    client_kwargs={"scope": "openid email profile"},
)

router = APIRouter(tags=["OAuth"])

@router.get("/login/google")
async def login_google(request: Request):
    if not getattr(oauth, "google", None):
        raise HTTPException(status_code=503, detail="Google OAuth is not configured")
    redirect_uri = request.url_for("auth_google")
    return await oauth.google.authorize_redirect(request, redirect_uri)

@router.get("/auth/google")
async def auth_google(request: Request, db: Session = Depends(get_db)):
    token = await oauth.google.authorize_access_token(request)
    user_info = token.get("userinfo") or token

    email = user_info.get("email")
    google_id = user_info.get("sub")

    if not email:
        raise HTTPException(status_code=400, detail="Google did not return an email")

    user = get_user_by_email(db, email.lower())

    if not user:
        user = create_user(
            db=db,
            email=email.lower(),
            password_hash=None,
            first_name=user_info.get("name") or email,
            last_name=None,
            google_id=google_id,
            is_email_verified=True,
        )
    else:
        if not user.google_id:
            user.google_id = google_id
            db.commit()

    roles = get_user_role_names(db, user.user_id)
    from app.core.security import create_access_token

    access_token = create_access_token(
        user_id=str(user.user_id),
        role=roles[0] if roles else "TENANT"
    )

    frontend_url = os.getenv("FRONTEND_URL", "http://localhost:5173")

    return RedirectResponse(
        url=f"{frontend_url}/oauth-success?token={access_token}",
        status_code=302
    )
