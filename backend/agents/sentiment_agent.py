# backend/agents/sentiment_agent.py

from config.gemini import llm
from ai_schemas.sentiment_schema import BatchSentimentAnalysis


class SentimentAgent:

    def __init__(self):

        self.llm = llm.with_structured_output(
            BatchSentimentAnalysis
        )

    def analyze_batch(
        self,
        feedback_list: list[str]
    ) -> BatchSentimentAnalysis:

        if not feedback_list:

            return BatchSentimentAnalysis(
                results=[]
            )

        formatted_feedback = "\n\n".join(
            [
                f"FEEDBACK {i}:\n{feedback}"
                for i, feedback
                in enumerate(feedback_list)
            ]
        )

        prompt = f"""
You are a customer feedback sentiment analysis system.

Analyze ALL of the following customer feedback items.

{formatted_feedback}

For EACH feedback item, classify sentiment as exactly one:

Positive
Neutral
Negative

Definitions:

Positive:
Praise, satisfaction, appreciation,
or positive experience.

Neutral:
A factual statement, question,
suggestion, or feature request
without clear positive or negative emotion.

Negative:
Complaint, frustration, dissatisfaction,
failure, or problem.

IMPORTANT RULES:

1. Return exactly ONE result for EVERY feedback item.
2. Preserve the original index number.
3. Index starts from 0.
4. Do not skip any feedback.
5. Do not combine feedback items.
6. Do not create extra feedback items.
7. Return only the structured result.
"""

        return self.llm.invoke(prompt)