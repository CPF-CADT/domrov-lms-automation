import os
import sys
from time import sleep

import grpc
from rq import Queue, get_current_job
from rq.registry import ScheduledJobRegistry

from ai.llm.base import AIModel
from ai.llm.evaluation import evaluate
from utils.normalize_ai_scores_auto import normalize_ai_scores_auto
from utils.custom_exception import InputTokenLimited
from config.grpc_config import EvaluateClient
from config.redis_connection import RedisSingleton


def process_submission(submission_id: str):
    try:
        client = EvaluateClient()
        print(f"Processing submission {submission_id} in PID {os.getpid()}")

        q = Queue("submission_queue", connection=RedisSingleton.get_instance())
        job = get_current_job(connection=RedisSingleton.get_instance())
        registry = ScheduledJobRegistry(queue=q)
        # ---- gRPC fetch (can fail) ----
        submission = client.get_submission_content(submission_id)

        if not submission:
            registry.remove(job)
            print(f"Submission {submission_id} not found, skipping")
            return

        submission_url = submission["resource_url"] 
        submission_rubric = submission["rubric"]

        # ---- Evaluation ----
        raw_response = evaluate(
            submission_id=str(submission_id),
            resource_url=submission_url,
            rubrics=submission_rubric,
            ai_model=AIModel.GEMINI_2_5,
        )
        # Extract the nested data safely
        evaluation_data = raw_response.get("result", {})
        ai_scores = evaluation_data.get("scores", [])
        ai_feedback = evaluation_data.get("feedback", "")

        if not ai_scores:
            print(f"Critical Error: 'scores' not found in nested result for {submission_id}")
            return

        actual_scores = normalize_ai_scores_auto(submission_rubric, ai_scores)

        response = client.evaluate_submission(
            submission_id=submission_id,
            scores=actual_scores,
            feedback=ai_feedback,
            input_token=raw_response.get("input_tokens", 0),
            output_token=raw_response.get("output_tokens", 0),
        )

        print(f"Evaluation response: {response}")
        sleep(30)

    except grpc.RpcError as e:
        # ---- gRPC error: never retry ----
        registry.remove(job)
        print(f"Submission {submission_id} gRPC failed " f"[{e.code()}]: {e.details()}")

    except InputTokenLimited as itl:
        registry.remove(job)
        print(f"Submission {submission_id} failed: {itl}")

    except Exception as e:
        # ---- Retry ONLY if not an application error ----
        code = getattr(e, "code", None) or getattr(
            getattr(e, "error", {}), "code", None
        )

        if code is not None and int(code) >= 400:
            registry.remove(job)
            print(f"Job {submission_id} failed with code {code}, no retry: {e}")
        else:
            # real transient error → allow retry
            raise
