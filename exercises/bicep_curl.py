"""
exercises/bicep_curl.py
Bicep curl detection: rep counting + posture correction.
Camera position: front view
"""

from utils.angles import calculate_angle


class BicepCurlDetector:
    def __init__(self):
        self.rep_count = 0
        self.state = "DOWN"
        self.feedback = []
        self.accuracy_scores = []
        self.current_rep_errors = 0
        self.current_rep_frames = 0

    def analyze(self, landmarks):
        self.feedback = []

        if not landmarks:
            return self.rep_count, self.state, ["No pose detected"], self._accuracy()

        # Use both arms, average the angle
        angles = []
        for side in [("LEFT_SHOULDER", "LEFT_ELBOW", "LEFT_WRIST"),
                     ("RIGHT_SHOULDER", "RIGHT_ELBOW", "RIGHT_WRIST")]:
            try:
                a = calculate_angle(
                    landmarks[side[0]],
                    landmarks[side[1]],
                    landmarks[side[2]]
                )
                angles.append(a)
            except KeyError:
                pass

        if not angles:
            return self.rep_count, self.state, ["No pose detected"], self._accuracy()

        elbow_angle = sum(angles) / len(angles)

        # Elbow drift check — elbow x should stay near hip x
        try:
            left_elbow_x  = landmarks["LEFT_ELBOW"]["x"]
            left_hip_x    = landmarks["LEFT_HIP"]["x"]
            right_elbow_x = landmarks["RIGHT_ELBOW"]["x"]
            right_hip_x   = landmarks["RIGHT_HIP"]["x"]
            drift = (abs(left_elbow_x - left_hip_x) +
                     abs(right_elbow_x - right_hip_x)) / 2
            if drift > 60:
                self.feedback.append("Keep elbows close to body")
                self.current_rep_errors += 1
        except KeyError:
            pass

        self.current_rep_frames += 1

        # ── State machine ───────────────────────────────────────────────
        if self.state == "DOWN":
            if elbow_angle < 50:
                self.state = "UP"
                self.current_rep_errors = 0
                self.current_rep_frames = 0

        elif self.state == "UP":
            if elbow_angle > 150:
                self.state = "DOWN"
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
        self.state = "DOWN"
        self.feedback = []
        self.accuracy_scores = []
        self.current_rep_errors = 0
        self.current_rep_frames = 0