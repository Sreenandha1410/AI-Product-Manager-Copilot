# backend/routes/feedback.py

import csv, io, uuid
from datetime import date
from fastapi import APIRouter, UploadFile, File, Form, HTTPException
from pydantic import BaseModel
from sqlalchemy.orm import Session
from fastapi import Query

from db import SessionLocal
from models import Feedback
from agents.sentiment_agent import SentimentAgent

router = APIRouter(prefix="/feedback", tags=["Feedback"])
sentiment_agent = SentimentAgent()

SENTIMENT_MAP = {
    "zendesk":  "Negative", "g2":       "Positive",
    "intercom": "Neutral",  "twitter":  "Negative",
    "gong":     "Neutral",  "csv":      "Neutral",
}
CATEGORY_MAP = {
    "zendesk":  "Bug",              "g2":      "Feature Request",
    "intercom": "UI/UX",            "twitter": "Performance",
    "gong":     "Feature Request",  "csv":     "General",
}
PRIORITY_MAP = {
    "zendesk":  "High",   "twitter": "High",
    "g2":       "Medium", "intercom":"Medium",
    "gong":     "Low",    "csv":     "Low",
}


def _serialize(item: Feedback, user_name: str = "") -> dict:
    src  = (item.source or "").lower().strip()
    text = item.feedback_text or ""
    title = (text[:60] + "...") if len(text) > 60 else text
    return {
        "id":          item.id,
        "title":       title,
        "description": text,
        "category":    CATEGORY_MAP.get(src, "General"),
        "priority":    PRIORITY_MAP.get(src, "Medium"),
        "sentiment": item.sentiment or "Not analyzed",
        "status":      "New",
        "date":        item.feedback_date.strftime("%Y-%m-%d") if item.feedback_date else "",
        "user_name":   user_name,
        "source":      item.source or "",
    }


# ── GET all feedback ─────────────────────────────────


@router.get("/")
def get_feedback(
    page: int = Query(1, ge=1),
    limit: int = Query(50, ge=1, le=100)
):
    db = SessionLocal()

    try:
        total = db.query(Feedback).count()

        offset = (page - 1) * limit

        feedback = (
            db.query(Feedback)
            .order_by(Feedback.id.desc())
            .offset(offset)
            .limit(limit)
            .all()
        )

        return {
    "items": [_serialize(f) for f in feedback],
    "total": total,
    "page": page,
    "limit": limit,
    "total_pages": (total + limit - 1) // limit,
}

    finally:
        db.close()


# ── POST manual feedback entry ───────────────────────
class ManualFeedbackRequest(BaseModel):
    feedback_text: str
    source:        str = "csv"
    user_id:       str | None = None


@router.post("/manual")
def add_manual_feedback(data: ManualFeedbackRequest):
    db: Session = SessionLocal()
    try:
        item = Feedback(
            source        = data.source,
            feedback_text = data.feedback_text,
            feedback_date = date.today(),
            user_id       = data.user_id,
        )
        db.add(item)
        db.commit()
        db.refresh(item)
        return _serialize(item)
    except Exception as e:
        db.rollback()
        raise HTTPException(status_code=500, detail=str(e))
    finally:
        db.close()


# ── POST CSV upload ──────────────────────────────────
@router.post("/upload")
async def upload_feedback(
    file:   UploadFile = File(...),
    source: str        = Form("csv"),
):
    if not file.filename.endswith(".csv"):
        raise HTTPException(status_code=400, detail="Only CSV files are supported.")

    contents = await file.read()
    text     = contents.decode("utf-8", errors="ignore")
    reader   = csv.DictReader(io.StringIO(text))

    db: Session = SessionLocal()
    saved = 0
    try:
        for row in reader:
            # accept common column name variations
            feedback_text = (
                row.get("feedback_text") or row.get("text") or
                row.get("feedback")      or row.get("description") or ""
            ).strip()
            if not feedback_text:
                continue

            src = (row.get("source") or source).strip().lower()

            # parse date if present
            raw_date = row.get("feedback_date") or row.get("date") or ""
            try:
                from datetime import datetime
                fb_date = datetime.strptime(raw_date, "%Y-%m-%d").date() if raw_date else date.today()
            except ValueError:
                fb_date = date.today()

            item = Feedback(
                source        = src,
                feedback_text = feedback_text,
                feedback_date = fb_date,
                user_id       = row.get("user_id") or None,
            )
            db.add(item)
            saved += 1

        db.commit()
        return {"message": f"{saved} feedback records uploaded successfully."}
    except Exception as e:
        db.rollback()
        raise HTTPException(status_code=500, detail=str(e))
    finally:
        db.close()

@router.post("/analyze-sentiment")
def analyze_sentiment():

    db = SessionLocal()

    try:

        # -------------------------------------------------
        # Get unanalyzed feedback
        # -------------------------------------------------

        feedback_items = (
            db.query(Feedback)
            .filter(
                Feedback.sentiment.is_(None)
            )
            .order_by(
                Feedback.id.desc()
            )
            .limit(20)
            .all()
        )

        if not feedback_items:
            return {
                "message": "No unanalyzed feedback found.",
                "analyzed": 0,
                "results": []
            }

        # -------------------------------------------------
        # Prepare feedback for ONE Gemini request
        # -------------------------------------------------

        feedback_texts = [
            item.feedback_text
            for item in feedback_items
        ]

        # -------------------------------------------------
        # ONE Gemini API call
        # -------------------------------------------------

        result = sentiment_agent.analyze_batch(
            feedback_texts
        )

        # -------------------------------------------------
        # Save Gemini results
        # -------------------------------------------------

        analyzed = 0
        saved_results = []

        for result_item in result.results:

            index = result_item.index

            if index < 0 or index >= len(feedback_items):
                continue

            feedback = feedback_items[index]

            feedback.sentiment = (
                result_item.sentiment
            )

            analyzed += 1

            saved_results.append({
                "id": feedback.id,
                "feedback": feedback.feedback_text,
                "sentiment": feedback.sentiment
            })

        db.commit()

        return {
            "message": "Batch sentiment analysis completed.",
            "analyzed": analyzed,
            "results": saved_results
        }

    except Exception as e:

        db.rollback()

        raise HTTPException(
            status_code=500,
            detail=f"Sentiment analysis failed: {str(e)}"
        )

    finally:

        db.close()




# ── GET stats ────────────────────────────────────────
@router.get("/stats")
def get_feedback_stats():
    db: Session = SessionLocal()
    try:
        all_items = db.query(Feedback).all()
        by_source: dict = {}
        for item in all_items:
            src = (item.source or "unknown").lower()
            by_source[src] = by_source.get(src, 0) + 1
        return {"total": len(all_items), "by_source": by_source}
    finally:
        db.close()


# ── POST analyze sentiment for a single feedback item ────────
@router.post("/{feedback_id}/analyze-sentiment")
def analyze_single_sentiment(feedback_id: int):
    db = SessionLocal()
    try:
        item = db.query(Feedback).filter(
            Feedback.id == feedback_id
        ).first()

        if not item:
            raise HTTPException(
                status_code=404,
                detail="Feedback not found."
            )

        # ── Skip if already analyzed ─────────────────────────
        if item.sentiment and item.sentiment != "Not analyzed":
            return {
                "id":        item.id,
                "sentiment": item.sentiment,
                "cached":    True,
                "message":   "Already analyzed. Returning cached result."
            }

        # ── Call Gemini for this single item ─────────────────
        result = sentiment_agent.analyze_batch([item.feedback_text])

        if not result.results:
            raise HTTPException(
                status_code=500,
                detail="Sentiment analysis returned no results."
            )

        sentiment = result.results[0].sentiment

        # ── Save to PostgreSQL ────────────────────────────────
        item.sentiment = sentiment
        db.commit()
        db.refresh(item)

        return {
            "id":        item.id,
            "sentiment": item.sentiment,
            "cached":    False,
            "message":   "Analyzed by AI now."
        }

    except HTTPException:
        raise
    except Exception as e:
        db.rollback()
        raise HTTPException(
            status_code=500,
            detail=f"Sentiment analysis failed: {str(e)}"
        )
    finally:
        db.close()

# ── POST support ticket manual entry ────────────────────────
class SupportTicketRequest(BaseModel):
    title:       str
    description: str
    priority:    str = "Medium"   # Critical / High / Medium / Low
    status:      str = "Open"

@router.post("/tickets")
def create_support_ticket(data: SupportTicketRequest):
    db = SessionLocal()
    try:
        from models import SupportTicket
        from datetime import date
        ticket = SupportTicket(
            title       = data.title,
            description = data.description,
            priority    = data.priority,
            status      = data.status,
            created_at  = date.today(),
        )
        db.add(ticket)
        db.commit()
        db.refresh(ticket)
        return {
            "id":          ticket.id,
            "title":       ticket.title,
            "priority":    ticket.priority,
            "status":      ticket.status,
            "description": ticket.description,
            "created_at":  str(ticket.created_at),
        }
    except Exception as e:
        db.rollback()
        raise HTTPException(status_code=500, detail=str(e))
    finally:
        db.close()

@router.get("/tickets")
def get_support_tickets():
    db = SessionLocal()
    try:
        from models import SupportTicket
        tickets = db.query(SupportTicket).order_by(
            SupportTicket.id.desc()
        ).all()
        return [
            {
                "id":          t.id,
                "title":       t.title,
                "priority":    t.priority,
                "status":      t.status,
                "description": t.description,
                "created_at":  str(t.created_at),
            }
            for t in tickets
        ]
    finally:
        db.close()
