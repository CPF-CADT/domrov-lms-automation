from pathlib import Path


def read_file_to_json(file_path: str | Path, submission_id: str) -> dict:
    file_path = Path(file_path)
    if not file_path.is_file():
        return {}

    try:
        # Errors ignore is good for binary files that slip through
        with open(file_path, "r", encoding="utf-8", errors="ignore") as f:
            lines = [line.rstrip("\n") for line in f]
    except Exception:
        lines = []

    full_path_str = str(file_path).replace("\\", "/")
    id_marker = f"/{submission_id}/"

    # More robust path cleaning
    if id_marker in full_path_str:
        clean_path = full_path_str.split(id_marker, 1)[-1]
    else:
        clean_path = file_path.name

    return {
        "type": "file",
        "name": file_path.name,
        "path": clean_path,
        "content": lines,
    }


def is_dir_cache(base_dir: str, submission_id: str) -> bool:
    # This is much faster and more reliable for Docker
    return (Path(base_dir) / str(submission_id)).is_dir()
