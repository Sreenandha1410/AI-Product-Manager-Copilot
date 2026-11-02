from config.openrouter import llm
from ai_schemas.feedback_analysis import FeedbackAnalysis


class FeedbackAnalysisAgent:

    def __init__(self):
        self.llm = llm.with_structured_output(FeedbackAnalysis)

    def analyze(self, feedback: str) -> FeedbackAnalysis:

        prompt = f"""
Analyze the following customer feedback.

Customer feedback:
{feedback}

Determine:

1. Sentiment:
- Positive
- Neutral
- Negative

2. Priority:
- High: serious issue, blocking problem, major business impact
- Medium: useful improvement or moderate issue
- Low: minor suggestion or cosmetic improvement

Return only the structured result.
"""

        return self.llm.invoke(prompt)
