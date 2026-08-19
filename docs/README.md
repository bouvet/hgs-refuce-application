# Documentation site

This folder is a Jekyll site (theme: [just-the-docs](https://just-the-docs.com/)) published via
GitHub Pages.

## Pages configuration (confirmed)

GitHub Pages is enabled with **source: "Deploy from a branch"** → branch `main`, folder **/docs**
(Settings → Pages → Build and deployment). There is no workflow file for this — the Actions tab
shows GitHub's own implicit `pages-build-deployment` run on every push to `main` that touches
`docs/`. See [Deployment → CI/CD](https://bouvet.github.io/hgs-refuce-application/deployment/ci-cd/).

The site is published at **https://bouvet.github.io/hgs-refuce-application/**.

{: .important }
> The branch source only builds `main`. Changes on any other branch — including this one before
> it merges — are not live.

## Preview locally

Requires Ruby + Bundler.

```bash
cd docs
bundle install
bundle exec jekyll serve --baseurl /hgs-refuce-application
# http://localhost:4000/hgs-refuce-application/
```

Pass `--baseurl` explicitly so local paths match production (`docs/_config.yml` sets
`baseurl: "/hgs-refuce-application"` — omitting the flag serves correctly but some editors/tools
expect it passed at the CLI too).

## Adding a page

Create a `.md` file with front matter, e.g.:

```markdown
---
title: My Page
layout: default
parent: Backend
nav_order: 1
---
```

`parent` must match the `title` of an existing page with `has_children: true` (e.g. `Backend`,
`Frontend`, `Getting Started`, `Architecture`, `Deployment`) to nest it in the sidebar.
