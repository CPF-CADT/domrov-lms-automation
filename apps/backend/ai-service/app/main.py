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


def run_rabbitmq_worker() -> None:
    from app.rabbitmq_worker import RabbitMQWorker
    RabbitMQWorker(settings).run()


if __name__ == "__main__":
    import sys
    command = sys.argv[1] if len(sys.argv) > 1 else "api"
    {"worker": run_worker, "rabbitmq-worker": run_rabbitmq_worker}.get(command, run_api)()
