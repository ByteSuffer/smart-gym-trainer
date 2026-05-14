import React, { useState, useEffect, useRef } from "react";
import axios from "axios";

const API = process.env.REACT_APP_API_URL || "http://localhost:8000";

const EXERCISES = [
  { id: "squats",     name: "Squats",      view: "Side View",  key: "1", color: "#00b0ff" },
  { id: "pushups",    name: "Push-ups",    view: "Side View",  key: "2", color: "#ff4081" },
  { id: "plank",      name: "Plank",       view: "Side View",  key: "3", color: "#69f0ae" },
  { id: "bicepcurls", name: "Bicep Curls", view: "Front View", key: "4", color: "#ffd740" },
];

const MET_VALUES = {
  squats: 5.0, pushups: 8.0, plank: 4.0, bicepcurls: 3.0
};

// ── MoveNet keypoint indices ─────────────────────────────────────────────────
// 0:nose 1:left_eye 2:right_eye 3:left_ear 4:right_ear
// 5:left_shoulder 6:right_shoulder 7:left_elbow 8:right_elbow
// 9:left_wrist 10:right_wrist 11:left_hip 12:right_hip
// 13:left_knee 14:right_knee 15:left_ankle 16:right_ankle
const KP = {
  LEFT_SHOULDER: 5,  RIGHT_SHOULDER: 6,
  LEFT_ELBOW: 7,     RIGHT_ELBOW: 8,
  LEFT_WRIST: 9,     RIGHT_WRIST: 10,
  LEFT_HIP: 11,      RIGHT_HIP: 12,
  LEFT_KNEE: 13,     RIGHT_KNEE: 14,
  LEFT_ANKLE: 15,    RIGHT_ANKLE: 16,
};

const SKELETON_CONNECTIONS = [
  [5,6],[5,7],[7,9],[6,8],[8,10],
  [5,11],[6,12],[11,12],
  [11,13],[13,15],[12,14],[14,16],
];

// ── Angle calculator ─────────────────────────────────────────────────────────
function calcAngle(a, b, c) {
  const radians = Math.atan2(c[1] - b[1], c[0] - b[0])
                - Math.atan2(a[1] - b[1], a[0] - b[0]);
  let angle = Math.abs(radians * 180 / Math.PI);
  if (angle > 180) angle = 360 - angle;
  return Math.round(angle);
}

function kpXY(keypoints, idx) {
  // MoveNet returns [y, x, score] per keypoint
  const kp = keypoints[idx];
  return [kp.x, kp.y];
}

// ── Exercise analyzers ───────────────────────────────────────────────────────
function analyzeSquat(kps, state) {
  const hip   = kpXY(kps, KP.LEFT_HIP);
  const knee  = kpXY(kps, KP.LEFT_KNEE);
  const ankle = kpXY(kps, KP.LEFT_ANKLE);
  const angle = calcAngle(hip, knee, ankle);
  const feedback = [];
  let newState = state.current;
  let reps = state.reps;

  if (angle < 100 && state.current === "STANDING") newState = "DOWN";
  if (angle > 160 && state.current === "DOWN") { newState = "STANDING"; reps += 1; }
  if (angle < 90) feedback.push("Good depth!");
  if (angle > 100 && state.current === "DOWN") feedback.push("Go lower!");

  return { reps, current: newState, feedback, angle, label: "Knee" };
}

function analyzePushup(kps, state) {
  const shoulder = kpXY(kps, KP.LEFT_SHOULDER);
  const elbow    = kpXY(kps, KP.LEFT_ELBOW);
  const wrist    = kpXY(kps, KP.LEFT_WRIST);
  const angle = calcAngle(shoulder, elbow, wrist);
  const feedback = [];
  let newState = state.current;
  let reps = state.reps;

  if (angle < 90 && state.current === "UP") newState = "DOWN";
  if (angle > 160 && state.current === "DOWN") { newState = "UP"; reps += 1; }

  const hipY      = kpXY(kps, KP.LEFT_HIP)[1];
  const shoulderY = kpXY(kps, KP.LEFT_SHOULDER)[1];
  const ankleY    = kpXY(kps, KP.LEFT_ANKLE)[1];
  if (Math.abs(hipY - (shoulderY + ankleY) / 2) > 0.05)
    feedback.push("Keep body straight!");

  return { reps, current: newState, feedback, angle, label: "Elbow" };
}

function analyzePlank(kps, state, startTime) {
  const shoulder = kpXY(kps, KP.LEFT_SHOULDER);
  const hip      = kpXY(kps, KP.LEFT_HIP);
  const ankle    = kpXY(kps, KP.LEFT_ANKLE);
  const angle = calcAngle(shoulder, hip, ankle);
  const feedback = [];
  let duration = state.reps;
  let newState = state.current;

  if (angle > 150) {
    newState = "HOLD";
    duration = startTime ? Math.floor((Date.now() - startTime) / 1000) : 0;
  } else {
    newState = "REST";
    if (hip[1] < shoulder[1] - 0.05) feedback.push("Lower your hips!");
    if (hip[1] > ankle[1] + 0.05)    feedback.push("Raise your hips!");
  }

  return { reps: duration, current: newState, feedback, angle, label: "Body" };
}

function analyzeCurl(kps, state) {
  const lShoulder = kpXY(kps, KP.LEFT_SHOULDER);
  const lElbow    = kpXY(kps, KP.LEFT_ELBOW);
  const lWrist    = kpXY(kps, KP.LEFT_WRIST);
  const rShoulder = kpXY(kps, KP.RIGHT_SHOULDER);
  const rElbow    = kpXY(kps, KP.RIGHT_ELBOW);
  const rWrist    = kpXY(kps, KP.RIGHT_WRIST);

  const leftAngle  = calcAngle(lShoulder, lElbow, lWrist);
  const rightAngle = calcAngle(rShoulder, rElbow, rWrist);
  const angle = Math.round((leftAngle + rightAngle) / 2);

  const feedback = [];
  let newState = state.current;
  let reps = state.reps;

  if (angle < 50 && state.current === "DOWN") newState = "UP";
  if (angle > 150 && state.current === "UP") { newState = "DOWN"; reps += 1; }

  const lDrift = Math.abs(lElbow[0] - kpXY(kps, KP.LEFT_HIP)[0]);
  const rDrift = Math.abs(rElbow[0] - kpXY(kps, KP.RIGHT_HIP)[0]);
  if ((lDrift + rDrift) / 2 > 0.15) feedback.push("Keep elbows close!");

  return { reps, current: newState, feedback, angle, label: "Elbow" };
}

// ── Draw skeleton ────────────────────────────────────────────────────────────
function drawSkeleton(ctx, keypoints, w, h) {
  // Draw connections
  ctx.strokeStyle = "#00e5ff";
  ctx.lineWidth = 3;
  SKELETON_CONNECTIONS.forEach(([a, b]) => {
    const kpA = keypoints[a];
    const kpB = keypoints[b];
    if (!kpA || !kpB || kpA.score < 0.3 || kpB.score < 0.3) return;
    ctx.beginPath();
    ctx.moveTo(kpA.x * w, kpA.y * h);
    ctx.lineTo(kpB.x * w, kpB.y * h);
    ctx.stroke();
  });
  // Draw joints
  keypoints.forEach(kp => {
    if (!kp || kp.score < 0.3) return;
    ctx.beginPath();
    ctx.arc(kp.x * w, kp.y * h, 5, 0, 2 * Math.PI);
    ctx.fillStyle = "#00ff88";
    ctx.fill();
  });
}

// ── Voice feedback ───────────────────────────────────────────────────────────
function speak(text) {
  if (!window.speechSynthesis) return;
  window.speechSynthesis.cancel();
  const u = new SpeechSynthesisUtterance(text);
  u.rate = 1.1;
  u.volume = 1;
  window.speechSynthesis.speak(u);
}

// ── HUD ──────────────────────────────────────────────────────────────────────
function HUD({ exercise, repState, accuracy, sessionSecs, calories, poseStatus }) {
  const mins = String(Math.floor(sessionSecs / 60)).padStart(2, "0");
  const secs = String(sessionSecs % 60).padStart(2, "0");
  const isPlank = exercise.id === "plank";
  const accColor = accuracy >= 80 ? "#00e676" : accuracy >= 60 ? "#ffa726" : "#ef5350";

  return (
    <div style={{
      position: "absolute", top: 0, left: 0, right: 0,
      background: "linear-gradient(180deg, rgba(5,5,20,0.95) 0%, rgba(5,5,20,0) 100%)",
      padding: "16px 24px", display: "flex", justifyContent: "space-between",
      alignItems: "flex-start", pointerEvents: "none"
    }}>
      <div>
        <div style={{ color: exercise.color, fontSize: 14, fontWeight: 600, letterSpacing: 2 }}>
          {exercise.name.toUpperCase()}
        </div>
        <div style={{ color: "#555", fontSize: 11, marginBottom: 2 }}>{exercise.view}</div>
        <div style={{
          fontSize: 11, marginBottom: 4,
          color: poseStatus === "detecting" ? "#00e676"
               : poseStatus === "loading"   ? "#ffa726" : "#ef5350"
        }}>
          {poseStatus === "detecting" ? "🟢 Pose detected"
         : poseStatus === "loading"   ? "🟡 Loading model..."
         : "🔴 No pose — step back & face camera"}
        </div>
        <div style={{ color: "#888", fontSize: 11 }}>{isPlank ? "SECS" : "REPS"}</div>
        <div style={{ color: "#00ff88", fontSize: 72, fontWeight: 800, lineHeight: 1 }}>
          {repState.reps}
        </div>
        <div style={{
          display: "inline-block", padding: "4px 12px", borderRadius: 20,
          background: repState.current === "DOWN" || repState.current === "HOLD"
            ? "#00b0ff33" : "#ffffff11",
          color: repState.current === "DOWN" || repState.current === "HOLD"
            ? "#00b0ff" : "#888",
          fontSize: 13, fontWeight: 600, marginTop: 4
        }}>
          {repState.current}
        </div>
      </div>
      <div style={{ textAlign: "right" }}>
        <div style={{ marginBottom: 12 }}>
          <div style={{ color: "#555", fontSize: 11 }}>ACCURACY</div>
          <div style={{ color: accColor, fontSize: 28, fontWeight: 700 }}>{accuracy}%</div>
        </div>
        <div style={{ marginBottom: 12 }}>
          <div style={{ color: "#555", fontSize: 11 }}>TIME</div>
          <div style={{ color: "#b39ddb", fontSize: 28, fontWeight: 700 }}>{mins}:{secs}</div>
        </div>
        <div>
          <div style={{ color: "#555", fontSize: 11 }}>CALORIES</div>
          <div style={{ color: "#ff8f00", fontSize: 22, fontWeight: 700 }}>
            {calories.toFixed(1)} kcal
          </div>
        </div>
      </div>
    </div>
  );
}

// ── Main App ─────────────────────────────────────────────────────────────────
export default function App() {
  const [screen, setScreen]           = useState("home");
  const [exercise, setExercise]       = useState(EXERCISES[0]);
  const [repState, setRepState]       = useState({ reps: 0, current: "STANDING" });
  const [feedback, setFeedback]       = useState([]);
  const [accuracy, setAccuracy]       = useState(100);
  const [sessionSecs, setSessionSecs] = useState(0);
  const [calories, setCalories]       = useState(0);
  const [sessions, setSessions]       = useState([]);
  const [stats, setStats]             = useState(null);
  const [poseStatus, setPoseStatus]   = useState("loading");

  const videoRef      = useRef(null);
  const canvasRef     = useRef(null);
  const detectorRef   = useRef(null);
  const stateRef      = useRef({ reps: 0, current: "STANDING" });
  const plankStartRef = useRef(null);
  const activeTimeRef = useRef(0);
  const lastCalRef    = useRef(Date.now());
  const accuracyRef   = useRef({ good: 0, total: 0 });
  const frameLoopRef  = useRef(null);
  const lastRepRef    = useRef(0);
  const runningRef    = useRef(false);

  // Load TensorFlow.js + MoveNet scripts
  useEffect(() => {
    const loadScript = (src) => new Promise((resolve) => {
      const s = document.createElement("script");
      s.src = src;
      s.onload = resolve;
      document.head.appendChild(s);
    });

    (async () => {
      await loadScript("https://cdn.jsdelivr.net/npm/@tensorflow/tfjs-core@4.11.0/dist/tf-core.min.js");
      await loadScript("https://cdn.jsdelivr.net/npm/@tensorflow/tfjs-backend-webgl@4.11.0/dist/tf-backend-webgl.min.js");
      await loadScript("https://cdn.jsdelivr.net/npm/@tensorflow-models/pose-detection@2.1.3/dist/pose-detection.min.js");
      window._tfReady = true;
    })();
  }, []);

  useEffect(() => {
    if (screen !== "workout") return;
    const interval = setInterval(() => {
      setSessionSecs(Math.floor(activeTimeRef.current));
    }, 1000);
    return () => clearInterval(interval);
  }, [screen]);

  const startWorkout = async () => {
    setScreen("workout");
    setRepState({ reps: 0, current: "STANDING" });
    stateRef.current = { reps: 0, current: "STANDING" };
    setFeedback([]);
    setAccuracy(100);
    setSessionSecs(0);
    setCalories(0);
    activeTimeRef.current = 0;
    lastCalRef.current = Date.now();
    accuracyRef.current = { good: 0, total: 0 };
    plankStartRef.current = null;
    lastRepRef.current = 0;
    runningRef.current = true;
    setPoseStatus("loading");

    // Wait for TF scripts to load
    await new Promise(resolve => {
      if (window._tfReady && window.poseDetection) return resolve();
      const check = setInterval(() => {
        if (window._tfReady && window.poseDetection) {
          clearInterval(check);
          resolve();
        }
      }, 200);
    });

    // Init TF WebGL backend
    await window.tf.setBackend("webgl");
    await window.tf.ready();

    // Create MoveNet detector — Lightning variant = fastest
    const detector = await window.poseDetection.createDetector(
      window.poseDetection.SupportedModels.MoveNet,
      {
        modelType: window.poseDetection.movenet.modelType.SINGLEPOSE_LIGHTNING,
        enableSmoothing: true,
      }
    );
    detectorRef.current = detector;

    // Get camera
    let stream;
    try {
      stream = await navigator.mediaDevices.getUserMedia({
        video: { facingMode: { ideal: "user" }, width: { ideal: 640 }, height: { ideal: 480 } }
      });
    } catch (e1) {
      try {
        stream = await navigator.mediaDevices.getUserMedia({ video: true });
      } catch (e2) {
        alert(`Camera error: ${e2.name}: ${e2.message}`);
        setScreen("home");
        return;
      }
    }

    videoRef.current.srcObject = stream;
    await new Promise(resolve => { videoRef.current.onloadedmetadata = resolve; });
    await videoRef.current.play();

    // Detection loop — requestAnimationFrame for smoothness
    const detect = async () => {
      if (!runningRef.current) return;

      const video  = videoRef.current;
      const canvas = canvasRef.current;
      if (!video || !canvas || video.readyState < 2) {
        frameLoopRef.current = requestAnimationFrame(detect);
        return;
      }

      try {
        const poses = await detectorRef.current.estimatePoses(video);
        const ctx = canvas.getContext("2d");
        canvas.width  = video.videoWidth  || 640;
        canvas.height = video.videoHeight || 480;
        ctx.clearRect(0, 0, canvas.width, canvas.height);

        if (!poses || poses.length === 0 || !poses[0].keypoints) {
          setPoseStatus("lost");
          frameLoopRef.current = requestAnimationFrame(detect);
          return;
        }

        const kps = poses[0].keypoints;

        // Check if enough keypoints are confident
        const visibleCount = kps.filter(k => k.score > 0.3).length;
        if (visibleCount < 8) {
          setPoseStatus("lost");
          frameLoopRef.current = requestAnimationFrame(detect);
          return;
        }

        setPoseStatus("detecting");
        drawSkeleton(ctx, kps, canvas.width, canvas.height);

        // Timer + calories
        const now = Date.now();
        const elapsed = (now - lastCalRef.current) / 1000;
        lastCalRef.current = now;
        activeTimeRef.current += elapsed;
        const met = MET_VALUES[exercise.id] || 4;
        setCalories(prev => prev + (met * 70 * elapsed) / 3600);

        // Analyze exercise
        let result;
        const exId = exercise.id;
        if      (exId === "squats")   result = analyzeSquat(kps, stateRef.current);
        else if (exId === "pushups")  result = analyzePushup(kps, stateRef.current);
        else if (exId === "plank") {
          if (!plankStartRef.current) plankStartRef.current = Date.now();
          result = analyzePlank(kps, stateRef.current, plankStartRef.current);
        }
        else result = analyzeCurl(kps, stateRef.current);

        // Voice: new rep
        if (result.reps > lastRepRef.current) {
          speak(`${result.reps}`);
          lastRepRef.current = result.reps;
        }
        // Voice: form tip (every 45 frames)
        if (result.feedback.length > 0 && accuracyRef.current.total % 45 === 0) {
          speak(result.feedback[0]);
        }

        stateRef.current = result;
        setRepState({ reps: result.reps, current: result.current });
        setFeedback(result.feedback);

        accuracyRef.current.total++;
        if (result.feedback.length === 0) accuracyRef.current.good++;
        setAccuracy(Math.round(
          (accuracyRef.current.good / accuracyRef.current.total) * 100
        ));

        // Draw angle label
        const anchorKp = kps[KP.LEFT_KNEE];
        if (result.angle && anchorKp && anchorKp.score > 0.3) {
          ctx.fillStyle = "#ffeb3b";
          ctx.font = "bold 18px Arial";
          ctx.fillText(
            `${result.label}: ${result.angle}°`,
            anchorKp.x * canvas.width + 10,
            anchorKp.y * canvas.height
          );
        }
      } catch (e) {
        // ignore detection errors
      }

      frameLoopRef.current = requestAnimationFrame(detect);
    };

    detect();
  };

  const endWorkout = async () => {
    runningRef.current = false;
    if (frameLoopRef.current) {
      cancelAnimationFrame(frameLoopRef.current);
      frameLoopRef.current = null;
    }
    const stream = videoRef.current?.srcObject;
    stream?.getTracks().forEach(t => t.stop());
    detectorRef.current?.dispose();
    window.speechSynthesis?.cancel();

    try {
      await axios.post(`${API}/sessions/`, {
        exercise: exercise.name,
        reps: stateRef.current.reps,
        duration: Math.floor(activeTimeRef.current),
        accuracy: accuracy,
        calories: parseFloat(calories.toFixed(1)),
      });
    } catch (e) {
      console.log("API save failed:", e);
    }
    setScreen("home");
  };

  const loadHistory = async () => {
    setScreen("history");
    try {
      const [s, st] = await Promise.all([
        axios.get(`${API}/sessions/?limit=20`),
        axios.get(`${API}/sessions/stats`)
      ]);
      setSessions(s.data);
      setStats(st.data);
    } catch (e) {
      console.log("Load failed:", e);
    }
  };

  const fmtTime = (s) => `${Math.floor(s / 60)}m ${s % 60}s`;
  const accColor = (a) => a >= 80 ? "#00e676" : a >= 60 ? "#ffa726" : "#ef5350";

  const baseStyle = {
    minHeight: "100vh", background: "#0a0a12", color: "#fff",
    fontFamily: "'Segoe UI', sans-serif"
  };

  // HOME SCREEN
  if (screen === "home") return (
    <div style={{ ...baseStyle, display: "flex", flexDirection: "column",
                  alignItems: "center", padding: "40px 20px" }}>
      <div style={{ fontSize: 48, marginBottom: 8 }}>💪</div>
      <h1 style={{ color: "#00e5ff", margin: 0, fontSize: 28 }}>Smart Gym Trainer</h1>
      <p style={{ color: "#555", marginBottom: 40 }}>AI-powered workout assistant</p>

      <div style={{ width: "100%", maxWidth: 500, marginBottom: 32 }}>
        <div style={{ color: "#888", fontSize: 12, marginBottom: 12, letterSpacing: 2 }}>
          SELECT EXERCISE
        </div>
        <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 12 }}>
          {EXERCISES.map(ex => (
            <div key={ex.id} onClick={() => setExercise(ex)} style={{
              padding: "16px", borderRadius: 12, cursor: "pointer",
              border: `2px solid ${exercise.id === ex.id ? ex.color : "#1e1e2e"}`,
              background: exercise.id === ex.id ? `${ex.color}15` : "#13131f",
              transition: "all 0.2s"
            }}>
              <div style={{ color: ex.color, fontWeight: 600, marginBottom: 4 }}>{ex.name}</div>
              <div style={{ color: "#555", fontSize: 12 }}>{ex.view}</div>
            </div>
          ))}
        </div>
      </div>

      <div style={{
        width: "100%", maxWidth: 500, background: "#13131f",
        borderRadius: 12, padding: "14px 18px", marginBottom: 24,
        border: "1px solid #1e1e2e", fontSize: 13, color: "#888"
      }}>
        📷 <strong style={{ color: "#aaa" }}>Camera tip:</strong> Position yourself{" "}
        {exercise.view === "Side View"
          ? "sideways — right side facing camera, 2-3m away"
          : "facing the camera directly, 2-3m away"}
      </div>

      <button onClick={startWorkout} style={{
        width: "100%", maxWidth: 500, padding: "18px",
        background: "linear-gradient(135deg, #00b0ff, #00e5ff)",
        border: "none", borderRadius: 14, color: "#000",
        fontSize: 18, fontWeight: 700, cursor: "pointer", marginBottom: 12
      }}>
        🎯 Start {exercise.name}
      </button>

      <button onClick={loadHistory} style={{
        width: "100%", maxWidth: 500, padding: "14px",
        background: "#13131f", border: "1px solid #1e1e2e",
        borderRadius: 14, color: "#888", fontSize: 14, cursor: "pointer"
      }}>
        📊 View Workout History
      </button>
    </div>
  );

  // WORKOUT SCREEN
  if (screen === "workout") return (
    <div style={{ ...baseStyle, position: "relative", overflow: "hidden" }}>
      <video ref={videoRef} style={{
        width: "100%", height: "100vh", objectFit: "cover",
        transform: "scaleX(-1)"
      }} playsInline muted />

      <canvas ref={canvasRef} style={{
        position: "absolute", top: 0, left: 0,
        width: "100%", height: "100%",
        transform: "scaleX(-1)"
      }} />

      <HUD exercise={exercise} repState={repState}
           accuracy={accuracy} sessionSecs={sessionSecs}
           calories={calories} poseStatus={poseStatus} />

      {feedback.length > 0 && (
        <div style={{
          position: "absolute", top: "45%", left: "50%",
          transform: "translate(-50%, -50%)",
          display: "flex", flexDirection: "column", gap: 8,
          pointerEvents: "none"
        }}>
          {feedback.map((msg, i) => (
            <div key={i} style={{
              background: "rgba(200,0,0,0.85)", padding: "10px 20px",
              borderRadius: 8, fontSize: 16, fontWeight: 600,
              textAlign: "center", border: "1px solid #ff4444"
            }}>
              ⚠️ {msg}
            </div>
          ))}
        </div>
      )}

      <div style={{
        position: "absolute", bottom: 20, left: "50%",
        transform: "translateX(-50%)", display: "flex", gap: 8
      }}>
        {EXERCISES.map(ex => (
          <button key={ex.id} onClick={() => {
            setExercise(ex);
            stateRef.current = { reps: 0, current: "STANDING" };
            setRepState({ reps: 0, current: "STANDING" });
            accuracyRef.current = { good: 0, total: 0 };
            lastRepRef.current = 0;
          }} style={{
            padding: "8px 14px", borderRadius: 20,
            border: `1px solid ${exercise.id === ex.id ? ex.color : "#333"}`,
            background: exercise.id === ex.id ? `${ex.color}22` : "rgba(0,0,0,0.6)",
            color: exercise.id === ex.id ? ex.color : "#888",
            fontSize: 12, cursor: "pointer", fontWeight: 600
          }}>
            {ex.name}
          </button>
        ))}
      </div>

      <button onClick={endWorkout} style={{
        position: "absolute", top: 20, right: 20,
        padding: "10px 20px", background: "rgba(200,0,0,0.8)",
        border: "none", borderRadius: 10, color: "#fff",
        fontSize: 14, cursor: "pointer", fontWeight: 600
      }}>
        ✕ End Workout
      </button>
    </div>
  );

  // HISTORY SCREEN
  if (screen === "history") return (
    <div style={{ ...baseStyle, padding: "24px 20px" }}>
      <div style={{ display: "flex", alignItems: "center", gap: 12, marginBottom: 24 }}>
        <button onClick={() => setScreen("home")} style={{
          background: "#13131f", border: "1px solid #1e1e2e",
          borderRadius: 8, color: "#888", padding: "8px 14px",
          cursor: "pointer", fontSize: 14
        }}>← Back</button>
        <h2 style={{ margin: 0, color: "#00e5ff" }}>Workout History</h2>
      </div>

      {stats && (
        <div style={{ display: "grid", gridTemplateColumns: "repeat(3, 1fr)",
                      gap: 10, marginBottom: 24 }}>
          {[
            ["Sessions", stats.total_sessions, ""],
            ["Total Reps", stats.total_reps, ""],
            ["Avg Accuracy", stats.average_accuracy, "%"],
            ["Best", stats.best_accuracy, "%"],
            ["Time", fmtTime(stats.total_duration), ""],
            ["Calories", stats.total_calories, " kcal"],
          ].map(([label, val, unit]) => (
            <div key={label} style={{
              background: "#13131f", borderRadius: 10,
              padding: "12px", textAlign: "center"
            }}>
              <div style={{ color: "#555", fontSize: 10, marginBottom: 4 }}>
                {label.toUpperCase()}
              </div>
              <div style={{ color: "#00e5ff", fontSize: 18, fontWeight: 700 }}>
                {val}{unit}
              </div>
            </div>
          ))}
        </div>
      )}

      {sessions.length === 0 ? (
        <div style={{ textAlign: "center", color: "#555", padding: 40 }}>
          No sessions yet. Complete a workout first!
        </div>
      ) : (
        sessions.map(s => (
          <div key={s.id} style={{
            background: "#13131f", borderRadius: 12,
            padding: "14px 16px", marginBottom: 10,
            display: "flex", justifyContent: "space-between", alignItems: "center"
          }}>
            <div>
              <div style={{ fontWeight: 600, marginBottom: 4 }}>{s.exercise}</div>
              <div style={{ color: "#555", fontSize: 12 }}>
                {new Date(s.created_at).toLocaleDateString()}
              </div>
            </div>
            <div style={{ display: "flex", gap: 16, textAlign: "center" }}>
              <div>
                <div style={{ color: "#00e676", fontWeight: 700 }}>{s.reps}</div>
                <div style={{ color: "#555", fontSize: 11 }}>reps</div>
              </div>
              <div>
                <div style={{ color: accColor(s.accuracy), fontWeight: 700 }}>
                  {s.accuracy}%
                </div>
                <div style={{ color: "#555", fontSize: 11 }}>accuracy</div>
              </div>
              <div>
                <div style={{ color: "#ff8f00", fontWeight: 700 }}>
                  {s.calories?.toFixed(1)}
                </div>
                <div style={{ color: "#555", fontSize: 11 }}>kcal</div>
              </div>
            </div>
          </div>
        ))
      )}
    </div>
  );
}