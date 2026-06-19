---
applyTo: frontend/app/**/*.tsx,frontend/components/**/*.tsx,frontend/lib/**/*.ts
---

# TypeScript & React Components

## Guidelines

- Use `'use client'` at the top of client components (required for Next.js 16 App Router)
- Server components (page.tsx) import and render client components (*-content.tsx)
- Props passed from server to client should be serializable (no functions, classes)
- Use TypeScript strict mode; avoid `any`
- Prefer const arrow functions over function declarations for consistency

## Imports

- Absolute imports: `import { WasteRepository } from '@/lib/data/...'` (configured in tsconfig.json)
- Group imports: React/Next.js → external libs → local imports
- No default exports for components (named exports only for clarity)

## State Management

- Use React hooks (useState, useContext, useEffect)
- Singleton repository accessed via import, not prop drilling
- UserProvider for auth state (role, user info)
- No global store; keep state as local as possible

## Styling

- Tailwind CSS classes only (no inline styles, no CSS modules)
- oklch color palette in globals.css
- Use shadcn/UI components from components/ui/ for consistency
