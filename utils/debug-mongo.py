import subprocess
import dotenv
import os

dotenv.load_dotenv()

MONGO_USERNAME = os.environ.get("MONGO_INITDB_ROOT_USERNAME", "root")
MONGO_PASSWORD = os.environ.get("MONGO_INITDB_ROOT_PASSWORD", "example")
MONGO_URI = os.environ.get("MONGO_URI")
DB_NAME = os.environ.get("DB_NAME", "schedge")

subprocess.run([
    "docker",
    "run",
    "--rm",
    "-it",
    "-p", "27017:27017",
    "-e", f"MONGO_INITDB_ROOT_USERNAME={MONGO_USERNAME}",
    "-e", f"MONGO_INITDB_ROOT_PASSWORD={MONGO_PASSWORD}",
    "-e", f"MONGO_INITDB_DATABASE={DB_NAME}",
    "-v", f"{os.getcwd()}/data/mongo-data:/data/db",
    "mongo:latest",
])
