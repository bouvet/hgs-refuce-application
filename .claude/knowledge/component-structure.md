---
domain: component-structure
related: [frontend-architecture, auth-rbac]
---

# Component Structure — Mental Model

## components/ folder organization

- OWNS: all React components (UI, layout, business logic)
- OWNS: subdirectories: admin/, auth/, layout/, providers/, stats/, waste/, ui/
- INVARIANT: shadcn/UI components live in ui/ (pre-built, customizable)
- INVARIANT: *-content.tsx components exported for page.tsx use
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
- INVARIANT: page.tsx (server) imports *-content.tsx (client)
- INVARIANT: 'use client' directive required in client components
- INVARIANT: data passed as props from server to client (minimal hydration)
- DECIDED: separate server/client components to avoid hydration mismatches
