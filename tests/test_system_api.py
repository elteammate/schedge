import pytest
import requests

BASE_URL = "http://localhost:5000/api/v0"

@pytest.fixture(scope="module")
def user_id():
    return 1

def test_get_user_state(user_id):
    response = requests.get(f"{BASE_URL}/user/{user_id}/state")
    assert response.status_code == 200
    data = response.json()
    assert data["status"] == "ok"
    assert "tasks" in data["result"]
    assert "slots" in data["result"]

def create_test_task(user_id):
    task = {
        "id": "",
        "type": "fixed",
        "name": "Test Task",
        "description": "A test task",
        "color": "#FF0000",
        "leisure": False,
        "dependencies": [],
        "nonce": 1,
        "start": "2023-05-01T10:00:00Z",
        "end": "2023-05-01T12:00:00Z",
    }
    response = requests.post(f"{BASE_URL}/user/{user_id}/task", json=task)
    assert response.status_code == 201
    return response.json()["result"]["id"]


def test_create_task(user_id):
    task = {
        "id": "",
        "type": "fixed",
        "name": "Test Task",
        "description": "A test task",
        "color": "#FF0000",
        "leisure": False,
        "dependencies": [],
        "nonce": 1,
        "start": "2023-05-01T10:00:00Z",
        "end": "2023-05-01T12:00:00Z",
    }
    response = requests.post(f"{BASE_URL}/user/{user_id}/task", json=task)
    assert response.status_code == 201
    data = response.json()
    assert data["status"] == "ok"
    assert data["result"]["name"] == "Test Task"

def test_update_task(user_id):
    task_id = create_test_task(user_id)
    updated_task = {
        "id": task_id,
        "type": "fixed",
        "name": "Updated Task",
        "description": "An updated test task",
        "color": "#00FF00",
        "leisure": True,
        "dependencies": [],
        "nonce": 1,
        "start": "2023-05-01T10:00:00Z",
        "end": "2023-05-01T13:00:00Z",
    }
    response = requests.put(f"{BASE_URL}/user/{user_id}/task/{task_id}", json=updated_task)
    assert response.status_code == 200
    data = response.json()
    assert data["status"] == "ok"
    assert data["result"]["name"] == "Updated Task"

def test_delete_task(user_id):
    task_id = create_test_task(user_id)
    response = requests.delete(f"{BASE_URL}/user/{user_id}/task/{task_id}")
    assert response.status_code == 200
    data = response.json()
    assert data["status"] == "ok"

    # Verify the task is deleted
    response = requests.get(f"{BASE_URL}/user/{user_id}/task/{task_id}")
    assert response.status_code == 404

def test_compute_slot_request(user_id):
    response = requests.post(f"{BASE_URL}/user/{user_id}/compute_slot_request", json={"sync": True})
    assert response.status_code == 201
    data = response.json()
    assert data["status"] == "ok"
