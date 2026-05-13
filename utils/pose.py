"""
utils/pose.py
Works with MediaPipe 0.10.18+ (Python 3.12)
Zero legacy imports — only Tasks API + pure cv2 drawing.
"""

import cv2
import mediapipe as mp
from mediapipe.tasks import python as mp_python
from mediapipe.tasks.python import vision
import urllib.request
import os

MODEL_PATH = "pose_landmarker_full.task"
MODEL_URL = (
    "https://storage.googleapis.com/mediapipe-models/"
    "pose_landmarker/pose_landmarker_full/float16/latest/"
    "pose_landmarker_full.task"
)

# Skeleton connections as index pairs
POSE_CONNECTIONS = [
    (11, 12),                                # shoulders
    (11, 13), (13, 15),                      # left arm
    (12, 14), (14, 16),                      # right arm
    (11, 23), (12, 24),                      # torso sides
    (23, 24),                                # hips
    (23, 25), (25, 27), (27, 29), (27, 31), # left leg
    (24, 26), (26, 28), (28, 30), (28, 32), # right leg
    (0, 11), (0, 12),                        # head to shoulders
]

LANDMARK_NAMES = [
    "NOSE", "LEFT_EYE_INNER", "LEFT_EYE", "LEFT_EYE_OUTER",
    "RIGHT_EYE_INNER", "RIGHT_EYE", "RIGHT_EYE_OUTER",
    "LEFT_EAR", "RIGHT_EAR", "MOUTH_LEFT", "MOUTH_RIGHT",
    "LEFT_SHOULDER", "RIGHT_SHOULDER",
    "LEFT_ELBOW", "RIGHT_ELBOW",
    "LEFT_WRIST", "RIGHT_WRIST",
    "LEFT_PINKY", "RIGHT_PINKY",
    "LEFT_INDEX", "RIGHT_INDEX",
    "LEFT_THUMB", "RIGHT_THUMB",
    "LEFT_HIP", "RIGHT_HIP",
    "LEFT_KNEE", "RIGHT_KNEE",
    "LEFT_ANKLE", "RIGHT_ANKLE",
    "LEFT_HEEL", "RIGHT_HEEL",
    "LEFT_FOOT_INDEX", "RIGHT_FOOT_INDEX"
]


def download_model():
    if not os.path.exists(MODEL_PATH):
        print("[INFO] Downloading pose model (~6MB), please wait...")
        urllib.request.urlretrieve(MODEL_URL, MODEL_PATH)
        print("[INFO] Model downloaded successfully.")


class PoseDetector:
    def __init__(self, detection_confidence=0.7, tracking_confidence=0.7):
        download_model()

        base_options = mp_python.BaseOptions(
            model_asset_path=MODEL_PATH
        )
        options = vision.PoseLandmarkerOptions(
            base_options=base_options,
            output_segmentation_masks=False,
            min_pose_detection_confidence=detection_confidence,
            min_tracking_confidence=tracking_confidence,
            running_mode=vision.RunningMode.VIDEO
        )
        self.landmarker = vision.PoseLandmarker.create_from_options(options)
        self.frame_index = 0
        self.last_results = None

    def get_landmarks(self, frame):
        """
        Process BGR frame.
        Returns:
          landmarks : dict {name: {x, y, z, visibility}}  or None
          results   : raw MediaPipe result object
        """
        h, w = frame.shape[:2]
        rgb = cv2.cvtColor(frame, cv2.COLOR_BGR2RGB)
        mp_image = mp.Image(image_format=mp.ImageFormat.SRGB, data=rgb)

        timestamp_ms = int(self.frame_index * (1000 / 30))
        self.frame_index += 1

        results = self.landmarker.detect_for_video(mp_image, timestamp_ms)
        self.last_results = results

        if not results.pose_landmarks or len(results.pose_landmarks) == 0:
            return None, results

        landmarks = {}
        for i, lm in enumerate(results.pose_landmarks[0]):
            landmarks[LANDMARK_NAMES[i]] = {
                "x": lm.x * w,
                "y": lm.y * h,
                "z": lm.z,
                "visibility": lm.visibility if hasattr(lm, "visibility") else 1.0
            }

        return landmarks, results

    def draw_skeleton(self, frame, results):
        """
        Draw skeleton using pure cv2 — no mediapipe drawing utils.
        White lines for bones, green dots for joints.
        """
        if not results or not results.pose_landmarks:
            return frame

        h, w = frame.shape[:2]
        lms = results.pose_landmarks[0]

        # Draw bone connections
        for start_idx, end_idx in POSE_CONNECTIONS:
            if start_idx >= len(lms) or end_idx >= len(lms):
                continue
            x1, y1 = int(lms[start_idx].x * w), int(lms[start_idx].y * h)
            x2, y2 = int(lms[end_idx].x * w),   int(lms[end_idx].y * h)
            cv2.line(frame, (x1, y1), (x2, y2), (255, 255, 255), 2)

        # Draw joint circles
        for lm in lms:
            cx, cy = int(lm.x * w), int(lm.y * h)
            cv2.circle(frame, (cx, cy), 5, (0, 255, 0), -1)  # filled green dot
            cv2.circle(frame, (cx, cy), 5, (0, 200, 0), 1)   # outline

        return frame

    def get_point(self, landmarks, name):
        """Returns (x, y) pixel tuple for a landmark name."""
        if landmarks and name in landmarks:
            return (int(landmarks[name]["x"]), int(landmarks[name]["y"]))
        return None

    def close(self):
        self.landmarker.close()