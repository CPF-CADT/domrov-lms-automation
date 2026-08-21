import os

# Root directory (relative path)
ROOT_DIR = "."   # current directory
OUTPUT_FILE = "enum_schemas.txt"

def collect_ts_files(root_dir):
    ts_files = []
    for root, dirs, files in os.walk(root_dir):
        for file in files:
            if file.endswith(".ts"):
                ts_files.append(os.path.join(root, file))
    return ts_files

def write_to_single_file(ts_files, output_file):
    with open(output_file, "w", encoding="utf-8") as out:
        for file_path in ts_files:
            out.write("=" * 80 + "\n")
            out.write(f"FILE: {file_path}\n")
            out.write("=" * 80 + "\n\n")

            try:
                with open(file_path, "r", encoding="utf-8") as f:
                    out.write(f.read())
            except Exception as e:
                out.write(f"ERROR reading file: {e}")

            out.write("\n\n")

if __name__ == "__main__":
    ts_files = collect_ts_files(ROOT_DIR)
    write_to_single_file(ts_files, OUTPUT_FILE)
    print(f"✅ Collected {len(ts_files)} .ts files into '{OUTPUT_FILE}'")
