from fastapi.testclient import TestClient
from sqlalchemy import text
from hgs_refuce_app.main import app, user_storage, data_storage, verify_service_auth

client = TestClient(app)

ADMIN_SECRET = "test-admin-secret"
TEST_USER = "test-user"
TEST_ADMIN = "test-admin"
TEST_SUPERADMIN = "test-superadmin"


def setup_function():
    with user_storage.engine.connect() as conn:
        conn.execute(text("DELETE FROM location_users"))
        conn.execute(text("DELETE FROM locations"))
        conn.execute(text("DELETE FROM users"))
        conn.execute(text("DELETE FROM pending_access_requests"))
        conn.commit()
    with data_storage.engine.connect() as conn:
        conn.execute(text("DELETE FROM registrations"))
        conn.execute(text("DELETE FROM reports"))
        conn.commit()
    # Tests for endpoints that require a service-signed call bypass the
    # HMAC verification — the signing/verification path is exercised by
    # the dedicated `verify_service_hmac` unit and by manual integration
    # tests against the running backend.
    app.dependency_overrides[verify_service_auth] = lambda: None


def teardown_function():
    app.dependency_overrides.pop(verify_service_auth, None)


def _seed_location_and_user():
    user_storage.create_user(TEST_USER, is_admin=False)
    user_storage.create_user(TEST_ADMIN, is_admin=True)
    loc_id = user_storage.create_location("Test Location")
    user_storage.add_user_to_location(loc_id, TEST_USER)
    user_storage.add_user_to_location(loc_id, TEST_ADMIN)
    return loc_id


def _headers(user_id: str = TEST_USER):
    return {"X-User-Id": user_id}


def _make_registration(id_="r1", date="2026-05-11", weight=12.5):
    return {
        "id": id_,
        "date": date,
        "entries": [{"categoryId": "restavfall", "weightKg": weight}],
        "createdAt": "2026-05-11T08:00:00Z",
        "updatedAt": "2026-05-11T08:00:00Z",
        "createdBy": "tester",
    }


# ---------- registrations ----------

def test_create_and_get_registration():
    loc_id = _seed_location_and_user()
    payload = _make_registration()
    resp = client.post(
        f"/locations/{loc_id}/registrations",
        json=payload,
        headers=_headers()
    )
    assert resp.status_code == 201
    assert resp.json()["id"] == "r1"

    listed = client.get(
        f"/locations/{loc_id}/registrations",
        headers=_headers()
    ).json()
    assert len(listed) == 1
    assert listed[0]["date"] == "2026-05-11"


def test_create_rejects_duplicate_id():
    loc_id = _seed_location_and_user()
    client.post(
        f"/locations/{loc_id}/registrations",
        json=_make_registration(),
        headers=_headers()
    )
    resp = client.post(
        f"/locations/{loc_id}/registrations",
        json=_make_registration(),
        headers=_headers()
    )
    assert resp.status_code == 409


def test_update_registration():
    loc_id = _seed_location_and_user()
    client.post(
        f"/locations/{loc_id}/registrations",
        json=_make_registration(),
        headers=_headers()
    )
    updated = _make_registration(weight=99.0)
    resp = client.put(
        f"/locations/{loc_id}/registrations/r1",
        json=updated,
        headers=_headers()
    )
    assert resp.status_code == 200
    assert resp.json()["entries"][0]["weightKg"] == 99.0


def test_update_404_when_missing():
    loc_id = _seed_location_and_user()
    resp = client.put(
        f"/locations/{loc_id}/registrations/missing",
        json=_make_registration(id_="missing"),
        headers=_headers()
    )
    assert resp.status_code == 404


def test_update_400_when_path_body_mismatch():
    loc_id = _seed_location_and_user()
    client.post(
        f"/locations/{loc_id}/registrations",
        json=_make_registration(),
        headers=_headers()
    )
    resp = client.put(
        f"/locations/{loc_id}/registrations/r1",
        json=_make_registration(id_="other"),
        headers=_headers()
    )
    assert resp.status_code == 400


def test_delete_registration():
    loc_id = _seed_location_and_user()
    client.post(
        f"/locations/{loc_id}/registrations",
        json=_make_registration(),
        headers=_headers()
    )
    resp = client.delete(
        f"/locations/{loc_id}/registrations/r1",
        headers=_headers()
    )
    assert resp.status_code == 204
    listed = client.get(
        f"/locations/{loc_id}/registrations",
        headers=_headers()
    ).json()
    assert listed == []


def test_filter_by_date_range():
    loc_id = _seed_location_and_user()
    client.post(
        f"/locations/{loc_id}/registrations",
        json=_make_registration(id_="a", date="2026-01-15"),
        headers=_headers()
    )
    client.post(
        f"/locations/{loc_id}/registrations",
        json=_make_registration(id_="b", date="2026-02-15"),
        headers=_headers()
    )
    client.post(
        f"/locations/{loc_id}/registrations",
        json=_make_registration(id_="c", date="2026-03-15"),
        headers=_headers()
    )
    resp = client.get(
        f"/locations/{loc_id}/registrations?from=2026-02-01&to=2026-02-28",
        headers=_headers()
    )
    ids = sorted(r["id"] for r in resp.json())
    assert ids == ["b"]


def test_filter_by_period_quarter():
    loc_id = _seed_location_and_user()
    client.post(
        f"/locations/{loc_id}/registrations",
        json=_make_registration(id_="a", date="2026-01-15"),
        headers=_headers()
    )
    client.post(
        f"/locations/{loc_id}/registrations",
        json=_make_registration(id_="b", date="2026-04-15"),
        headers=_headers()
    )
    resp = client.get(
        f"/locations/{loc_id}/registrations?period=2026-Q1",
        headers=_headers()
    )
    ids = sorted(r["id"] for r in resp.json())
    assert ids == ["a"]


def test_filter_by_exact_date():
    loc_id = _seed_location_and_user()
    client.post(
        f"/locations/{loc_id}/registrations",
        json=_make_registration(id_="a", date="2026-05-11"),
        headers=_headers()
    )
    client.post(
        f"/locations/{loc_id}/registrations",
        json=_make_registration(id_="b", date="2026-05-12"),
        headers=_headers()
    )
    resp = client.get(
        f"/locations/{loc_id}/registrations?date=2026-05-11",
        headers=_headers()
    )
    assert [r["id"] for r in resp.json()] == ["a"]


def test_registration_isolated_by_location():
    loc1 = _seed_location_and_user()
    loc2 = user_storage.create_location("Location 2")
    user_storage.add_user_to_location(loc2, TEST_USER)

    # Create in location 1
    client.post(
        f"/locations/{loc1}/registrations",
        json=_make_registration(id_="r1"),
        headers=_headers()
    )
    # Create in location 2
    client.post(
        f"/locations/{loc2}/registrations",
        json=_make_registration(id_="r2"),
        headers=_headers()
    )

    # List location 1 should only show r1
    loc1_regs = client.get(
        f"/locations/{loc1}/registrations",
        headers=_headers()
    ).json()
    assert len(loc1_regs) == 1
    assert loc1_regs[0]["id"] == "r1"

    # List location 2 should only show r2
    loc2_regs = client.get(
        f"/locations/{loc2}/registrations",
        headers=_headers()
    ).json()
    assert len(loc2_regs) == 1
    assert loc2_regs[0]["id"] == "r2"


def test_registration_requires_location_access():
    loc_id = _seed_location_and_user()
    other_user = "other-user"
    user_storage.create_user(other_user, is_admin=False)
    # don't add other_user to location

    resp = client.post(
        f"/locations/{loc_id}/registrations",
        json=_make_registration(),
        headers=_headers(other_user)
    )
    assert resp.status_code == 403


# ---------- reports ----------

def test_submit_and_list_reports():
    loc_id = _seed_location_and_user()
    resp = client.post(
        f"/locations/{loc_id}/reports",
        json={"period": "2026-Q1", "submittedBy": "admin"},
        headers=_headers()
    )
    assert resp.status_code == 201
    assert resp.json()["period"] == "2026-Q1"

    listed = client.get(
        f"/locations/{loc_id}/reports",
        headers=_headers()
    ).json()
    assert len(listed) == 1


def test_submit_409_on_duplicate():
    loc_id = _seed_location_and_user()
    client.post(
        f"/locations/{loc_id}/reports",
        json={"period": "2026-Q1", "submittedBy": "admin"},
        headers=_headers()
    )
    resp = client.post(
        f"/locations/{loc_id}/reports",
        json={"period": "2026-Q1", "submittedBy": "admin"},
        headers=_headers()
    )
    assert resp.status_code == 409


def test_get_report_404():
    loc_id = _seed_location_and_user()
    resp = client.get(
        f"/locations/{loc_id}/reports/2026-Q1",
        headers=_headers()
    )
    assert resp.status_code == 404


def test_unlock_report():
    loc_id = _seed_location_and_user()
    client.post(
        f"/locations/{loc_id}/reports",
        json={"period": "2026-Q1", "submittedBy": "admin"},
        headers=_headers()
    )
    resp = client.delete(
        f"/locations/{loc_id}/reports/2026-Q1",
        headers=_headers()
    )
    assert resp.status_code == 204
    listed = client.get(
        f"/locations/{loc_id}/reports",
        headers=_headers()
    ).json()
    assert listed == []


def test_report_isolated_by_location():
    loc1 = _seed_location_and_user()
    loc2 = user_storage.create_location("Location 2")
    user_storage.add_user_to_location(loc2, TEST_USER)

    # Submit report for location 1
    client.post(
        f"/locations/{loc1}/reports",
        json={"period": "2026-Q1", "submittedBy": "admin"},
        headers=_headers()
    )
    # Submit report for location 2 with same period
    client.post(
        f"/locations/{loc2}/reports",
        json={"period": "2026-Q1", "submittedBy": "admin"},
        headers=_headers()
    )

    # Both should exist independently
    loc1_reports = client.get(
        f"/locations/{loc1}/reports",
        headers=_headers()
    ).json()
    assert len(loc1_reports) == 1

    loc2_reports = client.get(
        f"/locations/{loc2}/reports",
        headers=_headers()
    ).json()
    assert len(loc2_reports) == 1


# ---------- lock enforcement ----------

def test_create_registration_blocked_when_quarter_locked():
    loc_id = _seed_location_and_user()
    client.post(
        f"/locations/{loc_id}/reports",
        json={"period": "2026-Q2", "submittedBy": "admin"},
        headers=_headers()
    )
    resp = client.post(
        f"/locations/{loc_id}/registrations",
        json=_make_registration(date="2026-05-11"),
        headers=_headers()
    )
    assert resp.status_code == 409


def test_update_blocked_when_quarter_locked():
    loc_id = _seed_location_and_user()
    client.post(
        f"/locations/{loc_id}/registrations",
        json=_make_registration(date="2026-05-11"),
        headers=_headers()
    )
    client.post(
        f"/locations/{loc_id}/reports",
        json={"period": "2026-Q2", "submittedBy": "admin"},
        headers=_headers()
    )
    resp = client.put(
        f"/locations/{loc_id}/registrations/r1",
        json=_make_registration(weight=50.0),
        headers=_headers()
    )
    assert resp.status_code == 409


def test_delete_blocked_when_quarter_locked():
    loc_id = _seed_location_and_user()
    client.post(
        f"/locations/{loc_id}/registrations",
        json=_make_registration(date="2026-05-11"),
        headers=_headers()
    )
    client.post(
        f"/locations/{loc_id}/reports",
        json={"period": "2026-Q2", "submittedBy": "admin"},
        headers=_headers()
    )
    resp = client.delete(
        f"/locations/{loc_id}/registrations/r1",
        headers=_headers()
    )
    assert resp.status_code == 409


def test_lock_isolated_by_location():
    loc1 = _seed_location_and_user()
    loc2 = user_storage.create_location("Location 2")
    user_storage.add_user_to_location(loc2, TEST_USER)

    # Lock location 1's Q1
    client.post(
        f"/locations/{loc1}/reports",
        json={"period": "2026-Q1", "submittedBy": "admin"},
        headers=_headers()
    )

    # Should be able to create registration in location 2's Q1
    resp = client.post(
        f"/locations/{loc2}/registrations",
        json=_make_registration(date="2026-01-15"),
        headers=_headers()
    )
    assert resp.status_code == 201

    # But not in location 1's Q1
    resp = client.post(
        f"/locations/{loc1}/registrations",
        json=_make_registration(id_="r2", date="2026-01-15"),
        headers=_headers()
    )
    assert resp.status_code == 409


# ---------- sso-resolve + pending access requests ----------


def _seed_superadmin():
    user_storage.create_user(TEST_SUPERADMIN, is_admin=True, is_super_admin=True)


def test_sso_resolve_known_email_returns_resolved():
    user_storage.create_user("alice@bouvet.no", is_admin=False)
    resp = client.post(
        "/auth/sso-resolve",
        json={"email": "alice@bouvet.no", "name": "Alice"},
    )
    assert resp.status_code == 200
    body = resp.json()
    assert body["status"] == "resolved"
    assert body["backendUserId"] == "alice@bouvet.no"
    assert body["role"] == "user"
    # No pending row should be created for a known user.
    assert user_storage.list_pending_requests() == []


def test_sso_resolve_unknown_email_returns_pending_and_queues():
    resp = client.post(
        "/auth/sso-resolve",
        json={"email": "bob@bouvet.no", "name": "Bob"},
    )
    assert resp.status_code == 200
    body = resp.json()
    assert body["status"] == "pending"
    assert body.get("backendUserId") is None
    pending = user_storage.list_pending_requests()
    assert len(pending) == 1
    assert pending[0].email == "bob@bouvet.no"
    assert pending[0].name == "Bob"


def test_sso_resolve_retry_updates_last_attempt_without_duplicating():
    client.post("/auth/sso-resolve", json={"email": "carol@bouvet.no", "name": "Carol"})
    first = user_storage.list_pending_requests()[0]
    # Second attempt: name omitted; existing name should be preserved.
    client.post("/auth/sso-resolve", json={"email": "carol@bouvet.no"})
    pending = user_storage.list_pending_requests()
    assert len(pending) == 1
    assert pending[0].email == "carol@bouvet.no"
    assert pending[0].name == "Carol"
    assert pending[0].requestedAt == first.requestedAt
    assert pending[0].lastAttemptAt >= first.lastAttemptAt


def test_access_requests_list_requires_superadmin():
    _seed_superadmin()
    user_storage.create_user(TEST_ADMIN, is_admin=True)
    client.post("/auth/sso-resolve", json={"email": "dan@bouvet.no", "name": "Dan"})

    resp = client.get("/admin/access-requests", headers=_headers(TEST_ADMIN))
    assert resp.status_code == 403

    resp = client.get("/admin/access-requests", headers=_headers(TEST_SUPERADMIN))
    assert resp.status_code == 200
    body = resp.json()
    assert len(body) == 1
    assert body[0]["email"] == "dan@bouvet.no"


def test_access_requests_delete_dismisses_then_404():
    _seed_superadmin()
    client.post("/auth/sso-resolve", json={"email": "eve@bouvet.no"})

    resp = client.delete(
        "/admin/access-requests/eve@bouvet.no",
        headers=_headers(TEST_SUPERADMIN),
    )
    assert resp.status_code == 204
    assert user_storage.list_pending_requests() == []

    resp = client.delete(
        "/admin/access-requests/eve@bouvet.no",
        headers=_headers(TEST_SUPERADMIN),
    )
    assert resp.status_code == 404


# ---------- create-user form modes (SSO vs PIN) ----------


def test_create_sso_user_clears_matching_pending_request():
    _seed_superadmin()
    user_storage.create_user(TEST_ADMIN, is_admin=True)
    client.post("/auth/sso-resolve", json={"email": "frank@bouvet.no", "name": "Frank"})
    assert len(user_storage.list_pending_requests()) == 1

    resp = client.post(
        "/users",
        json={"id": "frank@bouvet.no", "isAdmin": False, "name": "Frank"},
        headers=_headers(TEST_ADMIN),
    )
    assert resp.status_code == 201
    assert resp.json()["id"] == "frank@bouvet.no"
    # Provisioning an SSO user clears the matching pending request.
    assert user_storage.list_pending_requests() == []
    # Password column is NULL for SSO users.
    assert user_storage.check_password("frank@bouvet.no", "anything") is False


def test_create_pin_user_with_password_succeeds_and_login_works():
    user_storage.create_user(TEST_ADMIN, is_admin=True)
    resp = client.post(
        "/users",
        json={"id": "stavangerUser", "isAdmin": False, "password": "1234"},
        headers=_headers(TEST_ADMIN),
    )
    assert resp.status_code == 201
    # The PIN we just set must be usable on /auth/login.
    login = client.post(
        "/auth/login",
        json={"username": "stavangerUser", "password": "1234"},
    )
    assert login.status_code == 200
    assert login.json()["user"]["id"] == "stavangerUser"


def test_create_user_validation_rejects_sso_without_at():
    user_storage.create_user(TEST_ADMIN, is_admin=True)
    resp = client.post(
        "/users",
        json={"id": "no-at-sign", "isAdmin": False},
        headers=_headers(TEST_ADMIN),
    )
    assert resp.status_code == 422


def test_create_user_validation_rejects_pin_with_at():
    user_storage.create_user(TEST_ADMIN, is_admin=True)
    resp = client.post(
        "/users",
        json={"id": "user@bouvet.no", "isAdmin": False, "password": "1234"},
        headers=_headers(TEST_ADMIN),
    )
    assert resp.status_code == 422


def test_create_user_validation_rejects_short_pin():
    user_storage.create_user(TEST_ADMIN, is_admin=True)
    resp = client.post(
        "/users",
        json={"id": "shorty", "isAdmin": False, "password": "12"},
        headers=_headers(TEST_ADMIN),
    )
    assert resp.status_code == 422
