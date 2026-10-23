import json
import shutil
import sys
import tempfile
import unittest
import zipfile
from pathlib import Path
from unittest.mock import patch

from grpc_services import submission_servicer
from protos import submission_pb2
from utils import evaluation_workspace as workspace_module


class _Context:
    def __init__(self):
        self.code = None

    def set_code(self, code):
        self.code = code


class SubmissionServicerTests(unittest.TestCase):
    def setUp(self):
        self.root = Path(tempfile.mkdtemp(prefix="submission-servicer-test-")).resolve()
        self.permanent = self.root / "permanent"
        self.cache = self.root / "evaluation-cache"
        self.permanent.mkdir()
        self.cache.mkdir()
        self.old_values = (
            workspace_module.LOCAL_FILE_ROOT,
            workspace_module.PERMANENT_FILE_ROOT,
            workspace_module.EVALUATION_CACHE_ROOT,
        )
        workspace_module.LOCAL_FILE_ROOT = self.root
        workspace_module.PERMANENT_FILE_ROOT = self.permanent
        workspace_module.EVALUATION_CACHE_ROOT = self.cache

        self.archive = self.permanent / "class" / "submission.zip"
        self.archive.parent.mkdir(parents=True)
        with zipfile.ZipFile(self.archive, "w") as source:
            source.writestr("project/src/main.py", "print(1)\n")
            source.writestr("project/README.md", "readme\n")

        self.resource = {
            "storage_provider": "local",
            "storage_key": "class/submission.zip",
        }

    def tearDown(self):
        (
            workspace_module.LOCAL_FILE_ROOT,
            workspace_module.PERMANENT_FILE_ROOT,
            workspace_module.EVALUATION_CACHE_ROOT,
        ) = self.old_values
        shutil.rmtree(self.root, ignore_errors=True)

    def _servicer(self):
        return submission_servicer.SubmissionServicer()

    def test_zip_folder_browsing_returns_stable_relative_tree(self):
        context = _Context()
        with patch.object(submission_servicer.SubmissionServicer, "_resource", return_value=self.resource):
            response = self._servicer().GetSubmissionFolderStructure(
                submission_pb2.SubmissionResourceRequest(submission_id="1"), context
            )

        tree = json.loads(response.folder_structure)
        self.assertEqual(tree["name"], "project")
        self.assertEqual(tree["type"], "folder")
        self.assertEqual(tree["children"][0], {"name": "src", "type": "folder", "children": [{"name": "main.py", "type": "file"}]})
        self.assertIsNone(context.code)

    def test_file_content_returns_relative_path_name_and_type(self):
        context = _Context()
        request = submission_pb2.SubmissionRequest(submission_id="1", file_path="src/main.py")
        with patch.object(submission_servicer.SubmissionServicer, "_resource", return_value=self.resource):
            response = self._servicer().ProcessSubmission(request, context)

        self.assertTrue(response.success)
        self.assertEqual(response.file.type, "file")
        self.assertEqual(response.file.name, "main.py")
        self.assertEqual(response.file.path, "src/main.py")
        self.assertEqual(list(response.file.content), ["print(1)"])
        self.assertFalse(Path(response.file.path).is_absolute())
        self.assertIsNone(context.code)

    def test_invalid_file_paths_are_rejected(self):
        for file_path in ("/etc/passwd", "../main.py", "src/../main.py", "src\\main.py"):
            context = _Context()
            request = submission_pb2.SubmissionRequest(submission_id="1", file_path=file_path)
            with patch.object(submission_servicer.SubmissionServicer, "_resource", return_value=self.resource):
                response = self._servicer().ProcessSubmission(request, context)
            self.assertFalse(response.success)
            self.assertEqual(context.code, submission_servicer.grpc.StatusCode.INVALID_ARGUMENT)

    def test_existing_checksum_cache_is_reused(self):
        with workspace_module.evaluation_workspace("1", "local", "class/submission.zip"):
            pass
        cache_payloads = list((self.cache / "source-cache").glob("*/payload"))
        self.assertEqual(len(cache_payloads), 1)
        cached_payload = cache_payloads[0]
        with workspace_module.evaluation_workspace("1", "local", "class/submission.zip"):
            pass
        self.assertEqual(list((self.cache / "source-cache").glob("*/payload")), [cached_payload])
        self.assertTrue(cached_payload.is_file())


if __name__ == "__main__":
    unittest.main()
