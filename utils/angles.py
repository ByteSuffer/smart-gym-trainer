"""
utils/angles.py
Calculates the angle at point B given three points A, B, C.
Used for all joint angle measurements (knee, elbow, hip, etc.)
"""

import numpy as np


def calculate_angle(a, b, c):
    """
    Calculate angle at B in the A-B-C joint.

    Args:
        a, b, c: each is a dict with 'x' and 'y' keys
                 (as returned by PoseDetector.get_landmarks)

    Returns:
        Angle in degrees (0–180)
    """
    a = np.array([a["x"], a["y"]])
    b = np.array([b["x"], b["y"]])
    c = np.array([c["x"], c["y"]])

    radians = np.arctan2(c[1] - b[1], c[0] - b[0]) \
            - np.arctan2(a[1] - b[1], a[0] - b[0])

    angle = np.abs(np.degrees(radians))

    # Normalize to 0-180
    if angle > 180:
        angle = 360 - angle

    return round(angle, 1)


def calculate_angle_from_points(a, b, c):
    """
    Same as calculate_angle but accepts (x, y) tuples
    instead of landmark dicts. Useful for custom points.
    """
    a = np.array(a)
    b = np.array(b)
    c = np.array(c)

    radians = np.arctan2(c[1] - b[1], c[0] - b[0]) \
            - np.arctan2(a[1] - b[1], a[0] - b[0])

    angle = np.abs(np.degrees(radians))

    if angle > 180:
        angle = 360 - angle

    return round(angle, 1)


def midpoint(a, b):
    """Returns the midpoint between two landmark dicts."""
    return {
        "x": (a["x"] + b["x"]) / 2,
        "y": (a["y"] + b["y"]) / 2,
        "z": (a["z"] + b["z"]) / 2,
        "visibility": min(a["visibility"], b["visibility"])
    }