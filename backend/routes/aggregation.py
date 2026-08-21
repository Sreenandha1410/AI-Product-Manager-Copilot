# backend/routes/aggregation.py

from fastapi import APIRouter, HTTPException
from sqlalchemy.orm import Session
from db import SessionLocal
from models import FeatureCluster, FeatureRequest, Theme, PriorityScore

router = APIRouter(prefix="/aggregation", tags=["Feature Aggregation"])


# ── POST — run clustering agent ───────────────────────────────
@router.post("/cluster")
def run_clustering():
    """
    Reads unclustered themes from PostgreSQL,
    groups them using sentence embeddings + Gemini,
    saves clusters and feature requests to DB.
    """
    try:
        from agents.clustering_agent import ClusteringAgent
        agent  = ClusteringAgent()
        result = agent.run()   # agent handles its own DB session + close()

        if result["status"] == "error":
            raise HTTPException(
                status_code=500,
                detail=result["error"]
            )

        return result

    except HTTPException:
        raise
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))


# ── GET — return all saved clusters ──────────────────────────
@router.get("/clusters")
def get_clusters():
    db = SessionLocal()
    try:
        clusters = db.query(FeatureCluster).order_by(
            FeatureCluster.id.desc()
        ).all()
        return [
            {
                "id":               c.id,
                "cluster_name":     c.cluster_name,
                "description":      c.description,
                "related_theme_ids": c.related_theme_ids,
                "feature_count":    c.feature_count,
                "created_at":       str(c.created_at)[:10] if c.created_at else "",
            }
            for c in clusters
        ]
    finally:
        db.close()


# ── GET — trend analysis ──────────────────────────────────────
@router.get("/trends")
def get_trends():
    """
    Returns the main product trends:
    - Top feature requests
    - Top themes
    - Top RICE scores
    """

    db = SessionLocal()

    try:

        # =================================================
        # 1. TOP FEATURE REQUESTS
        # =================================================

        features = (
            db.query(FeatureRequest)
            .filter(FeatureRequest.title.isnot(None))
            .order_by(
                FeatureRequest.votes.desc()
            )
            .all()
        )

        # Remove duplicate feature titles
        seen_titles = set()
        top_features = []

        for feature in features:

            title = feature.title.strip()

            if title.lower() in seen_titles:
                continue

            seen_titles.add(title.lower())

            top_features.append(feature)

            if len(top_features) == 10:
                break

        # =================================================
        # 2. TOP THEMES
        # =================================================

        top_themes = (
            db.query(Theme)
            .filter(Theme.theme_label.isnot(None))
            .order_by(
                Theme.frequency.desc()
            )
            .limit(10)
            .all()
        )

        # =================================================
        # 3. TOP RICE SCORES
        # =================================================

        top_scores = (
            db.query(
                PriorityScore,
                FeatureRequest
            )
            .join(
                FeatureRequest,
                FeatureRequest.id == PriorityScore.feature_id,
                isouter=True
            )
            .filter(
                PriorityScore.rice_score.isnot(None)
            )
            .order_by(
                PriorityScore.rice_score.desc()
            )
            .limit(10)
            .all()
        )

        # =================================================
        # 4. RESPONSE
        # =================================================

        return {

            "top_features": [

                {
                    "id": feature.id,
                    "title": feature.title,
                    "description": feature.description or "",
                    "votes": feature.votes or 0
                }

                for feature in top_features
            ],

            "top_themes": [

                {
                    "theme": theme.theme_label,
                    "frequency": theme.frequency or 0,
                    "sentiment": theme.sentiment or "Neutral",
                    "cluster_id": theme.cluster_id
                }

                for theme in top_themes
            ],

            "top_rice_scores": [

                {
                    "feature":
                        feature.title
                        if feature
                        else "Unknown",

                    "rice":
                        round(
                            score.rice_score or 0,
                            1
                        ),

                    "priority":
                        score.impact_level or "Medium"
                }

                for score, feature in top_scores
            ]
        }

    finally:

        db.close()
# ── GET — cluster summary for dashboard widget ────────────────
@router.get("/summary")
def get_summary():

    db = SessionLocal()

    try:

        total_clusters = (
            db.query(FeatureCluster).count()
        )

        total_features = (
            db.query(FeatureRequest).count()
        )

        total_themes = (
            db.query(Theme).count()
        )

        unclustered = (
            db.query(Theme)
            .filter(
                Theme.cluster_id.is_(None)
            )
            .count()
        )

        return {

            "total_clusters":
                total_clusters,

            "total_feature_requests":
                total_features,

            "total_themes":
                total_themes,

            "unclustered_themes":
                unclustered,

            "ready_to_cluster":
                unclustered > 0
        }

    finally:

        db.close()