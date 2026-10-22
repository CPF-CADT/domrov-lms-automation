import json
import logging
import sys
from datetime import datetime, timezone


class JsonFormatter(logging.Formatter):
    def format(self, record):
        return json.dumps({
            "timestamp": datetime.now(timezone.utc).isoformat(),
            "level": record.levelname,
            "event": getattr(record, "event", record.getMessage()),
            "message": record.getMessage(),
            **getattr(record, "fields", {}),
        }, separators=(",", ":"))


logger = logging.getLogger("code_eval")
if not logger.handlers:
    handler = logging.StreamHandler(sys.stdout)
    handler.setFormatter(JsonFormatter())
    logger.addHandler(handler)
    logger.setLevel(logging.INFO)
    logger.propagate = False


def event(name: str, message: str = "", **fields):
    logger.info(message or name, extra={"event": name, "fields": fields})
