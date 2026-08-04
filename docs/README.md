# Documentation site

This folder is a Jekyll site (theme: [just-the-docs](https://just-the-docs.com/)) published via
GitHub Pages.

## Enable Pages (one-time, in the GitHub repo)

Settings → Pages → Build and deployment → Source: **Deploy from a branch** → Branch: `main`,
folder: **/docs**.

The site will be published at `https://<org>.github.io/<repo>/`.

## Preview locally

Requires Ruby + Bundler.

```bash
cd docs
bundle install
bundle exec jekyll serve
# http://localhost:4000
```

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
