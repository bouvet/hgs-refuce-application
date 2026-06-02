# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

@AGENTS.md

## Commands

```bash
npm run dev      # Start dev server (Turbopack, localhost:3000)
npm run build    # Production build (Turbopack)
npm run start    # Start production server
npm run lint     # Run ESLint
```

> `next build` no longer runs the linter automatically (changed in Next.js 16).

## Architecture

This is a **Next.js 16** App Router project with TypeScript, Tailwind CSS v4, shadcn/UI (base-vega), and Turbopack.

- **Routing**: File-system routing under `app/`. Pages are `page.tsx`, layouts are `layout.tsx`.
- **Bundler**: Turbopack is the default in Next.js 16 (no flag needed). Use `--webpack` to opt out.
- **Styling**: Tailwind CSS v4 via `@tailwindcss/postcss`. No `tailwind.config.*` — config lives in `app/globals.css`.
- **Components**: shadcn/UI in `@/components/ui/`. Utility: `cn()` from `@/lib/utils`.
- **Import alias**: `@/*` resolves to the project root.

## Server vs Client Components

Follow the Next.js App Router default: **components are server components unless they need client features.**

- **Pages (`page.tsx`) and layouts (`layout.tsx`)** should always be server components. They render static content (headings, layout wrappers) and compose client components for interactive parts.
- Only add `"use client"` when the component itself uses: hooks, event handlers (`onClick`, `onChange`), browser APIs (`localStorage`, `window`), or client-only libraries (Recharts, etc.).
- A server component CAN import and render client components — the client component runs on the client, while the static content around it is server-rendered.
- If a page needs interactivity, extract the interactive part into a separate client component in `components/` and import it from the server component page.

## Tailwind CSS v4

v4 is a major rewrite — do not apply v3 patterns.

- **No config file.** All configuration is in `app/globals.css` via `@theme inline { ... }`.
- **Imports** replace the old directives:
  ```css
  @import "tailwindcss";
  @import "tw-animate-css";
  @import "shadcn/tailwind.css";
  ```
- **Colors** use oklch: `oklch(0.205 0 0)`. All design tokens are CSS variables mapped in `@theme inline`.
- **Dark mode** via `@custom-variant dark (&:is(.dark *))` — toggled by adding `.dark` class to the tree.
- **Animations** come from `tw-animate-css` (imported above), not a Tailwind plugin.

## shadcn/UI

- **Style**: `base-vega` — uses `@base-ui/react` primitives, **not** Radix UI. Do not install or import `@radix-ui/*`.
- **Add a component**: `npx shadcn@latest add <component-name>` — files land in `@/components/ui/`.
- **Theme**: CSS variables in `globals.css` (`:root` / `.dark`). Modify colors there, not inline.
- **Icons**: `lucide-react`.
- **Utility**: always use `cn()` from `@/lib/utils` to merge Tailwind classes conditionally.

## useEffect — only when necessary

Before writing a `useEffect`, ask: *why does this code need to run?*

- **"Because the user did something"** → use an event handler, not an Effect.
- **"Because of other state/props"** → compute during render (or `useMemo`), not an Effect.
- **"Because the component is displayed / syncing with an external system"** → Effect is correct.

**Never do these in an Effect:**

```tsx
// ❌ Derived state — compute directly during render
const [fullName, setFullName] = useState('')
useEffect(() => { setFullName(first + ' ' + last) }, [first, last])
// ✅
const fullName = first + ' ' + last

// ❌ Event-driven logic — put it in the event handler
useEffect(() => {
  if (submitted) sendForm(data)
}, [submitted])
// ✅
function handleSubmit() { sendForm(data) }

// ❌ Resetting state on prop change — use key instead
useEffect(() => { setComment('') }, [userId])
// ✅
<Profile key={userId} userId={userId} />

// ❌ Subscribing to an external store
useEffect(() => {
  const raw = localStorage.getItem(KEY)
  setState(JSON.parse(raw))
}, [])
// ✅ useSyncExternalStore(subscribe, getSnapshot, getServerSnapshot)
```

**Effects are valid for:** keeping third-party widgets in sync, subscribing to browser events, data fetching with cleanup, sending analytics on mount.

Calling `setState` synchronously inside an Effect body causes cascading renders. If you find yourself doing it, the code almost certainly belongs somewhere else.

## React 19

React 19 removes and replaces several patterns. Do not use the old ones.

| Old | New |
|-----|-----|
| `forwardRef(fn)` | `ref` is a plain prop — just destructure it |
| `<Context.Provider value={...}>` | `<Context value={...}>` |
| `useFormState` (react-dom) | `useActionState(action, initialState)` |
| `ReactDOM.render` | `createRoot(el).render(...)` |
| `propTypes` / `defaultProps` on function components | TypeScript types + default parameters |

**New hooks:**
- `use(promise)` / `use(Context)` — read async resources or context in render
- `useActionState(action, initialState)` — manage form action state
- `useFormStatus()` — inside a `<form>`, reads pending/data/method
- `useOptimistic(state, updateFn)` — optimistic UI updates

**Document metadata** (`<title>`, `<meta>`, `<link>`) can be rendered anywhere in the component tree — React lifts them to `<head>` automatically.

## Next.js 16 Breaking Changes

These are commonly misused — check `node_modules/next/dist/docs/` for the full reference.

### Async Request APIs (breaking)
`cookies()`, `headers()`, `draftMode()`, `params`, and `searchParams` are now **async only** — synchronous access was removed. Always `await` them:

```tsx
export default async function Page(props: PageProps<'/blog/[slug]'>) {
  const { slug } = await props.params
  const query = await props.searchParams
}
```

Run `npx next typegen` to generate `PageProps`, `LayoutProps`, and `RouteContext` helpers.

### `middleware` renamed to `proxy`
The `middleware.ts` file and its named export are deprecated. Use `proxy.ts` with a `proxy` export instead. The `edge` runtime is **not** supported in `proxy` (use `nodejs`). Config flag `skipMiddlewareUrlNormalize` → `skipProxyUrlNormalize`.

### Caching APIs
- `revalidateTag` now requires a second `cacheLife` profile argument: `revalidateTag('posts', 'max')`
- `cacheLife` and `cacheTag` are stable — drop the `unstable_` prefix
- New: `updateTag` (Server Actions only) for read-your-writes semantics
- New: `refresh()` from `next/cache` to refresh the client router from a Server Action

### Partial Prerendering
PPR is now opt-in via `cacheComponents: true` in `next.config.ts` (replaces the `experimental.ppr` flag).

### `next/image` defaults changed
- `minimumCacheTTL`: `60s` → `14400s` (4 hours)
- `imageSizes`: `16` removed from default array
- `qualities`: now defaults to `[75]` only
- Local images with query strings require `images.localPatterns.search` config
