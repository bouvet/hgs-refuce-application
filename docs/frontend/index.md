---
title: Frontend
layout: default
nav_order: 5
has_children: true
---

# Frontend

Next.js 16, TypeScript, Tailwind CSS v4, shadcn/UI, Better Auth.

| Page | Covers |
| --- | --- |
| [Project structure]({{ site.baseurl }}/frontend/project-structure/) | `app/(app)/` routes, the `page.tsx` → `*-content.tsx` pattern |
| [Auth]({{ site.baseurl }}/frontend/auth/) | `requireSession()`/`requireRole()`, `proxy.ts` is optimistic only |
| [Data layer]({{ site.baseurl }}/frontend/data-layer/) | `WasteRepository`, `BackendWasteRepository`, the `/api/[...path]` proxy |
| [UI and styling]({{ site.baseurl }}/frontend/ui-and-styling/) | Tailwind v4 in `globals.css`, shadcn `base-vega` / `@base-ui/react` |

For how sign-in and roles actually work end to end (Entra SSO, PIN login, HMAC identity header), see
[Architecture → Authentication]({{ site.baseurl }}/architecture/authentication/) — this section
covers the frontend-specific pieces only.
