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
