---
domain: frontend-architecture
related: [auth-rbac, data-repository, component-structure]
---

# Frontend Architecture — Mental Model

## routing structure

- OWNS: Next.js 16 App Router with Turbopack
- OWNS: public routes (/, debug) vs protected routes under app/(app)/
- OWNS: page.tsx as server components, \*-content.tsx as client components
- READS FROM: filesystem routing (files define routes)
- INVARIANT: all authenticated pages live under app/(app)/ with RoleGuard wrapper
- INVARIANT: page.tsx imports and renders a single \*-content.tsx client component
- INVARIANT: (app)/layout.tsx wraps all protected routes with UserProvider and RoleGuard
- FLOW[page_load]: user navigates → page.tsx (server) → imports \*-content → RoleGuard validates role → renders ClientComponent
- DECIDED: server components for routing/auth, client components for interactivity (minimize hydration)
- TENSION: passing large data from server to client page component can inflate JS bundle; keep data layer minimal

## pages

- OWNS: `/` (landing/role selector), `/debug` (dev-only), and protected routes
- OWNS: oversikt (overview), statistikk (stats), historikk (history), registrer (register), registreringer (registrations list), rapportering (reporting admin), sadmin (super-admin)
- READS FROM: WasteRepository for data, UserProvider for auth state
- INVARIANT: each page has page.tsx + \*-content.tsx pair
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
- INVARIANT: NEXT*PUBLIC*\* only; no secret env vars in frontend
- INVARIANT: defaults to localhost:8000 if not set
- DECIDED: backend URL configurable for multi-environment deploys

## build and dev

- OWNS: next dev (Turbopack), next build, npm scripts
- INVARIANT: TypeScript strict mode enabled (check tsconfig.json)
- INVARIANT: ESLint runs via npm run lint
- DECIDED: Turbopack for fast dev rebuilds

## proxy.ts (Next.js 16)

- OWNS: `frontend/proxy.ts` — the Next 16 successor to `middleware.ts`
- READS FROM: Better Auth cookie cache via `getSessionCookie(request, { cookiePrefix: "avfall" })`
- WRITES TO: 307 redirects to `/login?redirect=...` for unauthenticated routes
- INVARIANT: **optimistic only** — see Next.js 16 proxy docs; cookie presence proves nothing about validity. Real auth lives in `getServerSession()` checks inside RSCs and `app/api/[...path]/route.ts`.
- INVARIANT: matcher excludes `/api/auth/*`, `/api/*` (the route handler does its own check), `_next/static`, `_next/image`, `favicon`, and common asset extensions
- INVARIANT: public routes set: `["/login"]`
- DECIDED: **Reverses prior `middleware.ts` filename.** Next.js 16 renamed the file and its named export to `proxy`; `edge` runtime is not supported (use `nodejs`).

## routes added

- OWNS: `/login` (RSC `page.tsx` + client `login-form.tsx`)
- OWNS: `/select-location` (RSC `page.tsx` + server actions `actions.ts` + client `location-picker.tsx`)
- OWNS: `/api/auth/[...all]` — Better Auth catch-all (`toNextJsHandler(auth)`)
- INVARIANT: `/login` is the only public route; everything else assumes a session
- INVARIANT: `/select-location` requires a session but tolerates missing `currentLocationId` (that is the whole point)

## pages (updated)

- DECIDED: **Reverses prior `each page has page.tsx + *-content.tsx pair` for landing.** `app/page.tsx` is now a pure RSC redirect (no content component). Same for `app/(app)/sadmin/page.tsx` — the guard is `await requireRole("superadmin")` then `<SuperAdminContent />` directly.
- DECIDED: **Reverses prior `RoleGuard wrapper` pattern on `(app)/layout.tsx`.** The layout now calls `requireSession()` and redirects to `/select-location` if `currentLocationId` is null.

## environment variables (updated)

- OWNS: `BETTER_AUTH_URL`, `BETTER_AUTH_SECRET`, `DATABASE_URL` (Postgres for Better Auth), `BACKEND_API_URL`, `BACKEND_SHARED_SECRET`, `MICROSOFT_CLIENT_ID`, `MICROSOFT_CLIENT_SECRET`, `MICROSOFT_TENANT_ID`
- INVARIANT: server-side secrets (no `NEXT_PUBLIC_` prefix); accessed via `lib/auth-env.ts` helpers `required()` / `optional()` which throw lazily on missing required vars
- INVARIANT: `NEXT_PUBLIC_API_URL` is gone — the browser only ever calls `/api/*`; the backend URL is server-side only
- DECIDED: **Reverses prior `NEXT_PUBLIC_API_URL` decision.** Exposing the backend URL to the browser is unnecessary now that the proxy handles every backend call; removing it lets us add HMAC headers without leaking the secret.
