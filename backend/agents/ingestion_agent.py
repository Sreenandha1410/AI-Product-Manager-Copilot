# backend/agents/ingestion_agent.py
"""
Ingestion Agent

Responsible for collecting, cleaning, validating,
and storing customer feedback in PostgreSQL.

Project: AI Product Manager Copilot
"""

from datetime import date
from typing import Optional, List
import pandas as pd

from agents.base_agent import BaseAgent
from models import Feedback


class IngestionAgent(BaseAgent):

    def __init__(self):
        super().__init__("Ingestion Agent")

    # ─────────────────────────────────────────────
    # CLEAN TEXT
    # ─────────────────────────────────────────────

    def clean_text(self, text: str) -> str:
        if text is None:
            return ""
        text = str(text)
        text = " ".join(text.split())   # collapse whitespace
        return text.strip()

    # ─────────────────────────────────────────────
    # VALIDATE
    # ─────────────────────────────────────────────

    def validate_feedback(self, text: str) -> bool:
        if not text:
            return False
        if len(text.strip()) < 3:
            return False
        return True

    # ─────────────────────────────────────────────
    # DUPLICATE CHECK
    # ─────────────────────────────────────────────

    def is_duplicate(self, text: str) -> bool:
        existing = (
            self.db.query(Feedback)
            .filter(Feedback.feedback_text == text)
            .first()
        )
        return existing is not None

    # ─────────────────────────────────────────────
    # INSERT SINGLE FEEDBACK
    # ─────────────────────────────────────────────

    def add_feedback(
        self,
        text:    str,
        source:  str           = "manual",
        user_id: Optional[str] = None,    # String UUID, not int
    ) -> dict:

        try:
            cleaned_text = self.clean_text(text)

            if not self.validate_feedback(cleaned_text):
                return self.failure("Invalid feedback text.")

            if self.is_duplicate(cleaned_text):
                return self.failure("Duplicate feedback already exists.")

            feedback = Feedback(
                source        = source,
                feedback_text = cleaned_text,
                feedback_date = date.today(),   # Date column, not DateTime
                user_id       = user_id,
            )
            self.db.add(feedback)
            self.db.commit()
            self.db.refresh(feedback)

            self.log_info(f"Feedback inserted: ID {feedback.id}")

            return self.success({
                "feedback_id": feedback.id,
                "text":        cleaned_text,
                "source":      source,
            })

        except Exception as e:
            self.db.rollback()
            self.log_error(f"Failed to insert feedback: {str(e)}")
            return self.failure(str(e))

    # ─────────────────────────────────────────────
    # INGEST DATAFRAME
    # ─────────────────────────────────────────────

    def ingest_dataframe(
        self,
        df:     pd.DataFrame,
        source: str = "csv",
    ) -> dict:

        try:
            if df.empty:
                return self.failure("Dataset is empty.")

            # Detect feedback column — accept common variations
            possible_columns = [
                "feedback_text", "feedback",
                "review",        "comment",
                "text",          "description",
            ]
            feedback_column = None
            for col in possible_columns:
                if col in df.columns:
                    feedback_column = col
                    break

            if feedback_column is None:
                return self.failure(
                    f"No feedback column found. "
                    f"Expected one of: {possible_columns}. "
                    f"Got: {list(df.columns)}"
                )

            # Optional source column in CSV
            has_source_col = "source" in df.columns
            # Optional date column in CSV
            has_date_col   = "feedback_date" in df.columns or "date" in df.columns
            date_col       = "feedback_date" if "feedback_date" in df.columns else "date"

            inserted   = 0
            duplicates = 0
            invalid    = 0

            for _, row in df.iterrows():
                text = self.clean_text(row[feedback_column])

                if not self.validate_feedback(text):
                    invalid += 1
                    continue

                if self.is_duplicate(text):
                    duplicates += 1
                    continue

                # Resolve source
                row_source = source
                if has_source_col:
                    row_source = str(row["source"]).lower().strip() or source

                # Resolve date
                row_date = date.today()
                if has_date_col and row.get(date_col):
                    try:
                        from datetime import datetime
                        row_date = datetime.strptime(
                            str(row[date_col]), "%Y-%m-%d"
                        ).date()
                    except ValueError:
                        row_date = date.today()

                feedback = Feedback(
                    source        = row_source,
                    feedback_text = text,
                    feedback_date = row_date,
                    user_id       = None,
                )
                self.db.add(feedback)
                inserted += 1

            self.db.commit()

            self.log_info(
                f"Ingestion done — inserted: {inserted}, "
                f"duplicates: {duplicates}, invalid: {invalid}"
            )

            return self.success({
                "inserted":   inserted,
                "duplicates": duplicates,
                "invalid":    invalid,
                "total":      len(df),
            })

        except Exception as e:
            self.db.rollback()
            self.log_error(str(e))
            return self.failure(str(e))

    # ─────────────────────────────────────────────
    # INGEST CSV FILE
    # ─────────────────────────────────────────────

    def ingest_csv(self, file_path: str) -> dict:
        try:
            df = pd.read_csv(file_path)
            return self.ingest_dataframe(df, source="csv")
        except Exception as e:
            self.log_error(str(e))
            return self.failure(str(e))

    # ─────────────────────────────────────────────
    # GET FEEDBACK FROM DB
    # ─────────────────────────────────────────────

    def get_feedback(
        self,
        limit:  Optional[int] = None,
        source: Optional[str] = None,
    ) -> List[dict]:

        query = self.db.query(Feedback).order_by(Feedback.id.desc())

        if source:
            query = query.filter(Feedback.source == source)

        if limit:
            query = query.limit(limit)

        items = query.all()

        return [
            {
                "id":        item.id,
                "text":      item.feedback_text,
                "source":    item.source,
                "date":      str(item.feedback_date) if item.feedback_date else "",
                "sentiment": item.sentiment or "Not analyzed",
                "priority":  item.priority  or "Medium",
            }
            for item in items
        ]

    # ─────────────────────────────────────────────
    # GET UNANALYZED FEEDBACK (for SentimentAgent)
    # ─────────────────────────────────────────────

    def get_unanalyzed(self, limit: int = 50) -> List[Feedback]:
        """
        Returns Feedback ORM objects where sentiment is NULL.
        Used by SentimentAgent to know what to analyze next.
        """
        return (
            self.db.query(Feedback)
            .filter(Feedback.sentiment.is_(None))
            .order_by(Feedback.id.desc())
            .limit(limit)
            .all()
        )