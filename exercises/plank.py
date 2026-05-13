"""
exercises/plank.py
Plank detection: duration timer + alignment correction.
Camera position: side view
"""

import time
from utils.angles import calculate_angle


class PlankDetector:
    def __init__(self):
        self.start_time = None
        self.duration = 0
        self.state = "NOT STARTED"
        self.feedback = []
        self.accuracy_scores = []
        self.error_frames = 0
        self.total_frames = 0

    def analyze(self, landmarks):
        self.feedback = []

        if not landmarks:
            if self.start_time:
                self.state = "HOLD"
            return self.duration, self.state, ["No pose detected"], self._accuracy()

        try:
            body_angle = calculate_angle(
                landmarks["RIGHT_SHOULDER"],
                landmarks["RIGHT_HIP"],
                landmarks["RIGHT_ANKLE"]
            )
        except KeyError:
            body_angle = 180

        try:
            hip_y      = landmarks["RIGHT_HIP"]["y"]
            shoulder_y = landmarks["RIGHT_SHOULDER"]["y"]
            ankle_y    = landmarks["RIGHT_ANKLE"]["y"]
            hip_too_high = hip_y < min(shoulder_y, ankle_y) - 30
            hip_too_low  = hip_y > max(shoulder_y, ankle_y) + 30
        except KeyError:
            hip_too_high = False
            hip_too_low  = False

        self.total_frames += 1

        # ── Posture checks ──────────────────────────────────────────────
        if hip_too_high:
            self.feedback.append("Lower your hips")
            self.error_frames += 1
        elif hip_too_low:
            self.feedback.append("Raise your hips")
            self.error_frames += 1
        elif body_angle < 160:
            self.feedback.append("Straighten your body")
            self.error_frames += 1

        # ── Timer logic ─────────────────────────────────────────────────
        if body_angle > 150:
            if self.start_time is None:
                self.start_time = time.time()
                self.state = "HOLD"
            self.duration = int(time.time() - self.start_time)
        else:
            if self.start_time:
                self.state = "REST"

        return self.duration, self.state, self.feedback, self._accuracy()

    def _accuracy(self):
        if self.total_frames == 0:
            return 100.0
        return round((1 - self.error_frames / self.total_frames) * 100, 1)

    def reset(self):
        self.start_time = None
        self.duration = 0
        self.state = "NOT STARTED"
        self.feedback = []
        self.accuracy_scores = []
        self.error_frames = 0
        self.total_frames = 0