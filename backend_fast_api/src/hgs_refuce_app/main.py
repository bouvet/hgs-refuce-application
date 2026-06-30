import logging
import os
import time
from contextlib import asynccontextmanager
from pathlib import Path
from sqlalchemy import text
from typing import List, Optional
import jwt

from fastapi import FastAPI, HTTPException, Query, Request, Response, Header, Depends
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import JSONResponse, HTMLResponse
from jinja2 import Environment, FileSystemLoader

from .logging_config import flush_logs, setup_logging
from .auth import create_access_token, verify_access_token, extract_bearer_token, verify_service_hmac
from .models import (
    Report,
    SubmitReportRequest,
    WasteRegistration,
    Location,
    User,
    CurrentUser,
    SsoResolveRequest,
    SsoResolveResponse,
    PendingAccessRequest,
    SetPreferredLocationRequest,
    CreateUserRequest,
    UpdateUserRequest,
    CreateLocationRequest,
    LocationUserEntry,
    LoginRequest,
    LoginResponse,
)
from .storage import UserStorage, DataStorage, DatabaseConnection, date_to_quarter

setup_logging()
logger = logging.getLogger(__name__)


@asynccontextmanager
async def lifespan(_: FastAPI):
    logger.info("application starting")
    # Initialize with demo data if empty
    if not user_storage.list_locations():
        logger.info("initializing with demo data")
        bouvet_id = user_storage.create_location("Bouvet Office")
        user_storage.create_user("common@example.com", is_admin=False, password="common")
        user_storage.create_user("admin@example.com", is_admin=True, password="admin")
        user_storage.add_user_to_location(bouvet_id, "common@example.com")
        user_storage.add_user_to_location(bouvet_id, "admin@example.com")
    # Create super-admin user if it doesn't exist (keeping legacy name for PIN login)
    if not user_storage.user_exists("sadmin"):
        logger.info("creating super-admin user")
        user_storage.create_user("sadmin", is_admin=True, password="sadmin", is_super_admin=True)
    # Also create an email-based superadmin for SSO testing
    sadmin_email = "sadmin@example.com"
    if not user_storage.user_exists(sadmin_email):
        logger.info("creating email-based super-admin user")
        user_storage.create_user(sadmin_email, is_admin=True, password="", is_super_admin=True)
    # Ensure Haugesund demo data
    haugesund = user_storage.get_location_by_name("Haugesund")
    if not haugesund:
        haugesund_id = user_storage.create_location("Haugesund")
    else:
        haugesund_id = haugesund.id
    haugesund_email = "haugesund@example.com"
    if not user_storage.user_exists(haugesund_email):
        user_storage.create_user(haugesund_email, is_admin=False, password="123")
    if not user_storage.location_has_access(haugesund_id, haugesund_email):
        user_storage.add_user_to_location(haugesund_id, haugesund_email)
    # Ensure Stavanger demo data
    stavanger = user_storage.get_location_by_name("Stavanger")
    if not stavanger:
        stavanger_id = user_storage.create_location("Stavanger")
    else:
        stavanger_id = stavanger.id
    if not user_storage.user_exists("stavangerUser"):
        user_storage.create_user("stavangerUser", is_admin=False, password="123")
    if not user_storage.location_has_access(stavanger_id, "stavangerUser"):
        user_storage.add_user_to_location(stavanger_id, "stavangerUser")
    # Ensure SSO test user exists (for development)
    bouvet = user_storage.get_location_by_name("Bouvet Office") or None
    if bouvet:
        sso_test_email = "sso-test@example.com"
        if not user_storage.user_exists(sso_test_email):
            user_storage.create_user(sso_test_email, is_admin=False)
            user_storage.add_user_to_location(bouvet.id, sso_test_email)
    try:
        yield
    finally:
        logger.info("application shutting down")
        flush_logs("shutdown")


app = FastAPI(title="hgs-refuce-application", lifespan=lifespan)

_is_production = os.environ.get("APP_ENV", "development").lower() == "production"
_database_url = os.environ.get("DATABASE_URL")
if _is_production and not _database_url:
    raise ValueError("DATABASE_URL is required in production")
if not _database_url:
    _database_url = "sqlite:///data.db"
logger.info("using database: %s", "PostgreSQL" if "postgresql" in _database_url else "SQLite")
_db = DatabaseConnection(_database_url)
user_storage = UserStorage(_db)
data_storage = DataStorage(_db)

_origins = [
    o.strip()
    for o in os.environ.get("BACKEND_CORS_ORIGINS", "http://localhost:3000").split(",")
    if o.strip()
]
app.add_middleware(
    CORSMiddleware,
    allow_origins=_origins,
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)


@app.middleware("http")
async def log_requests(request: Request, call_next):
    start = time.perf_counter()
    response = await call_next(request)
    duration_ms = (time.perf_counter() - start) * 1000
    logger.info(
        "%s %s -> %d (%.1fms)",
        request.method,
        request.url.path,
        response.status_code,
        duration_ms,
    )
    return response


@app.exception_handler(Exception)
async def unhandled_exception_handler(request: Request, exc: Exception):
    # ERROR triggers a prod log-buffer flush so the crash context lands on disk.
    logger.exception(
        "unhandled exception during %s %s", request.method, request.url.path
    )
    return JSONResponse(status_code=500, content={"detail": "Internal server error"})


# ---------- dependencies ----------

def _now_iso() -> str:
    from datetime import datetime, timezone
    return datetime.now(timezone.utc).isoformat()


def _role_for(user: User) -> str:
    """Normalize the stored isAdmin/isSuperAdmin flags into a single role.

    superadmin -> isSuperAdmin is True
    admin      -> isAdmin is True and not isSuperAdmin
    user       -> otherwise
    """
    if user.isSuperAdmin:
        return "superadmin"
    if user.isAdmin:
        return "admin"
    return "user"


def get_user_id(x_user_id: Optional[str] = Header(None)) -> str:
    if not x_user_id:
        raise HTTPException(status_code=401, detail="X-User-Id header required")
    return x_user_id


def get_admin_secret(x_admin_secret: Optional[str] = Header(None)) -> str:
    expected = os.environ.get("ADMIN_SECRET")
    if not expected:
        raise HTTPException(status_code=500, detail="ADMIN_SECRET not configured")
    if x_admin_secret != expected:
        raise HTTPException(status_code=403, detail="Invalid admin secret")
    return x_admin_secret


def verify_service_auth(
    x_service_sig_version: Optional[str] = Header(None),
    x_service_sig_timestamp: Optional[str] = Header(None),
    x_service_sig: Optional[str] = Header(None),
) -> None:
    if not x_service_sig_version or not x_service_sig_timestamp or not x_service_sig:
        raise HTTPException(status_code=401, detail="Missing signature headers")
    try:
        verify_service_hmac(x_service_sig, x_service_sig_timestamp, x_service_sig_version)
    except ValueError as e:
        raise HTTPException(status_code=401, detail=str(e))


def require_admin(user_id: str = Depends(get_user_id)) -> str:
    user = user_storage.get_user(user_id)
    if not user or not user.isAdmin:
        raise HTTPException(status_code=403, detail="Admin required")
    return user_id


def require_super_admin(user_id: str = Depends(get_user_id)) -> str:
    user = user_storage.get_user(user_id)
    if not user or not user.isSuperAdmin:
        raise HTTPException(status_code=403, detail="Super-admin required")
    return user_id


def require_location_access(location_id: str, user_id: str = Depends(get_user_id)) -> str:
    user = user_storage.get_user(user_id)
    if user and user.isSuperAdmin:
        return user_id
    if not user_storage.location_exists(location_id):
        raise HTTPException(status_code=404, detail="Location not found")
    if not user_storage.location_has_access(location_id, user_id):
        raise HTTPException(status_code=403, detail="Access denied to this location")
    return user_id


# ---------- root ----------

@app.get("/")
def read_root():
    return {"message": "Welcome to the Refuce Application API\n\nDocumentation available at /docs"}


@app.get("/db-test")
def db_test():
    try:
        with _db.engine.connect() as conn:
            conn.execute(text("SELECT 1"))
        return {"status": "ok", "message": "Database connection successful"}
    except Exception as e:
        logger.error("database connection failed: %s", e)
        return {"status": "error", "message": str(e)}, 500


@app.get("/favicon.ico", include_in_schema=False)
def favicon():
    return Response(status_code=204)


# ---------- admin endpoints (developer only) ----------

@app.post("/admin/locations", response_model=Location, status_code=201)
def admin_create_location(
    req: CreateLocationRequest,
    _: str = Depends(get_admin_secret)
):
    if user_storage.location_name_exists(req.name):
        raise HTTPException(status_code=409, detail="Location already exists")
    from datetime import datetime, timezone
    loc_id = user_storage.create_location(req.name)
    return Location(id=loc_id, name=req.name, createdAt=datetime.now(timezone.utc).isoformat())


@app.get("/admin/locations", response_model=List[Location])
def admin_list_locations(_: str = Depends(get_admin_secret)):
    return user_storage.list_locations()


@app.post("/admin/users", response_model=User, status_code=201)
def admin_create_user(
    req: CreateUserRequest,
    _: str = Depends(get_admin_secret)
):
    if user_storage.user_exists(req.id):
        raise HTTPException(status_code=409, detail="User already exists")
    user_storage.create_user(req.id, req.isAdmin)
    return User(id=req.id, isAdmin=req.isAdmin)


@app.post("/admin/locations/{location_id}/users/{user_id}", status_code=201)
def admin_add_user_to_location(
    location_id: str,
    user_id: str,
    _: str = Depends(get_admin_secret)
):
    if not user_storage.location_exists(location_id):
        raise HTTPException(status_code=404, detail="Location not found")
    if not user_storage.user_exists(user_id):
        raise HTTPException(status_code=404, detail="User not found")
    if user_storage.location_has_access(location_id, user_id):
        raise HTTPException(status_code=409, detail="User already has access to location")
    user_storage.add_user_to_location(location_id, user_id)
    return {"detail": "User added to location"}


# ---------- pending access requests (super-admin) ----------

@app.get("/admin/access-requests", response_model=List[PendingAccessRequest])
def list_access_requests(_: str = Depends(require_super_admin)):
    return user_storage.list_pending_requests()


@app.delete(
    "/admin/access-requests/{email}",
    status_code=204,
    response_class=Response,
)
def delete_access_request(
    email: str,
    _: str = Depends(require_super_admin),
):
    if not user_storage.delete_pending_request(email):
        raise HTTPException(status_code=404, detail="Pending request not found")
    logger.info("dismissed pending access request for %s", email)
    return Response(status_code=204)


# ---------- auth endpoints ----------

@app.post("/auth/login", response_model=LoginResponse)
def login(
    req: LoginRequest,
    _: None = Depends(verify_service_auth),
):
    if not user_storage.user_exists(req.username):
        raise HTTPException(status_code=401, detail="Invalid credentials")
    if not user_storage.check_password(req.username, req.password):
        raise HTTPException(status_code=401, detail="Invalid credentials")
    user = user_storage.get_user(req.username)
    if not user:
        raise HTTPException(status_code=401, detail="Invalid credentials")
    access_token = create_access_token(user.id)
    return LoginResponse(accessToken=access_token, user=user)


@app.get("/auth/validate", response_model=User)
def validate_token(user_id: str = Depends(get_user_id)):
    user = user_storage.get_user(user_id)
    if not user:
        raise HTTPException(status_code=401, detail="User not found")
    return user


@app.post("/auth/sso-resolve", response_model=SsoResolveResponse)
def sso_resolve(
    req: SsoResolveRequest,
    _: None = Depends(verify_service_auth),
):
    # Map an Entra email to a backend user. If the email is unknown, queue
    # the attempt as a pending access request so a superadmin can approve or
    # dismiss it from the admin panel. Always returns 200; the frontend reads
    # `status` to decide whether to persist `backendUserId` on the BA user.
    user = user_storage.get_user(req.email)
    if user:
        return SsoResolveResponse(
            status="resolved",
            backendUserId=user.id,
            role=_role_for(user),
        )
    logger.info("sso_resolve: queuing pending access request for %s", req.email)
    user_storage.upsert_pending_request(req.email, req.name)
    return SsoResolveResponse(status="pending")


# ---------- current user ----------

@app.get("/currentUser", response_model=CurrentUser)
def get_current_user(user_id: str = Depends(get_user_id)):
    user = user_storage.get_user(user_id)
    if not user:
        raise HTTPException(status_code=404, detail="User not found")
    locations = user_storage.get_user_locations(user_id)
    preferred = user_storage.get_preferred_location(user_id)
    # Only surface a preferred location the user still has access to.
    if preferred and not any(loc.id == preferred for loc in locations):
        preferred = None
    return CurrentUser(
        backendUserId=user.id,
        role=_role_for(user),
        name=user.name,
        locations=locations,
        preferredLocationId=preferred,
    )


@app.patch("/currentUser/location", status_code=204, response_class=Response)
def set_my_location(
    req: SetPreferredLocationRequest,
    user_id: str = Depends(get_user_id),
):
    locations = user_storage.get_user_locations(user_id)
    if not any(loc.id == req.locationId for loc in locations):
        raise HTTPException(status_code=403, detail="No access to this location")
    user_storage.set_preferred_location(user_id, req.locationId)
    return Response(status_code=204)


# ---------- user endpoints ----------

@app.get("/locations", response_model=List[Location])
def list_user_locations(user_id: str = Depends(get_user_id)):
    return user_storage.get_user_locations(user_id)


@app.post("/locations", response_model=Location, status_code=201)
def create_location_as_super_admin(
    req: CreateLocationRequest,
    _: str = Depends(require_super_admin)
):
    if user_storage.location_name_exists(req.name):
        raise HTTPException(status_code=409, detail="En lokasjon med dette navnet finnes allerede")
    from datetime import datetime, timezone
    loc_id = user_storage.create_location(req.name)
    return Location(id=loc_id, name=req.name, createdAt=datetime.now(timezone.utc).isoformat())


@app.delete("/locations/{location_id}", status_code=204, response_class=Response)
def delete_location(
    location_id: str,
    _: str = Depends(require_super_admin)
):
    if not user_storage.location_exists(location_id):
        raise HTTPException(status_code=404, detail="Location not found")
    user_storage.delete_location(location_id)
    data_storage.delete_registrations_for_location(location_id)
    data_storage.delete_reports_for_location(location_id)
    return Response(status_code=204)


@app.get("/users", response_model=List[User])
def list_all_users(_: str = Depends(require_super_admin)):
    return user_storage.list_users()


@app.post("/users", response_model=User, status_code=201)
def create_user_as_admin(
    req: CreateUserRequest,
    _: str = Depends(require_admin)
):
    # Validate the id/password combination matches one of the two supported
    # provisioning modes. The admin UI enforces this client-side too, but the
    # backend is the authority — reject mismatches with 422 so a misbehaving
    # client can't create an SSO user with a password (or vice versa).
    has_at = "@" in req.id
    if req.password is not None:
        if has_at:
            raise HTTPException(
                status_code=422,
                detail="PIN-brukere skal ha et brukernavn uten '@'.",
            )
        if len(req.password) < 4:
            raise HTTPException(
                status_code=422,
                detail="PIN m\u00e5 v\u00e6re minst 4 tegn.",
            )
    else:
        if not has_at:
            raise HTTPException(
                status_code=422,
                detail="SSO-brukere m\u00e5 opprettes med en e-postadresse.",
            )
    if user_storage.user_exists(req.id):
        raise HTTPException(status_code=409, detail="User already exists")
    user_storage.create_user(req.id, req.isAdmin, password=req.password, name=req.name)
    # If we just provisioned an SSO user, clear any pending access request
    # for the same email so the inbox stays tidy. PIN users never have a
    # matching pending row (those are always emails).
    if req.password is None:
        user_storage.delete_pending_request(req.id)
    return User(id=req.id, isAdmin=req.isAdmin, isSuperAdmin=False, name=req.name)


@app.delete("/users/{user_id}", status_code=204, response_class=Response)
def delete_user_endpoint(
    user_id: str,
    _: str = Depends(require_super_admin)
):
    if user_id == "sadmin":
        raise HTTPException(status_code=403, detail="Cannot delete super-admin user")
    if not user_storage.user_exists(user_id):
        raise HTTPException(status_code=404, detail="User not found")
    user_storage.delete_user(user_id)
    return Response(status_code=204)


@app.put("/users/{user_id}", response_model=User)
def update_user_endpoint(
    user_id: str,
    req: UpdateUserRequest,
    caller_id: str = Depends(require_admin),
):
    # PATCH semantics: only fields present in the request body are touched.
    # Authorisation: any admin may edit `name`; only superadmins may toggle
    # the role flags. Last-superadmin demotion is refused to prevent the org
    # from locking itself out.
    target = user_storage.get_user(user_id)
    if not target:
        raise HTTPException(status_code=404, detail="User not found")

    changes = req.model_dump(exclude_unset=True)
    touches_role = "isAdmin" in changes or "isSuperAdmin" in changes

    if touches_role:
        caller = user_storage.get_user(caller_id)
        if not caller or not caller.isSuperAdmin:
            raise HTTPException(
                status_code=403,
                detail="Bare superadmin kan endre rolle.",
            )

    # Guard against demoting the last remaining superadmin. Applies whether
    # the caller flips `isSuperAdmin` directly or sets `isAdmin=False` on a
    # row that is also a superadmin.
    would_demote_super = (
        target.isSuperAdmin
        and changes.get("isSuperAdmin") is False
    )
    if would_demote_super and user_storage.count_super_admins() <= 1:
        raise HTTPException(
            status_code=409,
            detail="Kan ikke fjerne den siste superadmin-en.",
        )

    # Map camelCase request fields to the snake_case storage kwargs.
    storage_kwargs: dict = {}
    if "name" in changes:
        storage_kwargs["name"] = changes["name"]
    if "isAdmin" in changes:
        storage_kwargs["is_admin"] = changes["isAdmin"]
    if "isSuperAdmin" in changes:
        storage_kwargs["is_super_admin"] = changes["isSuperAdmin"]

    updated = user_storage.update_user(user_id, **storage_kwargs)
    if not updated:
        raise HTTPException(status_code=404, detail="User not found")
    return updated


@app.get("/locations/{location_id}/users", response_model=List[str])
def list_location_users(
    location_id: str,
    _: str = Depends(require_admin)
):
    if not user_storage.location_exists(location_id):
        raise HTTPException(status_code=404, detail="Location not found")
    return user_storage.list_users_in_location(location_id)


@app.post("/locations/{location_id}/users/{user_id}", status_code=201)
def add_user_to_location_as_admin(
    location_id: str,
    user_id: str,
    admin_id: str = Depends(require_admin)
):
    if not user_storage.location_exists(location_id):
        raise HTTPException(status_code=404, detail="Location not found")
    if not user_storage.user_exists(user_id):
        raise HTTPException(status_code=404, detail="User not found")
    if user_storage.location_has_access(location_id, user_id):
        raise HTTPException(status_code=409, detail="User already has access")
    user_storage.add_user_to_location(location_id, user_id)
    return {"detail": "User added to location"}


@app.delete("/locations/{location_id}/users/{user_id}", status_code=204, response_class=Response)
def remove_user_from_location_as_admin(
    location_id: str,
    user_id: str,
    _: str = Depends(require_admin)
):
    if not user_storage.location_exists(location_id):
        raise HTTPException(status_code=404, detail="Location not found")
    if not user_storage.remove_user_from_location(location_id, user_id):
        raise HTTPException(status_code=404, detail="User not in location")
    return Response(status_code=204)


# ---------- registrations ----------

@app.get("/locations/{location_id}/registrations", response_model=List[WasteRegistration])
def list_registrations(
    location_id: str,
    date: Optional[str] = Query(None, description="YYYY-MM-DD exact match"),
    period: Optional[str] = Query(None, description="YYYY-Qn quarter"),
    date_from: Optional[str] = Query(None, alias="from"),
    date_to: Optional[str] = Query(None, alias="to"),
    _: str = Depends(require_location_access)
):
    if date is not None:
        reg = data_storage.get_registration_by_date(location_id, date)
        return [reg] if reg else []
    if period is not None:
        year, q = period.split("-Q")
        q_int = int(q)
        start_month = (q_int - 1) * 3 + 1
        end_month = start_month + 2
        start = f"{year}-{start_month:02d}-01"
        last_day = 31 if end_month in (3, 12) else (30 if end_month in (6, 9) else 31)
        end = f"{year}-{end_month:02d}-{last_day:02d}"
        return data_storage.list_registrations(location_id, date_from=start, date_to=end)
    return data_storage.list_registrations(location_id, date_from=date_from, date_to=date_to)


@app.post("/locations/{location_id}/registrations", response_model=WasteRegistration, status_code=201)
def create_registration(
    location_id: str,
    reg: WasteRegistration,
    _: str = Depends(require_location_access)
):
    if data_storage.is_date_locked(location_id, reg.date):
        logger.warning("rejected registration %s: quarter %s is locked", reg.id, date_to_quarter(reg.date))
        raise HTTPException(
            status_code=409,
            detail=f"Quarter {date_to_quarter(reg.date)} is locked",
        )
    if data_storage.get_registration(location_id, reg.id) is not None:
        logger.warning("rejected registration %s: id already exists", reg.id)
        raise HTTPException(status_code=409, detail="Registration id already exists")
    data_storage.insert_registration(location_id, reg)
    logger.info("created registration %s for %s by %s", reg.id, reg.date, reg.createdBy)
    return reg


@app.get("/locations/{location_id}/registrations/{id}", response_model=WasteRegistration)
def get_registration(
    location_id: str,
    id: str,
    _: str = Depends(require_location_access)
):
    reg = data_storage.get_registration(location_id, id)
    if reg is None:
        raise HTTPException(status_code=404, detail="Registration not found")
    return reg


@app.put("/locations/{location_id}/registrations/{id}", response_model=WasteRegistration)
def update_registration(
    location_id: str,
    id: str,
    reg: WasteRegistration,
    _: str = Depends(require_location_access)
):
    if id != reg.id:
        raise HTTPException(status_code=400, detail="Path id does not match body id")
    existing = data_storage.get_registration(location_id, id)
    if existing is None:
        raise HTTPException(status_code=404, detail="Registration not found")
    if data_storage.is_date_locked(location_id, existing.date) or data_storage.is_date_locked(location_id, reg.date):
        logger.warning("rejected update %s: quarter is locked", id)
        raise HTTPException(status_code=409, detail="Quarter is locked")
    data_storage.update_registration(location_id, reg)
    logger.info("updated registration %s", id)
    return reg


@app.delete("/locations/{location_id}/registrations/{id}", status_code=204, response_class=Response)
def delete_registration(
    location_id: str,
    id: str,
    _: str = Depends(require_location_access)
):
    existing = data_storage.get_registration(location_id, id)
    if existing is None:
        raise HTTPException(status_code=404, detail="Registration not found")
    if data_storage.is_date_locked(location_id, existing.date):
        logger.warning("rejected delete %s: quarter is locked", id)
        raise HTTPException(status_code=409, detail="Quarter is locked")
    data_storage.delete_registration(location_id, id)
    logger.info("deleted registration %s", id)
    return Response(status_code=204)


# ---------- reports ----------

@app.get("/locations/{location_id}/reports", response_model=List[Report])
def list_reports(
    location_id: str,
    _: str = Depends(require_location_access)
):
    return data_storage.list_reports(location_id)


@app.get("/locations/{location_id}/reports/{period}", response_model=Report)
def get_report(
    location_id: str,
    period: str,
    _: str = Depends(require_location_access)
):
    report = data_storage.get_report(location_id, period)
    if report is None:
        raise HTTPException(status_code=404, detail="Report not found")
    return report


@app.post("/locations/{location_id}/reports", response_model=Report, status_code=201)
def submit_report(
    location_id: str,
    req: SubmitReportRequest,
    _: str = Depends(require_location_access)
):
    if data_storage.get_report(location_id, req.period) is not None:
        logger.warning("rejected report submit %s: already submitted", req.period)
        raise HTTPException(
            status_code=409, detail=f"Report for {req.period} already submitted"
        )
    report = Report(
        id=f"report-{req.period}",
        period=req.period,
        submittedAt=_now_iso(),
        submittedBy=req.submittedBy,
    )
    data_storage.insert_report(location_id, report)
    logger.info("submitted report %s by %s", req.period, req.submittedBy)
    return report


@app.delete("/locations/{location_id}/reports/{period}", status_code=204, response_class=Response)
def unlock_report(
    location_id: str,
    period: str,
    _: str = Depends(require_location_access)
):
    if not data_storage.delete_report(location_id, period):
        raise HTTPException(status_code=404, detail="Report not found")
    logger.info("unlocked report %s", period)
    return Response(status_code=204)


_CATEGORY_META = {
    "restavfall":  {"label": "Restavfall",  "color": "#6b6e52"},
    "plast":       {"label": "Plast",       "color": "#c97b5a"},
    "papp-papir":  {"label": "Papp/papir",  "color": "#8b9eb7"},
    "matavfall":   {"label": "Matavfall",   "color": "#6b8e4e"},
    "metall":      {"label": "Metall",      "color": "#8a8a8a"},
    "glass":       {"label": "Glass",       "color": "#4e8a8a"},
    "ee-avfall":   {"label": "EE-avfall",   "color": "#a17bb3"},
}

_QUARTER_DATE_RANGES = {
    "Q1": ("01-01", "03-31"),
    "Q2": ("04-01", "06-30"),
    "Q3": ("07-01", "09-30"),
    "Q4": ("10-01", "12-31"),
}

_jinja_env = Environment(
    loader=FileSystemLoader(str(Path(__file__).parent / "report")),
    autoescape=True,
)


def _render_report_html(
    location_id: str,
    period: str,
    *,
    preview: bool,
) -> HTMLResponse:
    """Render the report Jinja template for a given period.

    When `preview` is True, the template is rendered without requiring a
    saved `Report` row — used to let admins preview the current quarter
    before locking it. When False, a 404 is raised if no report exists.
    """
    report = data_storage.get_report(location_id, period)
    if report is None and not preview:
        raise HTTPException(status_code=404, detail="Report not found")

    location = user_storage.get_location(location_id)
    if location is None:
        raise HTTPException(status_code=404, detail="Location not found")

    try:
        year, q = period.split("-")
        date_from = f"{year}-{_QUARTER_DATE_RANGES[q][0]}"
        date_to = f"{year}-{_QUARTER_DATE_RANGES[q][1]}"
    except (ValueError, KeyError):
        raise HTTPException(status_code=400, detail="Invalid period format, expected YYYY-Qn")

    registrations = data_storage.list_registrations(location_id, date_from=date_from, date_to=date_to)

    # Aggregate kg per category
    totals: dict[str, float] = {}
    for reg in registrations:
        for entry in reg.entries:
            totals[entry.categoryId] = totals.get(entry.categoryId, 0.0) + entry.weightKg

    total_kg = sum(totals.values())

    categories = []
    for cat_id, kg in sorted(totals.items(), key=lambda x: x[1], reverse=True):
        meta = _CATEGORY_META.get(cat_id, {"label": cat_id, "color": "#999999"})
        categories.append({
            "label": meta["label"],
            "color": meta["color"],
            "total_kg": kg,
            "pct": (kg / total_kg * 100) if total_kg > 0 else 0,
        })

    # Build per-registration rows with resolved labels
    reg_rows = []
    for reg in sorted(registrations, key=lambda r: r.date, reverse=True):
        reg_total = sum(e.weightKg for e in reg.entries)
        entries = [
            {
                "label": _CATEGORY_META.get(e.categoryId, {"label": e.categoryId})["label"],
                "weightKg": e.weightKg,
            }
            for e in reg.entries
        ]
        reg_rows.append({"date": reg.date, "entries": entries, "total_kg": reg_total})

    submitted_by = report.submittedBy if report else ""
    submitted_at_display = (report.submittedAt[:10] if report and report.submittedAt else "")

    template = _jinja_env.get_template("report_template.html")
    html = template.render(
        period=period,
        year=year,
        quarter_label=q,
        location_name=location.name,
        total_kg=total_kg,
        registration_count=len(registrations),
        category_count=len(categories),
        categories=categories,
        registrations=reg_rows,
        submitted_by=submitted_by,
        submitted_at=submitted_at_display,
        preview=preview,
    )
    return HTMLResponse(content=html)


@app.get("/locations/{location_id}/reports/{period}/html", response_class=HTMLResponse)
def get_report_html(
    location_id: str,
    period: str,
    _: str = Depends(require_location_access)
):
    return _render_report_html(location_id, period, preview=False)


@app.get("/locations/{location_id}/reports/{period}/preview-html", response_class=HTMLResponse)
def get_report_preview_html(
    location_id: str,
    period: str,
    _: str = Depends(require_location_access)
):
    return _render_report_html(location_id, period, preview=True)
