import json
from typing import Any
from redis import Redis
from rq import Queue


QUEUE_NAME = "ai-evaluations"


def enqueue(redis_url: str, payload: dict[str, Any]) -> str:
    redis = Redis.from_url(redis_url, decode_responses=False)
    job = Queue(QUEUE_NAME, connection=redis).enqueue("app.worker.process_evaluation", payload, job_timeout=600)
    return job.id
