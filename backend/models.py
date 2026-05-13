"""
backend/models.py
Database table definitions.
"""

from sqlalchemy import Column, Integer, String, Float, DateTime
from sqlalchemy.sql import func
from backend.database import Base


class WorkoutSession(Base):
    __tablename__ = "workout_sessions"

    id          = Column(Integer, primary_key=True, index=True)
    exercise    = Column(String, nullable=False)
    reps        = Column(Integer, default=0)
    duration    = Column(Integer, default=0)
    accuracy    = Column(Float, default=0.0)
    calories    = Column(Float, default=0.0)   # ← ADD THIS
    created_at  = Column(DateTime, default=func.now())