import os
from pathlib import Path

os.environ["DATABASE_URL"] = "sqlite:///./test-ai.db"

from app.db import EvaluationStore
from app.payment_client import PaymentServiceClient


def test_evaluation_store_persists_and_updates(tmp_path: Path):
    store = EvaluationStore(f"sqlite:///{tmp_path / 'ai.db'}")
    store.create({"evaluation_id": "eval-1", "submission_id": "sub-1", "assignment_id": "a-1", "user_id": "u-1", "language": "python", "resource_key": "r-1", "status": "QUEUED", "request_id": "req-1"})
    store.update("eval-1", status="COMPLETED", score=90.0, feedback="ok")
    record = store.get("eval-1")
    assert record["status"] == "COMPLETED"
    assert record["score"] == 90.0


def test_payment_client_has_no_database_dependency():
    client = PaymentServiceClient("http://payment-service:3003")
    assert client.base_url.endswith(":3003")
