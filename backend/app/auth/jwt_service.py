from datetime import datetime, timedelta
from jose import jwt

SECRET_KEY = "super-secure-jwt-secret-key-reviewmate-project-2026"
ALGORITHM = "HS256"
ACCESS_TOKEN_EXPIRE_MINUTES = 60


def create_access_token(user_id: str, role: str):

    payload = {
        "user_id": user_id,
        "role": role,
        "exp": datetime.utcnow() + timedelta(minutes=ACCESS_TOKEN_EXPIRE_MINUTES)
    }

    token = jwt.encode(payload, SECRET_KEY, algorithm=ALGORITHM)

    return token

from datetime import datetime, timedelta
from jose import JWTError, jwt

# --------------------------------------------------
# JWT Configuration
# --------------------------------------------------

SECRET_KEY = "super-secure-jwt-secret-key-reviewmate-project-2026"
ALGORITHM = "HS256"
ACCESS_TOKEN_EXPIRE_MINUTES = 60


# --------------------------------------------------
# Create Access Token
# --------------------------------------------------

def create_access_token(user_id: str, role: str):

    expire = datetime.utcnow() + timedelta(minutes=ACCESS_TOKEN_EXPIRE_MINUTES)

    payload = {
        "user_id": user_id,
        "role": role,
        "exp": expire
    }

    token = jwt.encode(payload, SECRET_KEY, algorithm=ALGORITHM)

    return token


# --------------------------------------------------
# Decode Access Token
# --------------------------------------------------

def decode_access_token(token: str):

    try:
        payload = jwt.decode(token, SECRET_KEY, algorithms=[ALGORITHM])
        return payload

    except JWTError:
        return None
def decode_access_token(token: str):

    payload = jwt.decode(token, SECRET_KEY, algorithms=[ALGORITHM])

    return payload