def normalize_feedback(text: str) -> str:
    """
    Normalize feedback for duplicate detection.
    """

    return " ".join(text.lower().strip().split())


def remove_duplicates(feedback_items: list[str]) -> list[str]:
    """
    Remove exact duplicate feedback items.

    Returns:
        A list containing unique feedback items.
    """

    seen = set()
    unique_feedback = []

    for feedback in feedback_items:
        normalized = normalize_feedback(feedback)

        if normalized not in seen:
            seen.add(normalized)
            unique_feedback.append(feedback)

    return unique_feedback