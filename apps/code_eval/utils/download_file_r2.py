import os
from pathlib import Path
import shutil
import boto3
from utils.extract_file import extract_file
from utils.git_handle import clone_repo


# ---------------- R2 Client ----------------
def get_r2_client():
    """
    Get R2 client from environment variables:
    R2_ACCOUNT_ID, R2_ACCESS_KEY, R2_SECRET_KEY, R2_BUCKET
    """
    account_id = os.getenv("R2_ACCOUNT_ID")
    access_key = os.getenv("R2_ACCESS_KEY")
    secret_key = os.getenv("R2_SECRET_KEY")
    bucket = os.getenv("R2_BUCKET")

    if not all([account_id, access_key, secret_key, bucket]):
        raise EnvironmentError(
            "Please set R2_ACCOUNT_ID, R2_ACCESS_KEY, R2_SECRET_KEY, R2_BUCKET env vars"
        )

    s3 = boto3.client(
        service_name="s3",
        endpoint_url=f"https://{account_id}.r2.cloudflarestorage.com",
        aws_access_key_id=access_key,
        aws_secret_access_key=secret_key,
        region_name="auto",
    )
    return s3, bucket


# ---------------- Download prefix from R2 ----------------
def download_prefix_from_r2(prefix: str, destination_folder: str) -> list[str]:
    """
    Download all files under a given R2 prefix into destination_folder.
    Extract zip/tar archives into folders, delete archive if needed.
    Returns a list of paths to files/folders ready to use.
    """
    os.makedirs(destination_folder, exist_ok=True)
    s3, bucket = get_r2_client()
    final_paths = []

    paginator = s3.get_paginator("list_objects_v2")
    for page in paginator.paginate(Bucket=bucket, Prefix=prefix):
        for obj in page.get("Contents", []):
            key = obj["Key"]
            if key.endswith("/"):  # skip folder keys
                continue

            filename = os.path.basename(key)
            local_path = os.path.join(destination_folder, filename)

            # Download file from R2
            response = s3.get_object(Bucket=bucket, Key=key)
            with open(local_path, "wb") as f:
                f.write(response["Body"].read())

            # Check for archives
            if filename.lower().endswith((".zip", ".tar", ".tar.gz", ".tgz")):
                # Extract into a folder named after archive
                archive_folder = os.path.join(
                    destination_folder, os.path.splitext(filename)[0]
                )
                os.makedirs(archive_folder, exist_ok=True)

                extracted_paths = extract_file(local_path, archive_folder)
                if isinstance(extracted_paths, list):
                    final_paths.append(archive_folder)  # keep folder for multiple files
                else:
                    final_paths.append(extracted_paths)  # single file

                print(f"✅ Extracted archive: {key} -> {archive_folder}")
            else:
                # Regular file
                final_paths.append(local_path)
                print(f"✅ Downloaded file: {key} -> {local_path}")

    if not final_paths:
        print(f"⚠️ No files found under prefix: {prefix}")

    return final_paths


def get_folder_size(folder: str) -> int:
    """Returns folder size in bytes."""
    total_size = 0
    for dirpath, dirnames, filenames in os.walk(folder):
        for f in filenames:
            fp = os.path.join(dirpath, f)
            if os.path.exists(fp):
                total_size += os.path.getsize(fp)
    return total_size

def clean_cache(cache_dir: str, max_size_bytes: int = 4 * 1024**3, free_bytes: int = 1 * 1024**3):
    """Remove oldest folders until at least free_bytes is freed if cache exceeds max_size_bytes."""
    cache_path = Path(cache_dir)
    if not cache_path.exists():
        return

    total_size = get_folder_size(cache_dir)
    print(f"DEBUG: Current cache size = {total_size / (1024**3):.2f} GB")

    if total_size < max_size_bytes:
        return

    # List all subfolders sorted by modification time (oldest first)
    folders = [f for f in cache_path.iterdir() if f.is_dir()]
    folders.sort(key=lambda f: f.stat().st_mtime)

    freed = 0
    for f in folders:
        folder_size = get_folder_size(f)
        print(f"DEBUG: Removing folder {f} ({folder_size / (1024**3):.2f} GB)")
        shutil.rmtree(f)
        freed += folder_size
        if freed >= free_bytes:
            break


# ---------------- Unified downloadFiles ----------------
import os


def downloadFiles(url: str, folder_name: str) -> str:
    cache_base = "/files_cache"
    dest = os.path.join(cache_base, folder_name)

    # 1. Clean cache if needed (free ~1GB)
    clean_cache(cache_base, max_size_bytes=4 * 1024**3, free_bytes=1 * 1024**3)

    # 2. Create the folder if it doesn't exist
    os.makedirs(dest, exist_ok=True)

    # 3. Force permissions to 777
    try:
        os.chmod(dest, 0o777)
        print(f"DEBUG: Successfully set 777 permissions on {dest}")
    except Exception as e:
        print(f"DEBUG: Failed to set permissions: {e}")

    # 4. Clone if GitHub repo
    if "github.com" in url:
        clone_repo(url, cache_base, folder_name)

    return dest
