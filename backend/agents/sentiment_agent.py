# backend/agents/sentiment_agent.py

from config.openrouter import llm as openrouter_llm
from ai_schemas.sentiment_schema import BatchSentimentAnalysis
import json


class SentimentAgent:
    def __init__(self):
        # Use OpenRouter instead of Gemini
        self.llm = openrouter_llm

    def analyze_batch(self, feedback_list: list[str]) -> BatchSentimentAnalysis:
        """
        Analyze a batch of customer feedback items and classify
        each one as Positive, Neutral, or Negative.
        """

        if not feedback_list:
            return BatchSentimentAnalysis(results=[])

        # Format feedback with zero-based indexes
        formatted_feedback = "\n\n".join(
            [
                f"FEEDBACK {i}:\n{feedback}"
                for i, feedback in enumerate(feedback_list)
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
7. Sentiment must be exactly Positive, Neutral, or Negative.
8. Return ONLY valid JSON.
9. Do not include Markdown.
10. Do not include ```json or ``` code fences.
11. Do not include explanations before or after the JSON.

Return the result using exactly this structure:

{{
    "results": [
        {{
            "index": 0,
            "sentiment": "Positive"
        }},
        {{
            "index": 1,
            "sentiment": "Negative"
        }}
    ]
}}
"""

        try:
            # Call OpenRouter
            response = self.llm.invoke(prompt)

            # Extract response content
            content = response.content

            # Handle list-based responses
            if isinstance(content, list):
                text_parts = []

                for item in content:
                    if isinstance(item, str):
                        text_parts.append(item)

                    elif isinstance(item, dict) and "text" in item:
                        text_parts.append(str(item["text"]))

                content = "\n".join(text_parts)

            content = str(content).strip()

            # Remove code fences if the model adds them
            if content.startswith("```"):
                content = content.replace("```json", "")
                content = content.replace("```", "")
                content = content.strip()

            # Convert JSON text to Python dictionary
            data = json.loads(content)

            # Validate using Pydantic schema
            result = BatchSentimentAnalysis.model_validate(data)

            # Make sure every feedback item has exactly one result
            if len(result.results) != len(feedback_list):
                raise ValueError(
                    f"Expected {len(feedback_list)} sentiment results "
                    f"but received {len(result.results)}."
                )

            # Check that indexes are correct
            expected_indexes = set(range(len(feedback_list)))
            actual_indexes = {item.index for item in result.results}

            if actual_indexes != expected_indexes:
                raise ValueError(
                    f"Invalid feedback indexes returned. "
                    f"Expected {expected_indexes}, "
                    f"but received {actual_indexes}."
                )

            return result

        except json.JSONDecodeError as exc:
            print(f"Sentiment analysis returned invalid JSON: {exc}")
            raise RuntimeError(
                "Unable to analyze sentiment: OpenRouter returned invalid JSON."
            ) from exc

        except Exception as exc:
            print(f"Sentiment analysis failed: {exc}")
            raise RuntimeError(
                f"Unable to analyze sentiment: {exc}"
            ) from exc