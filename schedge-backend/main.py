import asyncio

import aiohttp
import jsonschema
from aiohttp import web, WSMsgType
import aiohttp_cors
import json
import uuid
import dotenv
import os
from pymongo import AsyncMongoClient
import bson
from jsonschema import validate, ValidationError
import logging
import functools
from datetime import datetime, timedelta
import re

logging.basicConfig(level=logging.INFO)
logger = logging.getLogger(__name__)

dotenv.load_dotenv()

MONGO_URI = os.environ.get("MONGO_URI")
DB_NAME = os.environ.get("DB_NAME", "schedge")
SOLVER_SERVER_URL = os.environ.get("SOLVER_SERVER_URL")
BACKEND_HOST_ADDRESS = os.environ.get("BACKEND_HOST_ADDRESS", "localhost")
BACKEND_PORT = os.environ.get("BACKEND_PORT", "5000")

# Constants for limits
MAX_TASKS_PER_USER = 500  # Maximum number of tasks a user can create
MIN_DURATION_MINUTES = 5  # Minimum task duration in minutes
MAX_DURATION_DAYS = 3     # Maximum task duration in days

client = AsyncMongoClient(MONGO_URI)
db = client[DB_NAME]

# Global dictionary to hold WebSocket connections by user_id
# This allows us to send real-time updates to connected clients,
# unless a client is connected to a different server instance.
# In theory, this should be managed by a more robust solution like Redis Pub/Sub
# or a message broker, but for simplicity, we use an in-memory dictionary.
# TODO: Replace with something more robust
CONNECTIONS = {}

try:
    with open("static/schema.json") as schema_file:
        SCHEMA = json.load(schema_file)
    logger.info("Successfully loaded schema.json")
except Exception as e:
    logger.error(f"Failed to load schema.json: {e}")
    SCHEMA = {}


@functools.cache
def get_schema(schema_type):
    """
    Retrieve a specific schema by type from the loaded schema definitions.

    Args:
        schema_type (str): The type of schema to retrieve from the definitions

    Returns:
        dict: The schema with the proper $ref attribute

    Raises:
        ValueError: If the requested schema type doesn't exist in definitions
    """
    if "definitions" in SCHEMA and schema_type in SCHEMA["definitions"]:
        return {
            "$ref": f"#/definitions/{schema_type}",
            **SCHEMA
        }
    raise ValueError(f"Schema type '{schema_type}' not found in definitions")


def validate_schema(obj, schema_type):
    """
    Validate an object against a JSON schema.

    Args:
        obj (dict): The object to validate
        schema_type (str): The schema type to validate against

    Returns:
        tuple: (bool, str) - Success flag and error message if validation fails
    """
    try:
        validate(
            instance=obj,
            schema=get_schema(schema_type),
            format_checker=jsonschema.FormatChecker()
        )
        return True, None
    except ValidationError as e:
        return False, f"Schema validation failed: {e.message}. Details: {e.path} - {e.validator} ({e.validator_value})"
    except Exception as e:
        return False, f"Validation error: {str(e)}"


def safe_object_id(id_str):
    try:
        return True, bson.ObjectId(id_str)
    except Exception as e:
        return False, f"Invalid ObjectId format: {id_str}"


def safe_int(value, param_name="Parameter"):
    """Safely convert string to integer, returns (success, value/error)"""
    try:
        return True, int(value)
    except ValueError:
        return False, f"{param_name} must be an integer"


def fix_object_id(obj):
    """
    Convert MongoDB ObjectId instances to strings and rename _id to id.

    This function recursively processes lists
    to ensure ObjectIds are properly serialized for JSON responses.

    Args:
        obj: The object to process (can be dict, list, ObjectId, or primitive)

    Returns:
        The processed object with ObjectIds converted to strings
    """
    if obj is None:
        return None

    if isinstance(obj, bson.ObjectId):
        return str(obj)

    if isinstance(obj, list):
        return [fix_object_id(item) for item in obj]

    elif isinstance(obj, dict):
        if "_id" in obj:
            result = {**obj, "id": str(obj["_id"])}
            del result["_id"]
            return result
        return obj

    return obj


async def emit_state(user_id):
    """
    Emit the current state (tasks and slots) to all WebSocket connections for a user

    Args:
        user_id (int): The user ID to emit state for
    """
    try:
        tasks = await db.tasks.find({"userId": user_id}).to_list(None)
        slots = await db.slots.find({"userId": user_id}).to_list(None)

        fixed_tasks = fix_object_id(tasks)
        fixed_slots = fix_object_id(slots)

        message = json.dumps({
            "userId": user_id,
            "tasks": fixed_tasks,
            "slots": fixed_slots,
        })

        # Only send to connections for this user_id
        if user_id in CONNECTIONS:
            for connection_id, ws in list(CONNECTIONS[user_id].items()):
                try:
                    await ws.send_str(message)
                except Exception as e:
                    logger.error(f"Error sending state to connection {connection_id}: {e}")
                    CONNECTIONS[user_id].pop(connection_id, None)
                    # Remove user entry if no connections left
                    if not CONNECTIONS[user_id]:
                        CONNECTIONS.pop(user_id, None)
    except Exception as e:
        logger.error(f"Error in emit_state: {e}")


async def route_user_state(request):
    """
    Handler for GET /user/{user_id}/state

    Retrieves the complete state (tasks and slots) for a user.

    Args:
        request (Request): The HTTP request object

    Returns:
        Response: JSON response with user state or error
    """
    try:
        success, user_id_or_error = safe_int(request.match_info['user_id'], "User ID")
        if not success:
            return web.json_response({
                "status": "error",
                "message": user_id_or_error
            }, status=400)

        user_id = user_id_or_error
        tasks = await db.tasks.find({"userId": user_id}).to_list(None)
        slots = await db.slots.find({"userId": user_id}).to_list(None)

        fixed_tasks = fix_object_id(tasks)
        fixed_slots = fix_object_id(slots)

        result = {
            "userId": user_id,
            "tasks": fixed_tasks,
            "slots": fixed_slots,
        }

        return web.json_response({
            "status": "ok",
            "result": result,
        })
    except Exception as e:
        logger.error(f"Error in route_user_state: {e}")
        return web.json_response({
            "status": "error",
            "message": str(e)
        }, status=500)


async def route_user_tasks(request):
    """
    Handler for GET /user/{user_id}/task

    Retrieves all tasks for a user.

    Args:
        request (Request): The HTTP request object

    Returns:
        Response: JSON response with tasks or error
    """
    try:
        success, user_id_or_error = safe_int(request.match_info['user_id'], "User ID")
        if not success:
            return web.json_response({
                "status": "error",
                "message": user_id_or_error
            }, status=400)

        user_id = user_id_or_error
        tasks = await db.tasks.find({"userId": user_id}).to_list(None)
        fixed_tasks = fix_object_id(tasks)

        return web.json_response({
            "status": "ok",
            "result": fixed_tasks,
        })
    except Exception as e:
        logger.error(f"Error in route_user_tasks: {e}")
        return web.json_response({
            "status": "error",
            "message": str(e)
        }, status=500)


async def route_user_task(request):
    """
    Handler for GET /user/{user_id}/task/{task_id}

    Retrieves a specific task by ID.

    Args:
        request (Request): The HTTP request object

    Returns:
        Response: JSON response with the task or error
    """
    try:
        task_id = request.match_info['task_id']
        success, obj_id_or_error = safe_object_id(task_id)
        if not success:
            return web.json_response({
                "status": "error",
                "message": obj_id_or_error
            }, status=400)

        obj_id = obj_id_or_error
        task = await db.tasks.find_one({"_id": obj_id})
        if task:
            fixed_task = fix_object_id(task)

            return web.json_response({
                "status": "ok",
                "result": fixed_task,
            })
        return web.json_response({
            "status": "error",
            "message": "Task not found"
        }, status=404)
    except Exception as e:
        logger.error(f"Error in route_user_task: {e}")
        return web.json_response({
            "status": "error",
            "message": str(e)
        }, status=500)


def normalize_duration(duration_str):
    """
    Normalize a duration string to ensure it's within reasonable limits.
    Durations are clamped between 5 minutes and 3 days, and rounded to the nearest minute.

    Args:
        duration_str (str): Duration string in format like "1h30m"

    Returns:
        str: Normalized duration string
    """
    minutes = 0

    match = re.match(r'^P((\d{1,10})Y)?((\d{1,10})M)?((\d{1,10})D)?T((\d{1,10})H)?((\d{1,10})M)?((\d{1,10})S)?$', duration_str)
    if match is None:
        logger.warning(f"Invalid duration format: {duration_str}")
        return "PT60M"
    else:
        if match.group(2):
            years = int(match.group(2))
            minutes += years * 365 * 24 * 60
        if match.group(4):
            months = int(match.group(4))
            minutes += months * 30 * 24 * 60
        if match.group(6):
            days = int(match.group(6))
            minutes += days * 24 * 60
        if match.group(8):
            hours = int(match.group(8))
            minutes += hours * 60
        if match.group(10):
            minutes += int(match.group(10))

    minutes = max(MIN_DURATION_MINUTES, min(minutes, MAX_DURATION_DAYS * 24 * 60))

    return f"PT{minutes}M"

def normalize_datetime(dt_str):
    """
    Normalize a datetime string to ensure it's rounded to the nearest minute.

    Args:
        dt_str (str): Datetime string in ISO format

    Returns:
        str: Normalized datetime string
    """
    try:
        dt = datetime.fromisoformat(dt_str.replace('Z', '+00:00'))
        seconds = dt.second
        if seconds >= 30:
            dt = dt + timedelta(minutes=1)
        dt = dt.replace(second=0, microsecond=0)
        return dt.isoformat()
    except Exception as e:
        logger.warning(f"Failed to normalize datetime {dt_str}: {e}")
        return dt_str

def normalize_task_dates(task):
    """
    Normalize all date/time and duration fields in a task.

    Args:
        task (dict): Task data

    Returns:
        dict: Task with normalized dates
    """
    task_type = task.get("type")

    if task_type == "fixed":
        if "start" in task:
            task["start"] = normalize_datetime(task["start"])
        if "end" in task:
            task["end"] = normalize_datetime(task["end"])

        if "start" in task and "end" in task:
            start = datetime.fromisoformat(task["start"].replace('Z', '+00:00'))
            end = datetime.fromisoformat(task["end"].replace('Z', '+00:00'))
            duration_minutes = (end - start).total_seconds() / 60

            if duration_minutes < MIN_DURATION_MINUTES:
                end = start + timedelta(minutes=MIN_DURATION_MINUTES)
                task["end"] = end.isoformat()
            elif duration_minutes > MAX_DURATION_DAYS * 24 * 60:
                end = start + timedelta(days=MAX_DURATION_DAYS)
                task["end"] = end.isoformat()

    elif task_type in ["continuous", "project"]:
        if "kickoff" in task:
            task["kickoff"] = normalize_datetime(task["kickoff"])
        if "deadline" in task:
            task["deadline"] = normalize_datetime(task["deadline"])
        if "duration" in task:
            task["duration"] = normalize_duration(task["duration"])

        if "kickoff" in task and "deadline" in task:
            kickoff = datetime.fromisoformat(task["kickoff"].replace('Z', '+00:00'))
            deadline = datetime.fromisoformat(task["deadline"].replace('Z', '+00:00'))
            duration_minutes = (deadline - kickoff).total_seconds() / 60

            if duration_minutes < MIN_DURATION_MINUTES:
                deadline = kickoff + timedelta(minutes=MIN_DURATION_MINUTES)
                task["deadline"] = deadline.isoformat()

        if task_type == "project" and "timings" in task:
            timings = task["timings"]
            if "work" in timings:
                timings["work"] = normalize_duration(timings["work"])
            if "smallBreak" in timings:
                timings["smallBreak"] = normalize_duration(timings["smallBreak"])
            if "bigBreak" in timings:
                timings["bigBreak"] = normalize_duration(timings["bigBreak"])

    return task

async def route_user_task_create(request):
    """
    Handler for POST /user/{user_id}/task

    Creates a new task for a user.

    Args:
        request (Request): The HTTP request object with task data in JSON body

    Returns:
        Response: JSON response with the created task or error
    """
    try:
        success, user_id_or_error = safe_int(request.match_info['user_id'], "User ID")
        if not success:
            return web.json_response({
                "status": "error",
                "message": user_id_or_error
            }, status=400)

        user_id = user_id_or_error

        # Check if user has reached the task limit
        task_count = await db.tasks.count_documents({"userId": user_id})
        if task_count >= MAX_TASKS_PER_USER:
            return web.json_response({
                "status": "error",
                "message": f"Maximum number of tasks ({MAX_TASKS_PER_USER}) reached for this user"
            }, status=400)

        try:
            task = await request.json()
        except json.JSONDecodeError:
            return web.json_response({
                "status": "error",
                "message": "Invalid JSON in request body"
            }, status=400)

        # Normalize task dates and durations
        task = normalize_task_dates(task)

        # Validate task before insertion
        valid, error = validate_schema(task, "RawTask")
        if not valid:
            return web.json_response({
                "status": "error",
                "message": error
            }, status=400)

        # Check user ID consistency if present
        if "userId" in task and task["userId"] != user_id:
            return web.json_response({
                "status": "error",
                "message": "User ID in task does not match URL parameter"
            }, status=400)

        task["userId"] = user_id

        # Insert task
        try:
            result = await db.tasks.insert_one(task)
            if not result.inserted_id:
                return web.json_response({
                    "status": "error",
                    "message": "Failed to insert task"
                }, status=500)

            # Update task with the new ID
            task["_id"] = result.inserted_id
            fixed_task = fix_object_id(task)

            await emit_state(user_id)
            return web.json_response({
                "status": "ok",
                "result": fixed_task,
            }, status=201)
        except Exception as e:
            logger.error(f"Database error in task creation: {e}")
            return web.json_response({
                "status": "error",
                "message": f"Database error: {str(e)}"
            }, status=500)

    except Exception as e:
        logger.error(f"Error in route_user_task_create: {e}")
        return web.json_response({
            "status": "error",
            "message": str(e)
        }, status=500)


async def route_user_task_update(request):
    """
    Handler for PUT /user/{user_id}/task/{task_id}

    Updates an existing task.

    Args:
        request (Request): The HTTP request object with updated task data

    Returns:
        Response: JSON response with the updated task or error
    """
    try:
        success, user_id_or_error = safe_int(request.match_info['user_id'], "User ID")
        if not success:
            return web.json_response({
                "status": "error",
                "message": user_id_or_error
            }, status=400)

        user_id = user_id_or_error
        task_id = request.match_info['task_id']

        success, obj_id_or_error = safe_object_id(task_id)
        if not success:
            return web.json_response({
                "status": "error",
                "message": obj_id_or_error
            }, status=400)

        obj_id = obj_id_or_error

        try:
            task = await request.json()
        except json.JSONDecodeError:
            return web.json_response({
                "status": "error",
                "message": "Invalid JSON in request body"
            }, status=400)

        # Normalize task dates and durations
        task = normalize_task_dates(task)

        valid, error = validate_schema(task, "RawTask")
        if not valid:
            return web.json_response({
                "status": "error",
                "message": error
            }, status=400)

        existing_task = await db.tasks.find_one({"_id": obj_id})
        if not existing_task or existing_task.get("userId") != user_id:
            return web.json_response({
                "status": "error",
                "message": "Task not found"
            }, status=404)

        result = await db.tasks.update_one({"_id": obj_id}, {"$set": task})

        if result.matched_count:
            updated_task = await db.tasks.find_one({"_id": obj_id})
            fixed_task = fix_object_id(updated_task)

            await emit_state(user_id)
            return web.json_response({
                "status": "ok",
                "result": fixed_task,
            })
        return web.json_response({
            "status": "error",
            "message": "Task not found"
        }, status=404)
    except Exception as e:
        logger.error(f"Error in route_user_task_update: {e}")
        return web.json_response({
            "status": "error",
            "message": str(e)
        }, status=500)


async def route_user_task_delete(request):
    """
    Handler for DELETE /user/{user_id}/task/{task_id}

    Deletes a task by ID.

    Args:
        request (Request): The HTTP request object

    Returns:
        Response: JSON response with success message or error
    """
    try:
        success, user_id_or_error = safe_int(request.match_info['user_id'], "User ID")
        if not success:
            return web.json_response({
                "status": "error",
                "message": user_id_or_error
            }, status=400)

        user_id = user_id_or_error
        task_id = request.match_info['task_id']

        success, obj_id_or_error = safe_object_id(task_id)
        if not success:
            return web.json_response({
                "status": "error",
                "message": obj_id_or_error
            }, status=400)

        obj_id = obj_id_or_error

        # Check if task exists and belongs to user
        existing_task = await db.tasks.find_one({"_id": obj_id})
        if not existing_task:
            return web.json_response({
                "status": "error",
                "message": "Task not found"
            }, status=404)

        if existing_task.get("userId") != user_id:
            return web.json_response({
                "status": "error",
                "message": "Task belongs to a different user"
            }, status=403)

        result = await db.tasks.delete_one({"_id": obj_id})

        if result.deleted_count:
            await emit_state(user_id)
            return web.json_response({
                "status": "ok",
                "message": "Task deleted"
            }, status=200)
        return web.json_response({
            "status": "error",
            "message": "Task not found"
        }, status=404)
    except Exception as e:
        logger.error(f"Error in route_user_task_delete: {e}")
        return web.json_response({
            "status": "error",
            "message": str(e)
        }, status=500)


async def route_user_slots(request):
    """
    Handler for GET /user/{user_id}/slot

    Retrieves all slots for a user.

    Args:
        request (Request): The HTTP request object

    Returns:
        Response: JSON response with slots or error
    """
    try:
        success, user_id_or_error = safe_int(request.match_info['user_id'], "User ID")
        if not success:
            return web.json_response({
                "status": "error",
                "message": user_id_or_error
            }, status=400)

        user_id = user_id_or_error
        slots = await db.slots.find({"userId": user_id}).to_list(None)
        fixed_slots = fix_object_id(slots)

        return web.json_response({
            "status": "ok",
            "result": fixed_slots,
        })
    except Exception as e:
        logger.error(f"Error in route_user_slots: {e}")
        return web.json_response({
            "status": "error",
            "message": str(e)
        }, status=500)


async def do_scheduling(user_id, tasks) -> str | None:
    try:
        async with aiohttp.ClientSession() as session:
            async with session.post(SOLVER_SERVER_URL, json=fix_object_id(tasks)) as resp:
                if resp.status != 200:
                    error_message = await resp.text()
                    logger.error(f"Error in do_scheduling ({resp.status}): {error_message}")
                    return f"Solver server returned error: {error_message}"

                response_data = await resp.json()

        slots = response_data
        for slot in slots:
            slot["userId"] = user_id

        await db.slots.delete_many({"userId": user_id})
        if slots:
            await db.slots.insert_many(slots)

        await emit_state(user_id)
        return None
    except Exception as e:
        logger.error(f"Error in do_scheduling: {e}")
        return f"Unknown scheduling error: {str(e)}"


async def route_user_compute_slot_request(request):
    """
    Handler for POST /user/{user_id}/compute_slot_request

    Initiates the scheduling process for a user's tasks.

    Note: if scheduling operations fails, the user will not be notified

    Args:
        request (Request): The HTTP request object

    Returns:
        Response: JSON response indicating success or error
    """
    try:
        success, user_id_or_error = safe_int(request.match_info['user_id'], "User ID")
        if not success:
            return web.json_response({
                "status": "error",
                "message": user_id_or_error
            }, status=400)

        user_id = user_id_or_error

        tasks = await db.tasks.find({"userId": user_id}).to_list(None)

        options = await request.json()
        if not isinstance(options, dict):
            return web.json_response({
                "status": "error",
                "message": "Invalid options format, expected JSON object"
            }, status=400)

        if "sync" in options and options["sync"]:
            error = await do_scheduling(user_id, tasks)
            if error:
                return web.json_response({
                    "status": "error",
                    "message": error
                }, status=500)
        else:
            asyncio.create_task(do_scheduling(user_id, tasks))

        return web.json_response({
            "status": "ok",
            "result": None,
        }, status=201)
    except Exception as e:
        logger.error(f"Error in route_user_compute_slot_request: {e}")
        return web.json_response({
            "status": "error",
            "message": str(e)
        }, status=500)



async def websocket_handler(request):
    """
    Handler for GET /user/{user_id}/ws

    Establishes a WebSocket connection for real-time updates.
    Stores the connection in the CONNECTIONS dictionary organized by user_id.

    Args:
        request (Request): The HTTP request object for the WebSocket upgrade

    Returns:
        WebSocketResponse: The established WebSocket connection
    """
    ws = web.WebSocketResponse()

    try:
        success, user_id_or_error = safe_int(request.match_info['user_id'], "User ID")
        if not success:
            await ws.prepare(request)
            await ws.close(code=1007, message=user_id_or_error.encode())
            return ws

        user_id = user_id_or_error
        await ws.prepare(request)

        connection_id = uuid.uuid4()

        # Initialize user dict if not exists
        if user_id not in CONNECTIONS:
            CONNECTIONS[user_id] = {}

        # Store connection
        CONNECTIONS[user_id][connection_id] = ws

        try:
            async for msg in ws:
                if msg.type == WSMsgType.TEXT:
                    if msg.data == "ping":
                        await emit_state(user_id)
                    else:
                        logger.info(f"Received unknown message: {msg.data}")
                elif msg.type == WSMsgType.ERROR:
                    logger.error(f"WebSocket connection closed with exception {ws.exception()}")
        finally:
            # Clean up the connection
            if user_id in CONNECTIONS:
                CONNECTIONS[user_id].pop(connection_id, None)
                # Remove user entry if no connections left
                if not CONNECTIONS[user_id]:
                    CONNECTIONS.pop(user_id, None)
        return ws
    except Exception as e:
        logger.error(f"Error in websocket_handler: {e}")
        if not ws.closed:
            await ws.close(code=1011, message=str(e).encode())
        return ws


app = web.Application()
app.router.add_get("/api/v0/user/{user_id}/state", route_user_state)
app.router.add_get("/api/v0/user/{user_id}/task", route_user_tasks)
app.router.add_get("/api/v0/user/{user_id}/task/{task_id}", route_user_task)
app.router.add_post("/api/v0/user/{user_id}/task", route_user_task_create)
app.router.add_put("/api/v0/user/{user_id}/task/{task_id}", route_user_task_update)
app.router.add_delete("/api/v0/user/{user_id}/task/{task_id}", route_user_task_delete)
app.router.add_get("/api/v0/user/{user_id}/slot", route_user_slots)
app.router.add_post("/api/v0/user/{user_id}/compute_slot_request", route_user_compute_slot_request)
app.router.add_get("/api/v0/user/{user_id}/ws", websocket_handler)

cors = aiohttp_cors.setup(app, defaults={
    "*": aiohttp_cors.ResourceOptions(
        allow_credentials=True,
        expose_headers="*",
        allow_headers="*",
        allow_methods=["GET", "POST", "PUT", "DELETE", "OPTIONS"],
    )
})

for route in list(app.router.routes()):
    cors.add(route)

if __name__ == "__main__":
    web.run_app(app, host=BACKEND_HOST_ADDRESS, port=int(BACKEND_PORT))
