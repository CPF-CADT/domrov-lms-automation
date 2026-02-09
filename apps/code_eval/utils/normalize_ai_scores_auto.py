def normalize_ai_scores_auto(rubric, ai_scores):
    if len(rubric) != len(ai_scores):
        raise ValueError("Rubric and AI scores length mismatch")

    # Extract weights from gRPC objects (supporting both object.weight and dict['weight'])
    weights = [
        (
            getattr(item, "weight", None)
            if not isinstance(item, dict)
            else item.get("weight")
        )
        for item in rubric
    ]

    # Now compare ai_score (float) vs weight (int/float)
    any_percent = any(ai > w for ai, w in zip(ai_scores, weights))

    final_scores = []
    for max_val, ai_score in zip(weights, ai_scores):
        if any_percent:
            # If the AI provided percentages (0-100), scale it by the weight
            score = (ai_score / 100) * max_val
        else:
            # If the AI provided absolute points, use as is
            score = ai_score
        final_scores.append(round(score, 2))

    return final_scores
