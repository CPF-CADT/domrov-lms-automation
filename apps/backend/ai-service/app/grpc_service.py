from concurrent import futures
import uuid
import grpc

from app.db import EvaluationStore
from app.queue import enqueue
from app.config import Settings
from app.proto import evaluation_pb2, evaluation_pb2_grpc


class EvaluationServicer(evaluation_pb2_grpc.EvaluationServiceServicer):
    def __init__(self, store: EvaluationStore, settings: Settings):
        self.store = store
        self.settings = settings

    def SubmitEvaluation(self, request, context):
        evaluation_id = str(uuid.uuid4())
        record = {"evaluation_id": evaluation_id, "submission_id": request.submission_id,
                  "assignment_id": request.assignment_id, "user_id": request.user_id,
                  "language": request.language, "resource_key": request.resource_key,
                  "status": "QUEUED", "request_id": request.request_id or str(uuid.uuid4())}
        try:
            self.store.create(record)
            enqueue(self.settings.redis_url, {**record, "rubric": [{"criterion": item.criterion, "weight": item.weight} for item in request.rubric], "include_paths": list(request.include_paths), "exclude_paths": list(request.exclude_paths)})
        except Exception:
            self.store.update(evaluation_id, status="FAILED", error_code="QUEUE_UNAVAILABLE")
            context.set_code(grpc.StatusCode.UNAVAILABLE)
            context.set_details("Evaluation queue is unavailable")
            return evaluation_pb2.SubmitEvaluationResponse(evaluation_id=evaluation_id, status=evaluation_pb2.FAILED)
        return evaluation_pb2.SubmitEvaluationResponse(evaluation_id=evaluation_id, status=evaluation_pb2.QUEUED)

    def GetEvaluationStatus(self, request, context):
        record = self.store.get(request.evaluation_id)
        if not record:
            context.set_code(grpc.StatusCode.NOT_FOUND)
            return evaluation_pb2.EvaluationStatusResponse()
        return evaluation_pb2.EvaluationStatusResponse(evaluation_id=record["evaluation_id"], submission_id=record["submission_id"], status=getattr(evaluation_pb2, record["status"], 0), score=record["score"] or 0.0, feedback=record["feedback"], error_code=record["error_code"])

    def CancelEvaluation(self, request, context):
        record = self.store.get(request.evaluation_id)
        if not record:
            context.set_code(grpc.StatusCode.NOT_FOUND)
            return evaluation_pb2.EvaluationStatusResponse()
        if record["status"] not in ("COMPLETED", "FAILED"):
            self.store.update(request.evaluation_id, status="CANCELLED")
        return self.GetEvaluationStatus(request, context)


def create_server(store: EvaluationStore, settings: Settings) -> grpc.Server:
    server = grpc.server(futures.ThreadPoolExecutor(max_workers=10))
    evaluation_pb2_grpc.add_EvaluationServiceServicer_to_server(EvaluationServicer(store, settings), server)
    server.add_insecure_port(f"{settings.grpc_host}:{settings.grpc_port}")
    return server
