import requests
import boto3
import os
from utils.extract_file import extract_file
from utils.git_handle import clone_repo


def downloadFiles(url: str, folder_name: str) -> str:
    destination_folder = os.path("./files_cache")

    if url.__contains__("github.com"):
        return clone_repo(url, destination_folder,folder_name)
    else:
        return download_file_r2(destination_folder=destination_folder, url=url,local_filename=folder_name)


def download_file_r2(
    destination_folder: str = "./files_cache/",
    local_filename: str = os.urandom(8).hex(),
    bucket: str = None,
    key: str = None,
    url: str = None,
    account_id: str = None,
    access_key: str = None,
    secret_key: str = None,
) -> str:

    os.makedirs(destination_folder, exist_ok=True)

    # Download from URL
    if url:
        response = requests.get(url)
        response.raise_for_status()  # Raise error if download failed
        with open(local_filename, "wb") as f:
            f.write(response.content)
        print(f"File downloaded from URL to {local_filename}")
        return extract_file(local_filename, destination_folder)

    # Download from S3/R2
    if bucket and key and account_id and access_key and secret_key:
        s3 = boto3.client(
            service_name="s3",
            endpoint_url=f"https://{account_id}.r2.cloudflarestorage.com",
            aws_access_key_id=access_key,
            aws_secret_access_key=secret_key,
            region_name="auto",
        )
        response = s3.get_object(Bucket=bucket, Key=key)
        file_data = response["Body"].read()
        with open(local_filename, "wb") as f:
            f.write(file_data)
        print(f"File downloaded from S3/R2 to {local_filename}")
        return extract_file(local_filename, destination_folder)

    raise ValueError("Either url or bucket+key+credentials must be provided")
