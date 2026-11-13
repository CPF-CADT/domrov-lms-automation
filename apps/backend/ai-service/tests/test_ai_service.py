import os
from pathlib import Path

os.environ["DATABASE_URL"] = "sqlite:///./test-ai.db"

from app.db import EvaluationStore
from app.payment_client import PaymentServiceClient
from app import worker
from app import queue as evaluation_queue
from app.http import create_app


def test_admin_http_api_requires_token_and_exposes_usage(tmp_path: Path):
    from fastapi.testclient import TestClient

    store = EvaluationStore(f"sqlite:///{tmp_path / 'http.db'}")
    store.create({"evaluation_id": "eval-http", "submission_id": "sub-http", "assignment_id": "a-http", "user_id": "u-http", "language": "python", "resource_key": "r-http", "status": "QUEUED", "request_id": "req-http"})
    client = TestClient(create_app(store, "admin-secret"))
    assert client.get("/admin/usage").status_code == 403
    response = client.get("/admin/usage", headers={"X-Admin-Token": "admin-secret"})
    assert response.status_code == 200
    assert response.json()["totalEvaluations"] == 1
    logs = client.get("/admin/logs?evaluation_id=eval-http", headers={"X-Admin-Token": "admin-secret"})
    assert logs.status_code == 200
    assert logs.json()["items"][0]["event"] == "created"


def test_evaluation_store_persists_and_updates(tmp_path: Path):
    store = EvaluationStore(f"sqlite:///{tmp_path / 'ai.db'}")
    store.create({"evaluation_id": "eval-1", "submission_id": "sub-1", "assignment_id": "a-1", "user_id": "u-1", "language": "python", "resource_key": "r-1", "status": "QUEUED", "request_id": "req-1"})
    store.update("eval-1", status="COMPLETED", score=90.0, feedback="ok")
    record = store.get("eval-1")
    assert record["status"] == "COMPLETED"
    assert record["score"] == 90.0
    assert store.list_logs(evaluation_id="eval-1")[-1]["event"] == "status_changed"


def test_usage_summary_and_admin_log_projection(tmp_path: Path):
    store = EvaluationStore(f"sqlite:///{tmp_path / 'usage.db'}")
    store.create({"evaluation_id": "eval-1", "submission_id": "sub-1", "assignment_id": "a-1", "user_id": "u-1", "language": "python", "resource_key": "r-1", "status": "QUEUED", "request_id": "req-1"})
    store.create({"evaluation_id": "eval-2", "submission_id": "sub-2", "assignment_id": "a-1", "user_id": "u-2", "language": "javascript", "resource_key": "r-2", "status": "FAILED", "request_id": "req-2", "attempts": 2})
    store.update("eval-1", status="COMPLETED", score=88.0, feedback="ok")
    summary = store.usage_summary()
    assert summary["totalEvaluations"] == 2
    assert summary["byLanguage"] == {"python": 1, "javascript": 1}
    assert summary["byStatus"] == {"COMPLETED": 1, "FAILED": 1}
    assert summary["totalAttempts"] == 2
    assert summary["averageScore"] == 88.0
    assert len(store.list_logs(evaluation_id="eval-1")) == 2


def test_payment_client_has_no_database_dependency():
    client = PaymentServiceClient("http://payment-service:3003")
    assert client.base_url.endswith(":3003")


def test_payment_client_matches_payment_service_contract(monkeypatch):
    calls = []

    class Response:
        def __init__(self, payload=None):
            self.payload = payload or {"reservationId": "res-1", "status": "reserved", "amount": 1}

        def raise_for_status(self):
            return None

        def json(self):
            return self.payload

    def post(url, **kwargs):
        calls.append((url, kwargs))
        return Response()

    monkeypatch.setattr("app.payment_client.requests.post", post)
    client = PaymentServiceClient("http://payment-service:3003", "service-token")
    reservation = client.reserve("user-1", "eval-1")
    client.commit(reservation.reservation_id, "eval-1")
    client.release(reservation.reservation_id, "eval-2")

    assert reservation.approved is True
    assert calls[0][0].endswith("/credits/reservations")
    assert calls[1][0].endswith("/credits/reservations/res-1/commit")
    assert calls[2][0].endswith("/credits/reservations/res-1/release")
    assert calls[0][1]["headers"]["Authorization"] == "Bearer service-token"
    assert calls[0][1]["headers"]["Idempotency-Key"] == "eval-1"


def test_worker_invokes_preserved_evaluator_and_persists_output(tmp_path: Path, monkeypatch):
    database_url = f"sqlite:///{tmp_path / 'worker.db'}"
    store = EvaluationStore(database_url)
    store.create({"evaluation_id": "eval-2", "submission_id": "sub-2", "assignment_id": "a-2", "user_id": "u-2", "language": "python", "resource_key": "./submission", "status": "QUEUED", "request_id": "req-2"})

    class ApprovedPayment:
        def reserve(self, user_id, reference_id):
            return type("Reservation", (), {"approved": True, "reservation_id": "res-2"})()
        def commit(self, reservation_id, reference_id):
            return None
        def release(self, reservation_id, reference_id):
            return None

    monkeypatch.setattr(worker, "settings", type("Settings", (), {"database_url": database_url, "payment_service_url": "http://payment"})())
    monkeypatch.setattr(worker, "PaymentServiceClient", lambda *args: ApprovedPayment())
    monkeypatch.setattr(worker, "evaluate", lambda **kwargs: {"result": {"scores": [8, 9], "feedback": "Strong solution"}})

    worker.process_evaluation({"evaluation_id": "eval-2", "submission_id": "sub-2", "assignment_id": "a-2", "user_id": "u-2", "language": "python", "resource_key": "./submission", "rubric": [{"criterion": "correctness", "weight": 10}, {"criterion": "style", "weight": 10}]})

    record = store.get("eval-2")
    assert record["status"] == "COMPLETED"
    assert record["score"] == 17.0
    assert record["feedback"] == "Strong solution"


def test_worker_persists_failure_when_evaluator_raises(tmp_path: Path, monkeypatch):
    database_url = f"sqlite:///{tmp_path / 'worker-failure.db'}"
    store = EvaluationStore(database_url)
    store.create({"evaluation_id": "eval-3", "submission_id": "sub-3", "assignment_id": "a-3", "user_id": "u-3", "language": "python", "resource_key": "./submission", "status": "QUEUED", "request_id": "req-3"})

    class ApprovedPayment:
        def reserve(self, user_id, reference_id):
            return type("Reservation", (), {"approved": True, "reservation_id": "res-3"})()
        def commit(self, reservation_id, reference_id):
            raise AssertionError("failed evaluation must not commit credits")
        def release(self, reservation_id, reference_id):
            return None

    monkeypatch.setattr(worker, "settings", type("Settings", (), {"database_url": database_url, "payment_service_url": "http://payment"})())
    monkeypatch.setattr(worker, "PaymentServiceClient", lambda *args: ApprovedPayment())
    monkeypatch.setattr(worker, "evaluate", lambda **kwargs: (_ for _ in ()).throw(RuntimeError("provider down")))

    import pytest
    with pytest.raises(RuntimeError, match="provider down"):
        worker.process_evaluation({"evaluation_id": "eval-3", "submission_id": "sub-3", "assignment_id": "a-3", "user_id": "u-3", "language": "python", "resource_key": "./submission", "rubric": [{"criterion": "correctness", "weight": 10}]})

    record = store.get("eval-3")
    assert record["status"] == "FAILED"
    assert record["error_code"] == "EVALUATION_FAILED"


def test_redis_enqueue_dispatches_worker_entrypoint(monkeypatch):
    calls = []

    class FakeRedis:
        pass

    class FakeQueue:
        def __init__(self, name, connection):
            assert name == "ai-evaluations"
            assert isinstance(connection, FakeRedis)

        def enqueue(self, function, payload, job_timeout):
            calls.append((function, payload, job_timeout))
            return type("Job", (), {"id": "job-1"})()

    monkeypatch.setattr(evaluation_queue.Redis, "from_url", lambda _url, decode_responses: FakeRedis())
    monkeypatch.setattr(evaluation_queue, "Queue", FakeQueue)
    payload = {"evaluation_id": "eval-queue", "submission_id": "sub-queue"}

    assert evaluation_queue.enqueue("redis://test", payload) == "job-1"
    assert calls == [("app.worker.process_evaluation", payload, 600)]
