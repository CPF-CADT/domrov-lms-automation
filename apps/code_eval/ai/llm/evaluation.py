from ai.llm.base import MAX_TOKENS, AIModel
from ai.llm.evaluate_with_llm import get_evaluator
from ai.llm.extract_output import extract_scores_and_feedback_robust
from ai.prompt.prompt import generate_prompt
from utils.custom_exception import InputTokenLimited
from utils.download_file_r2 import downloadFiles
from utils.read_file import process_path
from utils.token_handler import estimate_tokens

def evaluate(
    submission_id:str,
    resource_url: str,
    rubrics: list[dict],
    user_exclude_files: list[str] = None,
    user_include_files: list[str] = None,
    ai_model: AIModel = AIModel.GEMINI_2_5,
):

    filePath = downloadFiles(resource_url, submission_id)

    tree_str, content_str = process_path(
        filePath, user_exclude_files, user_include_files
    )

    final_prompt = generate_prompt(
        rubric=rubrics, tree_view=tree_str, file_contents=content_str
    )
    # check token count
    input_tokens = estimate_tokens(final_prompt, ai_model)
    output_tokens = 0
    if input_tokens < MAX_TOKENS:
        evaluator = get_evaluator(ai_model)
        result = evaluator.evaluate(final_prompt)
        output_tokens = estimate_tokens(result, ai_model)

    else:
        raise InputTokenLimited("Input tokens exceed maximum allowed limit")

    return {
        "result": extract_scores_and_feedback_robust(result),
        "input_tokens": input_tokens,
        "output_tokens": output_tokens,
    }
