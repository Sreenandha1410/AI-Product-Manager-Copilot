# backend/routes/analytics.py

from fastapi import APIRouter
from sqlalchemy.orm import Session
from sqlalchemy import func, extract

from db import SessionLocal
from models import Feedback, Theme, PriorityScore, FeatureRequest
from pydantic import BaseModel
from fastapi import APIRouter, HTTPException

router = APIRouter(prefix="/analytics", tags=["Analytics"])


SENTIMENT_COLORS = {
    "Positive": "#10B981",
    "Neutral": "#F59E0B",
    "Negative": "#EF4444",
}

PRIORITY_COLORS = {
    "High": "#EF4444",
    "Medium": "#F59E0B",
    "Low": "#10B981",
}

MONTH_NAMES = [
    "Jan", "Feb", "Mar", "Apr", "May", "Jun",
    "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"
]


@router.get("/")
def get_analytics():

    db: Session = SessionLocal()

    try:

        # =====================================================
        # TOTAL FEEDBACK & AVERAGE PRIORITY SCORE
        # =====================================================

        total_feedback = db.query(Feedback).count()

        average_priority = (
            db.query(func.avg(PriorityScore.rice_score))
            .scalar()
            or 0
        )

        # =====================================================
        # FEEDBACK GROWTH
        # =====================================================

        monthly_raw = (
            db.query(
                extract(
                    "month",
                    Feedback.feedback_date
                ).label("month"),

                func.count(
                    Feedback.id
                ).label("count"),
            )
            .filter(
                Feedback.feedback_date.isnot(None)
            )
            .group_by("month")
            .order_by("month")
            .all()
        )

        feedback_growth = [
            {
                "name": MONTH_NAMES[int(row.month) - 1],
                "count": int(row.count),
            }
            for row in monthly_raw
        ]

        if not feedback_growth:
            feedback_growth = [
                {
                    "name": "No data",
                    "count": 0,
                }
            ]

        # =====================================================
        # SENTIMENT
        # Gemini-generated sentiment from Feedback table
        # =====================================================

        sentiment_raw = (
            db.query(
                Feedback.sentiment,
                func.count(Feedback.id).label("cnt"),
            )
            .filter(
                Feedback.sentiment.isnot(None)
            )
            .group_by(
                Feedback.sentiment
            )
            .all()
        )

        sentiment = [
            {
                "name": row.sentiment,
                "value": int(row.cnt),
                "color": SENTIMENT_COLORS.get(
                    row.sentiment,
                    "#3B82F6"
                ),
            }
            for row in sentiment_raw
        ]

        # =====================================================
        # CATEGORIES / THEMES
        # Top 10 themes by frequency
        # =====================================================

        categories_raw = (
            db.query(
                Theme.theme_label,
                Theme.frequency,
            )
            .order_by(
                Theme.frequency.desc()
            )
            .limit(10)
            .all()
        )

        categories = [
            {
                "name": row.theme_label,
                "count": row.frequency or 0,
            }
            for row in categories_raw
        ]

        # =====================================================
        # PRIORITY DISTRIBUTION
        # =====================================================

        priority_raw = (
            db.query(
                PriorityScore.impact_level,
                func.count(
                    PriorityScore.id
                ).label("cnt"),
            )
            .filter(
                PriorityScore.impact_level.isnot(None)
            )
            .group_by(
                PriorityScore.impact_level
            )
            .all()
        )

        priority = [
            {
                "name": row.impact_level,
                "count": int(row.cnt),
                "color": PRIORITY_COLORS.get(
                    row.impact_level,
                    "#3B82F6"
                ),
            }
            for row in priority_raw
        ]

        # =====================================================
        # FEATURE TRENDS
        # Top 10 features by votes
        # =====================================================

        feature_raw = (
            db.query(
                FeatureRequest.title,
                FeatureRequest.votes,
            )
            .filter(
                FeatureRequest.votes.isnot(None)
            )
            .order_by(
                FeatureRequest.votes.desc()
            )
            .limit(10)
            .all()
        )

        feature_trends = [
            {
                "name": row.title or "Untitled Feature",
                "count": row.votes or 0,
            }
            for row in feature_raw
        ]

        # =====================================================
        # AI RECOMMENDATIONS
        # Based on real database data
        # =====================================================

        top_theme = (
            categories[0]["name"]
            if categories
            else "performance"
        )

        negative_count = next(
            (
                s["value"]
                for s in sentiment
                if s["name"] == "Negative"
            ),
            0,
        )

        top_feature = (
            feature_trends[0]["name"]
            if feature_trends
            else "top feature"
        )

        ai_recommendations = [
            (
                f"Top feedback theme is "
                f"'{top_theme}' — consider prioritising it."
            ),

            (
                f"{negative_count} negative feedback "
                f"items require immediate attention."
            ),

            (
                f"'{top_feature}' is the most requested "
                f"feature with the highest votes."
            ),

            (
                "Focus on high-priority items to improve "
                "satisfaction and reduce churn."
            ),
        ]

        # =====================================================
        # FINAL RESPONSE
        # =====================================================

        return {
            "total_feedback": total_feedback,

            "average_priority_score": round(
                float(average_priority),
                2
            ),

            "feedback_growth": feedback_growth,

            "sentiment": sentiment,

            "categories": categories,

            "priority": priority,

            "feature_trends": feature_trends,

            "ai_recommendations": ai_recommendations,
        }

    finally:
        db.close()


class AnalyticsEntry(BaseModel):
    feature:            str
    daily_users:        int
    avg_session_min:    float
    drop_off_rate:      float
    satisfaction_score: float

@router.post("/")
def create_analytics_entry(data: AnalyticsEntry):
    db = SessionLocal()
    try:
        from models import Analytics
        entry = Analytics(
            feature            = data.feature,
            daily_users        = data.daily_users,
            avg_session_min    = data.avg_session_min,
            drop_off_rate      = data.drop_off_rate,
            satisfaction_score = data.satisfaction_score,
        )
        db.add(entry)
        db.commit()
        db.refresh(entry)
        return {"id": entry.id, "feature": entry.feature}
    except Exception as e:
        db.rollback()
        raise HTTPException(status_code=500, detail=str(e))
    finally:
        db.close()