import os
import logging
from datetime import datetime, timezone
import jwt

logger = logging.getLogger(__name__)

JWT_SECRET = os.environ.get("JWT_SECRET", "dev-secret-change-in-production")
JWT_ALGORITHM = "HS256"

if not os.environ.get("JWT_SECRET"):
    logger.warning("JWT_SECRET not set, using insecure default for development only")


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
