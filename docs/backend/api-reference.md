---
title: API Reference
layout: default
parent: Backend
nav_order: 4
---

<!-- GENERATED FILE — do not edit by hand. Regenerate with `python scripts/gen_openapi_docs.py` (see .claude/skills/update-api-reference/SKILL.md). -->

# API Reference

Generated from `app.openapi()` in `backend_fast_api/src/hgs_refuce_app/main.py` (34 routes). Never hand-edit this page — regenerate it with `python scripts/gen_openapi_docs.py` and see [update-api-reference]({{ site.baseurl }}/contributing/) for when to run it.

For the full interactive schema (request/response bodies, models), see the [API explorer]({{ site.baseurl }}/backend/api-explorer.html) (rendered from [openapi.json]({{ site.baseurl }}/backend/openapi.json) via Redoc).

## Auth

| Method | Path | Summary |
| --- | --- | --- |
| `POST` | `/auth/login` | Login |
| `POST` | `/auth/sso-resolve` | Sso Resolve |
| `GET` | `/auth/validate` | Validate Token |

## Current User

| Method | Path | Summary |
| --- | --- | --- |
| `GET` | `/currentUser` | Get Current User |
| `PATCH` | `/currentUser/location` | Set My Location |

## Locations

| Method | Path | Summary |
| --- | --- | --- |
| `GET` | `/locations` | List User Locations |
| `POST` | `/locations` | Create Location As Super Admin |
| `DELETE` | `/locations/{location_id}` | Delete Location |
| `GET` | `/locations/{location_id}/users` | List Location Users |
| `DELETE` | `/locations/{location_id}/users/{user_id}` | Remove User From Location As Admin |
| `POST` | `/locations/{location_id}/users/{user_id}` | Add User To Location As Admin |

## Registrations

| Method | Path | Summary |
| --- | --- | --- |
| `GET` | `/locations/{location_id}/registrations` | List Registrations |
| `POST` | `/locations/{location_id}/registrations` | Create Registration |
| `DELETE` | `/locations/{location_id}/registrations/{id}` | Delete Registration |
| `GET` | `/locations/{location_id}/registrations/{id}` | Get Registration |
| `PUT` | `/locations/{location_id}/registrations/{id}` | Update Registration |

## Reports

| Method | Path | Summary |
| --- | --- | --- |
| `GET` | `/locations/{location_id}/reports` | List Reports |
| `POST` | `/locations/{location_id}/reports` | Submit Report |
| `DELETE` | `/locations/{location_id}/reports/{period}` | Unlock Report |
| `GET` | `/locations/{location_id}/reports/{period}` | Get Report |
| `GET` | `/locations/{location_id}/reports/{period}/html` | Get Report Html |
| `GET` | `/locations/{location_id}/reports/{period}/preview-html` | Get Report Preview Html |

## Users

| Method | Path | Summary |
| --- | --- | --- |
| `GET` | `/users` | List All Users |
| `POST` | `/users` | Create User As Admin |
| `DELETE` | `/users/{user_id}` | Delete User Endpoint |
| `PUT` | `/users/{user_id}` | Update User Endpoint |

## Admin

| Method | Path | Summary |
| --- | --- | --- |
| `GET` | `/admin/access-requests` | List Access Requests |
| `DELETE` | `/admin/access-requests/{email}` | Delete Access Request |
| `GET` | `/admin/locations` | Admin List Locations |
| `POST` | `/admin/locations` | Admin Create Location |
| `POST` | `/admin/locations/{location_id}/users/{user_id}` | Admin Add User To Location |
| `POST` | `/admin/users` | Admin Create User |

## Misc

| Method | Path | Summary |
| --- | --- | --- |
| `GET` | `/` | Read Root |
| `GET` | `/db-test` | Db Test |
