# backend/routes/dashboard.py

from fastapi import APIRouter
from sqlalchemy.orm import Session
from sqlalchemy import func

from db import SessionLocal
from models import (
    Feedback, FeatureRequest, Theme,
    PRDDocument, RoadmapItem, PriorityScore
)

router = APIRouter(prefix="/dashboard", tags=["Dashboard"])


@router.get("/")
def get_dashboard():
    db: Session = SessionLocal()
    try:
        # ── KPI counts ──────────────────────────────
        total_feedback    = db.query(Feedback).count()
        total_themes      = db.query(Theme).count()
        feature_requests  = db.query(FeatureRequest).count()
        generated_prds    = db.query(PRDDocument).count()

        roadmap_total     = db.query(RoadmapItem).count()
        roadmap_completed = db.query(RoadmapItem).filter(
            RoadmapItem.status == "Completed"
        ).count()
        roadmap_progress  = (
            round((roadmap_completed / roadmap_total) * 100)
            if roadmap_total else 0
        )

        # ── Top pain points (from themes) ───────────
        top_pain_points = (
            db.query(Theme.theme_label, Theme.frequency, Theme.sentiment)
            .order_by(Theme.frequency.desc())
            .limit(5)
            .all()
        )
        pain_points = [
            {"label": t[0], "frequency": t[1], "sentiment": t[2]}
            for t in top_pain_points
        ]

        # ── Feature prioritization table ────────────
        priority_data = (
            db.query(
                FeatureRequest.title,
                PriorityScore.rice_score,
                PriorityScore.impact_level
            )
            .join(PriorityScore,
                  PriorityScore.feature_id == FeatureRequest.id,
                  isouter=True)
            .order_by(PriorityScore.rice_score.desc())
            .limit(5)
            .all()
        )
        feature_priority = [
            {
                "rank":     i + 1,
                "feature":  r[0] or "—",
                "rice":     round(r[1], 1) if r[1] else 0,
                "priority": r[2] or "Medium",
            }
            for i, r in enumerate(priority_data)
        ]

        # ── Recent PRDs ──────────────────────────────
        recent_prds_raw = (
            db.query(PRDDocument)
            .order_by(PRDDocument.created_at.desc())
            .limit(3)
            .all()
        )
        recent_prds = [
            {
                "id":    p.id,
                "title": p.title,
                "date":  str(p.created_at)[:10] if p.created_at else "",
            }
            for p in recent_prds_raw
        ]

        # ── Quarterly roadmap widget ─────────────────
        quarters = ["Q1", "Q2", "Q3", "Q4"]
        roadmap_widget = {}
        for q in quarters:
            items = (
                db.query(RoadmapItem, FeatureRequest)
                .join(FeatureRequest,
                      FeatureRequest.id == RoadmapItem.feature_id,
                      isouter=True)
                .filter(RoadmapItem.phase == q)
                .all()
            )
            roadmap_widget[q] = [
                {
                    "id":     item.id,
                    "title":  feat.title if feat else "Unknown",
                    "status": item.status or "Planned",
                }
                for item, feat in items
            ]

        # ── AI Insights ─────────────────────────────
        top_theme = pain_points[0]["label"] if pain_points else "performance"
        ai_insights = [
            f"Total feedback collected: {total_feedback}",
            f"Top pain point: {top_theme}" if pain_points else "No themes extracted yet.",
            f"Feature requests received: {feature_requests}",
            f"Generated PRDs: {generated_prds}",
        ]

        return {
            # KPI cards
            "total_feedback":   total_feedback,
            "total_themes":     total_themes,
            "feature_requests": feature_requests,
            "generated_prds":   generated_prds,
            "roadmap_progress": roadmap_progress,
            # Sections
            "pain_points":       pain_points,
            "feature_priority":  feature_priority,
            "recent_prds":       recent_prds,
            "roadmap_widget":    roadmap_widget,
            "ai_insights":       ai_insights,
        }
    finally:
        db.close()