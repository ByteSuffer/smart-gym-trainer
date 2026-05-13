// import React, { useState, useEffect } from "react";
// import axios from "axios";
// import {
//   BarChart, Bar, XAxis, YAxis, CartesianGrid,
//   Tooltip, ResponsiveContainer, LineChart, Line, Legend
// } from "recharts";

// const API = process.env.REACT_APP_API_URL || "http://localhost:8000";

// // ── Color helpers ────────────────────────────────────────────────────────────
// const accColor = (acc) =>
//   acc >= 80 ? "#00e676" : acc >= 60 ? "#ffa726" : "#ef5350";

// const EXERCISE_COLORS = {
//   Squats: "#00b0ff",
//   "Push-ups": "#ff4081",
//   Plank: "#69f0ae",
//   "Bicep Curls": "#ffeb3b",
// };

// // ── Stat Card ────────────────────────────────────────────────────────────────
// function StatCard({ title, value, unit, color }) {
//   return (
//     <div style={{
//       background: "#1e1e2e", borderRadius: 12, padding: "20px 24px",
//       flex: 1, minWidth: 140, borderLeft: `4px solid ${color}`
//     }}>
//       <div style={{ color: "#888", fontSize: 12, marginBottom: 6 }}>{title}</div>
//       <div style={{ color, fontSize: 32, fontWeight: 700 }}>
//         {value}<span style={{ fontSize: 14, color: "#888", marginLeft: 4 }}>{unit}</span>
//       </div>
//     </div>
//   );
// }

// // ── Main App ─────────────────────────────────────────────────────────────────
// export default function App() {
//   const [sessions, setSessions]   = useState([]);
//   const [stats, setStats]         = useState(null);
//   const [filter, setFilter]       = useState("All");
//   const [loading, setLoading]     = useState(true);
//   const [lastUpdated, setLastUpdated] = useState(null);

//   const exercises = ["All", "Squats", "Push-ups", "Plank", "Bicep Curls"];

//   const fetchData = async () => {
//     try {
//       const exercise = filter === "All" ? "" : filter;
//       const [sessRes, statsRes] = await Promise.all([
//         axios.get(`${API}/sessions/`, { params: { exercise, limit: 50 } }),
//         axios.get(`${API}/sessions/stats`, { params: { exercise } })
//       ]);
//       setSessions(sessRes.data);
//       setStats(statsRes.data);
//       setLastUpdated(new Date().toLocaleTimeString());
//     } catch (e) {
//       console.error("API error:", e);
//     } finally {
//       setLoading(false);
//     }
//   };

//   useEffect(() => { fetchData(); }, [filter]);

//   // Auto-refresh every 30 seconds
//   useEffect(() => {
//     const interval = setInterval(fetchData, 30000);
//     return () => clearInterval(interval);
//   }, [filter]);

//   // Chart data — last 20 sessions reversed (oldest first)
//   const chartData = [...sessions].reverse().slice(-20).map((s, i) => ({
//     name: `#${s.id}`,
//     reps: s.reps,
//     accuracy: s.accuracy,
//     exercise: s.exercise,
//     duration: s.duration,
//   }));

//   // Per-exercise best accuracy
//   const exerciseStats = exercises.slice(1).map(ex => {
//     const exSessions = sessions.filter(s => s.exercise === ex);
//     return {
//       name: ex,
//       sessions: exSessions.length,
//       avgAccuracy: exSessions.length
//         ? Math.round(exSessions.reduce((a, s) => a + s.accuracy, 0) / exSessions.length)
//         : 0,
//       totalReps: exSessions.reduce((a, s) => a + s.reps, 0),
//     };
//   }).filter(e => e.sessions > 0);

//   const fmtDuration = (secs) => {
//     if (secs < 60) return `${secs}s`;
//     return `${Math.floor(secs / 60)}m ${secs % 60}s`;
//   };

//   return (
//     <div style={{
//       minHeight: "100vh", background: "#13131f", color: "#fff",
//       fontFamily: "'Segoe UI', sans-serif", padding: "24px 32px"
//     }}>

//       {/* ── Header ── */}
//       <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 28 }}>
//         <div>
//           <h1 style={{ margin: 0, fontSize: 26, color: "#00e5ff" }}>
//             💪 Smart Gym Trainer
//           </h1>
//           <div style={{ color: "#555", fontSize: 13, marginTop: 4 }}>
//             Workout Dashboard
//             {lastUpdated && <span style={{ marginLeft: 12 }}>Last updated: {lastUpdated}</span>}
//           </div>
//         </div>
//         <button onClick={fetchData} style={{
//           background: "#00b0ff22", border: "1px solid #00b0ff",
//           color: "#00b0ff", borderRadius: 8, padding: "8px 18px",
//           cursor: "pointer", fontSize: 13
//         }}>
//           🔄 Refresh
//         </button>
//       </div>

//       {/* ── Filter tabs ── */}
//       <div style={{ display: "flex", gap: 8, marginBottom: 24, flexWrap: "wrap" }}>
//         {exercises.map(ex => (
//           <button key={ex} onClick={() => setFilter(ex)} style={{
//             padding: "6px 16px", borderRadius: 20, cursor: "pointer",
//             border: filter === ex ? "none" : "1px solid #333",
//             background: filter === ex ? "#00b0ff" : "#1e1e2e",
//             color: filter === ex ? "#000" : "#aaa",
//             fontWeight: filter === ex ? 700 : 400, fontSize: 13
//           }}>
//             {ex}
//           </button>
//         ))}
//       </div>

//       {loading ? (
//         <div style={{ textAlign: "center", color: "#555", padding: 60 }}>Loading...</div>
//       ) : (
//         <>
//           {/* ── Stat cards ── */}
//           {stats && (
//             <div style={{ display: "flex", gap: 16, marginBottom: 28, flexWrap: "wrap" }}>
//               <StatCard title="TOTAL SESSIONS" value={stats.total_sessions}  unit="sessions" color="#00b0ff" />
//               <StatCard title="TOTAL REPS"     value={stats.total_reps}      unit="reps"     color="#00e676" />
//               <StatCard title="AVG ACCURACY"   value={stats.average_accuracy} unit="%"       color={accColor(stats.average_accuracy)} />
//               <StatCard title="BEST ACCURACY"  value={stats.best_accuracy}   unit="%"        color="#ffd740" />
//               <StatCard title="TOTAL TIME"     value={fmtDuration(stats.total_duration)} unit="" color="#ea80fc" />
//               <StatCard title="CALORIES BURNED" value={stats.total_calories} unit="kcal"    color="#ff6d00" />
//             </div>
//           )}

//           {/* ── Charts row ── */}
//           {chartData.length > 0 && (
//             <div style={{ display: "flex", gap: 20, marginBottom: 28, flexWrap: "wrap" }}>

//               {/* Reps bar chart */}
//               <div style={{ background: "#1e1e2e", borderRadius: 12, padding: 20, flex: 2, minWidth: 300 }}>
//                 <div style={{ color: "#888", fontSize: 13, marginBottom: 14 }}>REPS PER SESSION</div>
//                 <ResponsiveContainer width="100%" height={200}>
//                   <BarChart data={chartData}>
//                     <CartesianGrid strokeDasharray="3 3" stroke="#2a2a3e" />
//                     <XAxis dataKey="name" tick={{ fill: "#555", fontSize: 11 }} />
//                     <YAxis tick={{ fill: "#555", fontSize: 11 }} />
//                     <Tooltip
//                       contentStyle={{ background: "#1e1e2e", border: "1px solid #333" }}
//                       formatter={(v, n, p) => [v, p.payload.exercise]}
//                     />
//                     <Bar dataKey="reps" fill="#00b0ff" radius={[4, 4, 0, 0]} />
//                   </BarChart>
//                 </ResponsiveContainer>
//               </div>

//               {/* Accuracy line chart */}
//               <div style={{ background: "#1e1e2e", borderRadius: 12, padding: 20, flex: 2, minWidth: 300 }}>
//                 <div style={{ color: "#888", fontSize: 13, marginBottom: 14 }}>ACCURACY TREND</div>
//                 <ResponsiveContainer width="100%" height={200}>
//                   <LineChart data={chartData}>
//                     <CartesianGrid strokeDasharray="3 3" stroke="#2a2a3e" />
//                     <XAxis dataKey="name" tick={{ fill: "#555", fontSize: 11 }} />
//                     <YAxis domain={[0, 100]} tick={{ fill: "#555", fontSize: 11 }} />
//                     <Tooltip contentStyle={{ background: "#1e1e2e", border: "1px solid #333" }} />
//                     <Line type="monotone" dataKey="accuracy" stroke="#00e676"
//                           strokeWidth={2} dot={{ fill: "#00e676", r: 3 }} />
//                   </LineChart>
//                 </ResponsiveContainer>
//               </div>
//             </div>
//           )}

//           {/* ── Per exercise breakdown ── */}
//           {exerciseStats.length > 0 && (
//             <div style={{ background: "#1e1e2e", borderRadius: 12, padding: 20, marginBottom: 28 }}>
//               <div style={{ color: "#888", fontSize: 13, marginBottom: 16 }}>EXERCISE BREAKDOWN</div>
//               <div style={{ display: "flex", gap: 16, flexWrap: "wrap" }}>
//                 {exerciseStats.map(ex => (
//                   <div key={ex.name} style={{
//                     flex: 1, minWidth: 160, background: "#13131f",
//                     borderRadius: 10, padding: "14px 18px",
//                     borderTop: `3px solid ${EXERCISE_COLORS[ex.name] || "#00b0ff"}`
//                   }}>
//                     <div style={{ fontWeight: 600, marginBottom: 10,
//                                   color: EXERCISE_COLORS[ex.name] || "#fff" }}>
//                       {ex.name}
//                     </div>
//                     <div style={{ fontSize: 12, color: "#888", lineHeight: 2 }}>
//                       <div>Sessions: <span style={{ color: "#fff" }}>{ex.sessions}</span></div>
//                       <div>Total Reps: <span style={{ color: "#fff" }}>{ex.totalReps}</span></div>
//                       <div>Avg Accuracy: <span style={{ color: accColor(ex.avgAccuracy) }}>
//                         {ex.avgAccuracy}%
//                       </span></div>
//                     </div>
//                   </div>
//                 ))}
//               </div>
//             </div>
//           )}

//           {/* ── Session history table ── */}
//           <div style={{ background: "#1e1e2e", borderRadius: 12, padding: 20 }}>
//             <div style={{ color: "#888", fontSize: 13, marginBottom: 16 }}>
//               WORKOUT HISTORY
//               <span style={{ marginLeft: 10, color: "#555" }}>({sessions.length} sessions)</span>
//             </div>
//             {sessions.length === 0 ? (
//               <div style={{ color: "#555", textAlign: "center", padding: 40 }}>
//                 No sessions yet. Complete a workout to see history!
//               </div>
//             ) : (
//               <table style={{ width: "100%", borderCollapse: "collapse", fontSize: 14 }}>
//                 <thead>
//                   <tr style={{ color: "#555", textAlign: "left" }}>
//                     {["#", "Exercise", "Reps", "Duration", "Accuracy", "Calories","Date"].map(h => (
//                       <th key={h} style={{ padding: "8px 12px", borderBottom: "1px solid #2a2a3e" }}>
//                         {h}
//                       </th>
//                     ))}
//                   </tr>
//                 </thead>
//                 <tbody>
//                   {sessions.map((s, i) => (
//                     <tr key={s.id} style={{
//                       borderBottom: "1px solid #1a1a2e",
//                       background: i % 2 === 0 ? "#13131f" : "transparent"
//                     }}>
//                       <td style={{ padding: "10px 12px", color: "#555" }}>{s.id}</td>
//                       <td style={{ padding: "10px 12px" }}>
//                         <span style={{
//                           background: `${EXERCISE_COLORS[s.exercise]}22`,
//                           color: EXERCISE_COLORS[s.exercise] || "#fff",
//                           padding: "2px 10px", borderRadius: 12, fontSize: 12
//                         }}>
//                           {s.exercise}
//                         </span>
//                       </td>
//                       <td style={{ padding: "10px 12px", color: "#00e676" }}>{s.reps}</td>
//                       <td style={{ padding: "10px 12px", color: "#ea80fc" }}>{fmtDuration(s.duration)}</td>
//                       <td style={{ padding: "10px 12px", color: accColor(s.accuracy) }}>
//                         {s.accuracy}%
//                       </td>
//                       <td style={{ padding: "10px 12px", color: "#ff6d00" }}>
//                         {s.calories?.toFixed(1) ?? "0.0"} kcal
//                       </td>
//                       <td style={{ padding: "10px 12px", color: "#555", fontSize: 12 }}>
//                         {new Date(s.created_at).toLocaleString()}
//                       </td>
//                     </tr>
//                   ))}
//                 </tbody>
//               </table>
//             )}
//           </div>
//         </>
//       )}
//     </div>
//   );
// }


import React, { useState, useEffect, useRef } from "react";
import axios from "axios";

const API = process.env.REACT_APP_API_URL || "http://localhost:8000";

const EXERCISES = [
  { id: "squats",      name: "Squats",       view: "Side View",  key: "1", color: "#00b0ff" },
  { id: "pushups",     name: "Push-ups",     view: "Side View",  key: "2", color: "#ff4081" },
  { id: "plank",       name: "Plank",        view: "Side View",  key: "3", color: "#69f0ae" },
  { id: "bicepcurls",  name: "Bicep Curls",  view: "Front View", key: "4", color: "#ffd740" },
];

const MET_VALUES = {
  squats: 5.0, pushups: 8.0, plank: 4.0, bicepcurls: 3.0
};

// ── Angle calculator ────────────────────────────────────────────────────────
function calcAngle(a, b, c) {
  const radians = Math.atan2(c.y - b.y, c.x - b.x)
                - Math.atan2(a.y - b.y, a.x - b.x);
  let angle = Math.abs(radians * 180 / Math.PI);
  if (angle > 180) angle = 360 - angle;
  return Math.round(angle);
}

// ── Exercise analyzers ──────────────────────────────────────────────────────
function analyzeSquat(lm, state) {
  const knee = calcAngle(lm[23], lm[25], lm[27]);   // hip→knee→ankle
  const feedback = [];
  let newState = state.current;
  let reps = state.reps;

  if (knee < 100 && state.current === "STANDING") {
    newState = "DOWN";
  }
  if (knee > 160 && state.current === "DOWN") {
    newState = "STANDING";
    reps += 1;
  }
  if (knee < 90) feedback.push("Good depth! Keep going");
  if (knee > 100 && state.current === "DOWN") feedback.push("Go lower!");

  return { reps, current: newState, feedback, angle: knee, label: "Knee" };
}

function analyzePushup(lm, state) {
  const elbow = calcAngle(lm[11], lm[13], lm[15]);  // shoulder→elbow→wrist
  const feedback = [];
  let newState = state.current;
  let reps = state.reps;

  if (elbow < 90 && state.current === "UP") newState = "DOWN";
  if (elbow > 160 && state.current === "DOWN") {
    newState = "UP";
    reps += 1;
  }

  // Hip sag check
  const hipY = lm[23].y;
  const shoulderY = lm[11].y;
  const ankleY = lm[27].y;
  if (Math.abs(hipY - (shoulderY + ankleY) / 2) > 0.05)
    feedback.push("Keep body straight!");

  return { reps, current: newState, feedback, angle: elbow, label: "Elbow" };
}

function analyzePlank(lm, state, startTime) {
  const body = calcAngle(lm[11], lm[23], lm[27]);   // shoulder→hip→ankle
  const feedback = [];
  let duration = state.reps;
  let newState = state.current;

  if (body > 150) {
    newState = "HOLD";
    duration = startTime ? Math.floor((Date.now() - startTime) / 1000) : 0;
  } else {
    newState = "REST";
    if (lm[23].y < lm[11].y - 0.05) feedback.push("Lower your hips!");
    if (lm[23].y > lm[27].y + 0.05) feedback.push("Raise your hips!");
  }

  return { reps: duration, current: newState, feedback, angle: body, label: "Body" };
}

function analyzeCurl(lm, state) {
  const leftElbow  = calcAngle(lm[11], lm[13], lm[15]);
  const rightElbow = calcAngle(lm[12], lm[14], lm[16]);
  const elbow = Math.round((leftElbow + rightElbow) / 2);
  const feedback = [];
  let newState = state.current;
  let reps = state.reps;

  if (elbow < 50 && state.current === "DOWN") newState = "UP";
  if (elbow > 150 && state.current === "UP") {
    newState = "DOWN";
    reps += 1;
  }

  const leftDrift  = Math.abs(lm[13].x - lm[23].x);
  const rightDrift = Math.abs(lm[14].x - lm[24].x);
  if ((leftDrift + rightDrift) / 2 > 0.15)
    feedback.push("Keep elbows close!");

  return { reps, current: newState, feedback, angle: elbow, label: "Elbow" };
}

// ── Draw skeleton on canvas ─────────────────────────────────────────────────
const CONNECTIONS = [
  [11,12],[11,13],[13,15],[12,14],[14,16],
  [11,23],[12,24],[23,24],[23,25],[24,26],
  [25,27],[26,28],[27,29],[28,30]
];

function drawSkeleton(ctx, landmarks, w, h) {
  ctx.strokeStyle = "#00e5ff";
  ctx.lineWidth = 3;
  CONNECTIONS.forEach(([a, b]) => {
    if (!landmarks[a] || !landmarks[b]) return;
    ctx.beginPath();
    ctx.moveTo(landmarks[a].x * w, landmarks[a].y * h);
    ctx.lineTo(landmarks[b].x * w, landmarks[b].y * h);
    ctx.stroke();
  });
  landmarks.forEach(lm => {
    if (!lm) return;
    ctx.beginPath();
    ctx.arc(lm.x * w, lm.y * h, 5, 0, 2 * Math.PI);
    ctx.fillStyle = "#00ff88";
    ctx.fill();
  });
}

// ── HUD overlay ─────────────────────────────────────────────────────────────
function HUD({ exercise, repState, accuracy, sessionSecs, calories }) {
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
      {/* Left — exercise + reps */}
      <div>
        <div style={{ color: exercise.color, fontSize: 14, fontWeight: 600, letterSpacing: 2 }}>
          {exercise.name.toUpperCase()}
        </div>
        <div style={{ color: "#555", fontSize: 11, marginBottom: 4 }}>{exercise.view}</div>
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

      {/* Right — stats */}
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
  const [screen, setScreen]           = useState("home");    // home | workout | history
  const [exercise, setExercise]       = useState(EXERCISES[0]);
  const [repState, setRepState]       = useState({ reps: 0, current: "STANDING" });
  const [feedback, setFeedback]       = useState([]);
  const [accuracy, setAccuracy]       = useState(100);
  const [sessionSecs, setSessionSecs] = useState(0);
  const [calories, setCalories]       = useState(0);
  const [poseReady, setPoseReady]     = useState(false);
  const [sessions, setSessions]       = useState([]);
  const [stats, setStats]             = useState(null);

  const videoRef     = useRef(null);
  const canvasRef    = useRef(null);
  const poseRef      = useRef(null);
  const stateRef     = useRef({ reps: 0, current: "STANDING" });
  const startTimeRef = useRef(null);
  const plankStartRef= useRef(null);
  const activeTimeRef= useRef(0);
  const lastCalRef   = useRef(Date.now());
  const accuracyRef  = useRef({ good: 0, total: 0 });

  // ── Load MediaPipe from CDN ────────────────────────────────────────
  useEffect(() => {
    const script1 = document.createElement("script");
    script1.src = "https://cdn.jsdelivr.net/npm/@mediapipe/camera_utils/camera_utils.js";
    script1.crossOrigin = "anonymous";
    document.head.appendChild(script1);

    const script2 = document.createElement("script");
    script2.src = "https://cdn.jsdelivr.net/npm/@mediapipe/pose/pose.js";
    script2.crossOrigin = "anonymous";
    document.head.appendChild(script2);

    script2.onload = () => setPoseReady(true);
  }, []);

  // ── Session timer ──────────────────────────────────────────────────
  useEffect(() => {
    if (screen !== "workout") return;
    const interval = setInterval(() => {
      setSessionSecs(Math.floor(activeTimeRef.current));
    }, 1000);
    return () => clearInterval(interval);
  }, [screen]);

  // ── Start workout ──────────────────────────────────────────────────
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
    startTimeRef.current = Date.now();
    plankStartRef.current = null;

    // Wait for poseReady
    await new Promise(resolve => {
      if (poseReady) return resolve();
      const check = setInterval(() => {
        if (window.Pose) { clearInterval(check); resolve(); }
      }, 200);
    });

    const pose = new window.Pose({
      locateFile: (file) =>
        `https://cdn.jsdelivr.net/npm/@mediapipe/pose/${file}`
    });

    pose.setOptions({
      modelComplexity: 1,
      smoothLandmarks: true,
      minDetectionConfidence: 0.6,
      minTrackingConfidence: 0.6,
    });

    pose.onResults((results) => {
      const canvas = canvasRef.current;
      const video  = videoRef.current;
      if (!canvas || !video) return;

      const ctx = canvas.getContext("2d");
      canvas.width  = video.videoWidth  || 640;
      canvas.height = video.videoHeight || 480;

      ctx.clearRect(0, 0, canvas.width, canvas.height);

      if (!results.poseLandmarks) return;

      const lm = results.poseLandmarks;
      drawSkeleton(ctx, lm, canvas.width, canvas.height);

      // Update timer + calories
      const now = Date.now();
      const elapsed = (now - lastCalRef.current) / 1000;
      lastCalRef.current = now;
      activeTimeRef.current += elapsed;
      const met = MET_VALUES[exercise.id] || 4;
      setCalories(prev => prev + (met * 70 * elapsed) / 3600);

      // Analyze exercise
      let result;
      if (exercise.id === "squats")     result = analyzeSquat(lm, stateRef.current);
      else if (exercise.id === "pushups") result = analyzePushup(lm, stateRef.current);
      else if (exercise.id === "plank") {
        if (!plankStartRef.current) plankStartRef.current = Date.now();
        result = analyzePlank(lm, stateRef.current, plankStartRef.current);
      }
      else result = analyzeCurl(lm, stateRef.current);

      stateRef.current = result;
      setRepState({ reps: result.reps, current: result.current });
      setFeedback(result.feedback);

      // Accuracy
      accuracyRef.current.total++;
      if (result.feedback.length === 0) accuracyRef.current.good++;
      const acc = Math.round(
        (accuracyRef.current.good / accuracyRef.current.total) * 100
      );
      setAccuracy(acc);

      // Draw angle
      if (result.angle && lm[25]) {
        ctx.fillStyle = "#ffeb3b";
        ctx.font = "bold 18px Arial";
        ctx.fillText(
          `${result.label}: ${result.angle}°`,
          lm[25].x * canvas.width + 10,
          lm[25].y * canvas.height
        );
      }
    });

    poseRef.current = pose;

    const stream = await navigator.mediaDevices.getUserMedia({
      video: { facingMode: "environment", width: 640, height: 480 }
    });
    videoRef.current.srcObject = stream;
    videoRef.current.play();

    const camera = new window.Camera(videoRef.current, {
      onFrame: async () => {
        await pose.send({ image: videoRef.current });
      },
      width: 640,
      height: 480,
    });
    camera.start();
  };

  // ── End workout ────────────────────────────────────────────────────
  const endWorkout = async () => {
    // Stop camera
    const stream = videoRef.current?.srcObject;
    stream?.getTracks().forEach(t => t.stop());
    poseRef.current?.close();

    // Save to API
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

  // ── Load history ───────────────────────────────────────────────────
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

  const fmtTime = (s) => `${Math.floor(s/60)}m ${s%60}s`;
  const accColor = (a) => a >= 80 ? "#00e676" : a >= 60 ? "#ffa726" : "#ef5350";

  // ── Screens ────────────────────────────────────────────────────────
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

      {/* Exercise picker */}
      <div style={{ width: "100%", maxWidth: 500, marginBottom: 32 }}>
        <div style={{ color: "#888", fontSize: 12, marginBottom: 12,
                      letterSpacing: 2 }}>SELECT EXERCISE</div>
        <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 12 }}>
          {EXERCISES.map(ex => (
            <div key={ex.id} onClick={() => setExercise(ex)} style={{
              padding: "16px", borderRadius: 12, cursor: "pointer",
              border: `2px solid ${exercise.id === ex.id ? ex.color : "#1e1e2e"}`,
              background: exercise.id === ex.id ? `${ex.color}15` : "#13131f",
              transition: "all 0.2s"
            }}>
              <div style={{ color: ex.color, fontWeight: 600, marginBottom: 4 }}>
                {ex.name}
              </div>
              <div style={{ color: "#555", fontSize: 12 }}>{ex.view}</div>
            </div>
          ))}
        </div>
      </div>

      {/* Camera tip */}
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

      {/* Start button */}
      <button onClick={startWorkout} style={{
        width: "100%", maxWidth: 500, padding: "18px",
        background: "linear-gradient(135deg, #00b0ff, #00e5ff)",
        border: "none", borderRadius: 14, color: "#000",
        fontSize: 18, fontWeight: 700, cursor: "pointer",
        marginBottom: 12
      }}>
        🎯 Start {exercise.name}
      </button>

      <button onClick={loadHistory} style={{
        width: "100%", maxWidth: 500, padding: "14px",
        background: "#13131f", border: "1px solid #1e1e2e",
        borderRadius: 14, color: "#888", fontSize: 14,
        cursor: "pointer"
      }}>
        📊 View Workout History
      </button>
    </div>
  );

  // WORKOUT SCREEN
  if (screen === "workout") return (
    <div style={{ ...baseStyle, position: "relative", overflow: "hidden" }}>
      {/* Video */}
      <video ref={videoRef} style={{
        width: "100%", height: "100vh", objectFit: "cover",
        transform: "scaleX(-1)"   // mirror
      }} playsInline muted />

      {/* Canvas overlay */}
      <canvas ref={canvasRef} style={{
        position: "absolute", top: 0, left: 0,
        width: "100%", height: "100%",
        transform: "scaleX(-1)"
      }} />

      {/* HUD */}
      <HUD exercise={exercise} repState={repState}
           accuracy={accuracy} sessionSecs={sessionSecs}
           calories={calories} />

      {/* Feedback warnings */}
      {feedback.length > 0 && (
        <div style={{
          position: "absolute", top: "45%", left: "50%",
          transform: "translate(-50%, -50%)",
          display: "flex", flexDirection: "column", gap: 8,
          pointerEvents: "none"
        }}>
          {feedback.map((msg, i) => (
            <div key={i} style={{
              background: "rgba(200, 0, 0, 0.85)",
              padding: "10px 20px", borderRadius: 8,
              fontSize: 16, fontWeight: 600, textAlign: "center",
              border: "1px solid #ff4444"
            }}>
              ⚠️ {msg}
            </div>
          ))}
        </div>
      )}

      {/* Exercise switcher */}
      <div style={{
        position: "absolute", bottom: 20, left: "50%",
        transform: "translateX(-50%)",
        display: "flex", gap: 8
      }}>
        {EXERCISES.map(ex => (
          <button key={ex.id} onClick={() => {
            setExercise(ex);
            stateRef.current = { reps: 0, current: "STANDING" };
            setRepState({ reps: 0, current: "STANDING" });
            accuracyRef.current = { good: 0, total: 0 };
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

      {/* End button */}
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
      <div style={{ display: "flex", alignItems: "center",
                    gap: 12, marginBottom: 24 }}>
        <button onClick={() => setScreen("home")} style={{
          background: "#13131f", border: "1px solid #1e1e2e",
          borderRadius: 8, color: "#888", padding: "8px 14px",
          cursor: "pointer", fontSize: 14
        }}>← Back</button>
        <h2 style={{ margin: 0, color: "#00e5ff" }}>Workout History</h2>
      </div>

      {/* Stats */}
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
              <div style={{ color: "#555", fontSize: 10,
                            marginBottom: 4 }}>{label.toUpperCase()}</div>
              <div style={{ color: "#00e5ff", fontSize: 18,
                            fontWeight: 700 }}>{val}{unit}</div>
            </div>
          ))}
        </div>
      )}

      {/* Session list */}
      {sessions.length === 0 ? (
        <div style={{ textAlign: "center", color: "#555", padding: 40 }}>
          No sessions yet. Complete a workout first!
        </div>
      ) : (
        sessions.map(s => (
          <div key={s.id} style={{
            background: "#13131f", borderRadius: 12,
            padding: "14px 16px", marginBottom: 10,
            display: "flex", justifyContent: "space-between",
            alignItems: "center"
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