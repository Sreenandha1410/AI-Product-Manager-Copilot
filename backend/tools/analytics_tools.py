# backend/tools/analytics_tools.py

from sqlalchemy import func
from db import SessionLocal
from models import (
    Feedback,
    FeatureRequest,
    SupportTicket,
    Analytics,
    PriorityScore,
    RoadmapItem,
    PRDDocument
)


class AnalyticsTools:

    def __init__(self):
        self.db = SessionLocal()

    # =====================================================
    # DASHBOARD COUNTS
    # =====================================================

    def total_feedback(self):
        return self.db.query(func.count(Feedback.id)).scalar()

    def total_feature_requests(self):
        return self.db.query(func.count(FeatureRequest.id)).scalar()

    def total_support_tickets(self):
        return self.db.query(func.count(SupportTicket.id)).scalar()

    def total_prds(self):
        return self.db.query(func.count(PRDDocument.id)).scalar()

    def total_roadmap_items(self):
        return self.db.query(func.count(RoadmapItem.id)).scalar()

    # =====================================================
    # ANALYTICS METRICS
    # =====================================================

    def average_session_time(self):
        return self.db.query(
            func.avg(Analytics.avg_session_min)
        ).scalar()

    def average_satisfaction(self):
        return self.db.query(
            func.avg(Analytics.satisfaction_score)
        ).scalar()

    def average_drop_off(self):
        return self.db.query(
            func.avg(Analytics.drop_off_rate)
        ).scalar()

    def total_daily_users(self):
        return self.db.query(
            func.sum(Analytics.daily_users)
        ).scalar()

    # =====================================================
    # FEATURE REQUEST METRICS
    # =====================================================

    def top_voted_features(self, limit=10):
        return (
            self.db.query(FeatureRequest)
            .order_by(FeatureRequest.votes.desc())
            .limit(limit)
            .all()
        )

    # =====================================================
    # PRIORITY METRICS
    # =====================================================

    def high_priority_features(self):
        return (
            self.db.query(PriorityScore)
            .filter(PriorityScore.impact_level == "High")
            .all()
        )

    def average_rice_score(self):
        return self.db.query(
            func.avg(PriorityScore.rice_score)
        ).scalar()

    def average_ice_score(self):
        return self.db.query(
            func.avg(PriorityScore.ice_score)
        ).scalar()

    # =====================================================
    # SUPPORT TICKET METRICS
    # =====================================================

    def open_tickets(self):
        return (
            self.db.query(SupportTicket)
            .filter(SupportTicket.status == "Open")
            .count()
        )

    def closed_tickets(self):
        return (
            self.db.query(SupportTicket)
            .filter(SupportTicket.status == "Closed")
            .count()
        )

    def resolved_tickets(self):
        return (
            self.db.query(SupportTicket)
            .filter(SupportTicket.status == "Resolved")
            .count()
        )

    # =====================================================
    # ROADMAP METRICS
    # =====================================================

    def completed_roadmap_items(self):
        return (
            self.db.query(RoadmapItem)
            .filter(RoadmapItem.status == "Completed")
            .count()
        )

    def planned_roadmap_items(self):
        return (
            self.db.query(RoadmapItem)
            .filter(RoadmapItem.status == "Planned")
            .count()
        )

    def in_progress_roadmap_items(self):
        return (
            self.db.query(RoadmapItem)
            .filter(RoadmapItem.status == "In Progress")
            .count()
        )

    # =====================================================
    # CLOSE DATABASE
    # =====================================================

    def close(self):
        self.db.close()