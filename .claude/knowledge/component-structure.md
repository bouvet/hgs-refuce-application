---
domain: component-structure
related: [frontend-architecture, auth-rbac]
---

# Component Structure — Mental Model

## components/ folder organization

- OWNS: all React components (UI, layout, business logic)
- OWNS: subdirectories: admin/, auth/, layout/, providers/, stats/, waste/, ui/
- INVARIANT: shadcn/UI components live in ui/ (pre-built, customizable)
- INVARIANT: \*-content.tsx components exported for page.tsx use
- DECIDED: single-level nesting (no deeply-nested subdirs) to keep navigation simple

## layout components

- OWNS: navigation, header, sidebar, footer shared across pages
- READS FROM: UserProvider for current user/role
- INVARIANT: consistent nav across all app/(app)/ pages
- DECIDED: layout structure in app/(app)/layout.tsx; reusable pieces imported into it

## auth components

- OWNS: RoleSelector, RoleGuard, login UI
- OWNS: role selection dropdown/menu
- READS FROM: UserProvider
- WRITES TO: UserProvider context (setRole, setUser)
- INVARIANT: RoleGuard redirects to / if user role doesn't match page requirement
- INVARIANT: RoleSelector persists choice to localStorage via UserProvider
- FLOW[role_change]: user selects role in RoleSelector → UserProvider.setRole() → localStorage update → redirect to /oversikt

## providers

- OWNS: UserProvider (role/user state), other context providers
- OWNS: localStorage sync for current-user selection (boss-app:current-user key)
- READS FROM: localStorage
- WRITES TO: React context
- INVARIANT: UserProvider wraps entire (app)/ subtree
- INVARIANT: role persists across page reloads via localStorage
- DECIDED: localStorage-only (no backend auth persistence); roles are UI-side selections

## admin components

- OWNS: rapportering-content.tsx, registrer-content.tsx, superadmin-content.tsx
- READS FROM: WasteRepository, UserProvider
- WRITES TO: WasteRepository (create/update/delete registrations, submit reports)
- INVARIANT: admin components require role=admin (enforced by RoleGuard)
- TENSION: superadmin-content.tsx likely overlaps with other admin pages; unclear separation

## waste components

- OWNS: registration forms, waste item lists, item details
- READS FROM: WasteRepository
- WRITES TO: WasteRepository (create/update/delete registrations)
- INVARIANT: tied to specific location (locationId from parent)
- FLOW[register_waste]: form input → validation → WasteRepository.createRegistration() → update UI

## stats components

- OWNS: statistics views, charts, aggregations
- READS FROM: WasteRepository for historical data
- INVARIANT: read-only (no mutations)
- TENSION: no charting library mentioned; check implementation for D3, Recharts, etc.

## UI components (shadcn/UI)

- OWNS: Button, Input, Select, Table, Modal, Toast, etc. (base-vega style)
- OWNS: Tailwind CSS styling (oklch colors in globals.css)
- INVARIANT: added via `npx shadcn@latest add <name>`
- INVARIANT: do not fork or modify; keep as thin wrappers over @base-ui/react
- DECIDED: @base-ui/react instead of Radix UI (simpler, less opinionated)

## component patterns

- OWNS: how components receive data, manage state, handle side effects
- INVARIANT: page.tsx (server) imports \*-content.tsx (client)
- INVARIANT: 'use client' directive required in client components
- INVARIANT: data passed as props from server to client (minimal hydration)
- DECIDED: separate server/client components to avoid hydration mismatches

## auth components (deleted)

- OWNS: there is no `components/auth/` folder — `role-selector.tsx`, `role-guard.tsx`, `superadmin-guard.tsx` are deleted
- OWNS: there is no `components/providers/` folder — `user-provider.tsx` is deleted
- DECIDED: **Reverses prior `RoleGuard / RoleSelector` decision.** Authentication UI is `app/login/login-form.tsx` (two-step: Microsoft SSO button + PIN form). Authorisation is server-side in RSCs via `requireRole()` from `lib/server-session.ts`.

## layout components (updated)

- READS FROM: `useCurrentUser()` (which reads the Better Auth session), NOT a context provider
- INVARIANT: logout in both `app-sidebar.tsx` and `app-header.tsx` calls `authClient.signOut({ fetchOptions: { onSuccess: () => { router.replace("/login"); router.refresh(); } } })` — router.refresh() is required so the new (logged-out) session is picked up by RSCs
- INVARIANT: role-aware filtering uses `user?.role === "admin" || user?.role === "superadmin"`, NOT `user?.isAdmin` or `user?.isSuperAdmin` (those fields no longer exist)
- DECIDED: **Reverses prior `setUser/setLocationId` mutation pattern.** Components only read from `useCurrentUser()`; mutations go through `authClient` or server actions.

## hooks

- OWNS: `frontend/hooks/use-current-user.ts` — wraps `authClient.useSession()` and returns `{ user, locationId, isPending }` where `user.id` is the **backend** user id, not the BA uuid
- OWNS: `hooks/use-reports.ts`, `hooks/use-waste-registrations.ts` — read `{ user, locationId }` from `useCurrentUser()` (not from a context)
- INVARIANT: hooks are the only client-side bridge to session state; do not call `authClient.useSession()` directly in components
- DECIDED: keeping the `useCurrentUser` export name minimises diff churn across the existing 9 callers despite the underlying implementation change.
