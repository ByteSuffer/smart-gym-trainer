"""
exercises/pushup.py
Push-up detection: rep counting + posture correction.
Camera position: side view
"""

from utils.angles import calculate_angle


class PushupDetector:
    def __init__(self):
        self.rep_count = 0
        self.state = "UP"
        self.feedback = []
        self.accuracy_scores = []
        self.current_rep_errors = 0
        self.current_rep_frames = 0

    def analyze(self, landmarks):
        self.feedback = []

        if not landmarks:
            return self.rep_count, self.state, ["No pose detected"], self._accuracy()

        try:
            elbow_angle = calculate_angle(
                landmarks["RIGHT_SHOULDER"],
                landmarks["RIGHT_ELBOW"],
                landmarks["RIGHT_WRIST"]
            )
        except KeyError:
            elbow_angle = 180

        try:
            hip_angle = calculate_angle(
                landmarks["RIGHT_SHOULDER"],
                landmarks["RIGHT_HIP"],
                landmarks["RIGHT_ANKLE"]
            )
        except KeyError:
            hip_angle = 180

        self.current_rep_frames += 1

        # ── Posture checks ──────────────────────────────────────────────
        if hip_angle < 160:
            self.feedback.append("Keep your body straight")
            self.current_rep_errors += 1

        if hip_angle > 200:
            self.feedback.append("Lower your hips")
            self.current_rep_errors += 1

        # ── State machine ───────────────────────────────────────────────
        if self.state == "UP":
            if elbow_angle < 90:
                self.state = "DOWN"
                self.current_rep_errors = 0
                self.current_rep_frames = 0

        elif self.state == "DOWN":
            if elbow_angle > 160:
                self.state = "UP"
                self.rep_count += 1
                error_rate = self.current_rep_errors / max(self.current_rep_frames, 1)
                self.accuracy_scores.append(max(0, 100 - error_rate * 100))

        return self.rep_count, self.state, self.feedback, self._accuracy()

    def _accuracy(self):
        if not self.accuracy_scores:
            return 100.0
        return round(sum(self.accuracy_scores) / len(self.accuracy_scores), 1)

    def reset(self):
        self.rep_count = 0
        self.state = "UP"
        self.feedback = []
        self.accuracy_scores = []
        self.current_rep_errors = 0
        self.current_rep_frames = 0