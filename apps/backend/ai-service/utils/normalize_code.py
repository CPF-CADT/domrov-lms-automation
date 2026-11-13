import re
from enum import Enum
from typing import Optional


class BlockType(Enum):
    BRACE = "brace"
    INDENT = "indent"
    KEYWORD = "keyword"


class LanguageConfig:
    def __init__(self, block_type: BlockType):
        self.block_type = block_type


def detect_lang_config(filename: str) -> LanguageConfig:
    ext = filename.lower().split(".")[-1]

    if ext in {"c", "cpp", "h", "hpp", "java", "js", "ts", "rs", "go", "cs"}:
        return LanguageConfig(BlockType.BRACE)
    if ext in {"py", "nim", "hs", "yaml", "yml"}:
        return LanguageConfig(BlockType.INDENT)
    if ext in {"rb", "lua", "pas", "sh"}:
        return LanguageConfig(BlockType.KEYWORD)

    return LanguageConfig(BlockType.BRACE)


def normalize_code(source: str, lang_config: Optional[LanguageConfig] = None) -> str:
    if not source:
        return ""

    block_type = lang_config.block_type if lang_config else BlockType.BRACE

    if block_type in (BlockType.BRACE, BlockType.KEYWORD):
        source = re.sub(r'//.*', '', source)
        source = re.sub(r'/\*[\s\S]*?\*/', '', source)
        source = re.sub(r'#.*', '', source)
    else:
        source = re.sub(r'#.*', '', source)
        source = re.sub(r'("""|\'\'\')[\s\S]*?\1', '', source)

    source = re.sub(r'\s+', ' ', source) if block_type != BlockType.INDENT else source

    return source.strip()
