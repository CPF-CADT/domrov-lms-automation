import os
import grpc

from protos import evaluate_pb2, evaluate_pb2_grpc
from protos import submission_pb2, submission_pb2_grpc
class EvaluateClient:

    def __init__(
        self,
        host=os.getenv("CODE_EVAL_GRPC_HOST"),
        port=os.getenv("CODE_EVAL_GRPC_PORT"),
    ):
        self.server_address = f"{host}:{port}"
        self.channel = grpc.insecure_channel(f'{host}:{port}')
        # Create stubs for both services
        self.evaluate_stub = evaluate_pb2_grpc.EvaluateWithAIStub(self.channel)
        self.submission_stub = submission_pb2_grpc.SubmissionServiceStub(self.channel)

    def get_submission_content(self, submission_id: int):
        request = submission_pb2.SubmissionContentRequest(
            submission_id=submission_id
        )

        try:
            response = self.submission_stub.GetSubmission(request)
            return {
                "submission_id": response.submission_id,
                "resource_url": response.resource_url,
                "instructions": response.instrctions,
                "rubric": response.rubric,
            }

        except grpc.RpcError as e:
            if e.code() == grpc.StatusCode.NOT_FOUND:
                print(f"Submission {submission_id} not found")
                return None
            else:
                raise

    def evaluate_submission(
        self,
        submission_id: str,
        scores: list[float],
        feedback: str,
        input_token: int = 0,
        output_token: int = 0
    ):
        request = evaluate_pb2.EvaluateRequest(
            submission_id=str(submission_id),
            score=evaluate_pb2.ScoreCriteria(value=scores),
            feedback=feedback,
            input_token=input_token,
            output_token=output_token
        )
        response = self.evaluate_stub.EvaluateSubmission(request)
        return response
