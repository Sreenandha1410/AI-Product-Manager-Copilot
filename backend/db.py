# backend/db.py

import os
from pathlib import Path

from dotenv import load_dotenv
from sqlalchemy import create_engine
from sqlalchemy.orm import declarative_base, sessionmaker

# -------------------------------------------------
# Load .env from backend folder
# -------------------------------------------------

BASE_DIR = Path(__file__).resolve().parent
ENV_FILE = BASE_DIR / ".env"

load_dotenv(dotenv_path=ENV_FILE)

# -------------------------------------------------
# Database URL
# -------------------------------------------------

if DATABASE_URL.startswith("postgresql://"):
    DATABASE_URL = DATABASE_URL.replace(
        "postgresql://",
        "postgresql+psycopg2://",
        1
    )

if DATABASE_URL is None:
    raise ValueError(
        "DATABASE_URL not found. Please check your backend/.env file."
    )

print("Connected Database:", DATABASE_URL)

# -------------------------------------------------
# SQLAlchemy Engine
# -------------------------------------------------

engine = create_engine(
    DATABASE_URL,
    pool_pre_ping=True
)

# -------------------------------------------------
# Session
# -------------------------------------------------

SessionLocal = sessionmaker(
    autocommit=False,
    autoflush=False,
    bind=engine
)

# -------------------------------------------------
# Base Class
# -------------------------------------------------

Base = declarative_base()

# -------------------------------------------------
# Dependency
# -------------------------------------------------

def get_db():
    db = SessionLocal()
    try:
        yield db
    finally:
        db.close()
