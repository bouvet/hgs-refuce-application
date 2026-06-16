from pydantic import BaseModel, Field
from typing import List


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


class TokenResponse(BaseModel):
    access_token: str
    token_type: str = "bearer"
    user: User


class TokenData(BaseModel):
    user_id: str
    exp: int


class AzureADTokenRequest(BaseModel):
    id_token: str
