#!/bin/bash
set -e

echo "Installing Python dependencies..."
cd /home/site/wwwroot/backend_fast_api
pip install --upgrade pip
pip install -r requirements.txt
pip install -e .

echo "Deployment complete"
