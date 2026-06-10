#!/bin/bash
set -e

# Make sure the package is installed in editable mode
cd /home/site/wwwroot/backend_fast_api
pip install -e .

# Run gunicorn
cd /home/site/wwwroot
gunicorn --workers 4 --bind 0.0.0.0:8000 hgs_refuce_app.main:app
