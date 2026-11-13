from fastapi import FastAPI, Header, HTTPException
from prometheus_client import CONTENT_TYPE_LATEST, Counter, generate_latest
from starlette.responses import Response

from app.db import EvaluationStore


def create_app(store: EvaluationStore, admin_token: str = "") -> FastAPI:
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

    def require_admin(x_admin_token: str | None) -> None:
        if not admin_token or x_admin_token != admin_token:
            raise HTTPException(status_code=403, detail="Administrator access required")

    @app.get("/admin/evaluations")
    def admin_evaluations(status: str | None = None, limit: int = 100, x_admin_token: str | None = Header(default=None)):
        require_admin(x_admin_token)
        return {"items": store.list(status=status, limit=limit)}

    @app.get("/admin/evaluations/{evaluation_id}")
    def admin_evaluation(evaluation_id: str, x_admin_token: str | None = Header(default=None)):
        require_admin(x_admin_token)
        record = store.get(evaluation_id)
        if not record:
            raise HTTPException(status_code=404, detail="Evaluation not found")
        return record

    @app.get("/admin/usage")
    def admin_usage(x_admin_token: str | None = Header(default=None)):
        require_admin(x_admin_token)
        return store.usage_summary()

    @app.get("/admin/logs")
    def admin_logs(evaluation_id: str | None = None, limit: int = 100, x_admin_token: str | None = Header(default=None)):
        require_admin(x_admin_token)
        return {"items": store.list_logs(evaluation_id=evaluation_id, limit=limit)}

    return app
