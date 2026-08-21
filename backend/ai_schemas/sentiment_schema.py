from pydantic import BaseModel, Field
from typing import Literal, List


class SentimentAnalysis(BaseModel):

    sentiment: Literal[
        "Positive",
        "Neutral",
        "Negative"
    ]


class BatchSentimentItem(BaseModel):

    index: int = Field(
        description="The zero-based index of the feedback item"
    )

    sentiment: Literal[
        "Positive",
        "Neutral",
        "Negative"
    ]


class BatchSentimentAnalysis(BaseModel):

    results: List[BatchSentimentItem]