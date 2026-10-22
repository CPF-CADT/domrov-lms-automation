import os
import shutil
import time
from pathlib import Path

from utils.structured_logging import event


def cleanup_evaluation_cache(root: Path, max_age_seconds: int | None = None) -> int:
    """Remove stale entries only below evaluation-cache."""
    age = max_age_seconds if max_age_seconds is not None else int(os.getenv("EVALUATION_CACHE_TTL_SECONDS", str(24 * 60 * 60)))
    root = root.resolve()
    root.mkdir(parents=True, exist_ok=True, mode=0o750)
    cutoff = time.time() - age
    removed = 0
    for entry in root.iterdir():
        if entry.resolve().parent != root or entry.stat().st_mtime >= cutoff:
            continue
        if entry.is_dir() and not entry.is_symlink():
            shutil.rmtree(entry)
        else:
            entry.unlink(missing_ok=True)
        removed += 1
    event("cleanup", "evaluation cache cleanup completed", removed=removed)
    return removed
