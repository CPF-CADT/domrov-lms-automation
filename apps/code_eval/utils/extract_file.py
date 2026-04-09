
import os
import patoolib


def extract_file(filePath: str, destinationFolder: str) -> str:
    """
    Extracts archive files into the destination folder.
    Returns the folder where files were extracted (destinationFolder).
    Deletes the original archive after extraction.
    """
    os.makedirs(destinationFolder, exist_ok=True)

    if filePath.lower().endswith((".zip", ".tar", ".tar.gz", ".tgz", ".rar", ".7z")):
        patoolib.extract_archive(filePath, outdir=destinationFolder)
        print(f"✅ Extracted {filePath} to {destinationFolder}")
        os.remove(filePath)
        return destinationFolder  # Return the folder directly

    # Not an archive, just return the file path
    return filePath
