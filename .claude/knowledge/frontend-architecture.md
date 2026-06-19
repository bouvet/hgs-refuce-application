---
domain: frontend-architecture
related: [auth-rbac, data-repository, component-structure]
---

# Frontend Architecture — Mental Model

## routing structure

- OWNS: Next.js 16 App Router with Turbopack
- OWNS: public routes (/, debug) vs protected routes under app/(app)/
- OWNS: page.tsx as server components, *-content.tsx as client components
- READS FROM: filesystem routing (files define routes)
- INVARIANT: all authenticated pages live under app/(app)/ with RoleGuard wrapper
- INVARIANT: page.tsx imports and renders a single *-content.tsx client component
- INVARIANT: (app)/layout.tsx wraps all protected routes with UserProvider and RoleGuard
- FLOW[page_load]: user navigates → page.tsx (server) → imports *-content → RoleGuard validates role → renders ClientComponent
- DECIDED: server components for routing/auth, client components for interactivity (minimize hydration)
- TENSION: passing large data from server to client page component can inflate JS bundle; keep data layer minimal

## pages

- OWNS: `/` (landing/role selector), `/debug` (dev-only), and protected routes
- OWNS: oversikt (overview), statistikk (stats), historikk (history), registrer (register), registreringer (registrations list), rapportering (reporting admin), sadmin (super-admin)
- READS FROM: WasteRepository for data, UserProvider for auth state
- INVARIANT: each page has page.tsx + *-content.tsx pair
- INVARIANT: /debug accessible without auth (dev helper)
- FLOW[landing]: load app/page.tsx → render RoleSelector → persist role to localStorage → redirect to /oversikt
- FLOW[protected_page]: load page under (app)/ → RoleGuard checks UserProvider.role → if no match, redirect to /
- DECIDED: RoleGuard redirects instead of 404; clearer UX for unauthorized users

## layouts

- OWNS: app/layout.tsx (root) and app/(app)/layout.tsx (protected)
- OWNS: global CSS, providers setup, navigation structure
- READS FROM: Providers (UserProvider, others)
- WRITES TO: DOM via React context
- INVARIANT: root layout includes globals.css (Tailwind v4 + oklch colors)
- INVARIANT: (app)/layout wraps content with UserProvider + RoleGuard
- INVARIANT: common components (nav, sidebar) rendered at layout level (shared across routes)
- FLOW[load_app]: browser → app/layout.tsx → Providers → (app)/layout → RoleGuard → page.tsx

## environment variables

- OWNS: NEXT_PUBLIC_API_URL (backend URL, defaults to http://localhost:8000)
- READS FROM: .env.local at build time
- INVARIANT: NEXT_PUBLIC_* only; no secret env vars in frontend
- INVARIANT: defaults to localhost:8000 if not set
- DECIDED: backend URL configurable for multi-environment deploys

## build and dev

- OWNS: next dev (Turbopack), next build, npm scripts
- INVARIANT: TypeScript strict mode enabled (check tsconfig.json)
- INVARIANT: ESLint runs via npm run lint
- DECIDED: Turbopack for fast dev rebuilds
