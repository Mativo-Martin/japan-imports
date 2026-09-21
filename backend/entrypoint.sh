#!/bin/bash
set -e

echo "=== Initializing Japan Imports Backend Service ==="

echo "Waiting for database connection..."
python3 -c "
import time, socket, os, sys
from urllib.parse import urlparse

db_url = os.getenv('DATABASE_URL', 'postgresql://japan_user:japan_dev_pass@db:5432/japan_imports_dev')
parsed = urlparse(db_url)
host = parsed.hostname or 'db'
port = parsed.port or 5432

print(f'Checking database reachability at {host}:{port}...')
for i in range(30):
    try:
        with socket.create_connection((host, port), timeout=2):
            print('Database is reachable!')
            sys.exit(0)
    except Exception as e:
        time.sleep(1)
print('Timed out waiting for database')
sys.exit(1)
"

echo "Running Alembic migrations..."
PYTHONPATH=. alembic upgrade head || echo "Alembic migrations skipped or failed, proceeding..."

echo "Populating database with realistic vehicle listings..."
PYTHONPATH=. python3 app/etl/test_data.py

echo "Starting Uvicorn web server on port 8000..."
exec uvicorn app.main:app --host 0.0.0.0 --port 8000
