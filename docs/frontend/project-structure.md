---
layout: default
parent: Frontend
title: Project structure
nav_order: 1
---

# Project structure

`frontend/` is a Next.js 16 App Router project. Authenticated pages live under the route group
`app/(app)/`; a couple of public routes (`/login`, `/select-location`) sit outside it.

## Routes under `app/(app)/`

```
frontend/app/(app)/
  layout.tsx           # requireSession(), redirects to /select-location, seeds SessionProvider
  oversikt/page.tsx      # admin/superadmin dashboard
  statistikk/page.tsx    # admin/superadmin statistics
  historikk/page.tsx     # history view
  registrer/page.tsx     # waste registration form (all roles)
  registreringer/page.tsx # registrations list (admin/superadmin)
  rapportering/page.tsx  # quarterly report submission (admin/superadmin)
  sadmin/page.tsx         # superadmin-only: location/user provisioning
```

`app/(app)/layout.tsx` is a server component. It calls `requireSession()` (redirecting to `/login`
if there's no session), fetches the backend's view of the user via `getCurrentUser()`, and
redirects to `/select-location` if there's no `preferredLocationId` yet. If both checks pass, it
seeds a read-only `SessionProvider` from the backend response and renders the shared chrome
(`AppSidebar`, and on small screens `AppHeader` + `AppNav`) around `{children}`.

```tsx
// frontend/app/(app)/layout.tsx
const session = await requireSession();
const currentUser = await getCurrentUser(getBackendUserId(session.user));
if (!currentUser?.preferredLocationId) {
  redirect("/select-location");
}
```

## The `page.tsx` → `*-content.tsx` pattern

Each route's `page.tsx` is a server component whose only real job is authorization plus importing
a client component that does the actual rendering/interactivity. The client component is named
`*-content.tsx`, but — unlike a same-folder convention — it is **not** colocated next to
`page.tsx`; it lives under `frontend/components/<domain>/`. For example:

```tsx
// frontend/app/(app)/oversikt/page.tsx
import { DashboardContent } from "@/components/stats/dashboard-content";
import { requireRole } from "@/lib/server-session";

export default async function OversiktPage() {
  await requireRole(["admin", "superadmin"]);
  return (
    <div className="flex flex-col gap-4">
      <DashboardContent />
    </div>
  );
}
```

```tsx
// frontend/app/(app)/sadmin/page.tsx
import { SuperAdminContent } from "@/components/admin/superadmin-content";
import { requireRole } from "@/lib/server-session";

export default async function SuperAdminPage() {
  await requireRole("superadmin");
  return <SuperAdminContent />;
}
```

Other examples of the pairing: `registrer/page.tsx` → `components/admin/registrer-content.tsx`
(desktop week-grid view) and `components/waste/registration-form.tsx` (mobile single-day form,
loaded in a `<Suspense>` boundary). Not every admin page repeats the `requireRole` call in exactly
the same spot, but the rule from `.claude/knowledge/auth-rbac.md` holds throughout: **every**
admin-only page gates itself server-side with `requireRole(...)` rather than relying solely on the
layout's `requireSession()` — a plain `user`-role session must not be able to reach an admin page
just because it's under `app/(app)/`.

For the authorization model in detail — roles, where `requireSession`/`requireRole` live, and why
`proxy.ts` is not the security boundary — see [Auth]({{ site.baseurl }}/frontend/auth/) and
[Authentication]({{ site.baseurl }}/architecture/authentication/).

## Public routes outside `app/(app)/`

- `app/login/` — RSC `page.tsx` + client `login-form.tsx` (Microsoft SSO button + username/PIN
  form). The only route in `proxy.ts`'s `PUBLIC_ROUTES` list.
- `app/select-location/` — RSC `page.tsx`, server actions in `actions.ts`
  (`setCurrentLocation(locationId)`), and a client `location-picker.tsx`. Requires a session but
  tolerates a user with no `preferredLocationId` yet — that's the page's whole purpose.
- `app/api/[...path]/route.ts` — the authenticated reverse-proxy to FastAPI (see
  [Data layer]({{ site.baseurl }}/frontend/data-layer/)).
- `app/api/auth/[...all]/route.ts` — Better Auth's own catch-all handler.
- `app/page.tsx` — a pure RSC redirect: no session → `/login`; no location → `/select-location`;
  otherwise routes to a role-appropriate default (`/registrer` for `user`, `/oversikt` for
  `admin`/`superadmin`).
