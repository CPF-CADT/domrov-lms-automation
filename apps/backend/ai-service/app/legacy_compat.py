"""Legacy gRPC compatibility adapters for the extracted AI service."""

import json
from pathlib import Path, PurePosixPath

import grpc

from app.db import EvaluationStore
from app.storage_boundary import ExistingStorageBoundary, SubmissionResourceProvider
from protos import evaluate_pb2, evaluate_pb2_grpc
from protos import submission_pb2, submission_pb2_grpc
from utils.evaluation_workspace import evaluation_workspace
from utils.find_file import read_file_to_json
from utils.ignore_checker import IgnoreChecker
from utils.read_file import build_directory_json


def _requested_path(value: str) -> PurePosixPath:
    if not value or "\x00" in value or "\\" in value:
        raise ValueError("Invalid requested file path")
    requested = PurePosixPath(value)
    if requested.is_absolute() or any(part in ("", ".", "..") for part in requested.parts):
        raise ValueError("Requested file path must be relative")
    return requested


def _submission_root(base_path: Path) -> Path:
    if not base_path.is_dir():
        return base_path
    items = [item for item in base_path.iterdir() if not item.name.startswith(".")]
    return items[0] if len(items) == 1 and items[0].is_dir() else base_path


def _find_file(root: Path, requested: PurePosixPath) -> Path | None:
    root = root.resolve()
    if root.is_file():
        return root if requested.as_posix() == root.name else None
    candidate = (root / Path(*requested.parts)).resolve()
    return candidate if candidate.is_file() and root in candidate.parents else None


def _resource_workspace(submission_id: str, resource: dict):
    return evaluation_workspace(
        submission_id=submission_id,
        storage_provider=resource.get("storage_provider", ""),
        storage_key=resource.get("storage_key", ""),
        checksum=resource.get("checksum", ""),
        external_url=resource.get("external_url", "") or resource.get("resource_url", ""),
    )


class LegacyEvaluationServicer(evaluate_pb2_grpc.EvaluateWithAIServicer):
    """Preserve the old result-callback RPCs while async evaluation remains primary."""

    def __init__(self, store: EvaluationStore):
        self.store = store

    def EvaluateSubmission(self, request, context):
        submission_id = request.submission_id.strip()
        if not submission_id:
            context.abort(grpc.StatusCode.INVALID_ARGUMENT, "submission_id is required")

        updated = self.store.update_by_submission(
            submission_id,
            status="COMPLETED",
            score=round(sum(request.score.value), 2),
            feedback=request.feedback,
            error_code="",
        )
        message = "Evaluation result stored" if updated else "Evaluation result accepted"
        return evaluate_pb2.EvaluateResponse(success=True, message=message)

    def NotifyUserAiModelInsufficient(self, request, context):
        submission_id = request.submission_id.strip()
        if not submission_id:
            context.abort(grpc.StatusCode.INVALID_ARGUMENT, "submission_id is required")
        self.store.update_by_submission(
            submission_id,
            status="FAILED",
            error_code="AI_MODEL_INSUFFICIENT",
            feedback=request.raw_response_message,
        )
        return evaluate_pb2.NotifyUserAiModelInsufficientResponse(
            success=True, message="AI model limitation recorded"
        )


class LegacySubmissionServicer(submission_pb2_grpc.SubmissionServiceServicer):
    """Serve legacy resource/file RPCs through storage metadata, never Academic DB."""

    def __init__(self, provider: SubmissionResourceProvider | None = None):
        self.provider = provider or ExistingStorageBoundary()

    def _resource(self, submission_id: str) -> dict:
        resource = self.provider.get_resource(submission_id)
        if not resource:
            raise FileNotFoundError("Submission resource not found")
        return resource

    @staticmethod
    def _resource_response(resource: dict):
        return submission_pb2.SubmissionResourceResponse(
            resource_url=resource.get("resource_url", ""),
            storage_provider=resource.get("storage_provider", ""),
            storage_key=resource.get("storage_key", ""),
            checksum=resource.get("checksum", ""),
            external_url=resource.get("external_url", "") or resource.get("resource_url", ""),
        )

    def GetSubmissionResource(self, request, context):
        try:
            return self._resource_response(self._resource(str(request.submission_id)))
        except FileNotFoundError as error:
            context.abort(grpc.StatusCode.NOT_FOUND, str(error))

    def GetSubmission(self, request, context):
        try:
            submission = self.provider.get_submission(str(request.submission_id))
            if not submission:
                context.abort(grpc.StatusCode.NOT_FOUND, "Submission not found")
            response = submission_pb2.SubmissionContentResponse(
                submission_id=submission.get("submission_id", str(request.submission_id)),
                instructions=submission.get("instructions", ""),
                resource_url=submission.get("resource_url", ""),
                storage_provider=submission.get("storage_provider", ""),
                storage_key=submission.get("storage_key", ""),
                checksum=submission.get("checksum", ""),
                external_url=submission.get("external_url", "") or submission.get("resource_url", ""),
                user_include_files=submission.get("user_include_files", []),
                user_exclude_files=submission.get("user_exclude_files", []),
            )
            response.rubric.extend(
                submission_pb2.RubricCriterion(criterion=item.get("criterion", ""), weight=item.get("weight", 0))
                for item in submission.get("rubric", [])
            )
            ai = submission.get("ai")
            if ai:
                response.ai.CopyFrom(submission_pb2.AIKeyInfo(
                    provider=ai.get("provider", ""),
                    api_key=ai.get("apiKey", ai.get("api_key", "")),
                    api_endpoint=ai.get("apiEndpoint", ai.get("api_endpoint", "")),
                    model=ai.get("model", ""),
                    label=ai.get("label", ""),
                ))
            return response
        except FileNotFoundError as error:
            context.abort(grpc.StatusCode.NOT_FOUND, str(error))

    def GetSubmissionFolderStructure(self, request, context):
        try:
            submission_id = str(request.submission_id)
            resource = self._resource(submission_id)
            with _resource_workspace(submission_id, resource) as base_path:
                root = _submission_root(base_path)
                tree = build_directory_json(root, IgnoreChecker(root, None, None)) or {}
                return submission_pb2.SubmissionFolderStructureResponse(folder_structure=json.dumps(tree))
        except FileNotFoundError as error:
            context.abort(grpc.StatusCode.NOT_FOUND, str(error))
        except (ValueError, OSError) as error:
            context.abort(grpc.StatusCode.INVALID_ARGUMENT, str(error))

    def ProcessSubmission(self, request, context):
        try:
            submission_id = str(request.submission_id)
            requested = _requested_path(request.file_path)
            resource = self._resource(submission_id)
            with _resource_workspace(submission_id, resource) as base_path:
                root = _submission_root(base_path)
                found = _find_file(root, requested)
                if not found:
                    return submission_pb2.SubmissionResponse(success=False, message="File not found")
                content = read_file_to_json(found, submission_id)
                content["path"] = found.name if root.is_file() else str(found.relative_to(root).as_posix())
                return submission_pb2.SubmissionResponse(success=True, file=submission_pb2.FileContent(**content))
        except ValueError as error:
            context.abort(grpc.StatusCode.INVALID_ARGUMENT, str(error))
        except FileNotFoundError as error:
            context.abort(grpc.StatusCode.NOT_FOUND, str(error))


def register_legacy_services(server, store: EvaluationStore, provider: SubmissionResourceProvider | None = None) -> None:
    evaluate_pb2_grpc.add_EvaluateWithAIServicer_to_server(LegacyEvaluationServicer(store), server)
    submission_pb2_grpc.add_SubmissionServiceServicer_to_server(LegacySubmissionServicer(provider), server)
