FROM python:3.12-slim

WORKDIR /app

# Copy the source code first
COPY backend_fast_api/ .

# Install dependencies and the package in editable mode
RUN pip install --no-cache-dir -r requirements.txt && pip install --no-cache-dir -e .

# Expose port 8000
EXPOSE 8000

# Run gunicorn
CMD ["gunicorn", "--workers", "4", "--bind", "0.0.0.0:8000", "hgs_refuce_app.main:app"]
