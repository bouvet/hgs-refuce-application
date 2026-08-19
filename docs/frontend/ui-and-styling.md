---
layout: default
parent: Frontend
title: UI and styling
nav_order: 4
---

# UI and styling

## Tailwind CSS v4 — no config file

The frontend uses Tailwind CSS v4, which is a rewrite from v3: there is **no**
`tailwind.config.*` file. All configuration lives directly in
[`frontend/app/globals.css`](https://github.com/bouvet/hgs-refuce-application/blob/main/frontend/app/globals.css)
(321 lines), via imports and an `@theme inline { ... }` block:

```css
@import "tailwindcss";
@import "tw-animate-css";
@import "shadcn/tailwind.css";

@custom-variant dark (&:is(.dark *));
```

- `tw-animate-css` supplies animation utilities that used to come from a Tailwind plugin in v3.
- Dark mode is a custom variant keyed off a `.dark` class on an ancestor element (`.dark *`),
  not the `media` strategy.
- The `@theme inline { --color-background: var(--background); ... }` block (starting around line
  123) maps every design token — colors, chart colors, sidebar colors, fonts, shadows, radius — to
  a Tailwind utility name, backed by a plain CSS custom property defined in `:root` and overridden
  under a `.dark { ... }` block further down the same file, using the same variable names.

## oklch colors

Every color token in `:root` is defined in the `oklch()` color space rather than hex/rgb, e.g.:

```css
:root {
  --background: oklch(0.9711 0.0074 80.7211);
  --primary: oklch(0.5234 0.1347 144.1672);
  --destructive: oklch(0.5386 0.1937 26.7249);
  --chart-1: oklch(0.6731 0.1624 144.2083);
  /* ... */
}
```

`--chart-1` through `--chart-5` back the statistics/dashboard charts; `--sidebar*` tokens theme
the app sidebar independently from the main content background. To change a color, edit the
variable in `globals.css` — never hardcode a hex value inline in a component.

## shadcn/UI — `base-vega` style on `@base-ui/react`

Components in `frontend/components/ui/` (`button.tsx`, `input.tsx`, `select.tsx`, `dialog.tsx`,
`sheet.tsx`, `table.tsx`, `tabs.tsx`, `card.tsx`, `calendar.tsx`, `popover.tsx`, `label.tsx`,
`badge.tsx`, `separator.tsx`, `skeleton.tsx`, `sonner.tsx`, `chart.tsx`, and others) are generated
by shadcn's `base-vega` style, which wraps **`@base-ui/react`** primitives — explicitly **not**
Radix UI. For example, `button.tsx` imports its primitive directly from base-ui:

```tsx
// frontend/components/ui/button.tsx
import { Button as ButtonPrimitive } from "@base-ui/react/button"
import { cva, type VariantProps } from "class-variance-authority"
import { cn } from "@/lib/utils"
```

Variants (`default`, `outline`, `secondary`, `ghost`, `destructive`, `link`) and sizes (`default`,
`xs`, `sm`, `lg`, `icon`, `icon-xs`, `icon-sm`, `icon-lg`) are defined with `class-variance-authority`
(`cva`), and class merging always goes through the shared `cn()` helper from `lib/utils`. Do not
install or import `@radix-ui/*` packages — it does not match this project's primitive layer.

### Adding a new component

```bash
npx shadcn@latest add <component-name>
```

This drops the generated file straight into `frontend/components/ui/`. Treat these as thin,
mostly-generated wrappers — don't fork significant custom behavior into them; put
domain-specific logic in a component under `frontend/components/<domain>/` that composes the
primitive instead.

## Where things live

- `components/ui/` — shadcn primitives (as above).
- `components/layout/` — `app-sidebar.tsx`, `app-header.tsx`, `app-nav.tsx` (shared chrome, see
  [Project structure]({{ site.baseurl }}/frontend/project-structure/)).
- `components/admin/`, `components/waste/`, `components/stats/` — the `*-content.tsx` client
  components each `page.tsx` imports, plus domain-specific pieces like `registration-form.tsx`.
- `components/providers/session-provider.tsx` — the read-only session context seeded by
  `app/(app)/layout.tsx` (see [Auth]({{ site.baseurl }}/frontend/auth/)).

Icons come from `lucide-react` throughout.
