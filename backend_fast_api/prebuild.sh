#!/usr/bin/env bash
# prebuild.sh — clean artifacts, set up env file, create/update venv and dependencies.
set -euo pipefail

BACKEND="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"

echo "=== backend prebuild: cleaning artifacts ==="
find "$BACKEND" -type d \( -name "__pycache__" -o -name ".pytest_cache" -o -name "*.egg-info" \) \
    -exec rm -rf {} + 2>/dev/null || true
find "$BACKEND" -name "*.pyc" -o -name "*.pyo" | xargs rm -f 2>/dev/null || true

echo "=== backend prebuild: env setup ==="
if [ ! -f "$BACKEND/.env" ]; then
    cp "$BACKEND/.env.example" "$BACKEND/.env"
    echo "  Created backend_fast_api/.env from .env.example — edit it if needed."
else
    echo "  backend_fast_api/.env already exists, skipping."
fi

echo "=== backend prebuild: setting up venv ==="
if [ ! -d "$BACKEND/.venv" ]; then
    echo "  Creating .venv..."
    python -m venv "$BACKEND/.venv"
fi

source "$BACKEND/.venv/bin/activate"

echo "=== backend prebuild: installing dependencies ==="
pip install -q -r "$BACKEND/requirements.txt"

echo "=== backend prebuild: done ==="
