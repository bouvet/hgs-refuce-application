#.env

```
# Copy this file to .env and adjust values for your environment.
# This file is committed to git; .env is not.

APP_ENV=development
DATABASE_PATH=./data.db

# Logging
# LOG_LEVEL: DEBUG | INFO | WARNING | ERROR | CRITICAL
LOG_LEVEL=INFO
# Prod-only: where log files are written and how many records are buffered
# in memory before being flushed on a crash (ERROR/CRITICAL).
LOG_DIR=./logs
LOG_BUFFER_CAPACITY=1000
```

To test localy
```
    # First time
     cp .env.example .env
     # Edit .env — fill in SECRET_KEY and ADMIN_SECRET

     # Build and start
     docker compose up --build

     # Subsequent runs (no code changes)
     docker compose up

     # Clean slate (wipe the database volume)
     docker compose down -v
```
