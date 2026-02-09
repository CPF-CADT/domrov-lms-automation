def rubric_to_plain_text(rubric_input):
    lines = []

    # 1. Handle String input
    if isinstance(rubric_input, str):
        lines.append(f"- {rubric_input}: 100%")
        return "\n".join(lines)

    # 2. Check if it's iterable (Handles list and gRPC RepeatedCompositeContainer)
    try:
        iterator = iter(rubric_input)
    except TypeError:
        raise ValueError(
            f"Input must be an iterable or string, got {type(rubric_input)}"
        )

    for item in iterator:
        criterion = getattr(item, "criterion", None) or item.get("criterion")
        weight = getattr(item, "weight", None) or item.get("weight")

        if criterion is not None and weight is not None:
            lines.append(f"- {criterion}: {weight}%")

    if not lines:
        raise ValueError("Rubric input was empty or contained invalid items.")

    return "\n".join(lines)
