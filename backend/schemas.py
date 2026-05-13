"""
backend/schemas.py
Pydantic schemas for request/response validation.
"""

from pydantic import BaseModel
from datetime import datetime
from typing import Optional


class SessionCreate(BaseModel):
    exercise : str
    reps     : int
    duration : int
    accuracy : float
    calories : float = 0.0   


class SessionResponse(BaseModel):
    id         : int
    exercise   : str
    reps       : int
    duration   : int
    accuracy   : float
    calories   : float  
    created_at : datetime

    class Config:
        from_attributes = True


class StatsResponse(BaseModel):
    total_sessions  : int
    total_reps      : int
    average_accuracy: float
    best_accuracy   : float
    total_duration  : int
    total_calories   : float 