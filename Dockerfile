FROM python:3.12-slim

WORKDIR /app

# Copy requirements and install dependencies
COPY backend_fast_api/requirements.txt .
RUN pip install --no-cache-dir -r requirements.txt

# Copy the source code
COPY backend_fast_api/ .

# Install the package in editable mode
RUN pip install -e .

# Expose port 8000
EXPOSE 8000

# Run gunicorn
CMD ["gunicorn", "--workers", "4", "--bind", "0.0.0.0:8000", "hgs_refuce_app.main:app"]
