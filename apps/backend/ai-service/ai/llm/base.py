from enum import Enum
from abc import ABC, abstractmethod


class AIModel(Enum):
    GEMINI_2_5 = "gemini-2.5-flash"
    GEMINI_1_5 = "gemini-1.5-pro"
    OLLAMA_GPT_OSS = "ollama-gpt-oss"
    GPT_4O = "gpt-4o"
    DEEPSEEK = "deepseek-chat"
    GROK_CODE_FAST_1 = "grok-code-fast-1"


MAX_TOKENS = 100000


class BaseEvaluator(ABC):
    @abstractmethod
    def evaluate(self, text: str) -> str:
        pass
