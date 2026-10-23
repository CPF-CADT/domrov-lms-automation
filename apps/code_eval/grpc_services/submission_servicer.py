import json
from pathlib import Path, PurePosixPath
import grpc

from protos import submission_pb2, submission_pb2_grpc
from config.grpc_config import EvaluateClient
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


def _find_file(root: Path, requested: PurePosixPath) -> Path | None:
    root = root.resolve()
    if root.is_file():
        return root if requested.as_posix() == root.name else None
    direct = (root / Path(*requested.parts)).resolve()
    if direct.is_file() and root in direct.parents:
        return direct
    return None


def _relative_file_path(root: Path, file_path: Path) -> str:
    """Return only a POSIX path relative to the displayed submission root."""
    if root.is_file():
        relative = PurePosixPath(root.name)
    else:
        relative = PurePosixPath(file_path.relative_to(root).as_posix())

    if relative.is_absolute() or any(part in ("", ".", "..") for part in relative.parts):
        raise ValueError("Resolved file path must be relative")
    return relative.as_posix()


def _submission_root(base_path: Path) -> Path:
    """Use the same root for folder browsing and file lookup."""
    if not base_path.is_dir():
        return base_path
    items = [item for item in base_path.iterdir() if not item.name.startswith(".")]
    return items[0] if len(items) == 1 and items[0].is_dir() else base_path


class SubmissionServicer(submission_pb2_grpc.SubmissionServiceServicer):
    def _resource(self, submission_id: str):
        result = EvaluateClient().get_submission_resource(submission_id)
        if not result:
            raise FileNotFoundError("Submission resource not found")
        return result

    def GetSubmissionFolderStructure(self, request, context):
        try:
            submission_id = str(request.submission_id)
            resource = self._resource(submission_id)
            with evaluation_workspace(
                submission_id=submission_id,
                storage_provider=resource.get("storage_provider", ""),
                storage_key=resource.get("storage_key", ""),
                checksum=resource.get("checksum", ""),
                external_url=resource.get("external_url", "") or resource.get("resource_url", ""),
            ) as base_path:
                actual_root = _submission_root(base_path)

                checker = IgnoreChecker(actual_root, user_exclude=None, user_include=None)
                full_tree = build_directory_json(actual_root, checker) or {}
                return submission_pb2.SubmissionFolderStructureResponse(
                    folder_structure=json.dumps(full_tree)
                )
        except FileNotFoundError as error:
            context.set_code(grpc.StatusCode.NOT_FOUND)
            return submission_pb2.SubmissionFolderStructureResponse(folder_structure="{}")
        except Exception as error:
            print(f"ERROR: {error}", flush=True)
            context.set_code(grpc.StatusCode.INTERNAL)
            return submission_pb2.SubmissionFolderStructureResponse(folder_structure="{}")

    def ProcessSubmission(self, request, context):
        try:
            submission_id = str(request.submission_id)
            requested = _requested_path(request.file_path)
            resource = self._resource(submission_id)
            with evaluation_workspace(
                submission_id=submission_id,
                storage_provider=resource.get("storage_provider", ""),
                storage_key=resource.get("storage_key", ""),
                checksum=resource.get("checksum", ""),
                external_url=resource.get("external_url", "") or resource.get("resource_url", ""),
            ) as base_path:
                actual_root = _submission_root(base_path)
                found_path = _find_file(actual_root, requested)
                if not found_path:
                    return submission_pb2.SubmissionResponse(success=False, message="File not found")

                file_data = read_file_to_json(found_path, submission_id)
                file_data["path"] = _relative_file_path(actual_root, found_path)
                return submission_pb2.SubmissionResponse(
                    success=True, file=submission_pb2.FileContent(**file_data)
                )
        except ValueError as error:
            context.set_code(grpc.StatusCode.INVALID_ARGUMENT)
            return submission_pb2.SubmissionResponse(success=False, message=str(error))
        except FileNotFoundError as error:
            context.set_code(grpc.StatusCode.NOT_FOUND)
            return submission_pb2.SubmissionResponse(success=False, message=str(error))
        except Exception as error:
            context.set_code(grpc.StatusCode.INTERNAL)
            return submission_pb2.SubmissionResponse(success=False, message=str(error))
