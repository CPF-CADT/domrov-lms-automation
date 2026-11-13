import os
import json
import tempfile

def save_json(content, base_dir="content"):
    os.makedirs(base_dir, exist_ok=True)

    filename = os.path.basename(content.get("name", "output"))
    if not filename.endswith(".json"):
        filename += ".json"

    final_path = os.path.join(base_dir, filename)

    try:
        with tempfile.NamedTemporaryFile(
            mode="w",
            encoding="utf-8",
            dir=base_dir,
            delete=False
        ) as tmp:
            json.dump(content, tmp, ensure_ascii=False, indent=4)
            tmp.flush()
            os.fsync(tmp.fileno())
            temp_path = tmp.name

        os.replace(temp_path, final_path)
        return final_path

    except Exception as e:
        if "temp_path" in locals() and os.path.exists(temp_path):
            os.remove(temp_path)
        raise RuntimeError(f"Failed to save JSON: {e}")


