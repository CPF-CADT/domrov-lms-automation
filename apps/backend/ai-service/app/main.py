from rq import Connection, Queue, Worker
from redis import Redis
import uvicorn

from app.config import settings
from app.db import EvaluationStore
from app.grpc_service import create_server
from app.http import create_app


def run_api() -> None:
    store = EvaluationStore(settings.database_url)
    grpc_server = create_server(store, settings)
    grpc_server.start()
    try:
        uvicorn.run(create_app(store, settings.ai_admin_token), host=settings.http_host, port=settings.http_port, log_level="info")
    finally:
        grpc_server.stop(0)


def run_worker() -> None:
    redis = Redis.from_url(settings.redis_url)
    with Connection(redis):
        Worker([Queue("ai-evaluations")]).work()


if __name__ == "__main__":
    import sys
    (run_worker if len(sys.argv) > 1 and sys.argv[1] == "worker" else run_api)()
