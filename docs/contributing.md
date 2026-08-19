---
title: Contributing
layout: default
nav_order: 7
---

# Contributing to these docs

This site is a Jekyll + [just-the-docs](https://just-the-docs.com/) site under `docs/`, published by
GitHub Pages ("Deploy from a branch", `main` / `/docs`). There is no build workflow file — GitHub's
own implicit `pages-build-deployment` run handles it. See [CI/CD]({{ site.baseurl }}/deployment/ci-cd/).

{: .important }
> The site only builds from `main`. Nothing you write here is visible on the live site until your
> branch merges.

## Adding a page

1. Create a `.md` file under the relevant section directory (`getting-started/`, `architecture/`,
   `backend/`, `frontend/`, `deployment/`), or at the top level of `docs/` for a new section.
2. Give it front matter:

   ```yaml
   ---
   title: My Page
   layout: default
   parent: Backend
   nav_order: 5
   ---
   ```

   `parent` must exactly match the `title:` of an existing page that has `has_children: true` — the
   five sections (`Getting Started`, `Architecture`, `Backend`, `Frontend`, `Deployment`) all do.
   Pick `nav_order` based on where it should sit among its siblings; just-the-docs sorts by this
   field within a parent.
3. Use `{{ site.baseurl }}` (or a Jekyll {% raw %}`{% link %}`{% endraw %} tag) for every internal link — bare relative
   paths like `../backend/` break once `baseurl` is set. See `docs/_config.yml`'s `baseurl:
   "/hgs-refuce-application"`.
4. Cross-link related pages, and cite file paths (e.g. `backend_fast_api/src/hgs_refuce_app/main.py`)
   for factual claims so they stay verifiable against the code.
5. If you're documenting something not already captured in `.claude/knowledge/`, add it there too —
   see [Knowledge base gates](#knowledge-base-gates) below.

The [`write-docs`](https://github.com/bouvet/hgs-refuce-application/blob/main/.claude/skills/write-docs/SKILL.md)
Claude Code skill automates this workflow end to end.

## Previewing locally

Requires Ruby + Bundler.

```bash
cd docs
bundle install
bundle exec jekyll serve --baseurl /hgs-refuce-application
# http://localhost:4000/hgs-refuce-application/
```

Passing `--baseurl` explicitly matches what production serves at, so asset paths, search, and
internal links resolve the same way locally as they do on
[bouvet.github.io/hgs-refuce-application](https://bouvet.github.io/hgs-refuce-application/). Check
the browser console for 404s and confirm the left nav shows all five sections with their children.

## Regenerating the API reference

`docs/backend/api-reference.md`, `docs/backend/openapi.json`, and `docs/backend/api-explorer.html`
are generated, never hand-edited — see [`scripts/gen_openapi_docs.py`](https://github.com/bouvet/hgs-refuce-application/blob/main/scripts/gen_openapi_docs.py):

```bash
# from backend_fast_api/, with the venv activated
python ../scripts/gen_openapi_docs.py
```

The [`update-api-reference`](https://github.com/bouvet/hgs-refuce-application/blob/main/.claude/skills/update-api-reference/SKILL.md)
skill runs this and summarizes what changed.

## Knowledge base gates

This repo also maintains `.claude/knowledge/*.md` — a structured, externalized mental model of *why*
the code is shaped the way it is (state ownership, invariants, decisions), separate from this
user-facing docs site. Root `CLAUDE.md` defines two gates:

- **Read gate** — before editing backend/frontend source or making a non-trivial change, read the
  knowledge files covering that domain first.
- **Write gate** — after discovering a new invariant, decision, or data-flow edge, add it to the
  right knowledge file using the `OWNS` / `READS FROM` / `WRITES TO` / `INVARIANT` / `FLOW` /
  `TENSION` / `DECIDED` notation.

Writing a docs page and updating the knowledge base are different jobs: docs explain the system to a
human reader; the knowledge base is Claude's own working notes for staying consistent across
sessions. A non-trivial docs change often means both need updating — the
[`docs-audit`](https://github.com/bouvet/hgs-refuce-application/blob/main/.claude/skills/docs-audit/SKILL.md)
skill checks the docs site for drift against the code; run `/retrospective` to check the knowledge
base.
