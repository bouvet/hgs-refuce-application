import os
import logging
from datetime import datetime, timezone
import jwt
import hmac
import hashlib

logger = logging.getLogger(__name__)

_IS_PRODUCTION = os.environ.get("APP_ENV", "development").lower() == "production"
_INSECURE_DEFAULT = "dev-secret-change-in-production"


def _load_secret(name: str) -> str:
    """Load a secret env var. In production, refuse to start without it.

    Matches the frontend's `auth-env.ts` posture: fail loud rather than silently
    fall back to a placeholder. The HMAC pair (frontend + backend) cannot match
    unless both sides agree on the secret, so a misconfiguration here surfaces
    as 401s on every signed call.
    """
    value = os.environ.get(name)
    if value and value.strip():
        return value
    if _IS_PRODUCTION:
        raise RuntimeError(
            f"{name} is required in production but is not set. "
            "Refusing to start with an insecure default."
        )
    logger.warning("%s not set, using insecure default for development only", name)
    return _INSECURE_DEFAULT


JWT_SECRET = _load_secret("JWT_SECRET")
JWT_ALGORITHM = "HS256"
BACKEND_SHARED_SECRET = _load_secret("BACKEND_SHARED_SECRET")
SIGNATURE_VERSION = "v1"


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
