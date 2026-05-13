"""
exercises/squat.py
Squat detection: rep counting + posture correction.
Camera position: side view (stand sideways to camera)
"""

from utils.angles import calculate_angle


class SquatDetector:
    def __init__(self):
        self.rep_count = 0
        self.state = "STANDING"   # STANDING → DOWN → STANDING = 1 rep
        self.feedback = []
        self.accuracy_scores = []
        self.current_rep_errors = 0
        self.current_rep_frames = 0

    def analyze(self, landmarks):
        """
        Call every frame with current landmarks.
        Returns:
          rep_count  : int
          state      : str
          feedback   : list of warning strings
          accuracy   : float (0-100)
        """
        self.feedback = []

        if not landmarks:
            return self.rep_count, self.state, ["No pose detected"], self._accuracy()

        # ── Angle calculations ──────────────────────────────────────────
        try:
            knee_angle = calculate_angle(
                landmarks["RIGHT_HIP"],
                landmarks["RIGHT_KNEE"],
                landmarks["RIGHT_ANKLE"]
            )
        except KeyError:
            knee_angle = 180

        try:
            hip_angle = calculate_angle(
                landmarks["RIGHT_SHOULDER"],
                landmarks["RIGHT_HIP"],
                landmarks["RIGHT_KNEE"]
            )
        except KeyError:
            hip_angle = 180

        try:
            back_angle = calculate_angle(
                landmarks["RIGHT_SHOULDER"],
                landmarks["RIGHT_HIP"],
                landmarks["RIGHT_ANKLE"]
            )
        except KeyError:
            back_angle = 180

        try:
            knee_x   = landmarks["RIGHT_KNEE"]["x"]
            ankle_x  = landmarks["RIGHT_ANKLE"]["x"]
            knee_over_toe = knee_x > ankle_x + 30   # knee pushed too far forward
        except KeyError:
            knee_over_toe = False

        self.current_rep_frames += 1

        # ── Posture checks ──────────────────────────────────────────────
        if back_angle < 140:
            self.feedback.append("Straighten your back")
            self.current_rep_errors += 1

        if knee_over_toe:
            self.feedback.append("Push your knees out, not forward")
            self.current_rep_errors += 1

        # ── State machine ───────────────────────────────────────────────
        if self.state == "STANDING":
            if knee_angle < 100:              # went low enough
                self.state = "DOWN"
                self.current_rep_errors = 0
                self.current_rep_frames = 0

        elif self.state == "DOWN":
            if knee_angle < 90:
                pass                           # still going down, good depth
            elif knee_angle > 90 and knee_angle < 100:
                self.feedback.append("Go lower for full rep")

            if knee_angle > 160:              # came back up
                self.state = "STANDING"
                self.rep_count += 1
                # Score this rep
                error_rate = self.current_rep_errors / max(self.current_rep_frames, 1)
                rep_score = max(0, 100 - (error_rate * 100))
                self.accuracy_scores.append(rep_score)

        return self.rep_count, self.state, self.feedback, self._accuracy()

    def _accuracy(self):
        if not self.accuracy_scores:
            return 100.0
        return round(sum(self.accuracy_scores) / len(self.accuracy_scores), 1)

    def reset(self):
        self.rep_count = 0
        self.state = "STANDING"
        self.feedback = []
        self.accuracy_scores = []
        self.current_rep_errors = 0
        self.current_rep_frames = 0