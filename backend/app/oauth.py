import os
from authlib.integrations.starlette_client import OAuth


oauth = OAuth()

client_id = os.getenv("GOOGLE_CLIENT_ID")
client_secret = os.getenv("GOOGLE_CLIENT_SECRET")
import os
from pathlib import Path
from authlib.integrations.starlette_client import OAuth
from dotenv import load_dotenv

BASE_DIR = Path(__file__).resolve().parent
load_dotenv(BASE_DIR.parent / ".env")
load_dotenv(BASE_DIR.parent.parent / ".env")


def _required_env(name: str) -> str:
    value = os.getenv(name)
    if value and value.strip():
        return value
    raise RuntimeError(f"Missing required environment variable: {name}")

oauth = OAuth()

oauth.register(
    name="google",
    client_id=_required_env("GOOGLE_CLIENT_ID"),
    client_secret=_required_env("GOOGLE_CLIENT_SECRET"),
    server_metadata_url="https://accounts.google.com/.well-known/openid-configuration",
    client_kwargs={"scope": "openid email profile"},
)

if client_id and client_secret:
    oauth.register(
        name="google",
        client_id=client_id,
        client_secret=client_secret,
        server_metadata_url="https://accounts.google.com/.well-known/openid-configuration",
        client_kwargs={"scope": "openid email profile"},
    )
