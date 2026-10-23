"""Safe ZIP and TAR extraction for untrusted submission archives."""

import os
import shutil
import stat
import tarfile
import zipfile
from pathlib import Path, PurePosixPath
from utils.structured_logging import event


MAX_ARCHIVE_FILES = int(os.getenv("EVAL_MAX_ARCHIVE_FILES", "10000"))
MAX_EXTRACTED_SIZE = int(os.getenv("EVAL_MAX_EXTRACTED_SIZE", str(512 * 1024 * 1024)))


def _safe_member_path(name: str, destination: Path) -> Path:
    if not name or "\x00" in name or "\\" in name:
        raise ValueError("Archive contains an invalid member path")

    member = PurePosixPath(name)
    if member.is_absolute() or any(part == ".." for part in member.parts):
        raise ValueError("Archive contains an absolute or traversal path")

    target = (destination / Path(*member.parts)).resolve()
    destination_resolved = destination.resolve()
    if target != destination_resolved and destination_resolved not in target.parents:
        raise ValueError("Archive member escapes extraction directory")
    return target


def _check_limits(file_count: int, extracted_size: int, member_size: int) -> tuple[int, int]:
    file_count += 1
    extracted_size += member_size
    if file_count > MAX_ARCHIVE_FILES:
        raise ValueError("Archive contains too many files")
    if extracted_size > MAX_EXTRACTED_SIZE:
        raise ValueError("Archive expands beyond the allowed size")
    return file_count, extracted_size


def _is_macos_metadata(name: str) -> bool:
    member = PurePosixPath(name)
    return (
        "__MACOSX" in member.parts
        or member.name == ".DS_Store"
        or member.name.startswith("._")
    )


def _extract_zip(archive: Path, destination: Path) -> None:
    file_count = 0
    extracted_size = 0
    with zipfile.ZipFile(archive) as source:
        for info in source.infolist():
            target = _safe_member_path(info.filename, destination)
            if _is_macos_metadata(info.filename):
                continue
            is_directory = info.filename.endswith("/")
            mode = (info.external_attr >> 16) & 0o170000
            if stat.S_ISLNK(mode):
                raise ValueError("Archive symlinks are not allowed")
            if is_directory:
                target.mkdir(parents=True, exist_ok=True)
                continue

            file_count, extracted_size = _check_limits(file_count, extracted_size, info.file_size)
            target.parent.mkdir(parents=True, exist_ok=True)
            if target.exists():
                raise ValueError("Archive contains duplicate paths")
            with source.open(info, "r") as input_stream, target.open("xb") as output_stream:
                shutil.copyfileobj(input_stream, output_stream, length=1024 * 1024)


def _extract_tar(archive: Path, destination: Path) -> None:
    file_count = 0
    extracted_size = 0
    with tarfile.open(archive, "r:*") as source:
        for member in source.getmembers():
            target = _safe_member_path(member.name, destination)
            if _is_macos_metadata(member.name):
                continue
            if member.issym() or member.islnk():
                raise ValueError("Archive links are not allowed")
            if member.isdir():
                target.mkdir(parents=True, exist_ok=True)
                continue
            if not member.isfile():
                raise ValueError("Archive contains an unsupported special file")

            file_count, extracted_size = _check_limits(file_count, extracted_size, member.size)
            target.parent.mkdir(parents=True, exist_ok=True)
            if target.exists():
                raise ValueError("Archive contains duplicate paths")
            input_stream = source.extractfile(member)
            if input_stream is None:
                raise ValueError("Archive member could not be read")
            with input_stream, target.open("xb") as output_stream:
                shutil.copyfileobj(input_stream, output_stream, length=1024 * 1024)


def extract_file(file_path: str, destination_folder: str) -> str:
    """Extract a ZIP/TAR archive without deleting the original archive."""
    archive = Path(file_path)
    destination = Path(destination_folder).resolve()
    destination.mkdir(parents=True, exist_ok=True)

    event("extraction", "archive extraction started", archive_type=archive.suffix.lower())
    if zipfile.is_zipfile(archive):
        _extract_zip(archive, destination)
    elif tarfile.is_tarfile(archive):
        _extract_tar(archive, destination)
    else:
        raise ValueError("Unsupported archive format; only ZIP, TAR, and TAR.GZ are supported")

    event("extraction", "archive extraction completed")
    return str(destination)
