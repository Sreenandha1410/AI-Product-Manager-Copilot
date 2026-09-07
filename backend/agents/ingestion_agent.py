import csv
import io
from typing import List, Dict

from sqlalchemy.orm import Session

from models import Feedback


class IngestionAgent:
    """
    Ingestion Agent

    Responsible for:
    - Reading raw customer feedback
    - Validating required fields
    - Cleaning basic text
    - Saving feedback into the database
    """

    def __init__(self):
        self.agent_name = "Ingestion Agent"

    def clean_text(self, value) -> str:
        if value is None:
            return ""

        return " ".join(str(value).strip().split())

    def validate_feedback(self, text: str) -> bool:
        return bool(text and len(text.strip()) > 0)

    def ingest_rows(
        self,
        db: Session,
        rows: List[Dict],
        workspace_id: str = "default",
    ):
        inserted = 0
        skipped = 0

        for row in rows:
            text = (
                row.get("feedback")
                or row.get("text")
                or row.get("message")
                or row.get("comment")
                or ""
            )

            text = self.clean_text(text)

            if not self.validate_feedback(text):
                skipped += 1
                continue

            feedback = Feedback(
                workspace_id=workspace_id,
                text=text,
                source=self.clean_text(row.get("source", "manual")),
                customer_name=self.clean_text(
                    row.get("customer_name", "")
                ),
            )

            db.add(feedback)
            inserted += 1

        db.commit()

        return {
            "inserted": inserted,
            "skipped": skipped,
            "total": len(rows),
        }

    def ingest_csv(
        self,
        db: Session,
        file_content: bytes,
        workspace_id: str = "default",
    ):
        """
        Read CSV file and insert feedback into database.
        """

        decoded = file_content.decode("utf-8-sig")

        reader = csv.DictReader(io.StringIO(decoded))

        rows = list(reader)

        return self.ingest_rows(
            db=db,
            rows=rows,
            workspace_id=workspace_id,
        )