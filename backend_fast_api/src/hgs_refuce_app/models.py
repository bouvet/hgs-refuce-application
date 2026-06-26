from pydantic import BaseModel, Field
from typing import List, Literal, Optional


class WasteCategoryEntry(BaseModel):
    categoryId: str
    weightKg: float


class WasteRegistration(BaseModel):
    id: str
    date: str = Field(..., description="YYYY-MM-DD")
    entries: List[WasteCategoryEntry]
    createdAt: str
    updatedAt: str
    createdBy: str


class Report(BaseModel):
    id: str
    period: str = Field(..., description="YYYY-Qn")
    submittedAt: str
    submittedBy: str


class SubmitReportRequest(BaseModel):
    period: str
    submittedBy: str


class Location(BaseModel):
    id: str
    name: str
    createdAt: str


class User(BaseModel):
    id: str
    isAdmin: bool
    isSuperAdmin: bool = False
    name: Optional[str] = None


class CurrentUser(BaseModel):
    """The signed-in user's authoritative role + location, served from /currentUser.

    The backend is the source of truth for both; the frontend never stores
    these on the Better Auth session.
    """
    backendUserId: str
    role: str = Field(..., description="user | admin | superadmin")
    name: Optional[str] = None
    locations: List[Location]
    preferredLocationId: Optional[str] = None


class SsoResolveRequest(BaseModel):
    email: str
    name: Optional[str] = None


class SsoResolveResponse(BaseModel):
    """Result of looking up an SSO email on the backend.

    `status` is the discriminator. On `resolved`, `backendUserId` and `role`
    are populated. On `pending`, the email was unknown to the backend and a
    row was upserted into `pending_access_requests` for admin review; the
    frontend should keep the Better Auth user without a `backendUserId` so a
    subsequent visit can lazy-resolve once the admin provisions the account.
    """
    status: Literal["resolved", "pending"]
    backendUserId: Optional[str] = None
    role: Optional[str] = None


class PendingAccessRequest(BaseModel):
    email: str
    name: Optional[str] = None
    requestedAt: str
    lastAttemptAt: str


class SetPreferredLocationRequest(BaseModel):
    locationId: str


class LocationUserEntry(BaseModel):
    userId: str


class CreateUserRequest(BaseModel):
    """Payload for `POST /users`.

    - `password` present  → PIN user; `id` must look like a username (no `@`).
    - `password` absent   → SSO user; `id` must look like an email (contains `@`).
    - `name` is persisted on the `users` row (optional display name).
    """
    id: str
    isAdmin: bool = False
    password: Optional[str] = None
    name: Optional[str] = None


class UpdateUserRequest(BaseModel):
    """Payload for `PUT /users/{user_id}`. All fields optional (PATCH semantics).

    Only the caller's authority decides which fields are accepted: regular
    admins may only change `name`; only superadmins may toggle `isAdmin` or
    `isSuperAdmin`. The backend enforces this — see `main.py`.
    """
    name: Optional[str] = None
    isAdmin: Optional[bool] = None
    isSuperAdmin: Optional[bool] = None


class LoginRequest(BaseModel):
    username: str
    password: str


class CreateLocationRequest(BaseModel):
    name: str


class LoginResponse(BaseModel):
    accessToken: str
    user: User
