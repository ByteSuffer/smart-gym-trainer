"""
backend/routes/sessions.py
REST API endpoints for workout sessions.
"""

from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session
from sqlalchemy import func
from typing import List
from backend.database import get_db
from backend.models import WorkoutSession
from backend.schemas import SessionCreate, SessionResponse, StatsResponse

router = APIRouter(prefix="/sessions", tags=["sessions"])


@router.post("/", response_model=SessionResponse)
def save_session(session: SessionCreate, db: Session = Depends(get_db)):
    """Save a completed workout session."""
    db_session = WorkoutSession(
        exercise=session.exercise,
        reps=session.reps,
        duration=session.duration,
        accuracy=session.accuracy,
        calories=session.calories 
    )
    db.add(db_session)
    db.commit()
    db.refresh(db_session)
    return db_session


@router.get("/", response_model=List[SessionResponse])
def get_sessions(
    skip: int = 0,
    limit: int = 50,
    exercise: str = None,
    db: Session = Depends(get_db)
):
    """Get workout history. Filter by exercise optionally."""
    query = db.query(WorkoutSession)
    if exercise:
        query = query.filter(WorkoutSession.exercise == exercise)
    return query.order_by(WorkoutSession.created_at.desc())\
                .offset(skip).limit(limit).all()


@router.get("/stats", response_model=StatsResponse)
def get_stats(exercise: str = None, db: Session = Depends(get_db)):
    """Get aggregate workout statistics."""
    query = db.query(WorkoutSession)
    if exercise:
        query = query.filter(WorkoutSession.exercise == exercise)

    sessions = query.all()

    if not sessions:
        return StatsResponse(
            total_sessions=0,
            total_reps=0,
            average_accuracy=0.0,
            best_accuracy=0.0,
            total_duration=0,
            total_calories=0.0
        )

    return StatsResponse(
        total_sessions  = len(sessions),
        total_reps      = sum(s.reps for s in sessions),
        average_accuracy= round(sum(s.accuracy for s in sessions) / len(sessions), 1),
        best_accuracy   = round(max(s.accuracy for s in sessions), 1),
        total_duration  = sum(s.duration for s in sessions),
        total_calories   = round(sum(s.calories for s in sessions), 1)
    )


@router.delete("/{session_id}")
def delete_session(session_id: int, db: Session = Depends(get_db)):
    """Delete a session by ID."""
    session = db.query(WorkoutSession).filter(
        WorkoutSession.id == session_id
    ).first()
    if not session:
        raise HTTPException(status_code=404, detail="Session not found")
    db.delete(session)
    db.commit()
    return {"message": "Session deleted"}