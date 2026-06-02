---
description: Add a shadcn/UI component to the project
argument-hint: <component-name>
---

Add the shadcn/UI component `$ARGUMENTS` to this project.

## Project context

- shadcn style: **base-vega** — uses `@base-ui/react`, NOT Radix UI
- Components install to: `@/components/ui/`
- Class utility: `cn()` from `@/lib/utils`
- Icons: `lucide-react`
- Framework: Next.js 16 App Router with React 19 and Tailwind CSS v4

## Steps

1. **Install the component** by running:
   ```bash
   npx shadcn@latest add $ARGUMENTS
   ```
   If `$ARGUMENTS` is empty, ask the user which component they want to add.

2. **Read the generated file(s)** in `@/components/ui/` to understand the component's props and variants before using it.

3. **Show the user** a minimal, correct usage example in a Server Component (default) unless the component requires interactivity (event handlers, state, effects) — in that case mark it `'use client'` and explain why.

4. **Usage rules to follow:**
   - Merge classes with `cn()` — never concatenate strings with Tailwind classes directly
   - Use CSS variable-based color tokens (`bg-primary`, `text-muted-foreground`, etc.) rather than raw colors
   - `ref` is a plain prop in React 19 — no `forwardRef` needed when building wrappers
   - Destructure `className` and spread remaining props for composability

5. **If the component doesn't exist** in the shadcn registry, tell the user and offer to build a custom component from scratch following the same conventions (base HTML elements, `cn()`, CSS variables, TypeScript props interface).
