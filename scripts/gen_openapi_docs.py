#!/usr/bin/env python
"""Generate the backend API reference from the live FastAPI app's OpenAPI schema.

Writes:
  - docs/backend/openapi.json       raw OpenAPI 3 schema
  - docs/backend/api-reference.md   grouped method/path/summary table (just-the-docs page)
  - docs/backend/api-explorer.html  standalone Redoc viewer over openapi.json

Safe to re-run: it only overwrites these three generated files. Requires the backend venv
(backend_fast_api/.venv) to be active, or its dependencies otherwise importable.

    cd backend_fast_api && .venv\\Scripts\\activate   (Windows)
    source backend_fast_api/.venv/bin/activate         (bash/WSL)
    python scripts/gen_openapi_docs.py
"""

import json
import os
import sys
from pathlib import Path

REPO_ROOT = Path(__file__).resolve().parent.parent
BACKEND_SRC = REPO_ROOT / "backend_fast_api" / "src"
DOCS_BACKEND = REPO_ROOT / "docs" / "backend"

DO_NOT_EDIT_BANNER = (
    "<!-- GENERATED FILE — do not edit by hand. Regenerate with "
    "`python scripts/gen_openapi_docs.py` (see .claude/skills/update-api-reference/SKILL.md). -->"
)

# Importing main.py instantiates DatabaseConnection at module scope. Point it at an
# in-memory database by default so generating docs never touches a real data.db file.
os.environ.setdefault("DATABASE_URL", "sqlite:///:memory:")
os.environ.setdefault("APP_ENV", "development")

sys.path.insert(0, str(BACKEND_SRC))

from hgs_refuce_app.main import app  # noqa: E402  (import after sys.path setup)

# (path prefix or exact match, group name), checked in order — first match wins.
GROUP_RULES = [
    ("/admin", "Admin"),
    ("/auth", "Auth"),
    ("/currentUser", "Current User"),
    ("registrations", "Registrations"),
    ("reports", "Reports"),
    ("/users", "Users"),
    ("/locations", "Locations"),
]
GROUP_ORDER = [
    "Auth",
    "Current User",
    "Locations",
    "Registrations",
    "Reports",
    "Users",
    "Admin",
    "Misc",
]


def group_for(path: str) -> str:
    for needle, group in GROUP_RULES:
        if needle.startswith("/"):
            if path.startswith(needle):
                return group
        elif needle in path:
            return group
    return "Misc"


def humanize(operation: dict, method: str, path: str) -> str:
    summary = operation.get("summary")
    if summary:
        return summary
    operation_id = operation.get("operationId", "")
    name = operation_id.rsplit("_", 1)[0] if operation_id else f"{method} {path}"
    return name.replace("_", " ").strip().capitalize()


def build_route_rows(schema: dict):
    rows_by_group = {group: [] for group in GROUP_ORDER}
    for path, methods in schema.get("paths", {}).items():
        for method, operation in methods.items():
            if method.upper() not in {"GET", "POST", "PUT", "PATCH", "DELETE"}:
                continue
            if operation.get("deprecated"):
                continue
            group = group_for(path)
            rows_by_group.setdefault(group, [])
            rows_by_group[group].append(
                (method.upper(), path, humanize(operation, method.upper(), path))
            )
    for rows in rows_by_group.values():
        rows.sort(key=lambda r: (r[1], r[0]))
    return rows_by_group


def render_markdown(rows_by_group: dict, route_count: int) -> str:
    lines = [
        "---",
        "title: API Reference",
        "layout: default",
        "parent: Backend",
        "nav_order: 4",
        "---",
        "",
        DO_NOT_EDIT_BANNER,
        "",
        "# API Reference",
        "",
        f"Generated from `app.openapi()` in `backend_fast_api/src/hgs_refuce_app/main.py` "
        f"({route_count} routes). Never hand-edit this page — regenerate it with "
        "`python scripts/gen_openapi_docs.py` and see "
        "[update-api-reference]({{ site.baseurl }}/contributing/) for when to run it.",
        "",
        "For the full interactive schema (request/response bodies, models), see the "
        "[API explorer]({{ site.baseurl }}/backend/api-explorer.html) "
        "(rendered from [openapi.json]({{ site.baseurl }}/backend/openapi.json) via Redoc).",
        "",
    ]
    for group in GROUP_ORDER:
        rows = rows_by_group.get(group) or []
        if not rows:
            continue
        lines.append(f"## {group}")
        lines.append("")
        lines.append("| Method | Path | Summary |")
        lines.append("| --- | --- | --- |")
        for method, path, summary in rows:
            lines.append(f"| `{method}` | `{path}` | {summary} |")
        lines.append("")
    return "\n".join(lines).rstrip() + "\n"


def render_explorer_html(openapi_filename: str) -> str:
    return f"""<!doctype html>
{DO_NOT_EDIT_BANNER}
<html>
  <head>
    <title>API Explorer — hgs-refuce-application</title>
    <meta charset="utf-8" />
    <meta name="viewport" content="width=device-width, initial-scale=1" />
    <style>body {{ margin: 0; padding: 0; }}</style>
  </head>
  <body>
    <redoc spec-url="{openapi_filename}"></redoc>
    <script src="https://cdn.redoc.ly/redoc/latest/bundles/redoc.standalone.js"></script>
  </body>
</html>
"""


def main() -> None:
    schema = app.openapi()
    schema["x-generated-by"] = "scripts/gen_openapi_docs.py — do not edit by hand"

    DOCS_BACKEND.mkdir(parents=True, exist_ok=True)

    openapi_path = DOCS_BACKEND / "openapi.json"
    openapi_path.write_text(json.dumps(schema, indent=2) + "\n", encoding="utf-8")

    route_count = sum(
        1
        for methods in schema.get("paths", {}).values()
        for method in methods
        if method.upper() in {"GET", "POST", "PUT", "PATCH", "DELETE"}
    )
    rows_by_group = build_route_rows(schema)

    api_reference_path = DOCS_BACKEND / "api-reference.md"
    api_reference_path.write_text(render_markdown(rows_by_group, route_count), encoding="utf-8")

    api_explorer_path = DOCS_BACKEND / "api-explorer.html"
    api_explorer_path.write_text(render_explorer_html("openapi.json"), encoding="utf-8")

    print(f"wrote {openapi_path.relative_to(REPO_ROOT)} ({route_count} routes)")
    print(f"wrote {api_reference_path.relative_to(REPO_ROOT)}")
    print(f"wrote {api_explorer_path.relative_to(REPO_ROOT)}")


if __name__ == "__main__":
    main()
