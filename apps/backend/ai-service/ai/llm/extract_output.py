import re
from typing import Dict, Any

def extract_scores_and_feedback_robust(text: str) -> Dict[str, Any]:
    result = {}

    scores_match = re.search(r'"scores"\s*:\s*\[([0-9.,\s]*)', text)
    if scores_match:
        raw_scores = scores_match.group(1)
        result["scores"] = [
            float(x) for x in re.findall(r'\d+\.?\d*', raw_scores)
        ]

    feedback_match = re.search(r'"feedback"\s*:\s*"([\s\S]*)', text)
    if feedback_match:
        result["feedback"] = feedback_match.group(1).strip()

    return result

# if __name__ == "__main__":
#     sample_text = '''
#     ``````json
# {
#   "scores": [
#     10.0,
#     10.0,
#     56.0
#   ],
#   "feedback": "Your code demonstrates a clear understanding of recursion and modular programming. The `factorial` function correctly calculates factorials for non-negative integers using a recursive approach, and variable names are meaningful.\n\nFor improvement, consider handling negative input in the `factorial` function. Currently, negative numbers lead to infinite recursion. Adding input validation or defining specific behavior for such cases would make the program more robust. Also, be mindful of potential `int` overflow for very large input numbers."
# }
#     '''
#     extracted = extract_scores_and_feedback_robust(sample_text)
#     print(extracted)