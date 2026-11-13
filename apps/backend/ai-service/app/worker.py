import logging
from typing import Any

from app.config import settings
from app.db import EvaluationStore
from app.payment_client import PaymentServiceClient
from ai.llm.base import AIModel
from utils.normalize_ai_scores_auto import normalize_ai_scores_auto


def evaluate(*args, **kwargs):
    """Lazy adapter to keep API/worker startup independent of provider SDKs."""
    from ai.llm.evaluation import evaluate as preserved_evaluate
    return preserved_evaluate(*args, **kwargs)


def _run_preserved_evaluator(payload: dict[str, Any]) -> tuple[float, str]:
    """Adapt the new job payload to the preserved evaluator API."""
    model = payload.get("ai_model", AIModel.GEMINI_2_5)
    if isinstance(model, str):
        model = AIModel(model)
    raw = evaluate(
        submission_id=payload["submission_id"],
        resource_url=payload.get("resource_key", ""),
        storage_provider=payload.get("storage_provider", ""),
        storage_key=payload.get("resource_key", ""),
        checksum=payload.get("checksum", ""),
        external_url=payload.get("external_url", "") or payload.get("resource_key", ""),
        rubrics=payload.get("rubric", []),
        user_exclude_files=payload.get("exclude_paths"),
        user_include_files=payload.get("include_paths"),
        ai_model=model,
        api_key=payload.get("api_key"),
        api_endpoint=payload.get("api_endpoint"),
        provider=payload.get("provider"),
    )
    result = raw.get("result") or {}
    scores = result.get("scores") or []
    rubric = payload.get("rubric") or []
    if not scores or len(scores) != len(rubric):
        raise ValueError("Evaluator returned scores that do not match the rubric")
    normalized = normalize_ai_scores_auto(rubric, scores)
    return round(sum(normalized), 2), str(result.get("feedback") or "")


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
        score, feedback = _run_preserved_evaluator(payload)
        store.update(evaluation_id, status="COMPLETED", score=score, feedback=feedback, error_code="")
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
