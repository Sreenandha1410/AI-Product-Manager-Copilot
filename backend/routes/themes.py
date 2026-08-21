# backend/routes/themes.py

import time

from fastapi import APIRouter, HTTPException
from sqlalchemy.orm import Session

from db import SessionLocal
from models import Feedback, Theme

from agents.theme_agent import ThemeAgent
from agents.sentiment_agent import SentimentAgent


router = APIRouter(
    prefix="/themes",
    tags=["Themes"]
)


# =========================================================
# GEMINI RATE-LIMIT SETTINGS
# =========================================================

# Your Gemini 3.5 Flash Lite limit is 15 requests/minute.
#
# We use one request for every 50 feedback items.
# Waiting 6 seconds means approximately:
#
# 60 / 6 = 10 requests/minute
#
# This keeps us below the 15 RPM limit.

SENTIMENT_BATCH_SIZE = 50
SENTIMENT_REQUEST_DELAY = 6

# If Gemini returns 429, wait this long before retrying.
QUOTA_RETRY_WAIT = 30

# Maximum number of retries for one batch.
MAX_RETRIES = 3


# =========================================================
# HELPER — SENTIMENT BATCH WITH RETRY
# =========================================================

def analyze_sentiment_with_retry(
    sentiment_agent,
    batch_texts: list[str]
):
    """
    Send one batch to Gemini.

    If Gemini returns a rate-limit / quota error,
    wait and retry automatically.
    """

    for attempt in range(1, MAX_RETRIES + 1):

        try:

            result = sentiment_agent.analyze_batch(
                batch_texts
            )

            return result

        except Exception as e:

            error_message = str(e)

            is_quota_error = (
                "RESOURCE_EXHAUSTED" in error_message
                or "429" in error_message
                or "quota" in error_message.lower()
                or "rate limit" in error_message.lower()
                or "rate_limit" in error_message.lower()
            )

            if not is_quota_error:

                raise

            print(
                f"Gemini rate limit reached. "
                f"Retry {attempt}/{MAX_RETRIES}."
            )

            if attempt < MAX_RETRIES:

                print(
                    f"Waiting {QUOTA_RETRY_WAIT} seconds "
                    f"before retry..."
                )

                time.sleep(QUOTA_RETRY_WAIT)

            else:

                raise RuntimeError(
                    "Gemini API rate limit exceeded "
                    "after multiple retries."
                )


# =========================================================
# POST /themes/analyze
# =========================================================

@router.post("/analyze")
def analyze_themes():

    db = SessionLocal()

    try:

        # =================================================
        # 1. GET ALL FEEDBACK
        # =================================================

        feedback_rows = (
            db.query(Feedback)
            .order_by(Feedback.id)
            .all()
        )

        if not feedback_rows:

            raise HTTPException(
                status_code=400,
                detail=(
                    "No feedback found. "
                    "Upload feedback first."
                )
            )

        # =================================================
        # 2. PREPARE VALID FEEDBACK
        # =================================================

        valid_feedback = []

        for row in feedback_rows:

            if (
                row.feedback_text
                and row.feedback_text.strip()
            ):

                valid_feedback.append(
                    {
                        "id": row.id,
                        "text": row.feedback_text.strip()
                    }
                )

        if not valid_feedback:

            raise HTTPException(
                status_code=400,
                detail="No valid feedback text found."
            )

        print(
            f"Total valid feedback: "
            f"{len(valid_feedback)}"
        )

        # =================================================
        # 3. SENTIMENT ANALYSIS
        # =================================================

        print(
            "=========================================="
        )

        print(
            "Starting Sentiment Agent..."
        )

        print(
            f"Total feedback: {len(valid_feedback)}"
        )

        print(
            f"Batch size: {SENTIMENT_BATCH_SIZE}"
        )

        total_batches = (
            len(valid_feedback)
            + SENTIMENT_BATCH_SIZE
            - 1
        ) // SENTIMENT_BATCH_SIZE

        print(
            f"Total Gemini sentiment requests: "
            f"{total_batches}"
        )

        print(
            "=========================================="
        )

        sentiment_agent = SentimentAgent()

        total_sentiment_results = 0

        for batch_number, start in enumerate(
            range(
                0,
                len(valid_feedback),
                SENTIMENT_BATCH_SIZE
            ),
            start=1
        ):

            batch_items = valid_feedback[
                start:start + SENTIMENT_BATCH_SIZE
            ]

            batch_texts = [
                item["text"]
                for item in batch_items
            ]

            print("")
            print(
                f"Sentiment batch "
                f"{batch_number}/{total_batches}"
            )

            print(
                f"Processing feedback "
                f"{start + 1}-"
                f"{start + len(batch_items)} "
                f"of {len(valid_feedback)}"
            )

            # ---------------------------------------------
            # Send batch to Gemini
            # ---------------------------------------------

            try:

                sentiment_result = (
                    analyze_sentiment_with_retry(
                        sentiment_agent,
                        batch_texts
                    )
                )

            except Exception as e:

                db.rollback()

                print(
                    "Sentiment batch failed:"
                )

                print(str(e))

                raise HTTPException(
                    status_code=429,
                    detail=(
                        "Gemini API rate limit exceeded. "
                        "Please wait for the quota window "
                        "to reset and run the analysis again."
                    )
                )

            # ---------------------------------------------
            # Save returned sentiments
            # ---------------------------------------------

            batch_saved = 0

            for result_item in sentiment_result.results:

                local_index = result_item.index

                # Gemini should return indexes
                # from 0 to batch_size - 1.

                if (
                    local_index < 0
                    or local_index >= len(batch_items)
                ):

                    print(
                        f"Invalid sentiment index: "
                        f"{local_index}"
                    )

                    continue

                feedback_id = (
                    batch_items[local_index]["id"]
                )

                feedback_row = (
                    db.query(Feedback)
                    .filter(
                        Feedback.id == feedback_id
                    )
                    .first()
                )

                if feedback_row:

                    feedback_row.sentiment = (
                        result_item.sentiment
                    )

                    batch_saved += 1
                    total_sentiment_results += 1

            # ---------------------------------------------
            # Commit this batch
            # ---------------------------------------------

            db.commit()

            print(
                f"Batch saved: {batch_saved}"
            )

            print(
                f"Total sentiment results saved: "
                f"{total_sentiment_results}"
            )

            # ---------------------------------------------
            # RATE LIMIT PROTECTION
            # ---------------------------------------------
            #
            # Do NOT wait after the final batch.
            #

            if batch_number < total_batches:

                print(
                    f"Waiting "
                    f"{SENTIMENT_REQUEST_DELAY} seconds "
                    f"before next Gemini request..."
                )

                time.sleep(
                    SENTIMENT_REQUEST_DELAY
                )

        print("")
        print(
            "=========================================="
        )

        print(
            "Sentiment analysis completed."
        )

        print(
            f"Results saved: "
            f"{total_sentiment_results}"
        )

        print(
            "=========================================="
        )

        # =================================================
        # 4. THEME EXTRACTION
        # =================================================
        #
        # IMPORTANT:
        #
        # We keep this at 50 for now.
        #
        # This prevents unnecessary Gemini usage.
        #
        # Later, once everything is stable,
        # you can increase this.
        #
        # =================================================

        THEME_ANALYSIS_LIMIT = 50

        theme_feedback = valid_feedback[
            :THEME_ANALYSIS_LIMIT
        ]

        theme_texts = [
            item["text"]
            for item in theme_feedback
        ]

        print("")
        print(
            "=========================================="
        )

        print(
            f"Feedback sent to ThemeAgent: "
            f"{len(theme_texts)}"
        )

        print(
            "Starting Theme Agent..."
        )

        print(
            "=========================================="
        )

        theme_agent = ThemeAgent()

        theme_result = (
            theme_agent.analyze_feedback_in_batches(
                theme_texts,
                batch_size=50
            )
        )

        print(
            "Theme Agent completed."
        )

        print(
            f"Themes found: "
            f"{len(theme_result.themes)}"
        )

        # =================================================
        # 5. DELETE OLD THEMES
        # =================================================

        print(
            "Deleting previously generated themes..."
        )

        db.query(Theme).delete()

        db.commit()

        # =================================================
        # 6. SAVE NEW THEMES
        # =================================================

        saved_themes = []

        for theme in theme_result.themes:

            # ---------------------------------------------
            # Feedback belonging to this theme
            # ---------------------------------------------

            theme_feedback_set = set(
                theme.feedback
            )

            # ---------------------------------------------
            # Get sentiments for this theme
            # ---------------------------------------------

            theme_sentiments = []

            for item in theme_feedback:

                if item["text"] in theme_feedback_set:

                    feedback_row = (
                        db.query(Feedback)
                        .filter(
                            Feedback.id == item["id"]
                        )
                        .first()
                    )

                    if (
                        feedback_row
                        and feedback_row.sentiment
                    ):

                        theme_sentiments.append(
                            feedback_row.sentiment
                        )

            # ---------------------------------------------
            # Determine majority sentiment
            # ---------------------------------------------

            if theme_sentiments:

                majority_sentiment = max(
                    set(theme_sentiments),
                    key=theme_sentiments.count
                )

            else:

                majority_sentiment = "Neutral"

            # ---------------------------------------------
            # Create Theme
            # ---------------------------------------------

            db_theme = Theme(

                theme_label=theme.theme,

                sentiment=majority_sentiment,

                frequency=theme.feedback_count,

                cluster_id=None,

                workspace_id="default"
            )

            db.add(db_theme)

            # ---------------------------------------------
            # API response
            # ---------------------------------------------

            saved_themes.append(
                {
                    "theme": theme.theme,
                    "frequency": theme.feedback_count,
                    "sentiment": majority_sentiment
                }
            )

        # =================================================
        # 7. FINAL COMMIT
        # =================================================

        db.commit()

        print(
            f"Successfully saved "
            f"{len(saved_themes)} themes."
        )

        # =================================================
        # 8. RETURN RESULT
        # =================================================

        return {

            "message":
                f"{len(saved_themes)} themes "
                f"extracted and saved.",

            "feedback_processed":
                len(valid_feedback),

            "sentiment_processed":
                total_sentiment_results,

            "theme_feedback_processed":
                len(theme_feedback),

            "themes":
                saved_themes
        }

    # =====================================================
    # HTTP ERROR
    # =====================================================

    except HTTPException:

        raise

    # =====================================================
    # RUNTIME / GEMINI ERROR
    # =====================================================

    except RuntimeError as e:

        db.rollback()

        error_message = str(e)

        if (
            "RESOURCE_EXHAUSTED" in error_message
            or "429" in error_message
            or "quota" in error_message.lower()
            or "rate limit" in error_message.lower()
        ):

            raise HTTPException(
                status_code=429,
                detail=(
                    "Gemini API rate limit exceeded. "
                    "Please wait for the quota window "
                    "to reset and run the analysis again."
                )
            )

        raise HTTPException(
            status_code=500,
            detail=error_message
        )

    # =====================================================
    # GENERAL ERROR
    # =====================================================

    except Exception as e:

        db.rollback()

        error_message = str(e)

        if (
            "RESOURCE_EXHAUSTED" in error_message
            or "429" in error_message
            or "quota" in error_message.lower()
            or "rate limit" in error_message.lower()
        ):

            raise HTTPException(
                status_code=429,
                detail=(
                    "Gemini API rate limit exceeded. "
                    "Please wait for the quota window "
                    "to reset and run the analysis again."
                )
            )

        raise HTTPException(
            status_code=500,
            detail=error_message
        )

    # =====================================================
    # ALWAYS CLOSE DATABASE
    # =====================================================

    finally:

        db.close()


# =========================================================
# GET /themes/
# =========================================================

@router.get("/")
def get_themes():

    db: Session = SessionLocal()

    try:

        themes = (
            db.query(Theme)
            .order_by(
                Theme.frequency.desc()
            )
            .all()
        )

        return [

            {

                "id":
                    t.id,

                "theme_label":
                    t.theme_label,

                "frequency":
                    t.frequency,

                "sentiment":
                    t.sentiment,

                "cluster_id":
                    t.cluster_id
            }

            for t in themes
        ]

    finally:

        db.close()