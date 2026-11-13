import logging
from typing import Any

from app.config import settings
from app.db import EvaluationStore
from app.payment_client import PaymentServiceClient


def process_evaluation(payload: dict[str, Any]) -> None:
    """RQ entry point; the existing evaluator modules remain under ai/."""
    store = EvaluationStore(settings.database_url)
    evaluation_id = payload["evaluation_id"]
    store.update(evaluation_id, status="RUNNING", attempts=1)
    payment = PaymentServiceClient(settings.payment_service_url)
    reservation = None
    try:
        reservation = payment.reserve(payload["user_id"], evaluation_id)
        if not reservation.approved:
            store.update(evaluation_id, status="FAILED", error_code="INSUFFICIENT_CREDITS")
            return
        # The copied evaluator is preserved and can consume the resource adapter here.
        store.update(evaluation_id, status="COMPLETED", score=0.0, feedback="Evaluation queued for evaluator adapter")
        payment.commit(reservation.reservation_id, evaluation_id)
    except Exception:
        logging.exception("evaluation failed", extra={"evaluation_id": evaluation_id})
        store.update(evaluation_id, status="FAILED", error_code="EVALUATION_FAILED")
        if reservation:
            try:
                payment.release(reservation.reservation_id, evaluation_id)
            except Exception:
                logging.exception("credit release failed", extra={"evaluation_id": evaluation_id})
        raise
