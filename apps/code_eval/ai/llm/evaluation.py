from ai.llm.base import MAX_TOKENS, AIModel
from ai.llm.evaluate_with_llm import get_evaluator
from ai.llm.extract_output import extract_scores_and_feedback_robust
from ai.prompt.prompt import generate_prompt
from config.grpc_config import EvaluateClient
from utils.custom_exception import InputTokenLimited
from utils.download_file_r2 import downloadFiles
from utils.read_file import process_path
from utils.token_handler import estimate_tokens
from ai.llm.ai_client import AIClient, AIProvider
import requests


def evaluate(
    submission_id: str,
    resource_url: str,
    rubrics: list[dict],
    user_exclude_files: list[str] = None,
    user_include_files: list[str] = None,
    ai_model: AIModel | str = AIModel.GEMINI_2_5,
    api_key: str = None,
    api_endpoint: str = None,
    provider: str = None,
):
    # -----------------------------
    # Download
    # -----------------------------
    filePath = downloadFiles(resource_url, submission_id)
    tree_str, content_str = process_path(
        filePath, user_exclude_files, user_include_files
    )
    eval_client = EvaluateClient()

    final_prompt = generate_prompt(
        rubric=rubrics,
        tree_view=tree_str,
        file_contents=content_str,
    )

    # normalize model name
    model_name = ai_model.value if isinstance(ai_model, AIModel) else str(ai_model)

    input_tokens = estimate_tokens(final_prompt, ai_model)
    output_tokens = 0

    if input_tokens >= MAX_TOKENS:
        raise InputTokenLimited("Input tokens exceed maximum allowed limit")

    # =========================================================
    # SYSTEM AI
    # =========================================================
    if api_key is None:
        print("Using SYSTEM AI")

        evaluator = get_evaluator(ai_model)
        result = evaluator.evaluate(final_prompt)
        output_tokens = estimate_tokens(result, ai_model)

    # =========================================================
    # USER AI
    # =========================================================
    else:
        if not provider:
            raise ValueError("User AI requires provider")

        provider_lower = provider.lower().strip()
        print(f"Using USER AI provider={provider_lower}")

        try:
            provider_enum = AIProvider(provider_lower)

            client = AIClient(
                provider=provider_enum,
                api_key=api_key,
            )

            result = client.generate(
                prompt=final_prompt,
                model=model_name,
                temperature=0.1,
            )

        except Exception as e:
            print(f"AIClient failed: {e}")
            eval_client.notify_user_ai_model_insufficient(submission_id=submission_id, raw_response="AIClient failed: ")
            raise RuntimeError(f"Gemini SDK failed (no HTTP fallback allowed): {e}")
        
        output_tokens = estimate_tokens(result, ai_model)

    return {
        "result": extract_scores_and_feedback_robust(result),
        "input_tokens": input_tokens,
        "output_tokens": output_tokens,
    }
