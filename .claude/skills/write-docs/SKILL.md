---
name: write-docs
description: Author or update a page on the docs/ Jekyll site (just-the-docs). Use when adding documentation for a new feature, correcting a stale page, or filling a gap the user points out.
---

# Write Docs

The site lives under `docs/` (Jekyll + just-the-docs, published by GitHub Pages branch-source
build of `main` + `/docs`). Five sections have `has_children: true`: Getting Started,
Architecture, Backend, Frontend, Deployment, plus a standalone `contributing.md`.

## Steps

1. **Identify the target section.** Pick one of the five `has_children: true` sections, or
   `docs/contributing.md` if it's process documentation about the docs themselves.

2. **Read before writing — never write from memory.** Read the `.claude/knowledge/*.md` file(s)
   covering the affected domain (per the root `CLAUDE.md` read gate), then read the actual source
   files the page will describe (route decorators in `main.py`, the real component/hook, the real
   env var name). Knowledge files can be stale — the code is the final authority. If you find a
   knowledge file disagrees with the code, fix the knowledge file too (write gate).

3. **Check whether an existing page already covers this** before creating a new one — grep
   `docs/**/*.md` for the topic. Prefer extending an existing page over fragmenting the same
   subject across two files.

4. **Write with correct front matter:**

   ```markdown
   ---
   title: Page Title
   layout: default
   parent: Backend
   nav_order: 3
   ---
   ```

   `parent` MUST match the `title:` of an existing section page that has `has_children: true`
   exactly (case-sensitive) — otherwise the page silently drops out of the sidebar nesting.
   Pick `nav_order` by looking at the sibling pages already under that parent (`grep -l "parent:
   <Section>" docs/<section>/*.md` and check their `nav_order` values) and slot in accordingly;
   don't collide with an existing value unless you're deliberately reordering.

5. **Use `{{ site.baseurl }}` for every internal link** — `docs/_config.yml` sets
   `baseurl: /hgs-refuce-application`, so a bare relative link (`../backend/`) or root-relative
   link (`/backend/`) will 404 once the site is built. Cross-check any link you write actually
   resolves to a real page path.

6. **Cross-link related pages** — architecture pages to the backend/frontend pages that implement
   the decision, getting-started pages to the architecture page that explains why, etc.

7. **State facts with file paths** (`frontend/lib/server-session.ts`, `main.py:314`) so a reader
   can independently verify every claim instead of trusting the prose.

8. **Finish by checking the write gate.** If writing this page surfaced a new invariant,
   state-ownership fact, data-flow edge, design decision, or tension not already captured in
   `.claude/knowledge/`, add it there using the structured notation (OWNS / READS FROM / WRITES TO
   / INVARIANT / FLOW / TENSION / DECIDED) before finishing the task.
