import os
from typing import Dict, List, Union
import chardet
from pathlib import Path
from utils.ignore_checker import IgnoreChecker
from utils.normalize_code import detect_lang_config, normalize_code

def detect_encoding(file_path: Path) -> str:
    """
    Detects file encoding. 
    Optimization: Only reads the first 4KB to save memory on large files.
    """
    try:
        with open(file_path, "rb") as f:
            raw = f.read(4096) 
        result = chardet.detect(raw)
        return result.get("encoding") or "utf-8"
    except Exception:
        return "utf-8"


def read_file(file_path: Path) -> str:
    """Reads a file and returns the full content as a string."""
    encoding = detect_encoding(file_path)
    try:
        with open(file_path, "r", encoding=encoding, errors="ignore") as f:
            return f.read()
    except Exception:
        return ""


def build_directory_tree(directory: Path, checker: IgnoreChecker, prefix: str = "", is_root: bool = True) -> str:
    """
    Directly walks the filesystem to generate the tree string.
    """
    if not directory.exists():
        return ""
    
    # Handle the root node display
    name = directory.name
    if is_root:
        name = f"{name}/" if directory.is_dir() else name
        lines = [name]
    else:
        lines = []

    # If it's a file passed as root, return just the name
    if directory.is_file():
        return lines[0]

    # Get all items, sorted by type (folder first) then name
    try:
        items = sorted(directory.iterdir(), key=lambda x: (not x.is_dir(), x.name.lower()))
    except PermissionError:
        return f"{prefix}[Permission Denied]"

    for item in items:
        if checker.is_ignored(item):
            #os.remove(item) need implment file delete
            continue

        if item.is_file():
            lines.append(f"{prefix}  {item.name}")
        elif item.is_dir():
            lines.append(f"{prefix}  {item.name}/")
            # Recurse
            lines.append(build_directory_tree(item, checker, prefix + "  ", is_root=False))

    return "\n".join(lines)


def _process_single_file(file_path: Path, base_path: Path) -> str:
    """Helper to read, normalize, and format a single file block."""
    content = read_file(file_path)
    
    # Normalization
    lang_config = detect_lang_config(file_path.name)
    normalized = normalize_code(content, lang_config)
    
    # Calculate relative path for the header (e.g. ---src/main.py---)
    try:
        rel_path = file_path.relative_to(base_path)
    except ValueError:
        # Fallback if file is not relative to base (e.g. external path)
        rel_path = file_path.name

    return f"---{rel_path}---\n{normalized}\n"


def collected_file_content(directory: Path, checker: IgnoreChecker, base_path: Path | None = None) -> str:
    """
    Walks the filesystem to collect and normalize code content.
    """
    if base_path is None:
        base_path = directory.parent

    output = []

    # CASE 1: Single File
    if directory.is_file():
        if not checker.is_ignored(directory):
            return _process_single_file(directory, base_path)
        return ""

    # CASE 2: Directory (Recursive walk)
    # rglob('*') is more efficient than manual recursion for flat collection
    try:
        for item in sorted(directory.rglob("*")):
            if item.is_file():
                if checker.is_ignored(item):
                    continue
                output.append(_process_single_file(item, base_path))
    except PermissionError:
        pass

    return "\n".join(output)


def process_path(path_str: str, user_exclude=None, user_include=None):
    """
    Main Entry Point.
    Returns:
        tree_output (str): Visual representation of the file structure.
        content_output (str): Concatenated content of all files.
    """
    path = Path(path_str)
    checker = IgnoreChecker(path, user_exclude, user_include)

    if not path.exists():
        raise FileNotFoundError(f"Path not found: {path_str}")

    # Generate the visual tree
    tree_output = build_directory_tree(path, checker)

    # Generate the combined code content
    content_output = collected_file_content(path, checker)

    return tree_output, content_output


def build_directory_json(directory: Path, checker: IgnoreChecker) -> Union[Dict, None]:
    if not directory.exists():
        return None

    if directory.is_file():
        return {"name": directory.name, "type": "file"}

    node = {"name": directory.name, "type": "folder"}
    children = []

    try:
        items = sorted(
            directory.iterdir(), key=lambda x: (not x.is_dir(), x.name.lower())
        )
        for item in items:
            if checker.is_ignored(item):
                continue

            child_node = build_directory_json(item, checker)
            if child_node:
                children.append(child_node)
    except PermissionError:
        pass

    if children:
        node["children"] = children

    return node


if __name__ == "__main__":
    base_path = Path("./files_cache/35")  # Replace with your folder path
    user_exclude = ["models/", "examples/"]  # Optional extra exclude patterns
    user_include = [
        "src/main.ts",
        "src/utils/",
    ]  # Optional exact files/folders to include

    # Create IgnoreChecker with user exclude/include
    checker = IgnoreChecker(
        base_path, user_exclude=user_exclude, user_include=user_include
    )

    tree_json = build_directory_json(base_path, checker)

    import json

    print(json.dumps(tree_json, indent=2))
