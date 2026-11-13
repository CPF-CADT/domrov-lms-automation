"""Resolve submission resources into isolated, disposable evaluation workspaces."""

import fcntl
import hashlib
import os
import shutil
import tempfile
from contextlib import contextmanager
from pathlib import Path, PurePosixPath
from urllib.parse import urlparse

from utils.extract_file import extract_file
from utils.structured_logging import event


LOCAL_FILE_ROOT = Path(os.getenv("LOCAL_FILE_ROOT", "/data/files")).resolve()
PERMANENT_FILE_ROOT = (LOCAL_FILE_ROOT / "permanent").resolve()
EVALUATION_CACHE_ROOT = (LOCAL_FILE_ROOT / "evaluation-cache").resolve()


def _validate_storage_key(storage_key: str) -> PurePosixPath:
    if not storage_key or "\x00" in storage_key or "\\" in storage_key:
        raise ValueError("Invalid local storage key")
    key = PurePosixPath(storage_key)
    if key.is_absolute() or any(part in ("", ".", "..") for part in key.parts):
        raise ValueError("Local storage key must be a relative path")
    return key


def resolve_local_storage_key(storage_key: str) -> Path:
    key = _validate_storage_key(storage_key)
    candidate = PERMANENT_FILE_ROOT
    for part in key.parts:
        candidate = candidate / part
        if candidate.is_symlink():
            raise ValueError("Local storage key traverses a symlink")
    resolved = candidate.resolve()
    if resolved != PERMANENT_FILE_ROOT and PERMANENT_FILE_ROOT not in resolved.parents:
        raise ValueError("Local storage key escapes permanent storage")
    return resolved


def _sha256(path: Path) -> str:
    digest = hashlib.sha256()
    with path.open("rb") as source:
        for chunk in iter(lambda: source.read(1024 * 1024), b""):
            digest.update(chunk)
    return digest.hexdigest()


def _is_github_url(value: str) -> bool:
    parsed = urlparse(value or "")
    host = (parsed.hostname or "").lower().rstrip(".")
    return parsed.scheme in ("http", "https") and (host == "github.com" or host.endswith(".github.com"))


def _copy_into_checksum_cache(source: Path, checksum: str) -> Path:
    EVALUATION_CACHE_ROOT.mkdir(parents=True, exist_ok=True, mode=0o750)
    entry = EVALUATION_CACHE_ROOT / "source-cache" / checksum
    payload = entry / "payload"
    lock_path = EVALUATION_CACHE_ROOT / f".{checksum}.lock"
    with lock_path.open("a+") as lock_file:
        fcntl.flock(lock_file.fileno(), fcntl.LOCK_EX)
        if payload.is_symlink() or not payload.exists() or _sha256(payload) != checksum:
            entry.mkdir(parents=True, exist_ok=True, mode=0o750)
            temporary = entry / ".payload.tmp"
            shutil.copyfile(source, temporary)
            os.replace(temporary, payload)
    return payload


def _reject_workspace_symlinks(root: Path) -> None:
    for current, directories, files in os.walk(root, followlinks=False):
        for name in [*directories, *files]:
            path = Path(current) / name
            if path.is_symlink():
                raise ValueError("Evaluation workspaces cannot contain symlinks")


def _is_archive(path: Path) -> bool:
    import tarfile
    import zipfile

    return zipfile.is_zipfile(path) or tarfile.is_tarfile(path)


@contextmanager
def evaluation_workspace(
    submission_id: str,
    storage_provider: str,
    storage_key: str = "",
    checksum: str = "",
    external_url: str = "",
):
    """Yield a disposable path containing only the files to evaluate."""
    EVALUATION_CACHE_ROOT.mkdir(parents=True, exist_ok=True, mode=0o750)
    safe_submission_id = "".join(ch for ch in str(submission_id) if ch.isalnum() or ch in "-_") or "submission"
    workspace = Path(tempfile.mkdtemp(prefix=f"{safe_submission_id}-", dir=EVALUATION_CACHE_ROOT))
    workspace.chmod(0o750)
    event("evaluation_start", "evaluation workspace created", submission_id=safe_submission_id, provider=storage_provider)

    try:
        provider = (storage_provider or "").lower()
        if provider == "local":
            storage_path = _validate_storage_key(storage_key)
            source = resolve_local_storage_key(storage_key)
            if source.is_symlink() or not source.is_file():
                raise FileNotFoundError("Local submission file not found")

            actual_checksum = _sha256(source)
            if checksum and checksum != actual_checksum:
                raise ValueError("Local submission checksum does not match metadata")
            payload = _copy_into_checksum_cache(source, checksum or actual_checksum)
            copied_archive = workspace / storage_path.name
            shutil.copyfile(payload, copied_archive)

            if _is_archive(copied_archive):
                extracted = workspace / "extracted"
                extract_file(str(copied_archive), str(extracted))
                evaluation_path = extracted
            else:
                evaluation_path = copied_archive
        elif provider == "external" and _is_github_url(external_url):
            from utils.git_handle import clone_repo

            repository = clone_repo(external_url, str(workspace), "repository")
            if not repository:
                raise FileNotFoundError("GitHub repository could not be cloned")
            repository_path = Path(repository)
            if not repository_path.exists():
                raise FileNotFoundError("GitHub repository could not be cloned")
            evaluation_path = repository_path
        else:
            raise ValueError("Unsupported submission storage provider")

        _reject_workspace_symlinks(workspace)
        yield evaluation_path
    finally:
        shutil.rmtree(workspace, ignore_errors=True)
        event("cleanup", "evaluation workspace removed", submission_id=safe_submission_id)
