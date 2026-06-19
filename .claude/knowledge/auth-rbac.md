---
domain: auth-rbac
related: [backend-api, database-layer, component-structure]
---

# Authentication & RBAC — Mental Model

## roles

- OWNS: two roles: `admin` and `common`
- INVARIANT: admin can access all admin pages + regular pages
- INVARIANT: common can access only regular pages (registrations, reports)
- DECIDED: simple two-tier RBAC; extend if needed

## authentication flow

- OWNS: frontend login (UserProvider), backend validation (models.User)
- READS FROM: email + password from login form
- WRITES TO: UserProvider.setUser() + localStorage
- INVARIANT: no persistent session tokens; user state ephemeral (lost on browser close without localStorage)
- INVARIANT: each request to backend carries no explicit auth header (backend trusts frontend role claim)
- FLOW[login]: frontend RoleSelector → POST /auth/login(email, password) → backend validates → returns User → frontend stores in UserProvider + localStorage
- TENSION: frontend trust model: backend accepts role from UserProvider without verification; only safe for internal/trusted users
- DECIDED: no token-based session (uncommon but intentional for this use case)

## authorization

- OWNS: RoleGuard component (frontend), role checks in backend endpoints
- READS FROM: UserProvider.role for frontend, User.role for backend
- INVARIANT: page-level RoleGuard redirects if user.role not in required array
- INVARIANT: backend endpoints check user.role (e.g. super-admin for /admin/*)
- FLOW[access_control]: user navigates → page.tsx renders RoleGuard → RoleGuard checks UserProvider.role → if mismatch, redirect to /
- TENSION: frontend RoleGuard can be bypassed by dev tools (but localStorage is source of truth for UX)

## UserProvider

- OWNS: React context storing current user + role
- OWNS: localStorage persistence (boss-app:current-user key)
- READS FROM: localStorage at app startup
- WRITES TO: context + localStorage on role/user changes
- INVARIANT: role is string: `admin` or `common`
- INVARIANT: user object has at least { email, role }
- INVARIANT: RoleSelector updates both context and localStorage
- DECIDED: persist entire user object to localStorage for quick restore on reload

## backend role enforcement

- OWNS: role validation in endpoint handlers
- INVARIANT: /admin/* requires role=admin or special ADMIN_SECRET header
- INVARIANT: other endpoints check location ownership (user must be assigned to location)
- TENSION: no JWT or session token; backend must trust Authorization header or infer from request context (clarify mechanism)

## super-admin operations

- OWNS: /admin/locations, /admin/users endpoints (developer-only)
- READS FROM: ADMIN_SECRET env var
- WRITES TO: direct Location/User database writes
- INVARIANT: requires exact ADMIN_SECRET header match
- INVARIANT: bypass normal role checks (full database access)
- DECIDED: admin endpoints exist for local development; never expose in production
