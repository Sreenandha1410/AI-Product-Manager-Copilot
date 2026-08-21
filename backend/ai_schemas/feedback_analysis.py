from pydantic import BaseModel
from typing import Literal


class FeedbackAnalysis(BaseModel):
    sentiment: Literal["Positive", "Neutral", "Negative"]
    priority: Literal["High", "Medium", "Low"]