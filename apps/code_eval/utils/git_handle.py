import os
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


def clone_repo(repo_url: str, destination: str = None, name=os.urandom(8).hex()) -> str:
    os.makedirs(destination if destination else './files_cache', exist_ok=True)
    clone_dir = os.path.join(destination if destination else './files_cache', name)
    try:
        if not os.path.exists(clone_dir):
            os.makedirs(clone_dir)
            Repo.clone_from(repo_url, clone_dir)
        return clone_dir
    except GitCommandError as e:
        print(f"Error cloning repository: {e}")
        return None


if __name__ == "__main__":
    repo = "https://github.com/lida-sokha/KonnYoeung.git"
    access = is_repo_accessible(repo)
    print(f"Repository access: {'public' if access else 'private'}")
    if access:
        path = clone_repo(repo)
        print(f"Cloned repository to: {path}")
