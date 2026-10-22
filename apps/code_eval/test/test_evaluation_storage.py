import io
import os
import stat
import sys
import tarfile
import tempfile
import types
import unittest
import zipfile
from pathlib import Path
from unittest.mock import patch

from utils import evaluation_workspace as workspace_module
from utils import extract_file as extract_module
from utils.cache_cleanup import cleanup_evaluation_cache


class SecureExtractionTests(unittest.TestCase):
    def setUp(self):
        self.root = Path(tempfile.mkdtemp(prefix="extract-test-"))
        self.destination = self.root / "out"

    def tearDown(self):
        import shutil
        shutil.rmtree(self.root, ignore_errors=True)

    def test_zip_extraction(self):
        archive = self.root / "submission.zip"
        with zipfile.ZipFile(archive, "w") as source:
            source.writestr("src/main.py", "print(1)\n")

        extract_module.extract_file(str(archive), str(self.destination))
        self.assertEqual((self.destination / "src/main.py").read_text(), "print(1)\n")
        self.assertTrue(archive.exists())

    def test_tar_gz_extraction(self):
        archive = self.root / "submission.tar.gz"
        source_file = self.root / "main.py"
        source_file.write_text("print(1)\n")
        with tarfile.open(archive, "w:gz") as source:
            source.add(source_file, arcname="main.py")

        extract_module.extract_file(str(archive), str(self.destination))
        self.assertTrue((self.destination / "main.py").exists())

    def test_rejects_zip_traversal_and_symlink(self):
        traversal = self.root / "traversal.zip"
        with zipfile.ZipFile(traversal, "w") as source:
            source.writestr("../../outside.txt", "bad")
        with self.assertRaises(ValueError):
            extract_module.extract_file(str(traversal), str(self.destination))

        symlink = self.root / "symlink.zip"
        info = zipfile.ZipInfo("link")
        info.external_attr = (stat.S_IFLNK | 0o777) << 16
        with zipfile.ZipFile(symlink, "w") as source:
            source.writestr(info, "../../outside.txt")
        with self.assertRaises(ValueError):
            extract_module.extract_file(str(symlink), str(self.destination))

    def test_rejects_file_count_and_expanded_size_limits(self):
        archive = self.root / "large.zip"
        with zipfile.ZipFile(archive, "w") as source:
            source.writestr("one.txt", "12345")
            source.writestr("two.txt", "12345")

        with patch.object(extract_module, "MAX_ARCHIVE_FILES", 1):
            with self.assertRaises(ValueError):
                extract_module.extract_file(str(archive), str(self.destination / "count"))
        with patch.object(extract_module, "MAX_EXTRACTED_SIZE", 5):
            with self.assertRaises(ValueError):
                extract_module.extract_file(str(archive), str(self.destination / "size"))


class EvaluationWorkspaceTests(unittest.TestCase):
    def setUp(self):
        self.root = Path(tempfile.mkdtemp(prefix="workspace-test-")).resolve()
        self.permanent = (self.root / "permanent").resolve()
        self.cache = (self.root / "evaluation-cache").resolve()
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

    def tearDown(self):
        workspace_module.LOCAL_FILE_ROOT, workspace_module.PERMANENT_FILE_ROOT, workspace_module.EVALUATION_CACHE_ROOT = self.old_values
        import shutil
        shutil.rmtree(self.root, ignore_errors=True)

    def test_local_source_file_evaluation_and_cleanup(self):
        source = self.permanent / "7" / "submission" / "9" / "main.py"
        source.parent.mkdir(parents=True)
        source.write_text("print(1)\n")

        with workspace_module.evaluation_workspace("9", "local", "7/submission/9/main.py") as path:
            self.assertEqual(path.name, "main.py")
            self.assertEqual(path.read_text(), "print(1)\n")
            temporary_root = path.parent
            self.assertTrue(temporary_root.exists())
        self.assertFalse(temporary_root.exists())
        self.assertTrue(source.exists())

    def test_local_zip_evaluation(self):
        archive = self.permanent / "7" / "submission" / "9" / "submission.zip"
        archive.parent.mkdir(parents=True)
        with zipfile.ZipFile(archive, "w") as source:
            source.writestr("main.py", "print(1)\n")

        with workspace_module.evaluation_workspace("9", "local", "7/submission/9/submission.zip") as path:
            self.assertEqual((path / "main.py").read_text(), "print(1)\n")
        self.assertTrue(archive.exists())

    def test_github_evaluation_and_failure_cleanup(self):
        fake_git = types.ModuleType("utils.git_handle")

        def fake_clone(url, destination, name):
            repo = Path(destination) / name
            repo.mkdir()
            (repo / "main.py").write_text("print(1)\n")
            return str(repo)

        fake_git.clone_repo = fake_clone
        with patch.dict(sys.modules, {"utils.git_handle": fake_git}):
            with workspace_module.evaluation_workspace("9", "external", external_url="https://github.com/example/repo") as path:
                self.assertTrue((path / "main.py").exists())

        with self.assertRaises(ValueError):
            with workspace_module.evaluation_workspace("9", "local", "../escape"):
                pass
        self.assertEqual(list(self.cache.glob("9-*")), [])

    def test_cache_cleanup_does_not_touch_permanent_storage(self):
        stale_cache = self.cache / "stale"
        stale_cache.mkdir()
        (stale_cache / "temporary.txt").write_text("temporary")
        stale_permanent = self.permanent / "keep.txt"
        stale_permanent.write_text("permanent")
        old = 1
        os.utime(stale_cache, (old, old))
        os.utime(stale_permanent, (old, old))

        self.assertEqual(cleanup_evaluation_cache(self.cache, max_age_seconds=0), 1)
        self.assertFalse(stale_cache.exists())
        self.assertTrue(stale_permanent.exists())


if __name__ == "__main__":
    unittest.main()
