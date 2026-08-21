import os
import shutil
from git import GitCommandError, Repo
from github import Github
from urllib.parse import urlparse

def is_repo_accessible(repo_url: str, token: str = None) -> bool:
    try:
        path = urlparse(repo_url).path.strip("/")
        if path.endswith(".git"):
            path = path[:-4]

        g = Github(token) if token else Github()
        repo = g.get_repo(path)
        return not repo.private
    except Exception as e:
        print(f"Error accessing repository: {e}")
        return False


def clone_repo(repo_url: str, destination: str = None, name=None) -> str:
    destination = destination or "/files_cache"

    # Normalize repo_url and detect subfolders
    folder_in_repo = ""
    if "/tree/" in repo_url:
        parts = repo_url.split("/tree/")
        repo_url = parts[0] + ".git"
        branch_and_path = parts[1].split("/", 1)
        if len(branch_and_path) > 1:
            folder_in_repo = branch_and_path[1]

    if not name:
        name = os.urandom(8).hex()

    clone_dir = os.path.join(destination, name)

    try:
        # 1. CLEAN START: If directory exists, remove it to avoid GitPython "Dir not empty" errors
        if os.path.exists(clone_dir):
            shutil.rmtree(clone_dir)
        os.makedirs(clone_dir, exist_ok=True)

        print(f"DEBUG: Actually cloning {repo_url} into {clone_dir}", flush=True)
        Repo.clone_from(repo_url, clone_dir)

        # 2. Subfolder logic (Only if /tree/ was used)
        if folder_in_repo:
            folder_path = os.path.join(clone_dir, folder_in_repo)
            if os.path.exists(folder_path):
                temp_path = clone_dir + "_temp"
                shutil.move(folder_path, temp_path)
                shutil.rmtree(clone_dir)
                shutil.move(temp_path, clone_dir)

        # 3. Remove .git to save space/avoid nested repo issues
        git_folder = os.path.join(clone_dir, ".git")
        if os.path.exists(git_folder):
            shutil.rmtree(git_folder, ignore_errors=True)

        print(f"DEBUG: Clone successful. Files: {os.listdir(clone_dir)}", flush=True)
        return clone_dir

    except Exception as e:
        print(f"❌ ERROR in clone_repo: {e}", flush=True)
        return None


if __name__ == "__main__":
    repo = (
        "https://github.com/Next-Gen-G9/week-2-algorithms-gossip-team/tree/main/utils"
    )
    path = clone_repo(repo, "/files_cache", "13")
    print(f"Cloned repository to: {path}")
