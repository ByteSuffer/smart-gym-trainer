"""
test_pose_core.py
Live test of pose detection + angle calculation + skeleton overlay.
Shows knee, elbow, and hip angles on screen in real time.
Press Q to quit.
"""

import cv2
from utils.pose import PoseDetector
from utils.angles import calculate_angle
from utils.voice import VoiceFeedback


def main(source=0):
    cap = cv2.VideoCapture(source)
    detector = PoseDetector()
    voice = VoiceFeedback()

    print("[INFO] Running pose core test. Press Q to quit.")
    voice.speak("Pose detection started")

    while True:
        ret, frame = cap.read()
        if not ret:
            break

        landmarks, results = detector.get_landmarks(frame)

        # Draw skeleton
        frame = detector.draw_skeleton(frame, results)

        if landmarks:
            # --- Knee angle (right leg: hip → knee → ankle) ---
            try:
                knee_angle = calculate_angle(
                    landmarks["RIGHT_HIP"],
                    landmarks["RIGHT_KNEE"],
                    landmarks["RIGHT_ANKLE"]
                )
                knee_pt = detector.get_point(landmarks, "RIGHT_KNEE")
                cv2.putText(frame, f"Knee: {knee_angle}°",
                            (knee_pt[0] + 10, knee_pt[1]),
                            cv2.FONT_HERSHEY_SIMPLEX, 0.6, (255, 255, 0), 2)
            except Exception:
                pass

            # --- Elbow angle (right arm: shoulder → elbow → wrist) ---
            try:
                elbow_angle = calculate_angle(
                    landmarks["RIGHT_SHOULDER"],
                    landmarks["RIGHT_ELBOW"],
                    landmarks["RIGHT_WRIST"]
                )
                elbow_pt = detector.get_point(landmarks, "RIGHT_ELBOW")
                cv2.putText(frame, f"Elbow: {elbow_angle}°",
                            (elbow_pt[0] + 10, elbow_pt[1]),
                            cv2.FONT_HERSHEY_SIMPLEX, 0.6, (0, 255, 255), 2)
            except Exception:
                pass

            # --- Hip angle (shoulder → hip → knee) ---
            try:
                hip_angle = calculate_angle(
                    landmarks["RIGHT_SHOULDER"],
                    landmarks["RIGHT_HIP"],
                    landmarks["RIGHT_KNEE"]
                )
                hip_pt = detector.get_point(landmarks, "RIGHT_HIP")
                cv2.putText(frame, f"Hip: {hip_angle}°",
                            (hip_pt[0] + 10, hip_pt[1]),
                            cv2.FONT_HERSHEY_SIMPLEX, 0.6, (0, 255, 0), 2)
            except Exception:
                pass

            cv2.putText(frame, "Pose OK", (20, 40),
                        cv2.FONT_HERSHEY_SIMPLEX, 0.8, (0, 255, 0), 2)
        else:
            cv2.putText(frame, "No pose detected", (20, 40),
                        cv2.FONT_HERSHEY_SIMPLEX, 0.8, (0, 0, 255), 2)

        cv2.imshow("Pose Core Test", frame)
        if cv2.waitKey(1) & 0xFF == ord('q'):
            break

    cap.release()
    cv2.destroyAllWindows()
    voice.stop()
    detector.close()
    print("[DONE]")


if __name__ == "__main__":
    main(source=0)