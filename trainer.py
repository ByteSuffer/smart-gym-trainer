"""
trainer.py
Main Smart Gym Trainer app.
Press keys to switch exercises:
  1 = Squats      (side view)
  2 = Push-ups    (side view)
  3 = Plank       (side view)
  4 = Bicep Curls (front view)
  R = Reset current exercise
  Q = Quit
"""

import os
os.environ["QT_QPA_PLATFORM"] = "xcb"
os.environ["DISPLAY"] = ":0"
os.environ["GDK_BACKEND"] = "x11"

import cv2
import time
import numpy as np
import requests

from utils.pose import PoseDetector
from utils.angles import calculate_angle
from utils.voice import VoiceFeedback
from exercises.squat import SquatDetector
from exercises.pushup import PushupDetector
from exercises.plank import PlankDetector
from exercises.bicep_curl import BicepCurlDetector


# ── Calories config ──────────────────────────────────────────────────────────
USER_WEIGHT_KG = 70   # ← change to your weight in kg

MET_VALUES = {
    "Squats":      5.0,
    "Push-ups":    8.0,
    "Plank":       4.0,
    "Bicep Curls": 3.0,
}

# ── Exercise registry ────────────────────────────────────────────────────────
EXERCISES = {
    "1": {"name": "Squats",      "key": "1", "view": "SIDE VIEW",  "class": SquatDetector},
    "2": {"name": "Push-ups",    "key": "2", "view": "SIDE VIEW",  "class": PushupDetector},
    "3": {"name": "Plank",       "key": "3", "view": "SIDE VIEW",  "class": PlankDetector},
    "4": {"name": "Bicep Curls", "key": "4", "view": "FRONT VIEW", "class": BicepCurlDetector},
}


def save_session_to_api(exercise, reps, duration, accuracy,calories=0.0):
    """Save workout session to FastAPI backend."""
    try:
        response = requests.post(
            "http://localhost:8000/sessions/",
            json={
                "exercise": exercise,
                "reps":     reps,
                "duration": duration,
                "accuracy": accuracy,
                "calories": round(calories, 1), 
            },
            timeout=2
        )
        if response.status_code == 200:
            print(f"[API] Session saved: {exercise} — {reps} reps")
    except Exception:
        pass


def draw_hud(frame, exercise_name, view, primary_value, state,
             feedback, accuracy, angles, session_secs=0, calories=0.0):
    h, w = frame.shape[:2]
    is_plank = exercise_name == "Plank"

    # ── Top bar ──────────────────────────────────────────────────────────
    cv2.rectangle(frame, (0, 0), (w, 120), (15, 15, 15), -1)

    # Exercise name + view
    cv2.putText(frame, exercise_name.upper(), (20, 28),
                cv2.FONT_HERSHEY_SIMPLEX, 0.8, (100, 200, 255), 2)
    cv2.putText(frame, view, (20, 48),
                cv2.FONT_HERSHEY_SIMPLEX, 0.42, (100, 100, 100), 1)

    # Reps or secs label
    label = "SECS" if is_plank else "REPS"
    cv2.putText(frame, label, (20, 70),
                cv2.FONT_HERSHEY_SIMPLEX, 0.48, (150, 150, 150), 1)
    cv2.putText(frame, str(primary_value), (20, 112),
                cv2.FONT_HERSHEY_SIMPLEX, 2.2, (0, 255, 0), 3)

    # State
    state_color = (0, 255, 255) if state in ("DOWN", "HOLD", "UP") else (200, 200, 200)
    cv2.putText(frame, state, (175, 75),
                cv2.FONT_HERSHEY_SIMPLEX, 1.0, state_color, 2)

    # Accuracy
    acc_color = (0, 255, 0) if accuracy >= 80 else \
                (0, 165, 255) if accuracy >= 60 else (0, 0, 255)
    cv2.putText(frame, f"Accuracy: {accuracy}%", (w - 245, 30),
                cv2.FONT_HERSHEY_SIMPLEX, 0.65, acc_color, 2)

    # Timer
    mins = session_secs // 60
    secs = session_secs % 60
    cv2.putText(frame, f"Time: {mins:02d}:{secs:02d}", (w - 245, 60),
                cv2.FONT_HERSHEY_SIMPLEX, 0.62, (180, 180, 255), 1)

    # Calories
    cv2.putText(frame, f"Calories: {calories:.1f} kcal", (w - 245, 88),
                cv2.FONT_HERSHEY_SIMPLEX, 0.58, (255, 160, 50), 1)

    # Angle display (bottom left)
    y_start = h - 10
    for label_txt, value in reversed(angles):
        cv2.putText(frame, f"{label_txt}: {value}", (20, y_start),
                    cv2.FONT_HERSHEY_SIMPLEX, 0.6, (255, 255, 0), 2)
        y_start -= 28

    # Exercise selector (bottom right)
    cv2.rectangle(frame, (w - 200, h - 105), (w, h), (20, 20, 20), -1)
    cv2.putText(frame, "1:Squat 2:Push", (w - 195, h - 80),
                cv2.FONT_HERSHEY_SIMPLEX, 0.42, (150, 150, 150), 1)
    cv2.putText(frame, "3:Plank 4:Curl", (w - 195, h - 57),
                cv2.FONT_HERSHEY_SIMPLEX, 0.42, (150, 150, 150), 1)
    cv2.putText(frame, "R:Reset  Q:Quit", (w - 195, h - 32),
                cv2.FONT_HERSHEY_SIMPLEX, 0.42, (100, 100, 100), 1)
    cv2.putText(frame, f"► {exercise_name}", (w - 195, h - 8),
                cv2.FONT_HERSHEY_SIMPLEX, 0.45, (0, 255, 100), 1)

    # Feedback warnings
    if feedback and feedback != ["No pose detected"]:
        for i, msg in enumerate(feedback):
            y_pos = 140 + (i * 38)
            box_w = len(msg) * 13 + 20
            cv2.rectangle(frame, (10, y_pos - 24),
                          (box_w, y_pos + 10), (0, 0, 180), -1)
            cv2.putText(frame, msg, (15, y_pos),
                        cv2.FONT_HERSHEY_SIMPLEX, 0.65, (255, 255, 255), 2)

    return frame


def open_camera(source):
    print(f"[INFO] Opening camera: {source}")
    if isinstance(source, int):
        cap = cv2.VideoCapture(source, cv2.CAP_V4L2)
        cap.set(cv2.CAP_PROP_FOURCC, cv2.VideoWriter_fourcc('Y', 'U', '1', '2'))
        cap.set(cv2.CAP_PROP_FRAME_WIDTH, 640)
        cap.set(cv2.CAP_PROP_FRAME_HEIGHT, 480)
        cap.set(cv2.CAP_PROP_FPS, 30)
        cap.set(cv2.CAP_PROP_BUFFERSIZE, 1)
        if not cap.isOpened():
            cap.release()
            return None
        print("[INFO] Warming up camera...")
        time.sleep(2)
        for _ in range(30):
            cap.read()
            time.sleep(0.05)
        for _ in range(15):
            ret, frame = cap.read()
            if ret and frame is not None and frame.size > 0:
                if not np.all(frame == 0):
                    print(f"[OK] Camera ready: {frame.shape}")
                    return cap
            time.sleep(0.2)
        cap.release()
        return None
    cap = cv2.VideoCapture(source)
    cap.set(cv2.CAP_PROP_BUFFERSIZE, 1)
    time.sleep(2)
    for _ in range(10):
        ret, frame = cap.read()
        if ret and frame is not None and frame.size > 0:
            return cap
        time.sleep(0.1)
    cap.release()
    return None


def main(source=0):
    cap = open_camera(source)
    if cap is None:
        print("[ERROR] Camera failed. Make sure droidcam-cli is running.")
        return

    detector         = PoseDetector()
    voice            = VoiceFeedback(cooldown_seconds=4)
    current_key      = "1"
    current_detector = EXERCISES["1"]["class"]()
    last_primary     = 0

    cv2.namedWindow("Smart Gym Trainer", cv2.WINDOW_NORMAL)
    cv2.resizeWindow("Smart Gym Trainer", 640, 480)
    cv2.moveWindow("Smart Gym Trainer", 100, 100)

    voice.speak("Smart Gym Trainer ready. Starting with squats.")
    print("[INFO] Trainer running.")
    print("       Keys: 1=Squats 2=Push-ups 3=Plank 4=Bicep Curls R=Reset Q=Quit")

    fail_count     = 0
    MAX_FAILS      = 30
    total_calories = 0.0
    last_cal_time  = time.time()
    active_time    = 0.0
    session_secs   = 0

    while True:
        ret, frame = cap.read()

        # ── Handle bad frames ────────────────────────────────────────────
        if not ret or frame is None or frame.size == 0:
            fail_count += 1
            time.sleep(0.05)
            if fail_count >= MAX_FAILS:
                cap.release()
                time.sleep(2)
                cap = open_camera(source)
                fail_count = 0
                if cap is None:
                    break
            continue

        fail_count = 0

        frame = frame.copy()
        if len(frame.shape) == 2:
            frame = cv2.cvtColor(frame, cv2.COLOR_GRAY2BGR)

        # ── Pose detection FIRST ─────────────────────────────────────────
        landmarks, results = detector.get_landmarks(frame)
        frame = detector.draw_skeleton(frame, results)

        # ── Timer + Calories (only when person detected) ─────────────────
        now     = time.time()
        elapsed = now - last_cal_time
        last_cal_time = now

        if landmarks is not None:
            active_time    += elapsed
            met             = MET_VALUES.get(EXERCISES[current_key]["name"], 4.0)
            total_calories += (met * USER_WEIGHT_KG * elapsed) / 3600

        session_secs = int(active_time)

        # ── Exercise analysis ────────────────────────────────────────────
        ex      = EXERCISES[current_key]
        name    = ex["name"]
        view    = ex["view"]
        primary, state, feedback, accuracy = current_detector.analyze(landmarks)

        # ── Voice feedback ───────────────────────────────────────────────
        for msg in feedback:
            voice.speak(msg)
        if name != "Plank" and primary > last_primary:
            voice.speak(f"{primary} reps")
            last_primary = primary
        elif name == "Plank" and primary > 0 and primary % 10 == 0 and primary != last_primary:
            voice.speak(f"{primary} seconds")
            last_primary = primary

        # ── Compute angles for display ───────────────────────────────────
        angles = []
        if landmarks:
            try:
                if name == "Squats":
                    knee = calculate_angle(landmarks["RIGHT_HIP"],
                                          landmarks["RIGHT_KNEE"],
                                          landmarks["RIGHT_ANKLE"])
                    hip  = calculate_angle(landmarks["RIGHT_SHOULDER"],
                                          landmarks["RIGHT_HIP"],
                                          landmarks["RIGHT_KNEE"])
                    angles = [("Knee", knee), ("Hip", hip)]
                elif name == "Push-ups":
                    elbow = calculate_angle(landmarks["RIGHT_SHOULDER"],
                                           landmarks["RIGHT_ELBOW"],
                                           landmarks["RIGHT_WRIST"])
                    angles = [("Elbow", elbow)]
                elif name == "Bicep Curls":
                    elbow = calculate_angle(landmarks["RIGHT_SHOULDER"],
                                           landmarks["RIGHT_ELBOW"],
                                           landmarks["RIGHT_WRIST"])
                    angles = [("Elbow", elbow)]
                elif name == "Plank":
                    body = calculate_angle(landmarks["RIGHT_SHOULDER"],
                                          landmarks["RIGHT_HIP"],
                                          landmarks["RIGHT_ANKLE"])
                    angles = [("Body", body)]
            except Exception:
                pass

        # ── Draw HUD ─────────────────────────────────────────────────────
        frame = draw_hud(frame, name, view, primary, state,
                         feedback, accuracy, angles,
                         session_secs, total_calories)

        cv2.imshow("Smart Gym Trainer", frame)

        # ── Key controls ─────────────────────────────────────────────────
        key = cv2.waitKey(1) & 0xFF
        if key == ord('q'):
            break
        elif key == ord('r'):
            current_detector.reset()
            last_primary = 0
            voice.speak("Reset")
            print(f"[INFO] {name} reset.")
        elif key in [ord('1'), ord('2'), ord('3'), ord('4')]:
            new_key = chr(key)
            if new_key != current_key:
                current_key      = new_key
                current_detector = EXERCISES[new_key]["class"]()
                last_primary     = 0
                new_name         = EXERCISES[new_key]["name"]
                new_view         = EXERCISES[new_key]["view"]
                voice.speak(f"Switching to {new_name}. {new_view}.")
                print(f"[INFO] Switched to {new_name} ({new_view})")

    # ── Save session to API ───────────────────────────────────────────────
    save_session_to_api(
        exercise=EXERCISES[current_key]["name"],
        reps=current_detector.rep_count if hasattr(current_detector, 'rep_count') else 0,
        duration=int(active_time),
        accuracy=current_detector._accuracy(),
        calories=total_calories
    )

    # ── Cleanup ───────────────────────────────────────────────────────────
    cap.release()
    cv2.destroyAllWindows()
    voice.stop()
    detector.close()
    print(f"\n── Session Summary ──────────────────")
    print(f"  Exercise   : {EXERCISES[current_key]['name']}")
    print(f"  Active time: {session_secs}s")
    print(f"  Calories   : {total_calories:.1f} kcal")
    print(f"─────────────────────────────────────")
    print("\n[DONE] Session ended.")


if __name__ == "__main__":
    main(source=0)