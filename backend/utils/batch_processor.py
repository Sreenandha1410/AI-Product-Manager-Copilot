from typing import TypeVar, List

T = TypeVar("T")


def create_batches(items: List[T], batch_size: int = 50) -> List[List[T]]:
    """
    Split a list of items into smaller batches.

    Args:
        items: List of items to split.
        batch_size: Maximum number of items in each batch.

    Returns:
        A list containing smaller batches.
    """

    if batch_size <= 0:
        raise ValueError("batch_size must be greater than 0")

    return [
        items[i:i + batch_size]
        for i in range(0, len(items), batch_size)
    ]