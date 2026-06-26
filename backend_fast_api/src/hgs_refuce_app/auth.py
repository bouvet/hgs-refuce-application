import os
import logging
from datetime import datetime, timezone
import jwt
import hmac
import hashlib

logger = logging.getLogger(__name__)

JWT_SECRET = os.environ.get("JWT_SECRET", "dev-secret-change-in-production")
JWT_ALGORITHM = "HS256"
BACKEND_SHARED_SECRET = os.environ.get("BACKEND_SHARED_SECRET", "dev-secret-change-in-production")
SIGNATURE_VERSION = "v1"

if not os.environ.get("JWT_SECRET"):
    logger.warning("JWT_SECRET not set, using insecure default for development only")

if not os.environ.get("BACKEND_SHARED_SECRET"):
    logger.warning("BACKEND_SHARED_SECRET not set, using insecure default for development only")


def create_access_token(user_id: str) -> str:
    """Generate a JWT access token for the given user_id."""
    payload = {
        "sub": user_id,
        "iat": datetime.now(timezone.utc).isoformat(),
    }
    token = jwt.encode(payload, JWT_SECRET, algorithm=JWT_ALGORITHM)
    return token


def verify_access_token(token: str) -> str:
    """Verify JWT token and return the user_id (sub claim).

    Raises jwt.InvalidTokenError on invalid/expired token.
    """
    try:
        payload = jwt.decode(token, JWT_SECRET, algorithms=[JWT_ALGORITHM])
        user_id = payload.get("sub")
        if not user_id:
            raise jwt.InvalidTokenError("Token missing 'sub' claim")
        return user_id
    except jwt.ExpiredSignatureError:
        raise jwt.InvalidTokenError("Token has expired")
    except jwt.InvalidTokenError as e:
        raise e


def extract_bearer_token(auth_header: str) -> str:
    """Extract token from 'Bearer <token>' header format.

    Raises ValueError if header format is invalid.
    """
    if not auth_header.startswith("Bearer "):
        raise ValueError("Invalid bearer token format")
    return auth_header[7:]


def verify_service_hmac(
    signature: str,
    timestamp: str,
    version: str,
    caller: str = "service",
    max_age_seconds: int = 300,
) -> None:
    """Verify HMAC signature from service-to-service calls (e.g., sso-resolve from frontend).

    Raises ValueError if the signature is invalid or stale.
    """
    if version != SIGNATURE_VERSION:
        raise ValueError(f"Unsupported signature version: {version}")

    try:
        ts_int = int(timestamp)
    except ValueError:
        raise ValueError("Invalid timestamp")

    now = datetime.now(timezone.utc).timestamp()
    if abs(now - ts_int) > max_age_seconds:
        raise ValueError("Signature expired or clock skew too large")

    payload = f"{version}.{timestamp}.{caller}"
    expected = hmac.new(
        BACKEND_SHARED_SECRET.encode(),
        payload.encode(),
        hashlib.sha256,
    ).hexdigest()

    if not hmac.compare_digest(signature, expected):
        raise ValueError("Invalid signature")
