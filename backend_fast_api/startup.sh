#!/bin/bash
export PYTHONPATH=/home/site/wwwroot/src:$PYTHONPATH
uvicorn hgs_refuce_app.main:app --host 0.0.0.0 --port ${PORT:-8000}
