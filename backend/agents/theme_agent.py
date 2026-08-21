from config.gemini import llm
from prompts.theme_prompt import theme_prompt
from ai_schemas.theme_schema import ThemeAnalysis
import time


class ThemeAgent:
    """
    AI Agent responsible for analyzing customer feedback
    and grouping it into product themes.
    """

    def __init__(self):
        self.llm = llm.with_structured_output(ThemeAnalysis)
        self.prompt = theme_prompt
        self.chain = self.prompt | self.llm

    def analyze_feedback(self, feedback: str) -> ThemeAnalysis:

        if not feedback or not feedback.strip():
            raise ValueError("Feedback cannot be empty.")

        try:
            response = self.chain.invoke(
                {
                    "feedback": feedback
                }
            )

            return response

        except Exception as exc:
            print(f"Theme analysis failed: {exc}")
            raise RuntimeError(
                f"Unable to analyze customer feedback: {exc}"
            ) from exc

    def analyze_feedback_in_batches(
        self,
        feedback_items: list[str],
        batch_size: int = 50
    ) -> ThemeAnalysis:

        from utils.batch_processor import create_batches
        from utils.duplicate_handler import remove_duplicates
        from utils.theme_aggregator import aggregate_theme_results

        if not feedback_items:
            raise ValueError("Feedback items cannot be empty.")

        # -------------------------------------------------
        # Remove duplicate feedback
        # -------------------------------------------------

        unique_feedback = remove_duplicates(feedback_items)

        # -------------------------------------------------
        # Create batches
        # -------------------------------------------------

        batches = create_batches(
            unique_feedback,
            batch_size
        )

        results = []

        # -------------------------------------------------
        # Process each batch
        # -------------------------------------------------

        for i, batch in enumerate(batches, start=1):

            print(
                f"\nAnalyzing batch {i}/{len(batches)} "
                f"({len(batch)} feedback items)..."
            )

            feedback_text = "\n".join(batch)

            # -------------------------------------------------
            # Try Gemini request
            # -------------------------------------------------

            try:

                result = self.analyze_feedback(
                    feedback_text
                )

                results.append(result)

                print(
                    f"✓ Batch {i} completed successfully."
                )

            except Exception as exc:

                error_message = str(exc)

                # -------------------------------------------------
                # IMPORTANT:
                # Do NOT retry Gemini quota errors.
                # -------------------------------------------------

                if (
                    "RESOURCE_EXHAUSTED" in error_message
                    or "429" in error_message
                    or "quota" in error_message.lower()
                ):

                    print(
                        f"✗ Gemini quota exceeded while processing "
                        f"batch {i}."
                    )

                    raise RuntimeError(
                        "Gemini API quota exceeded. "
                        "Please try again after the quota resets."
                    ) from exc

                # -------------------------------------------------
                # For other temporary errors, retry
                # -------------------------------------------------

                print(
                    f"⚠ Batch {i} failed: {exc}"
                )

                # Retry up to 2 additional times
                success = False

                for attempt in range(2):

                    try:

                        print(
                            f"Retrying batch {i} "
                            f"(attempt {attempt + 2}/3)..."
                        )

                        time.sleep(2)

                        result = self.analyze_feedback(
                            feedback_text
                        )

                        results.append(result)

                        print(
                            f"✓ Batch {i} completed successfully "
                            f"on retry."
                        )

                        success = True
                        break

                    except Exception as retry_exc:

                        retry_message = str(retry_exc)

                        # Stop immediately if quota is exhausted
                        if (
                            "RESOURCE_EXHAUSTED" in retry_message
                            or "429" in retry_message
                            or "quota" in retry_message.lower()
                        ):

                            print(
                                "✗ Gemini API quota exceeded. "
                                "Stopping retries."
                            )

                            raise RuntimeError(
                                "Gemini API quota exceeded. "
                                "Please try again after the quota resets."
                            ) from retry_exc

                        print(
                            f"⚠ Retry failed: {retry_exc}"
                        )

                if not success:

                    print(
                        f"✗ Batch {i} failed after retries."
                    )

        # -------------------------------------------------
        # If every batch failed
        # -------------------------------------------------

        if not results:

            raise RuntimeError(
                "All theme analysis batches failed."
            )

        # -------------------------------------------------
        # Combine successful results
        # -------------------------------------------------

        final_result = aggregate_theme_results(
            results
        )

        return final_result