import flask
import flask_cors


app = flask.Flask(__name__)
flask_cors.CORS(app)


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
    },
    {
        "id": 2,
        "type": "continuous",
        "duration": "P0000-00-00T01:30:00",
        "kickoff": "2025-04-28T00:00:00+0300",
        "deadline": "2025-04-29T00:00:00+0300",
        "name": "Reading",
        "description": "Rationality: from AI to Zombies",
        "leisure": False,
        "color": "#FFD700",
        "dependencies": [],
    },
    {
        "id": 3,
        "type": "continuous",
        "duration": "P0000-00-00T01:30:00",
        "kickoff": "2025-04-29T00:00:00+0300",
        "deadline": "2025-04-30T00:00:00+0300",
        "name": "Reading",
        "description": "Rationality: from AI to Zombies",
        "color": "#FFD700",
        "leisure": False,
        "dependencies": [2],
    },
    {
        "id": 4,
        "type": "continuous",
        "duration": "P0000-00-00T01:30:00",
        "kickoff": "2025-05-01T00:00:00+0300",
        "deadline": "2025-05-02T00:00:00+0300",
        "name": "Reading",
        "description": "Rationality: from AI to Zombies",
        "color": "#FFD700",
        "leisure": False,
        "dependencies": [3],
    },
    {
        "id": 5,
        "type": "project",
        "duration": "P0000-00-00T10:00:00",
        "kickoff": "2025-04-28T00:00:00+0300",
        "deadline": "2025-05-02T00:00:00+0300",
        "name": "Work on the project",
        "description": None,
        "color": "#2ECC71",
        "leisure": False,
        "timings": {
            "work": "P0000-00-00T00:20:00",
            "smallBreak": "P0000-00-00T00:05:00",
            "bigBreak": "P0000-00-00T00:20:00",
            "numberOfSmallBreaks": 3,
        }
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
    task = flask.request.json
    return {
        "status": "ok",
        "result": task,
    }, 201


@app.route("/user/<int:user_id>/task/<int:task_id>", methods=['PUT'])
def route_user_task_update(user_id, task_id):
    task = flask.request.json
    for i, t in enumerate(USER_TASKS):
        if t["id"] == task_id:
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
    for i, t in enumerate(USER_TASKS):
        if t["id"] == task_id:
            return {
                "status": "ok",
                "result": t,
            }
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

if __name__ == "__main__":
    app.run(debug=True, port=5000)
