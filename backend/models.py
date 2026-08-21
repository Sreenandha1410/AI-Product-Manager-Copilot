from sqlalchemy import (
    Column,
    Integer,
    String,
    Text,
    Float,
    Date,
    DateTime,
    ForeignKey
)

from sqlalchemy.sql import func
from sqlalchemy.orm import relationship

from db import Base


# =====================================================
# USERS
# =====================================================

class User(Base):
    __tablename__ = "users"
    __table_args__ = {"schema": "product_ai"}

    user_id = Column(String, primary_key=True)
    name = Column(String, nullable=False)
    email = Column(String, unique=True, nullable=False)
    password = Column(String, nullable=False)
    role = Column(String, default="Product Manager")
    created_at = Column(DateTime, default=func.now())


# =====================================================
# FEEDBACK
# =====================================================

class Feedback(Base):
    __tablename__ = "feedback"
    __table_args__ = {"schema": "product_ai"}

    id = Column(Integer, primary_key=True)
    source = Column(String)
    feedback_text = Column(Text, nullable=False)
    feedback_date = Column(Date)
    priority = Column(String)
    sentiment = Column(String)
    user_id = Column(
        String,
        ForeignKey("product_ai.users.user_id")
    )


# =====================================================
# FEATURE REQUESTS
# =====================================================

class FeatureRequest(Base):
    __tablename__ = "feature_requests"
    __table_args__ = {"schema": "product_ai"}

    id = Column(Integer, primary_key=True)
    title = Column(String)
    description = Column(Text)
    votes = Column(Integer)

    submitted_by = Column(
        String,
        ForeignKey("product_ai.users.user_id")
    )

    request_date = Column(Date)


# =====================================================
# SUPPORT TICKETS
# =====================================================

class SupportTicket(Base):
    __tablename__ = "support_tickets"
    __table_args__ = {"schema": "product_ai"}

    id = Column(Integer, primary_key=True)
    title = Column(String)
    priority = Column(String)
    status = Column(String)
    description = Column(Text)
    created_at = Column(Date)


# =====================================================
# ANALYTICS
# =====================================================

class Analytics(Base):
    __tablename__ = "analytics"
    __table_args__ = {"schema": "product_ai"}

    id = Column(Integer, primary_key=True)
    feature = Column(String)
    daily_users = Column(Integer)
    avg_session_min = Column(Float)
    drop_off_rate = Column(Float)
    satisfaction_score = Column(Float)


# =====================================================
# THEMES
# =====================================================

class Theme(Base):
    __tablename__ = "themes"
    __table_args__ = {"schema": "product_ai"}

    id = Column(Integer, primary_key=True)
    theme_label = Column(String)
    sentiment = Column(String)
    frequency = Column(Integer)
    cluster_id = Column(String)
    workspace_id = Column(String)
    created_at = Column(DateTime, default=func.now())


# =====================================================
# FEATURE CLUSTERS
# =====================================================

class FeatureCluster(Base):
    __tablename__ = "feature_clusters"
    __table_args__ = {"schema": "product_ai"}

    id = Column(Integer, primary_key=True)
    cluster_name = Column(String)
    description = Column(Text)
    related_theme_ids = Column(Text)
    feature_count = Column(Integer)
    created_at = Column(DateTime, default=func.now())


# =====================================================
# PRIORITY SCORES
# =====================================================

class PriorityScore(Base):
    __tablename__ = "priority_scores"
    __table_args__ = {"schema": "product_ai"}

    id = Column(Integer, primary_key=True)

    feature_id = Column(
        Integer,
        ForeignKey("product_ai.feature_requests.id")
    )

    rice_score = Column(Float)
    ice_score = Column(Float)

    reach = Column(Integer)
    impact = Column(Integer)
    confidence = Column(Float)
    effort = Column(Integer)

    impact_level = Column(String)

    created_at = Column(DateTime, default=func.now())


# =====================================================
# PRD DOCUMENTS
# =====================================================

class PRDDocument(Base):
    __tablename__ = "prd_documents"
    __table_args__ = {"schema": "product_ai"}

    id = Column(Integer, primary_key=True)

    feature_id = Column(
        Integer,
        ForeignKey("product_ai.feature_requests.id")
    )

    title = Column(String)
    problem_statement = Column(Text)
    objectives = Column(Text)
    user_stories = Column(Text)
    acceptance_criteria = Column(Text)
    success_metrics = Column(Text)

    created_at = Column(DateTime, default=func.now())


# =====================================================
# ROADMAP ITEMS
# =====================================================

class RoadmapItem(Base):
    __tablename__ = "roadmap_items"
    __table_args__ = {"schema": "product_ai"}

    id = Column(Integer, primary_key=True)

    feature_id = Column(
        Integer,
        ForeignKey("product_ai.feature_requests.id")
    )

    phase = Column(String)
    status = Column(String)

    start_date = Column(Date)
    end_date = Column(Date)

    created_at = Column(DateTime, default=func.now())


# =====================================================
# CHAT HISTORY
# =====================================================

class ChatHistory(Base):
    __tablename__ = "chat_history"
    __table_args__ = {"schema": "product_ai"}

    id = Column(Integer, primary_key=True)

    workspace_id = Column(String)
    role = Column(String)
    message = Column(Text)

    timestamp = Column(DateTime, default=func.now())