from fastapi.testclient import TestClient
from hgs_refuce_app.main import app, storage

client = TestClient(app)

def setup_function():
    # clear DB between tests
    storage.conn.execute("DELETE FROM datapoints")
    storage.conn.commit()

def test_add_and_get_datapoint():
    payload = {"source": "sensor-a", "value": 12.34}
    resp = client.post("/add_datapoint", json=payload)
    assert resp.status_code == 200
    data = resp.json()
    assert data["id"] == 1
    assert data["source"] == "sensor-a"

    get = client.get(f"/get_datapoint/{data['id']}")
    assert get.status_code == 200
    assert get.json()["value"] == 12.34
