from pydantic import BaseModel, Field
from typing import List, Optional


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


class CurrentUser(BaseModel):
    """The signed-in user's authoritative role + location, served from /currentUser.

    The backend is the source of truth for both; the frontend never stores
    these on the Better Auth session.
    """
    backendUserId: str
    role: str = Field(..., description="user | admin | superadmin")
    locations: List[Location]
    preferredLocationId: Optional[str] = None


class SsoResolveRequest(BaseModel):
    email: str
    name: Optional[str] = None


class SsoResolveResponse(BaseModel):
    backendUserId: str
    role: str


class SetPreferredLocationRequest(BaseModel):
    locationId: str


class LocationUserEntry(BaseModel):
    userId: str


class CreateUserRequest(BaseModel):
    id: str
    isAdmin: bool = False


class LoginRequest(BaseModel):
    username: str
    password: str


class CreateLocationRequest(BaseModel):
    name: str


class LoginResponse(BaseModel):
    accessToken: str
    user: User
