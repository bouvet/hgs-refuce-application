#!/usr/bin/env bash
# build.sh — run prebuild, then test and verify the backend.
set -euo pipefail

BACKEND="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"

echo "=== backend build: running prebuild ==="
"$BACKEND/prebuild.sh"

echo "=== backend build: clearing build artifacts ==="
find "$BACKEND" -type d \( -name "__pycache__" -o -name ".pytest_cache" -o -name "*.egg-info" \) \
    -exec rm -rf {} + 2>/dev/null || true
find "$BACKEND" -name "*.pyc" -o -name "*.pyo" | xargs rm -f 2>/dev/null || true

echo "=== backend build: running tests ==="
source "$BACKEND/.venv/bin/activate"
cd "$BACKEND"
PYTHONPATH="$BACKEND/src" pytest

echo "=== backend build: verifying imports ==="
PYTHONPATH="$BACKEND/src" python -c "from hgs_refuce_app.main import app; print('  Backend imports OK')"

echo "=== backend build: done ==="
