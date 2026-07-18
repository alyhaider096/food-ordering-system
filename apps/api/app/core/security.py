from __future__ import annotations

import base64
import hashlib
import hmac
import uuid
from datetime import UTC, datetime, timedelta
from typing import Any

from cryptography.hazmat.primitives.ciphers.aead import AESGCM
from jose import jwt
from passlib.context import CryptContext

from app.core.config import settings

password_context = CryptContext(schemes=["bcrypt"], deprecated="auto")


def utcnow() -> datetime:
    return datetime.now(UTC)


def verify_password(plain_password: str, password_hash: str) -> bool:
    return password_context.verify(plain_password, password_hash)


def hash_password(plain_password: str) -> str:
    return password_context.hash(plain_password)


def hash_sensitive(value: str) -> str:
    return hmac.new(
        settings.customer_data_key.encode("utf-8"),
        value.strip().lower().encode("utf-8"),
        hashlib.sha256,
    ).hexdigest()


def _encryption_key() -> bytes:
    return hashlib.sha256(settings.customer_data_key.encode("utf-8")).digest()


def encrypt_sensitive(value: str) -> str:
    nonce = uuid.uuid4().bytes[:12]
    aes = AESGCM(_encryption_key())
    encrypted = aes.encrypt(nonce, value.encode("utf-8"), None)
    return "v1:" + ":".join(
        base64.urlsafe_b64encode(part).decode("ascii").rstrip("=")
        for part in [nonce, encrypted]
    )


def decrypt_sensitive(value: str) -> str:
    version, nonce, encrypted = value.split(":", 2)
    if version != "v1":
        raise ValueError("Unsupported encrypted value version.")

    def decode(part: str) -> bytes:
        padding = "=" * (-len(part) % 4)
        return base64.urlsafe_b64decode(part + padding)

    aes = AESGCM(_encryption_key())
    return aes.decrypt(decode(nonce), decode(encrypted), None).decode("utf-8")


def create_access_token(subject: str, role: str, extra_claims: dict[str, Any] | None = None) -> str:
    expires_at = utcnow() + timedelta(minutes=settings.access_token_minutes)
    payload = {
        "exp": expires_at,
        "iat": utcnow(),
        "role": role,
        "sub": subject,
        "typ": "access",
    }
    if extra_claims:
        payload.update(extra_claims)
    return jwt.encode(payload, settings.secret_key, algorithm="HS256")


def decode_access_token(token: str) -> dict[str, Any]:
    return jwt.decode(token, settings.secret_key, algorithms=["HS256"])


def make_tracking_token() -> tuple[str, str, str]:
    raw = str(uuid.uuid4())
    return raw, hash_sensitive(raw), encrypt_sensitive(raw)


def mask_name(name: str) -> str:
    clean = name.strip()
    if len(clean) <= 2:
        return clean
    return f"{clean[:1]}{'*' * min(len(clean) - 1, 8)}"


def mask_phone(value: str) -> str:
    digits = "".join(char for char in value if char.isdigit())
    return f"****{digits[-4:]}" if len(digits) >= 4 else "Hidden"
