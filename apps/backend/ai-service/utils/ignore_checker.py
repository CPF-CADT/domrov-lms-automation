from pathlib import Path
import pathspec

# -------------------
# Ignore checker
# -------------------
class IgnoreChecker:
    def __init__(self, project_dir: str, user_exclude=None, user_include=None):
        self.project_dir = Path(project_dir)

        # 1. Default ignore patterns
        default_ignore_patterns = [
            "__pycache__/", "*.pyc", "*.pyo", "*.pyd",
            "node_modules/", "dist/", "build/", "*.log",
            "*.class", "*.exe", "*.dll", "*.jar", "*.war", "*.ear",
            "*.iml", "*.ipr", "*.ide", "*.lock",
            "*.swp", "*.swo", "*.bak", "*~", "*.tmp", "*.old",
            "Thumbs.db", "Desktop.ini",
            "*.png", "*.jpg", "*.jpeg", "*.gif", "*.bmp", "*.tiff", "*.ico",
            "*.svg", "*.webp", "*.heic",
            "*.pdf", "*.md", "*.txt", "*.json", "*.xml", "*.yaml", "*.yml",
            "venv/", ".venv/", "env/", ".env/", "ENV/", ".ENV/",
            "bin/", "obj/", "*.obj", "*.o", "*.a", "*.so", "*.dylib",
            "CMakeFiles/", "CMakeCache.txt", "cmake_install.cmake", "Makefile",
            "target/", '*.rar','*.zip' ,'*.7z', '*.tar', '*.gz', '*.bz2', '*.xz', '*.lz', '*.lzma', 
            '*.lzo', '*.rz', '*.s7z', '*.z', '*.apk', '*.jar', '*.war','*.docx', '*.pptx', '*.xlsx',
            '*.mp3', '*.mp4', '*.avi', '*.mkv', '*.mov', '*.wmv', '*.flv', '*.webm'
            
        ]

        # 2. Merge user exclude patterns
        if user_exclude:
            user_exclude = [p.lstrip("/") for p in user_exclude if p.strip()]
            default_ignore_patterns.extend(user_exclude)

        # 3. Temporary spec (used only to skip ignored paths)
        temp_spec = pathspec.PathSpec.from_lines(
            "gitwildmatch", default_ignore_patterns
        )

        # 4. Discover ignore files (only in unignored paths)
        ignore_lines = []
        for path in self.project_dir.rglob("*"):
            if not path.is_file():
                continue

            try:
                rel = path.relative_to(self.project_dir)
            except ValueError:
                continue

            # Skip paths already ignored by defaults
            if temp_spec.match_file(str(rel).replace("\\", "/")):
                continue

            if path.name.startswith(".") and "ignore" in path.name.lower():
                with open(path, "r", encoding="utf-8", errors="ignore") as f:
                    for line in f:
                        line = line.strip()
                        if line and not line.startswith("#"):
                            ignore_lines.append(line)

        # 5. Final combined patterns
        combined_patterns = default_ignore_patterns + ignore_lines + [".*"]  

        # 6. Final matcher
        self.spec = pathspec.PathSpec.from_lines(
            "gitwildmatch", combined_patterns
        )

        # 7. User include paths (absolute, exact)
        self.user_include = [
            self.project_dir / Path(p)
            for p in (user_include or [])
        ]

    def is_ignored(self, file_path: Path) -> bool:
        file_path = Path(file_path)

        # Always keep user-included files/folders
        for inc in self.user_include:
            if inc in file_path.parents or file_path in inc.parents or file_path.name in inc.name:
                return False

        # Relative path from project root
        try:
            rel_path = file_path.relative_to(self.project_dir)
        except ValueError:
            return True  # file outside project, ignore

        return self.spec.match_file(str(rel_path).replace("\\", "/"))


