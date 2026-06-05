from fastapi.testclient import TestClient
from sqlalchemy import text
from hgs_refuce_app.main import app, user_storage, data_storage

client = TestClient(app)

ADMIN_SECRET = "test-admin-secret"
TEST_USER = "test-user"
TEST_ADMIN = "test-admin"


def setup_function():
    with user_storage.engine.connect() as conn:
        conn.execute(text("DELETE FROM location_users"))
        conn.execute(text("DELETE FROM locations"))
        conn.execute(text("DELETE FROM users"))
        conn.commit()
    with data_storage.engine.connect() as conn:
        conn.execute(text("DELETE FROM registrations"))
        conn.execute(text("DELETE FROM reports"))
        conn.commit()


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
