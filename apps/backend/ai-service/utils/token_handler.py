import tiktoken
from enum import Enum

from ai.llm.base import AIModel

def estimate_tokens(text: str, model: AIModel = AIModel.GPT_4O) -> int:
    # Map each model to a tiktoken encoding
    model_to_encoding = {
        AIModel.GEMINI_2_5: "cl100k_base",      # approximate GPT encoding
        AIModel.GEMINI_1_5: "cl100k_base",
        AIModel.OLLAMA_GPT_OSS: "r50k_base",    # LLaMA-style encoding
        AIModel.GPT_4O: "cl100k_base",          # GPT-4o encoding
        AIModel.DEEPSEEK: "cl100k_base",        # fallback
        AIModel.GROK_CODE_FAST_1: "cl100k_base" # similar to GPT
    }

    encoding_name = model_to_encoding.get(model, "cl100k_base")
    encoding = tiktoken.get_encoding(encoding_name)

    tokens = encoding.encode(text)
    return len(tokens)

