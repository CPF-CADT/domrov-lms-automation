import os
from time import sleep

import grpc
from rq import Queue, get_current_job
from rq.registry import ScheduledJobRegistry

from ai.llm.base import AIModel
from ai.llm.evaluation import evaluate
from config.grpc_config import EvaluateClient
from config.redis_connection import RedisSingleton
from utils.custom_exception import InputTokenLimited
from utils.normalize_ai_scores_auto import normalize_ai_scores_auto
from utils.structured_logging import event


LOCK_TIMEOUT_SECONDS = int(os.getenv("EVALUATION_LOCK_TIMEOUT_SECONDS", str(6 * 60 * 60)))


def _remove_job(registry, job):
    if job is not None:
        registry.remove(job)


def process_submission(submission_id: str):
    redis_conn = RedisSingleton.get_instance()
    queue = Queue("submission_queue", connection=redis_conn)
    job = get_current_job(connection=redis_conn)
    registry = ScheduledJobRegistry(queue=queue)
    lock = redis_conn.lock(
        f"evaluation:submission:{submission_id}",
        timeout=LOCK_TIMEOUT_SECONDS,
        blocking_timeout=0,
    )

    if not lock.acquire(blocking=False):
        print(f"Skipping duplicate evaluation job for submission {submission_id}")
        _remove_job(registry, job)
        return

    try:
        _process_submission_locked(submission_id, registry, job)
    finally:
        if lock.owned():
            lock.release()


def _process_submission_locked(submission_id: str, registry, job):
    client = EvaluateClient()
    event("evaluation_start", "processing submission", submission_id=str(submission_id), pid=os.getpid())

    try:
        submission = client.get_submission_content(submission_id)
        event("evaluation_start", "submission metadata fetched", submission_id=str(submission_id))

        if submission is None:
            print(f"Submission {submission_id} not found")
            _remove_job(registry, job)
            return

        ai_info = submission.get("ai") or {}
        provider_raw = (ai_info.get("provider") or "").lower()

        if provider_raw == "domrov":
            api_key = None
            api_endpoint = None
            provider = None
            ai_model = AIModel.OLLAMA_GPT_OSS
        else:
            api_key = ai_info.get("api_key") or ai_info.get("apiKey")
            api_endpoint = ai_info.get("api_endpoint") or ai_info.get("apiEndpoint")
            provider = provider_raw or None
            ai_model = ai_info.get("model")

        raw_response = evaluate(
            submission_id=submission_id,
            resource_url=submission.get("resource_url", ""),
            storage_provider=submission.get("storage_provider", ""),
            storage_key=submission.get("storage_key", ""),
            checksum=submission.get("checksum", ""),
            external_url=submission.get("external_url", ""),
            rubrics=submission.get("rubric", []),
            ai_model=ai_model,
            api_key=api_key,
            api_endpoint=api_endpoint,
            provider=provider,
            user_exclude_files=submission.get("user_exclude_files"),
            user_include_files=submission.get("user_include_files"),
        )

        evaluation_data = raw_response.get("result", {})
        ai_scores = evaluation_data.get("scores", [])
        ai_feedback = evaluation_data.get("feedback", "")
        actual_scores = normalize_ai_scores_auto(submission.get("rubric", []), ai_scores)

        response = client.evaluate_submission(
            submission_id=submission_id,
            scores=actual_scores,
            feedback=ai_feedback,
            input_token=raw_response.get("input_tokens", 0),
            output_token=raw_response.get("output_tokens", 0),
        )
        print(f"Evaluation response: {response}")
        sleep(5)

    except grpc.RpcError as error:
        code = error.code()
        print(f"gRPC error [{code.name}]: {error.details() or 'no details'}")
        if code in (grpc.StatusCode.UNAVAILABLE, grpc.StatusCode.DEADLINE_EXCEEDED, grpc.StatusCode.INTERNAL):
            raise
        _remove_job(registry, job)

    except InputTokenLimited as error:
        _remove_job(registry, job)
        print(f"Submission {submission_id} failed (token limit): {error}")

    except (ValueError, RuntimeError) as error:
        message = str(error).lower()
        auth_keywords = ["token expired", "invalid token", "unauthorized", "api key", "authentication"]
        _remove_job(registry, job)
        if any(keyword in message for keyword in auth_keywords):
            print(f"Permanent authentication failure for submission {submission_id}: {error}")
        else:
            raise

    except Exception as error:
        _remove_job(registry, job)
        event("evaluation_failure", str(error), submission_id=str(submission_id))
        raise
