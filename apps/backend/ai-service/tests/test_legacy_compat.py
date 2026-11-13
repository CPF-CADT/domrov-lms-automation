from contextlib import contextmanager
from pathlib import Path

import grpc

from app.db import EvaluationStore
from app.legacy_compat import LegacyEvaluationServicer, LegacySubmissionServicer
from app import legacy_compat
from protos import evaluate_pb2, submission_pb2


class Context:
    def abort(self, code, details):
        raise RuntimeError(f"{code.name}: {details}")


def test_legacy_evaluation_callback_updates_async_record(tmp_path: Path):
    store = EvaluationStore(f"sqlite:///{tmp_path / 'ai.db'}")
    store.create({
        "evaluation_id": "eval-legacy",
        "submission_id": "submission-legacy",
        "assignment_id": "assignment-1",
        "user_id": "user-1",
        "language": "python",
        "resource_key": "submission.zip",
        "status": "RUNNING",
        "request_id": "request-1",
    })

    response = LegacyEvaluationServicer(store).EvaluateSubmission(
        evaluate_pb2.EvaluateRequest(
            submission_id="submission-legacy",
            score=evaluate_pb2.ScoreCriteria(value=[8.0, 9.0]),
            feedback="legacy feedback",
        ),
        Context(),
    )

    record = store.get("eval-legacy")
    assert response.success is True
    assert record["status"] == "COMPLETED"
    assert record["score"] == 17.0
    assert record["feedback"] == "legacy feedback"


def test_legacy_submission_methods_use_storage_boundary(tmp_path: Path, monkeypatch):
    root = tmp_path / "workspace"
    root.mkdir()
    (root / "main.py").write_text("print('ok')\n", encoding="utf-8")

    class Provider:
        def get_submission(self, submission_id):
            return {
                "submission_id": submission_id,
                "instructions": "Run the program",
                "resource_url": "local://submission.zip",
                "storage_provider": "local",
                "storage_key": "submission.zip",
                "rubric": [{"criterion": "correctness", "weight": 10}],
            }

        def get_resource(self, submission_id):
            return {
                "resource_url": "local://submission.zip",
                "storage_provider": "local",
                "storage_key": "submission.zip",
            }

    @contextmanager
    def fake_workspace(**_kwargs):
        yield root

    monkeypatch.setattr(legacy_compat, "evaluation_workspace", fake_workspace)
    service = LegacySubmissionServicer(Provider())

    content = service.GetSubmission(submission_pb2.SubmissionContentRequest(submission_id="sub-1"), Context())
    resource = service.GetSubmissionResource(submission_pb2.SubmissionResourceRequest(submission_id="sub-1"), Context())
    file_response = service.ProcessSubmission(
        submission_pb2.SubmissionRequest(submission_id="sub-1", file_path="main.py"), Context()
    )

    assert content.instructions == "Run the program"
    assert content.rubric[0].criterion == "correctness"
    assert resource.storage_provider == "local"
    assert file_response.success is True
    assert list(file_response.file.content) == ["print('ok')"]

