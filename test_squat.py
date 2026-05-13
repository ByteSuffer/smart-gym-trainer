"""
test_squat.py
Live squat rep counter with posture correction + voice feedback.
Stand SIDEWAYS to the camera (right side facing camera).
Press R to reset | Press Q to quit.
"""

import os
os.environ["QT_QPA_PLATFORM"] = "xcb"
os.environ["DISPLAY"] = ":0"
os.environ["GDK_BACKEND"] = "x11"

import cv2
import time
import numpy as np
from utils.pose import PoseDetector
from utils.angles import calculate_angle
from utils.voice import VoiceFeedback
from exercises.squat import SquatDetector


def draw_hud(frame, rep_count, state, feedback, accuracy, knee_angle, hip_angle):
    h, w = frame.shape[:2]

    # ── Dark top bar ────────────────────────────────────────────────────
    cv2.rectangle(frame, (0, 0), (w, 110), (20, 20, 20), -1)

    # Rep count
    cv2.putText(frame, "REPS", (30, 30),
                cv2.FONT_HERSHEY_SIMPLEX, 0.6, (150, 150, 150), 1)
    cv2.putText(frame, str(rep_count), (30, 80),
                cv2.FONT_HERSHEY_SIMPLEX, 2.0, (0, 255, 0), 3)

    # State
    state_color = (0, 255, 255) if state == "DOWN" else (255, 255, 255)
    cv2.putText(frame, state, (160, 60),
                cv2.FONT_HERSHEY_SIMPLEX, 0.9, state_color, 2)

    # Accuracy
    acc_color = (0, 255, 0) if accuracy >= 80 else (0, 165, 255) if accuracy >= 60 else (0, 0, 255)
    cv2.putText(frame, f"Accuracy: {accuracy}%", (w - 230, 50),
                cv2.FONT_HERSHEY_SIMPLEX, 0.7, acc_color, 2)

    # ── Angle display ───────────────────────────────────────────────────
    cv2.putText(frame, f"Knee: {knee_angle}", (30, h - 60),
                cv2.FONT_HERSHEY_SIMPLEX, 0.65, (255, 255, 0), 2)
    cv2.putText(frame, f"Hip:  {hip_angle}", (30, h - 30),
                cv2.FONT_HERSHEY_SIMPLEX, 0.65, (0, 255, 255), 2)

    # ── Squat depth bar ─────────────────────────────────────────────────
    bar_x, bar_y, bar_h = w - 50, 130, h - 200
    cv2.rectangle(frame, (bar_x, bar_y), (bar_x + 30, bar_y + bar_h),
                  (50, 50, 50), -1)
    depth_pct = max(0, min(1, (180 - knee_angle) / 90))
    fill_h = int(bar_h * depth_pct)
    bar_color = (0, 255, 0) if depth_pct > 0.7 else (0, 165, 255)
    cv2.rectangle(frame, (bar_x, bar_y + bar_h - fill_h),
                  (bar_x + 30, bar_y + bar_h), bar_color, -1)
    cv2.putText(frame, "Depth", (bar_x - 10, bar_y - 10),
                cv2.FONT_HERSHEY_SIMPLEX, 0.4, (150, 150, 150), 1)

    # ── Feedback warnings ───────────────────────────────────────────────
    if feedback:
        for i, msg in enumerate(feedback):
            y_pos = 145 + (i * 35)
            cv2.rectangle(frame, (10, y_pos - 22),
                          (len(msg) * 13 + 20, y_pos + 8), (0, 0, 180), -1)
            cv2.putText(frame, msg, (15, y_pos),
                        cv2.FONT_HERSHEY_SIMPLEX, 0.65, (255, 255, 255), 2)

    # ── Controls hint ───────────────────────────────────────────────────
    cv2.putText(frame, "R = Reset  |  Q = Quit", (30, h - 10),
                cv2.FONT_HERSHEY_SIMPLEX, 0.45, (100, 100, 100), 1)

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
            print("[ERROR] Could not open camera device.")
            cap.release()
            return None

        print("[INFO] Warming up camera (2 sec)...")
        time.sleep(2)

        print("[INFO] Flushing warmup frames...")
        for _ in range(30):
            cap.read()
            time.sleep(0.05)

        for attempt in range(15):
            ret, frame = cap.read()
            if ret and frame is not None and frame.size > 0:
                if not np.all(frame == 0):
                    print(f"[OK] Camera ready. Frame shape: {frame.shape}")
                    return cap
            time.sleep(0.2)

        print("[ERROR] Camera opened but all frames are black.")
        print("        Make sure DroidCam app is OPEN on your phone!")
        cap.release()
        return None

    # HTTP stream
    urls_to_try = [
        source,
        source.replace("/video", "/mjpegfeed"),
        source.replace("/video", "/videofeed"),
    ]
    for url in urls_to_try:
        print(f"[INFO] Trying URL: {url}")
        cap = cv2.VideoCapture(url)
        cap.set(cv2.CAP_PROP_BUFFERSIZE, 1)
        time.sleep(2)
        if not cap.isOpened():
            cap.release()
            continue
        for _ in range(10):
            ret, frame = cap.read()
            if ret and frame is not None and frame.size > 0:
                print(f"[OK] Connected to: {url}")
                return cap
            time.sleep(0.1)
        cap.release()

    print("[ERROR] Could not connect to any stream URL.")
    return None


def main(source=0):
    print("[INFO] Smart Gym Trainer — Squat Mode")
    print("[INFO] Make sure DroidCam is connected in the other terminal.")

    cap = open_camera(source)

    if cap is None:
        print("\n[ERROR] Camera failed to open. Check:")
        print("  1. Run 'droidcam-cli 192.168.1.39 4747' in another terminal")
        print("  2. DroidCam app must be OPEN on phone (not minimized)")
        print("  3. venv must be active: source venv/bin/activate")
        return

    detector       = PoseDetector()
    squat          = SquatDetector()
    voice          = VoiceFeedback(cooldown_seconds=4)
    last_rep_count = 0
    fail_count     = 0
    MAX_FAILS      = 30

    # ── Create window explicitly before loop ─────────────────────────────
    cv2.namedWindow("Smart Gym Trainer — Squats", cv2.WINDOW_NORMAL)
    cv2.resizeWindow("Smart Gym Trainer — Squats", 640, 480)
    cv2.moveWindow("Smart Gym Trainer — Squats", 100, 100)

    print("[INFO] Squat tracker running.")
    print("       Stand SIDEWAYS to camera (right side facing lens).")
    print("       Press R to reset | Press Q to quit.")
    voice.speak("Squat tracker ready. Stand sideways to the camera.")

    while True:
        ret, frame = cap.read()

        # ── Handle bad frames ────────────────────────────────────────────
        if not ret or frame is None or frame.size == 0:
            fail_count += 1
            if fail_count % 10 == 0:
                print(f"[WARN] Bad frames: {fail_count}/{MAX_FAILS} — "
                      "is DroidCam still running?")
            time.sleep(0.05)

            if fail_count >= MAX_FAILS:
                print("[INFO] Too many bad frames — reconnecting...")
                cap.release()
                time.sleep(2)
                cap = open_camera(source)
                fail_count = 0
                if cap is None:
                    print("[ERROR] Reconnect failed. Exiting.")
                    break
                print("[OK] Reconnected.")
            continue

        fail_count = 0

        # ── Ensure frame is BGR 3-channel ────────────────────────────────
        frame = frame.copy()
        if len(frame.shape) == 2:
            frame = cv2.cvtColor(frame, cv2.COLOR_GRAY2BGR)

        # ── Pose detection ───────────────────────────────────────────────
        landmarks, results = detector.get_landmarks(frame)
        frame = detector.draw_skeleton(frame, results)

        # ── Angle calculation ────────────────────────────────────────────
        knee_angle = 180
        hip_angle  = 180
        if landmarks:
            try:
                knee_angle = calculate_angle(
                    landmarks["RIGHT_HIP"],
                    landmarks["RIGHT_KNEE"],
                    landmarks["RIGHT_ANKLE"]
                )
                hip_angle = calculate_angle(
                    landmarks["RIGHT_SHOULDER"],
                    landmarks["RIGHT_HIP"],
                    landmarks["RIGHT_KNEE"]
                )
            except Exception:
                pass

        # ── Squat analysis ───────────────────────────────────────────────
        rep_count, state, feedback, accuracy = squat.analyze(landmarks)

        # ── Voice feedback ───────────────────────────────────────────────
        for msg in feedback:
            voice.speak(msg)
        if rep_count > last_rep_count:
            voice.speak(f"{rep_count} reps")
            last_rep_count = rep_count

        # ── Draw HUD ─────────────────────────────────────────────────────
        frame = draw_hud(frame, rep_count, state, feedback,
                         accuracy, knee_angle, hip_angle)

        # ── Display ──────────────────────────────────────────────────────
        cv2.imshow("Smart Gym Trainer — Squats", frame)
        cv2.waitKey(1)

        # ── Key controls ─────────────────────────────────────────────────
        key = cv2.waitKey(1) & 0xFF
        if key == ord('q'):
            break
        elif key == ord('r'):
            squat.reset()
            last_rep_count = 0
            voice.speak("Reset")
            print("[INFO] Rep counter reset.")

    # ── Cleanup ──────────────────────────────────────────────────────────
    cap.release()
    cv2.destroyAllWindows()
    voice.stop()
    detector.close()

    print(f"\n── Session Summary ──────────────────")
    print(f"  Total reps : {squat.rep_count}")
    print(f"  Accuracy   : {squat._accuracy()}%")
    print(f"─────────────────────────────────────")


if __name__ == "__main__":
    main(source=0)   # 0 = /dev/video0 (DroidCam virtual device)