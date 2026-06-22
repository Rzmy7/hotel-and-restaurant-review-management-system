"""
AES-256-GCM encryption for storing sensitive values (API keys) in the database.

The key is loaded from LLM_ENCRYPTION_KEY in .env (32-byte, base64-encoded).
Generate a key:
    python -c "import os,base64; print(base64.urlsafe_b64encode(os.urandom(32)).decode())"
"""

import base64
import os

from cryptography.hazmat.primitives.ciphers.aead import AESGCM


def _load_key() -> bytes:
    from app.core.config import LLM_ENCRYPTION_KEY
    if not LLM_ENCRYPTION_KEY:
        raise RuntimeError(
            "LLM_ENCRYPTION_KEY is not set. Add it to .env — see docs for generation command."
        )
    raw = base64.urlsafe_b64decode(LLM_ENCRYPTION_KEY.encode())
    if len(raw) != 32:
        raise ValueError("LLM_ENCRYPTION_KEY must decode to exactly 32 bytes (AES-256).")
    return raw


def encrypt_value(plaintext: str) -> str:
    """Encrypt *plaintext* with AES-256-GCM. Returns a base64url string (nonce + ciphertext)."""
    nonce = os.urandom(12)
    ciphertext = AESGCM(_load_key()).encrypt(nonce, plaintext.encode("utf-8"), None)
    return base64.urlsafe_b64encode(nonce + ciphertext).decode("ascii")


def decrypt_value(encrypted: str) -> str:
    """Decrypt a value produced by :func:`encrypt_value`."""
    data = base64.urlsafe_b64decode(encrypted.encode("ascii"))
    nonce, ciphertext = data[:12], data[12:]
    return AESGCM(_load_key()).decrypt(nonce, ciphertext, None).decode("utf-8")
