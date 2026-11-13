from fastapi import FastAPI
from prometheus_client import CONTENT_TYPE_LATEST, Counter, generate_latest
from starlette.responses import Response

from app.db import EvaluationStore


def create_app(store: EvaluationStore) -> FastAPI:
    app = FastAPI(title="DOMROV AI Evaluation Service")
    requests = Counter("ai_http_requests_total", "HTTP requests", ["path"])

    @app.get("/health/live")
    def live():
        requests.labels("/health/live").inc()
        return {"status": "ok"}

    @app.get("/health/ready")
    def ready():
        store.get("readiness-probe")
        requests.labels("/health/ready").inc()
        return {"status": "ready"}

    @app.get("/metrics")
    def metrics():
        return Response(generate_latest(), media_type=CONTENT_TYPE_LATEST)

    @app.get("/evaluations/{evaluation_id}")
    def evaluation(evaluation_id: str):
        requests.labels("/evaluations").inc()
        return store.get(evaluation_id) or {"error": "not_found"}

    return app
