import React, { useState, useEffect } from "react";
import axios from "axios";
import {
  BarChart, Bar, XAxis, YAxis, CartesianGrid,
  Tooltip, ResponsiveContainer, LineChart, Line, Legend
} from "recharts";

const API = process.env.REACT_APP_API_URL || "http://localhost:8000";

// ── Color helpers ────────────────────────────────────────────────────────────
const accColor = (acc) =>
  acc >= 80 ? "#00e676" : acc >= 60 ? "#ffa726" : "#ef5350";

const EXERCISE_COLORS = {
  Squats: "#00b0ff",
  "Push-ups": "#ff4081",
  Plank: "#69f0ae",
  "Bicep Curls": "#ffeb3b",
};

// ── Stat Card ────────────────────────────────────────────────────────────────
function StatCard({ title, value, unit, color }) {
  return (
    <div style={{
      background: "#1e1e2e", borderRadius: 12, padding: "20px 24px",
      flex: 1, minWidth: 140, borderLeft: `4px solid ${color}`
    }}>
      <div style={{ color: "#888", fontSize: 12, marginBottom: 6 }}>{title}</div>
      <div style={{ color, fontSize: 32, fontWeight: 700 }}>
        {value}<span style={{ fontSize: 14, color: "#888", marginLeft: 4 }}>{unit}</span>
      </div>
    </div>
  );
}

// ── Main App ─────────────────────────────────────────────────────────────────
export default function App() {
  const [sessions, setSessions]   = useState([]);
  const [stats, setStats]         = useState(null);
  const [filter, setFilter]       = useState("All");
  const [loading, setLoading]     = useState(true);
  const [lastUpdated, setLastUpdated] = useState(null);

  const exercises = ["All", "Squats", "Push-ups", "Plank", "Bicep Curls"];

  const fetchData = async () => {
    try {
      const exercise = filter === "All" ? "" : filter;
      const [sessRes, statsRes] = await Promise.all([
        axios.get(`${API}/sessions/`, { params: { exercise, limit: 50 } }),
        axios.get(`${API}/sessions/stats`, { params: { exercise } })
      ]);
      setSessions(sessRes.data);
      setStats(statsRes.data);
      setLastUpdated(new Date().toLocaleTimeString());
    } catch (e) {
      console.error("API error:", e);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => { fetchData(); }, [filter]);

  // Auto-refresh every 30 seconds
  useEffect(() => {
    const interval = setInterval(fetchData, 30000);
    return () => clearInterval(interval);
  }, [filter]);

  // Chart data — last 20 sessions reversed (oldest first)
  const chartData = [...sessions].reverse().slice(-20).map((s, i) => ({
    name: `#${s.id}`,
    reps: s.reps,
    accuracy: s.accuracy,
    exercise: s.exercise,
    duration: s.duration,
  }));

  // Per-exercise best accuracy
  const exerciseStats = exercises.slice(1).map(ex => {
    const exSessions = sessions.filter(s => s.exercise === ex);
    return {
      name: ex,
      sessions: exSessions.length,
      avgAccuracy: exSessions.length
        ? Math.round(exSessions.reduce((a, s) => a + s.accuracy, 0) / exSessions.length)
        : 0,
      totalReps: exSessions.reduce((a, s) => a + s.reps, 0),
    };
  }).filter(e => e.sessions > 0);

  const fmtDuration = (secs) => {
    if (secs < 60) return `${secs}s`;
    return `${Math.floor(secs / 60)}m ${secs % 60}s`;
  };

  return (
    <div style={{
      minHeight: "100vh", background: "#13131f", color: "#fff",
      fontFamily: "'Segoe UI', sans-serif", padding: "24px 32px"
    }}>

      {/* ── Header ── */}
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 28 }}>
        <div>
          <h1 style={{ margin: 0, fontSize: 26, color: "#00e5ff" }}>
            💪 Smart Gym Trainer
          </h1>
          <div style={{ color: "#555", fontSize: 13, marginTop: 4 }}>
            Workout Dashboard
            {lastUpdated && <span style={{ marginLeft: 12 }}>Last updated: {lastUpdated}</span>}
          </div>
        </div>
        <button onClick={fetchData} style={{
          background: "#00b0ff22", border: "1px solid #00b0ff",
          color: "#00b0ff", borderRadius: 8, padding: "8px 18px",
          cursor: "pointer", fontSize: 13
        }}>
          🔄 Refresh
        </button>
      </div>

      {/* ── Filter tabs ── */}
      <div style={{ display: "flex", gap: 8, marginBottom: 24, flexWrap: "wrap" }}>
        {exercises.map(ex => (
          <button key={ex} onClick={() => setFilter(ex)} style={{
            padding: "6px 16px", borderRadius: 20, cursor: "pointer",
            border: filter === ex ? "none" : "1px solid #333",
            background: filter === ex ? "#00b0ff" : "#1e1e2e",
            color: filter === ex ? "#000" : "#aaa",
            fontWeight: filter === ex ? 700 : 400, fontSize: 13
          }}>
            {ex}
          </button>
        ))}
      </div>

      {loading ? (
        <div style={{ textAlign: "center", color: "#555", padding: 60 }}>Loading...</div>
      ) : (
        <>
          {/* ── Stat cards ── */}
          {stats && (
            <div style={{ display: "flex", gap: 16, marginBottom: 28, flexWrap: "wrap" }}>
              <StatCard title="TOTAL SESSIONS" value={stats.total_sessions}  unit="sessions" color="#00b0ff" />
              <StatCard title="TOTAL REPS"     value={stats.total_reps}      unit="reps"     color="#00e676" />
              <StatCard title="AVG ACCURACY"   value={stats.average_accuracy} unit="%"       color={accColor(stats.average_accuracy)} />
              <StatCard title="BEST ACCURACY"  value={stats.best_accuracy}   unit="%"        color="#ffd740" />
              <StatCard title="TOTAL TIME"     value={fmtDuration(stats.total_duration)} unit="" color="#ea80fc" />
              <StatCard title="CALORIES BURNED" value={stats.total_calories} unit="kcal"    color="#ff6d00" />
            </div>
          )}

          {/* ── Charts row ── */}
          {chartData.length > 0 && (
            <div style={{ display: "flex", gap: 20, marginBottom: 28, flexWrap: "wrap" }}>

              {/* Reps bar chart */}
              <div style={{ background: "#1e1e2e", borderRadius: 12, padding: 20, flex: 2, minWidth: 300 }}>
                <div style={{ color: "#888", fontSize: 13, marginBottom: 14 }}>REPS PER SESSION</div>
                <ResponsiveContainer width="100%" height={200}>
                  <BarChart data={chartData}>
                    <CartesianGrid strokeDasharray="3 3" stroke="#2a2a3e" />
                    <XAxis dataKey="name" tick={{ fill: "#555", fontSize: 11 }} />
                    <YAxis tick={{ fill: "#555", fontSize: 11 }} />
                    <Tooltip
                      contentStyle={{ background: "#1e1e2e", border: "1px solid #333" }}
                      formatter={(v, n, p) => [v, p.payload.exercise]}
                    />
                    <Bar dataKey="reps" fill="#00b0ff" radius={[4, 4, 0, 0]} />
                  </BarChart>
                </ResponsiveContainer>
              </div>

              {/* Accuracy line chart */}
              <div style={{ background: "#1e1e2e", borderRadius: 12, padding: 20, flex: 2, minWidth: 300 }}>
                <div style={{ color: "#888", fontSize: 13, marginBottom: 14 }}>ACCURACY TREND</div>
                <ResponsiveContainer width="100%" height={200}>
                  <LineChart data={chartData}>
                    <CartesianGrid strokeDasharray="3 3" stroke="#2a2a3e" />
                    <XAxis dataKey="name" tick={{ fill: "#555", fontSize: 11 }} />
                    <YAxis domain={[0, 100]} tick={{ fill: "#555", fontSize: 11 }} />
                    <Tooltip contentStyle={{ background: "#1e1e2e", border: "1px solid #333" }} />
                    <Line type="monotone" dataKey="accuracy" stroke="#00e676"
                          strokeWidth={2} dot={{ fill: "#00e676", r: 3 }} />
                  </LineChart>
                </ResponsiveContainer>
              </div>
            </div>
          )}

          {/* ── Per exercise breakdown ── */}
          {exerciseStats.length > 0 && (
            <div style={{ background: "#1e1e2e", borderRadius: 12, padding: 20, marginBottom: 28 }}>
              <div style={{ color: "#888", fontSize: 13, marginBottom: 16 }}>EXERCISE BREAKDOWN</div>
              <div style={{ display: "flex", gap: 16, flexWrap: "wrap" }}>
                {exerciseStats.map(ex => (
                  <div key={ex.name} style={{
                    flex: 1, minWidth: 160, background: "#13131f",
                    borderRadius: 10, padding: "14px 18px",
                    borderTop: `3px solid ${EXERCISE_COLORS[ex.name] || "#00b0ff"}`
                  }}>
                    <div style={{ fontWeight: 600, marginBottom: 10,
                                  color: EXERCISE_COLORS[ex.name] || "#fff" }}>
                      {ex.name}
                    </div>
                    <div style={{ fontSize: 12, color: "#888", lineHeight: 2 }}>
                      <div>Sessions: <span style={{ color: "#fff" }}>{ex.sessions}</span></div>
                      <div>Total Reps: <span style={{ color: "#fff" }}>{ex.totalReps}</span></div>
                      <div>Avg Accuracy: <span style={{ color: accColor(ex.avgAccuracy) }}>
                        {ex.avgAccuracy}%
                      </span></div>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* ── Session history table ── */}
          <div style={{ background: "#1e1e2e", borderRadius: 12, padding: 20 }}>
            <div style={{ color: "#888", fontSize: 13, marginBottom: 16 }}>
              WORKOUT HISTORY
              <span style={{ marginLeft: 10, color: "#555" }}>({sessions.length} sessions)</span>
            </div>
            {sessions.length === 0 ? (
              <div style={{ color: "#555", textAlign: "center", padding: 40 }}>
                No sessions yet. Complete a workout to see history!
              </div>
            ) : (
              <table style={{ width: "100%", borderCollapse: "collapse", fontSize: 14 }}>
                <thead>
                  <tr style={{ color: "#555", textAlign: "left" }}>
                    {["#", "Exercise", "Reps", "Duration", "Accuracy", "Calories","Date"].map(h => (
                      <th key={h} style={{ padding: "8px 12px", borderBottom: "1px solid #2a2a3e" }}>
                        {h}
                      </th>
                    ))}
                  </tr>
                </thead>
                <tbody>
                  {sessions.map((s, i) => (
                    <tr key={s.id} style={{
                      borderBottom: "1px solid #1a1a2e",
                      background: i % 2 === 0 ? "#13131f" : "transparent"
                    }}>
                      <td style={{ padding: "10px 12px", color: "#555" }}>{s.id}</td>
                      <td style={{ padding: "10px 12px" }}>
                        <span style={{
                          background: `${EXERCISE_COLORS[s.exercise]}22`,
                          color: EXERCISE_COLORS[s.exercise] || "#fff",
                          padding: "2px 10px", borderRadius: 12, fontSize: 12
                        }}>
                          {s.exercise}
                        </span>
                      </td>
                      <td style={{ padding: "10px 12px", color: "#00e676" }}>{s.reps}</td>
                      <td style={{ padding: "10px 12px", color: "#ea80fc" }}>{fmtDuration(s.duration)}</td>
                      <td style={{ padding: "10px 12px", color: accColor(s.accuracy) }}>
                        {s.accuracy}%
                      </td>
                      <td style={{ padding: "10px 12px", color: "#ff6d00" }}>
                        {s.calories?.toFixed(1) ?? "0.0"} kcal
                      </td>
                      <td style={{ padding: "10px 12px", color: "#555", fontSize: 12 }}>
                        {new Date(s.created_at).toLocaleString()}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            )}
          </div>
        </>
      )}
    </div>
  );
}