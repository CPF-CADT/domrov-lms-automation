"""Read-only submission metadata boundary used by legacy AI RPCs.

The AI service never queries Academic Service's database.  The default adapter
uses the existing gRPC storage boundary; tests can inject a deterministic
provider without any network or database dependency.
"""

from typing import Protocol

from config.grpc_config import EvaluateClient


class SubmissionResourceProvider(Protocol):
    def get_submission(self, submission_id: str) -> dict | None: ...

    def get_resource(self, submission_id: str) -> dict | None: ...


class ExistingStorageBoundary:
    """Adapter around the existing submission/resource gRPC boundary."""

    def __init__(self, client: EvaluateClient | None = None):
        self.client = client or EvaluateClient()

    def get_submission(self, submission_id: str) -> dict | None:
        return self.client.get_submission_content(submission_id)

    def get_resource(self, submission_id: str) -> dict | None:
        return self.client.get_submission_resource(submission_id)
