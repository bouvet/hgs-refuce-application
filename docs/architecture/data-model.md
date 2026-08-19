---
layout: default
parent: Architecture
title: Data model
nav_order: 3
---

# Data model

The backend's Pydantic models (`backend_fast_api/src/hgs_refuce_app/models.py`) double as the
request/response schemas for FastAPI and the shapes SQLAlchemy reads/writes in `storage.py`. This
page lists the fields actually present in that file today.

## WasteRegistration

```python
class WasteCategoryEntry(BaseModel):
    categoryId: str
    weightKg: float

class WasteRegistration(BaseModel):
    id: str
    date: str            # "YYYY-MM-DD"
    entries: List[WasteCategoryEntry]
    createdAt: str
    updatedAt: str
    createdBy: str
```

A registration is a single date plus a list of `(categoryId, weightKg)` entries — one registration
can cover multiple waste categories at once, rather than one row per category/weight pair.

## Report

```python
class Report(BaseModel):
    id: str
    period: str           # "YYYY-Qn", e.g. "2026-Q3"
    submittedAt: str
    submittedBy: str

class SubmitReportRequest(BaseModel):
    period: str
    submittedBy: str
```

There is **no boolean `locked` field**. A quarter is locked purely by the *existence* of a `Report`
row for that `(location_id, period)` pair:

- `POST /locations/{id}/reports` (`submit_report` in `main.py`) checks
  `data_storage.get_report(location_id, period)`; if a report already exists for that period, it
  returns `409 Conflict`. Otherwise it inserts a new `Report` row.
- `data_storage.is_period_locked(location_id, period)` — used when validating new/edited
  registrations — is really just "does a report row exist for this period."
- `DELETE /locations/{id}/reports/{period}` deletes the row, which **is** the unlock operation —
  there's no soft-delete or audit trail of who unlocked a quarter or when.

## Location

```python
class Location(BaseModel):
    id: str
    name: str
    createdAt: str
```

The Pydantic model itself carries no `address` field and no embedded user list. Location membership
is a separate many-to-many join table, `location_users(location_id, user_id)`, managed directly in
`storage.py` (raw SQL via SQLAlchemy's `text()`) rather than modeled as a Pydantic relationship.
`GET /locations` and the `/currentUser` response's `locations` field derive from a join against this
table, not from a field on `Location` itself.

## User

```python
class User(BaseModel):
    id: str
    isAdmin: bool
    isSuperAdmin: bool = False
    name: Optional[str] = None
```

No `email` or `password` field appears on the response model — `id` doubles as the login username
for PIN users and as the email address for SSO users (see
[Authentication]({{ site.baseurl }}/architecture/authentication/) for the `${username}@pin.local`
synthetic-email convention on the Better Auth side). Password/PIN storage and verification happen
inside `UserStorage` (`storage.py`), outside this response model, so a stored credential is never
serialized back to a client. Role is *not* a field on `User` — it's derived on demand from the two
booleans by `_role_for(user)` in `main.py` (`superadmin` if `isSuperAdmin`, else `admin` if
`isAdmin`, else `user`).

## CurrentUser

```python
class CurrentUser(BaseModel):
    backendUserId: str
    role: str                          # "user" | "admin" | "superadmin"
    name: Optional[str] = None
    locations: List[Location]
    preferredLocationId: Optional[str] = None
```

Served from `GET /currentUser`; this is the single response the frontend uses for role and location
— never stored on the Better Auth session (see
[Authentication]({{ site.baseurl }}/architecture/authentication/) and
[Decisions]({{ site.baseurl }}/architecture/decisions/)). `preferredLocationId` is only populated if
the user still has access to that location — the backend filters it against `locations` before
returning it.

## SSO resolution and pending access requests

```python
class SsoResolveRequest(BaseModel):
    email: str
    name: Optional[str] = None

class SsoResolveResponse(BaseModel):
    status: Literal["resolved", "pending"]
    backendUserId: Optional[str] = None
    role: Optional[str] = None

class PendingAccessRequest(BaseModel):
    email: str
    name: Optional[str] = None
    requestedAt: str
    lastAttemptAt: str
```

An SSO sign-in from an email FastAPI doesn't recognize does **not** fail — it queues a
`PendingAccessRequest` row for a superadmin to review (see
[Authentication]({{ site.baseurl }}/architecture/authentication/) for the full flow). This model
isn't mentioned in older written summaries of this system, which described SSO resolution as a hard
404 for unprovisioned users — that's no longer accurate.

## Other request/response models

- `SetPreferredLocationRequest { locationId }` — body for `PATCH /currentUser/location`.
- `LocationUserEntry { userId }` — used when adding a user to a location.
- `CreateUserRequest { id, isAdmin, password?, name? }` — `password` present means a PIN user
  (`id` should look like a username); absent means an SSO user (`id` should look like an email).
- `UpdateUserRequest { name?, isAdmin?, isSuperAdmin? }` — PATCH semantics; the backend restricts
  which fields a caller may set based on their own role (regular admins: `name` only; superadmins:
  all three).
- `LoginRequest { username, password }` / `LoginResponse { accessToken, user: User }` — the
  `POST /auth/login` contract, consumed today only by the PIN plugin (`backendServiceFetch`), never
  by a browser.
- `CreateLocationRequest { name }`.

## Related pages

- [Authentication]({{ site.baseurl }}/architecture/authentication/) — how `CurrentUser`, `SsoResolveResponse`, and `LoginResponse` are actually used in the two sign-in flows.
- [Overview]({{ site.baseurl }}/architecture/overview/) — where these models sit in the request flow.
- [Decisions]({{ site.baseurl }}/architecture/decisions/) — why quarter-locking has no separate boolean, why role isn't a stored field.
