import flask
import flask_cors
import flask_sock
from flask_sock import Sock
import uuid

app = flask.Flask(__name__)
flask_cors.CORS(app)
sock = Sock(app)

# In-memory data
USER_TASKS = [
    {
        "id": 1,
        "type": "fixed",
        "start": "2025-04-28T16:00:00+0300",
        "end": "2025-04-28T18:00:00+0300",
        "name": "Walk with a friend",
        "description": None,
        "leisure": True,
        "color": "#3498DB",
        "dependencies": [],
        "nonce": 1,
    },
    {
        "id": 2,
        "type": "continuous",
        "duration": "PT1H30M",
        "kickoff": "2025-04-28T00:00:00+0300",
        "deadline": "2025-04-29T00:00:00+0300",
        "name": "Reading",
        "description": "Rationality: from AI to Zombies",
        "leisure": False,
        "color": "#FFD700",
        "dependencies": [],
        "nonce": 1,
    },
    {
        "id": 3,
        "type": "continuous",
        "duration": "PT1H30M",
        "kickoff": "2025-04-29T00:00:00+0300",
        "deadline": "2025-04-30T00:00:00+0300",
        "name": "Reading",
        "description": "Rationality: from AI to Zombies",
        "color": "#FFD700",
        "leisure": False,
        "dependencies": [2],
        "nonce": 1,
    },
    {
        "id": 4,
        "type": "continuous",
        "duration": "PT1H30M",
        "kickoff": "2025-05-01T00:00:00+0300",
        "deadline": "2025-05-02T00:00:00+0300",
        "name": "Reading",
        "description": "Rationality: from AI to Zombies",
        "color": "#FFD700",
        "leisure": False,
        "dependencies": [3],
        "nonce": 1,
    },
    {
        "id": 5,
        "type": "project",
        "duration": "PT10H",
        "kickoff": "2025-04-28T00:00:00+0300",
        "deadline": "2025-05-02T00:00:00+0300",
        "name": "Work on the project",
        "description": None,
        "color": "#2ECC71",
        "leisure": False,
        "timings": {
            "work": "PT20M",
            "smallBreak": "PT5M",
            "bigBreak": "PT20M",
            "numberOfSmallBreaks": 3,
        },
        "nonce": 1,
    }
]

SLOTS = [
    {
        "start": "2025-04-28T16:00:00+0300",
        "end": "2025-04-28T18:00:00+0300",
        "task": USER_TASKS[0],
    },
    {
        "start": "2025-04-28T18:00:00+0300",
        "end": "2025-04-28T19:30:00+0300",
        "task": USER_TASKS[1],
    },
]

# Keep track of the next available task ID
next_task_id = len(USER_TASKS) + 1

CONNECTIONS = {}

def emit_state(user_id):
    for uid, ws in list(CONNECTIONS.items()):
        try:
            ws.send(flask.json.dumps({
                "userId": user_id,
                "tasks": USER_TASKS,
                "slots": SLOTS,
            }))
        except Exception as e:
            print(f"Error sending state to {ws}: {e}")
            CONNECTIONS.pop(uid, None)


@app.route("/user/<int:user_id>/state", methods=['GET'])
def route_user_state(user_id):
    return {
        "status": "ok",
        "result": {
            "userId": user_id,
            "tasks": USER_TASKS,
            "slots": SLOTS,
        },
    }


@app.route("/user/<int:user_id>/task", methods=['GET'])
def route_user_tasks(user_id):
    return {
        "status": "ok",
        "result": USER_TASKS,
    }


@app.route("/user/<int:user_id>/task/<int:task_id>", methods=['GET'])
def route_user_task(user_id, task_id):
    for task in USER_TASKS:
        if task["id"] == task_id:
            return {
                "status": "ok",
                "result": task,
            }
    return {
        "status": "error",
        "message": "Task not found"
    }, 404


@app.route("/user/<int:user_id>/task", methods=['POST'])
def route_user_task_create(user_id):
    global next_task_id
    task = flask.request.json
    task["id"] = next_task_id
    USER_TASKS.append(task)
    next_task_id += 1
    emit_state(user_id)
    return {
        "status": "ok",
        "result": task,
    }, 201


@app.route("/user/<int:user_id>/task/<int:task_id>", methods=['PUT'])
def route_user_task_update(user_id, task_id):
    task = flask.request.json
    for i, t in enumerate(USER_TASKS):
        if t["id"] == task_id:
            USER_TASKS[i] = task  # Update the task in place
            emit_state(user_id)
            return {
                "status": "ok",
                "result": task,
            }
    return {
        "status": "error",
        "message": "Task not found"
    }, 404


@app.route("/user/<int:user_id>/task/<int:task_id>", methods=['DELETE'])
def route_user_task_delete(user_id, task_id):
    global USER_TASKS
    original_length = len(USER_TASKS)
    USER_TASKS = [task for task in USER_TASKS if task["id"] != task_id]

    if len(USER_TASKS) < original_length:
        emit_state(user_id)
        return {
            "status": "ok",
            "message": "Task deleted"
        }, 200
    else:
        return {
            "status": "error",
            "message": "Task not found"
        }, 404


@app.route("/user/<int:user_id>/queue", methods=['POST'])
def route_user_queue(user_id):
    queue = flask.request.json
    return {
        "status": "ok",
        "result": queue,
    }, 201


@app.route("/user/<int:user_id>/slot", methods=['GET'])
def route_user_slots(user_id):
    return {
        "status": "ok",
        "result": SLOTS,
    }


@sock.route('/user/<int:user_id>/ws')
def echo(ws, user_id):
    uid = uuid.uuid4()
    try:
        CONNECTIONS[uid] = ws
        while True:
            data = ws.receive()
            if data == "ping":
                emit_state(user_id)
            else:
                print(f"Received unknown message: {data}")
    except flask_sock.ConnectionClosed as e:
        CONNECTIONS.pop(uid, None)
        raise e


if __name__ == "__main__":
    app.run(debug=True, port=5000)
