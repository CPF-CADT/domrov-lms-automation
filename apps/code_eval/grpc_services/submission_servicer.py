import json
from pathlib import Path
import grpc

from protos import submission_pb2, submission_pb2_grpc
from config.grpc_config import EvaluateClient
from utils.download_file_r2 import downloadFiles
from utils.ignore_checker import IgnoreChecker
from utils.read_file import build_directory_json

class SubmissionServicer(submission_pb2_grpc.SubmissionServiceServicer):

    def GetSubmissionFolderStructure(self, request, context):
        try:
            submission_id = str(request.submission_id)
            base_path = Path(f"/files_cache/{submission_id}")

            if not base_path.exists() or not any(base_path.iterdir()):
                client = EvaluateClient()
                result = client.get_submission_resource(submission_id)
                downloadFiles(result.get("resource_url"), submission_id)

            actual_root = base_path
            items = [i for i in base_path.iterdir() if not i.name.startswith(".")]
            if len(items) == 1 and items[0].is_dir():
                actual_root = items[0]

            checker = IgnoreChecker(actual_root, user_exclude=None, user_include=None)

            # Generate the full tree
            full_tree = build_directory_json(actual_root, checker)

            # --- THE FIX: Return children only, not the root folder "1" ---
            # This extracts the inner content so you don't see the "1" folder
            response_data = full_tree
            if full_tree and "children" in full_tree:
                # Replace root with its children
                response_data = full_tree["children"]

            return submission_pb2.SubmissionFolderStructureResponse(
                folder_structure=json.dumps(response_data)
            )

        except Exception as e:
            print(f"ERROR: {str(e)}", flush=True)
            context.set_code(grpc.StatusCode.INTERNAL)
            return submission_pb2.SubmissionFolderStructureResponse(
                folder_structure="{}"
            )

    def ProcessSubmission(self, request, context):
        try:
            submission_id = str(request.submission_id)
            base_path = Path(f"/files_cache/{submission_id}")

            if not base_path.exists():
                context.set_code(grpc.StatusCode.NOT_FOUND)
                return submission_pb2.SubmissionResponse(success=False)

            requested_file = request.file_path.lstrip("/")
            found_path = None

            for p in base_path.rglob("*"):
                if p.is_file():
                    if str(p).replace("\\", "/").endswith(requested_file):
                        found_path = p
                        break

            if not found_path:
                return submission_pb2.SubmissionResponse(
                    success=False, message="File not found"
                )

            from utils.find_file import read_file_to_json

            file_data = read_file_to_json(str(found_path), submission_id)

            return submission_pb2.SubmissionResponse(
                success=True, file=submission_pb2.FileContent(**file_data)
            )
        except Exception as e:
            context.set_code(grpc.StatusCode.INTERNAL)
            return submission_pb2.SubmissionResponse(success=False, message=str(e))
