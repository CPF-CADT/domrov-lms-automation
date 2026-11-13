
from ai.llm.base import AIModel, BaseEvaluator
from ai.llm.deepseek import DeepSeekEvaluator
from ai.llm.gemini import Gemini1_5Evaluator, Gemini2_5Evaluator
from ai.llm.grock import Grok_Code_Fast_1_Evaluator
from ai.llm.ollma import OllamaEvaluator
from ai.llm.chatgpt import Gpt4oEvaluator

def get_evaluator(model: AIModel) -> BaseEvaluator:
    if model == AIModel.GEMINI_2_5:
        return Gemini2_5Evaluator()
    if model == AIModel.GEMINI_1_5:
        return Gemini1_5Evaluator()
    if model == AIModel.OLLAMA_GPT_OSS:
        return OllamaEvaluator()
    if model == AIModel.GPT_4O:
        return Gpt4oEvaluator()
    if model == AIModel.DEEPSEEK:
        return DeepSeekEvaluator()
    if model == AIModel.GROK_CODE_FAST_1:
        return Grok_Code_Fast_1_Evaluator()
    raise ValueError("Unsupported model")

