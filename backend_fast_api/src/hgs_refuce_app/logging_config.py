"""
Logging configuration for the backend.

Behavior is driven by environment variables (see .env.example):

    APP_ENV             "development" (default) or "production"
    LOG_LEVEL           DEBUG | INFO (default) | WARNING | ERROR | CRITICAL
    LOG_DIR             prod-only: directory for log files (default "./logs")
    LOG_BUFFER_CAPACITY prod-only: max records kept in memory (default 1000)

Dev: writes to stderr.
Prod: never writes to stdout/stderr. Records are buffered in memory and
flushed to a rotating file only when an ERROR/CRITICAL is logged, or on
clean shutdown. This keeps logs off shared terminals while still preserving
context around crashes.

To change the level without touching code, set LOG_LEVEL in .env. To change
the level in code, edit DEFAULT_LEVEL below.
"""

from __future__ import annotations

import logging
import logging.handlers
import os
from pathlib import Path

DEFAULT_LEVEL = "INFO"
DEFAULT_LOG_DIR = "./logs"
DEFAULT_BUFFER_CAPACITY = 1000
LOG_FILE_NAME = "app.log"
LOG_FILE_MAX_BYTES = 5_000_000
LOG_FILE_BACKUP_COUNT = 5

_LOG_FORMAT = "%(asctime)s %(levelname)-8s %(name)s: %(message)s"

_memory_handler: logging.handlers.MemoryHandler | None = None
_configured = False


def _resolve_level() -> int:
    name = os.environ.get("LOG_LEVEL", DEFAULT_LEVEL).upper()
    return logging.getLevelName(name) if name in logging._nameToLevel else logging.INFO


def _is_production() -> bool:
    return os.environ.get("APP_ENV", "development").lower() == "production"


def setup_logging() -> None:
    """Configure the root logger. Safe to call more than once."""
    global _memory_handler, _configured
    if _configured:
        return

    level = _resolve_level()
    formatter = logging.Formatter(_LOG_FORMAT)

    root = logging.getLogger()
    root.setLevel(level)
    # Strip any handlers a previous import attached (e.g. uvicorn defaults).
    for h in list(root.handlers):
        root.removeHandler(h)

    if _is_production():
        log_dir = Path(os.environ.get("LOG_DIR", DEFAULT_LOG_DIR))
        log_dir.mkdir(parents=True, exist_ok=True)
        file_handler = logging.handlers.RotatingFileHandler(
            log_dir / LOG_FILE_NAME,
            maxBytes=LOG_FILE_MAX_BYTES,
            backupCount=LOG_FILE_BACKUP_COUNT,
            encoding="utf-8",
        )
        file_handler.setFormatter(formatter)
        capacity = int(
            os.environ.get("LOG_BUFFER_CAPACITY", DEFAULT_BUFFER_CAPACITY)
        )
        # Buffer everything in memory; flush to disk only when something at
        # ERROR or above is logged (i.e. on a crash). flushOnClose handles
        # clean shutdown via flush_logs().
        _memory_handler = logging.handlers.MemoryHandler(
            capacity=capacity,
            flushLevel=logging.ERROR,
            target=file_handler,
            flushOnClose=False,
        )
        root.addHandler(_memory_handler)
    else:
        stream_handler = logging.StreamHandler()
        stream_handler.setFormatter(formatter)
        root.addHandler(stream_handler)

    _configured = True
    logging.getLogger(__name__).debug(
        "logging configured: env=%s level=%s",
        "production" if _is_production() else "development",
        logging.getLevelName(level),
    )


def flush_logs(reason: str | None = None) -> None:
    """Flush the prod buffer to disk. Call on shutdown or from a custom
    trigger (e.g. a future auth module flushing after N failed logins)."""
    if _memory_handler is None:
        return
    if reason:
        logging.getLogger(__name__).info("flushing log buffer: %s", reason)
    _memory_handler.flush()
