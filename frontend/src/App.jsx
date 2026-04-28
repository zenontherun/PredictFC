// ============================================
// App.jsx — Full app with Supabase backend
// ============================================

import { useState, useEffect } from "react";
import {
  supabase,
  signOut,
  getCurrentUser,
  onAuthChange,
  getMatches,
  getUserPredictions,
  savePrediction,
  getLeaderboard,
  subscribeToLeaderboard,
  getAdminUsers,
  updateAdminUserStatus,
  updateAdminUserPoints,
  deleteAdminUser,
  updateMatchLock,
  updateMatchResult,
  calculateMatchPoints,
} from "./supabase";

// ─── Admin Dashboard Component ──────────────
function AdminDashboard() {
  const [users, setUsers] = useState([]);
  const [matches, setAdminMatches] = useState([]);
  const [search, setSearch] = useState("");
  const [loading, setLoading] = useState(true);
  const [view, setView] = useState("matches");

  useEffect(() => { loadData(); }, []);

  async function loadData() {
    try {
      const [u, m] = await Promise.all([getAdminUsers(), getMatches()]);
      setUsers(u);
      setAdminMatches(m);
    } catch (err) {
      alert("Error loading admin data: " + err.message);
    } finally {
      setLoading(false);
    }
  }

  const handleToggleStatus = async (user) => {
    const newStatus = user.status === "active" ? "deactivated" : "active";
    try { await updateAdminUserStatus(user.id, newStatus); loadData(); }
    catch (err) { alert(err.message); }
  };

  const handleToggleLock = async (match) => {
    try { await updateMatchLock(match.id, !match.is_locked); loadData(); }
    catch (err) { alert(err.message); }
  };

  const handleSetResult = async (match) => {
    const home = prompt(`Home score for ${match.home_team}:`, match.result_home ?? "");
    if (home === null) return;
    const away = prompt(`Away score for ${match.away_team}:`, match.result_away ?? "");
    if (away === null) return;
    try {
      await updateMatchResult(match.id, parseInt(home) || 0, parseInt(away) || 0);
      if (window.confirm("Result saved! Calculate & distribute points now?")) {
        await calculateMatchPoints(match.id);
        alert("Points calculated! (5 exact / 3 goal diff / 1 outcome)");
      }
      loadData();
    } catch (err) { alert(err.message); }
  };

  const handleUpdatePoints = async (user) => {
    const pts = prompt(`New total points for ${user.username}:`, user.total_points);
    if (pts === null) return;
    try { await updateAdminUserPoints(user.id, parseInt(pts) || 0); loadData(); }
    catch (err) { alert(err.message); }
  };

  const handleDelete = async (user) => {
    if (!window.confirm(`Permanently delete ${user.username}?`)) return;
    try { await deleteAdminUser(user.id); loadData(); }
    catch (err) { alert(err.message); }
  };

  const filteredUsers = users.filter(u =>
    (u.username || "").toLowerCase().includes(search.toLowerCase()) ||
    (u.email || "").toLowerCase().includes(search.toLowerCase())
  );

  return (
    <div style={{ background: "#0d1e35", border: "1px solid #c8a84b", borderRadius: 16, padding: "24px" }}>
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 24, flexWrap: "wrap", gap: 12 }}>
        <h2 style={{ fontFamily: "Barlow Condensed", fontSize: 32, color: "#c8a84b", margin: 0 }}>⚙️ SuperAdmin Dashboard</h2>
        <div style={{ display: "flex", gap: 8, background: "#061020", padding: 4, borderRadius: 12, border: "1px solid #1a2e48" }}>
          <button onClick={() => setView("matches")} style={{ padding: "8px 16px", background: view === "matches" ? "#1a2e48" : "transparent", color: view === "matches" ? "#fff" : "#4a6a8a", border: "none", borderRadius: 8, cursor: "pointer", fontWeight: "bold", fontFamily: "Barlow Condensed", fontSize: 16 }}>Manage Matches</button>
          <button onClick={() => setView("users")} style={{ padding: "8px 16px", background: view === "users" ? "#1a2e48" : "transparent", color: view === "users" ? "#fff" : "#4a6a8a", border: "none", borderRadius: 8, cursor: "pointer", fontWeight: "bold", fontFamily: "Barlow Condensed", fontSize: 16 }}>Manage Users</button>
        </div>
      </div>

      {loading && <p style={{ color: "#8ab0d0" }}>Loading data...</p>}

      {!loading && view === "users" && (
        <div>
          <input
            type="text"
            placeholder="Search users by name or email..."
            value={search}
            onChange={e => setSearch(e.target.value)}
            style={{ width: "100%", padding: "12px", borderRadius: "8px", border: "1px solid #1a2e48", background: "#061020", color: "#fff", marginBottom: "16px", fontFamily: "Barlow, sans-serif" }}
          />
          <div style={{ overflowX: "auto" }}>
            <table style={{ width: "100%", borderCollapse: "collapse", fontSize: 14 }}>
              <thead>
                <tr style={{ background: "#1a2e48", color: "#8ab0d0", textAlign: "left" }}>
                  <th style={{ padding: "12px" }}>User</th>
                  <th style={{ padding: "12px" }}>Email</th>
                  <th style={{ padding: "12px" }}>Joined</th>
                  <th style={{ padding: "12px" }}>Points</th>
                  <th style={{ padding: "12px" }}>Predictions</th>
                  <th style={{ padding: "12px" }}>Status</th>
                  <th style={{ padding: "12px", textAlign: "right" }}>Actions</th>
                </tr>
              </thead>
              <tbody>
                {filteredUsers.map(u => (
                  <tr key={u.id} style={{ borderBottom: "1px solid #1a2e48" }}>
                    <td style={{ padding: "12px", fontWeight: "bold" }}>{u.username}</td>
                    <td style={{ padding: "12px", color: "#8ab0d0" }}>{u.email}</td>
                    <td style={{ padding: "12px" }}>{new Date(u.created_at).toLocaleDateString()}</td>
                    <td style={{ padding: "12px", color: "#c8a84b", fontWeight: "bold" }}>{u.total_points}</td>
                    <td style={{ padding: "12px" }}>{u.predictions_made}</td>
                    <td style={{ padding: "12px" }}>
                      <span style={{ padding: "4px 8px", borderRadius: "4px", fontSize: 12, fontWeight: "bold", background: u.status === "active" ? "#1a5a2a" : "#5a1a1a", color: u.status === "active" ? "#00ff87" : "#ff6b6b" }}>
                        {u.status.toUpperCase()}
                      </span>
                    </td>
                    <td style={{ padding: "12px" }}>
                      <div style={{ display: "flex", gap: "8px", justifyContent: "flex-end" }}>
                        <button onClick={() => handleUpdatePoints(u)} style={{ padding: "6px 10px", background: "#2a4060", color: "#fff", border: "none", borderRadius: "4px", cursor: "pointer", fontSize: 12, fontWeight: "bold" }}>Edit Pts</button>
                        <button onClick={() => handleToggleStatus(u)} style={{ padding: "6px 10px", background: u.status === "active" ? "#ff6b6b" : "#00ff87", color: "#060d1a", border: "none", borderRadius: "4px", cursor: "pointer", fontSize: 12, fontWeight: "bold" }}>{u.status === "active" ? "Deactivate" : "Activate"}</button>
                        <button onClick={() => handleDelete(u)} style={{ padding: "6px 10px", background: "#ff0000", color: "#fff", border: "none", borderRadius: "4px", cursor: "pointer", fontSize: 12, fontWeight: "bold" }}>Delete</button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
            {filteredUsers.length === 0 && <p style={{ padding: 20, textAlign: "center", color: "#8ab0d0" }}>No users found.</p>}
          </div>
        </div>
      )}

      {!loading && view === "matches" && (
        <div style={{ display: "flex", flexDirection: "column", gap: 12 }}>
          {matches.map(m => (
            <div key={m.id} style={{ display: "flex", justifyContent: "space-between", alignItems: "center", background: "#061020", padding: "16px 20px", borderRadius: 12, border: "1px solid #1a2e48", flexWrap: "wrap", gap: 12 }}>
              <div style={{ flex: 1 }}>
                <div style={{ fontSize: 12, color: "#8ab0d0", fontWeight: "bold", marginBottom: 4 }}>Group {m.group_name} · {new Date(m.match_date).toLocaleDateString()}</div>
                <div style={{ fontSize: 18, fontFamily: "Barlow Condensed", fontWeight: "bold" }}>
                  {m.home_flag} {m.home_team} <span style={{ color: "#c8a84b" }}>{m.result_home ?? "-"} : {m.result_away ?? "-"}</span> {m.away_team} {m.away_flag}
                </div>
                {m.result_home !== null && <div style={{ fontSize: 11, color: "#00ff87", marginTop: 4 }}>✓ Result entered. Points calculated.</div>}
              </div>
              <div style={{ display: "flex", gap: 8, flexShrink: 0 }}>
                <button onClick={() => handleToggleLock(m)} style={{ padding: "8px 16px", background: m.is_locked ? "#5a1a1a" : "#1a2e48", color: m.is_locked ? "#ff6b6b" : "#4a6a8a", border: "none", borderRadius: 6, cursor: "pointer", fontWeight: "bold", fontSize: 13 }}>
                  {m.is_locked ? "🔒 Unlock" : "🔓 Lock"}
                </button>
                <button onClick={() => handleSetResult(m)} disabled={!m.is_locked} style={{ padding: "8px 16px", background: !m.is_locked ? "#0a1628" : "#2a4060", color: !m.is_locked ? "#1a2e48" : "#fff", border: "none", borderRadius: 6, cursor: !m.is_locked ? "not-allowed" : "pointer", fontWeight: "bold", fontSize: 13, minWidth: 120 }}>
                  Enter Score
                </button>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

// ─── Auth Screen Component ──────────────────
function AuthScreen() {
  const [mode, setMode] = useState("login"); // login | signup
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [authLoading, setAuthLoading] = useState(false);
  const [error, setError] = useState("");
  const [success, setSuccess] = useState("");

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError("");
    setSuccess("");
    setAuthLoading(true);
    try {
      if (mode === "login") {
        const { error } = await supabase.auth.signInWithPassword({ email, password });
        if (error) throw error;
      } else {
        const { error } = await supabase.auth.signUp({ email, password });
        if (error) throw error;
        setSuccess("Account created! Check your email for a confirmation link, then log in.");
        setMode("login");
        setPassword("");
      }
    } catch (err) {
      setError(err.message);
    } finally {
      setAuthLoading(false);
    }
  };

  const handleGoogle = async () => {
    setError("");
    try {
      const { error } = await supabase.auth.signInWithOAuth({ provider: "google" });
      if (error) throw error;
    } catch (err) {
      setError(err.message);
    }
  };

  return (
    <div style={{ minHeight: "100vh", background: "#060d1a", display: "flex", alignItems: "center", justifyContent: "center", fontFamily: "'Barlow', sans-serif", padding: "20px" }}>
      <style>{`
        @import url('https://fonts.googleapis.com/css2?family=Barlow:wght@400;600&family=Barlow+Condensed:ital,wght@1,800;0,800;0,700&display=swap');
        .auth-input { width: 100%; padding: 14px 16px; border-radius: 10px; border: 1.5px solid #1a2e48; background: #061020; color: #fff; font-family: Barlow, sans-serif; font-size: 15px; outline: none; transition: border-color 0.2s, box-shadow 0.2s; box-sizing: border-box; }
        .auth-input:focus { border-color: #c8a84b; box-shadow: 0 0 0 3px #c8a84b18; }
        .auth-input::placeholder { color: #2a4060; }
        .auth-btn-main { width: 100%; padding: 15px; border: none; border-radius: 10px; font-family: Barlow Condensed, sans-serif; font-size: 17px; font-weight: 800; letter-spacing: 1px; cursor: pointer; transition: opacity 0.2s, transform 0.1s; }
        .auth-btn-main:hover:not(:disabled) { opacity: 0.88; transform: scale(1.01); }
        .auth-btn-main:disabled { opacity: 0.6; cursor: not-allowed; }
        .mode-tab { flex: 1; padding: 10px; border: none; background: transparent; font-family: Barlow Condensed, sans-serif; font-size: 15px; font-weight: 700; letter-spacing: 1px; cursor: pointer; border-bottom: 2px solid transparent; transition: all 0.2s; color: #4a6a8a; }
        .mode-tab.active { color: #fff; border-bottom-color: #c8a84b; }
        .mode-tab:hover:not(.active) { color: #8ab0d0; }
        .google-btn { width: 100%; padding: 13px; background: #fff; color: #222; border: none; border-radius: 10px; font-family: Barlow Condensed, sans-serif; font-size: 16px; font-weight: 700; cursor: pointer; display: flex; align-items: center; justify-content: center; gap: 10px; transition: background 0.2s, transform 0.1s; }
        .google-btn:hover { background: #f0f0f0; transform: scale(1.01); }
        @keyframes spin { to { transform: rotate(360deg); } }
        .spinner { width: 18px; height: 18px; border: 2px solid transparent; border-top-color: #060d1a; border-radius: 50%; animation: spin 0.7s linear infinite; display: inline-block; }
        @keyframes fadeSlide { from { opacity: 0; transform: translateY(6px); } to { opacity: 1; transform: translateY(0); } }
        .auth-card { background: linear-gradient(135deg, #0d1e35, #0a1628); border: 1px solid #1a2e48; border-radius: 24px; padding: 40px 36px; max-width: 420px; width: 100%; animation: fadeSlide 0.4s ease; }
      `}</style>

      <div className="auth-card">
        {/* Logo */}
        <div style={{ textAlign: "center", marginBottom: 24 }}>
          <div style={{ fontSize: 52, marginBottom: 10 }}>⚽</div>
          <h1 style={{ fontFamily: "Barlow Condensed, sans-serif", fontStyle: "italic", fontSize: 38, fontWeight: 800, lineHeight: 1, background: "linear-gradient(135deg, #fff 30%, #c8a84b)", WebkitBackgroundClip: "text", WebkitTextFillColor: "transparent", marginBottom: 6 }}>WORLD CUP 2026<br />PREDICTOR</h1>
          <p style={{ color: "#4a6a8a", fontSize: 13 }}>Predict matches. Climb the leaderboard. Win glory.</p>
        </div>

        {/* Mode Toggle */}
        <div style={{ display: "flex", borderBottom: "1px solid #1a2e48", marginBottom: 24 }}>
          <button className={`mode-tab ${mode === "login" ? "active" : ""}`} onClick={() => { setMode("login"); setError(""); setSuccess(""); }}>LOG IN</button>
          <button className={`mode-tab ${mode === "signup" ? "active" : ""}`} onClick={() => { setMode("signup"); setError(""); setSuccess(""); }}>SIGN UP</button>
        </div>

        {/* Success Banner */}
        {success && (
          <div style={{ background: "#0d2a1a", border: "1px solid #1a5a2a", borderRadius: 10, padding: "12px 16px", marginBottom: 16, color: "#00ff87", fontSize: 13, display: "flex", gap: 8, alignItems: "flex-start" }}>
            <span style={{ fontSize: 16 }}>✅</span> {success}
          </div>
        )}

        {/* Error Banner */}
        {error && (
          <div style={{ background: "#2a0d0d", border: "1px solid #5a1a1a", borderRadius: 10, padding: "12px 16px", marginBottom: 16, color: "#ff6b6b", fontSize: 13, display: "flex", gap: 8, alignItems: "flex-start" }}>
            <span style={{ fontSize: 16 }}>⚠️</span> {error}
          </div>
        )}

        {/* Form */}
        <form onSubmit={handleSubmit} style={{ display: "flex", flexDirection: "column", gap: 14 }}>
          <input className="auth-input" type="email" placeholder="Email address" value={email} onChange={e => { setEmail(e.target.value); setError(""); }} required />
          <div style={{ position: "relative" }}>
            <input className="auth-input" type="password" placeholder={mode === "signup" ? "Create a password (min. 6 chars)" : "Password"} value={password} onChange={e => { setPassword(e.target.value); setError(""); }} required />
          </div>
          <button type="submit" className="auth-btn-main" disabled={authLoading} style={{ background: "linear-gradient(135deg, #c8a84b, #a8882b)", color: "#060d1a", marginTop: 4 }}>
            {authLoading ? <span className="spinner" style={{ borderTopColor: "#060d1a" }} /> : mode === "login" ? "LOG IN" : "CREATE ACCOUNT"}
          </button>
        </form>

        {/* Divider */}
        <div style={{ display: "flex", alignItems: "center", gap: 12, margin: "20px 0" }}>
          <div style={{ flex: 1, height: 1, background: "#1a2e48" }} />
          <span style={{ color: "#2a4060", fontSize: 12, fontFamily: "Barlow Condensed", letterSpacing: 1 }}>OR</span>
          <div style={{ flex: 1, height: 1, background: "#1a2e48" }} />
        </div>

        {/* Google */}
        <button className="google-btn" onClick={handleGoogle}>
          <img src="https://www.gstatic.com/firebasejs/ui/2.0.0/images/auth/google.svg" alt="Google" style={{ width: 20, height: 20 }} />
          CONTINUE WITH GOOGLE
        </button>

        {/* Switch mode */}
        <p style={{ textAlign: "center", marginTop: 20, fontSize: 13, color: "#4a6a8a" }}>
          {mode === "login" ? "Don't have an account?" : "Already have an account?"}{" "}
          <button onClick={() => { setMode(mode === "login" ? "signup" : "login"); setError(""); setSuccess(""); }} style={{ background: "none", border: "none", color: "#c8a84b", cursor: "pointer", fontWeight: 700, fontSize: 13, padding: 0 }}>
            {mode === "login" ? "Sign up" : "Log in"}
          </button>
        </p>
      </div>
    </div>
  );
}

// ─── Helpers ────────────────────────────────
function calcPoints(pred, result) {
  if (!pred || !result) return null;
  const ph = parseInt(pred.predicted_home ?? pred.home);
  const pa = parseInt(pred.predicted_away ?? pred.away);
  const rh = parseInt(result.result_home);
  const ra = parseInt(result.result_away);
  if (ph === rh && pa === ra) return { pts: 5, label: "Exact Score!", color: "#00ff87" };
  const predOutcome = ph > pa ? "H" : ph < pa ? "A" : "D";
  const realOutcome = rh > ra ? "H" : rh < ra ? "A" : "D";
  if (predOutcome === realOutcome && (ph - pa) === (rh - ra)) return { pts: 3, label: "Goal Diff!", color: "#ffd700" };
  if (predOutcome === realOutcome) return { pts: 1, label: "Correct Result", color: "#87ceeb" };
  return { pts: 0, label: "Incorrect", color: "#ff6b6b" };
}

// ─── Main App ───────────────────────────────
export default function App() {
  const [tab, setTab] = useState("predict");
  const [user, setUser] = useState(null);
  const [loading, setLoading] = useState(true);
  const [matches, setMatches] = useState([]);
  const [predictions, setPredictions] = useState({});
  const [leaderboard, setLeaderboard] = useState([]);
  const [saving, setSaving] = useState({});
  const [toast, setToast] = useState(null);

  const showToast = (msg, type = "success") => {
    setToast({ msg, type });
    setTimeout(() => setToast(null), 3000);
  };

  useEffect(() => {
    const { data: { subscription } } = onAuthChange(async (authUser) => {
      if (authUser) {
        const profile = await getCurrentUser();
        setUser(profile);
        setTab(profile?.role === "superAdmin" ? "admin" : "predict");
      } else {
        setUser(null);
      }
      setLoading(false);
    });
    return () => subscription.unsubscribe();
  }, []);

  useEffect(() => { getMatches().then(setMatches).catch(console.error); }, []);

  useEffect(() => {
    if (!user) return;
    getUserPredictions(user.id).then(data => {
      const map = {};
      data.forEach(p => { map[p.match_id] = p; });
      setPredictions(map);
    }).catch(console.error);
  }, [user]);

  useEffect(() => {
    getLeaderboard().then(setLeaderboard).catch(console.error);
    const channel = subscribeToLeaderboard(setLeaderboard);
    return () => supabase.removeChannel(channel);
  }, []);

  const handleInput = (matchId, side, value) => {
    setPredictions(p => ({
      ...p,
      [matchId]: { ...(p[matchId] || {}), [side === "home" ? "predicted_home" : "predicted_away"]: value }
    }));
  };

  const handleLock = async (matchId) => {
    const pred = predictions[matchId];
    if (!pred || pred.predicted_home === undefined || pred.predicted_away === undefined ||
        pred.predicted_home === "" || pred.predicted_away === "") {
      showToast("Enter both scores first!", "error");
      return;
    }
    setSaving(s => ({ ...s, [matchId]: true }));
    try {
      await savePrediction({ userId: user.id, matchId, predictedHome: parseInt(pred.predicted_home), predictedAway: parseInt(pred.predicted_away) });
      setPredictions(p => ({ ...p, [matchId]: { ...p[matchId], locked: true } }));
      showToast("Prediction locked in! 🔒");
    } catch (err) {
      showToast(err.message || "Failed to save.", "error");
    } finally {
      setSaving(s => ({ ...s, [matchId]: false }));
    }
  };

  const totalPredicted = Object.values(predictions).filter(p => p.locked).length;
  const userLeaderboardEntry = leaderboard.find(l => l.id === user?.id);

  if (loading) return (
    <div style={{ minHeight: "100vh", background: "#060d1a", display: "flex", alignItems: "center", justifyContent: "center" }}>
      <div style={{ fontFamily: "Barlow Condensed, sans-serif", color: "#c8a84b", fontSize: 22, fontWeight: 800, letterSpacing: 2 }}>LOADING...</div>
    </div>
  );

  if (!user) return <AuthScreen />;

  return (
    <div style={{ minHeight: "100vh", background: "#060d1a", fontFamily: "'Barlow', sans-serif", color: "#fff", position: "relative" }}>
      <style>{`
        @import url('https://fonts.googleapis.com/css2?family=Barlow:wght@400;500;600&family=Barlow+Condensed:ital,wght@0,700;0,800;1,800&display=swap');
        * { box-sizing: border-box; margin: 0; padding: 0; }
        ::-webkit-scrollbar { width: 4px; }
        ::-webkit-scrollbar-track { background: #0d1a2e; }
        ::-webkit-scrollbar-thumb { background: #1e3a5f; border-radius: 2px; }
        input[type=number]::-webkit-inner-spin-button { -webkit-appearance: none; }
        input[type=number] { -moz-appearance: textfield; }
        .tab-btn { padding: 10px 24px; border: none; background: transparent; color: #4a6a8a; font-family: 'Barlow Condensed', sans-serif; font-size: 15px; font-weight: 700; letter-spacing: 1px; text-transform: uppercase; cursor: pointer; border-bottom: 3px solid transparent; transition: all 0.2s; }
        .tab-btn.active { color: #fff; border-bottom-color: #c8a84b; }
        .tab-btn:hover:not(.active) { color: #8ab0d0; }
        .match-card { background: linear-gradient(135deg, #0d1e35 0%, #0a1628 100%); border: 1px solid #1a2e48; border-radius: 16px; padding: 20px 24px; margin-bottom: 16px; transition: border-color 0.2s, transform 0.2s; position: relative; overflow: hidden; }
        .match-card::before { content: ''; position: absolute; top: 0; left: 0; right: 0; height: 2px; background: linear-gradient(90deg, transparent, #c8a84b44, transparent); }
        .match-card:hover { border-color: #2a4060; transform: translateY(-1px); }
        .match-card.locked { border-color: #1a3a1a; }
        .match-card.locked::before { background: linear-gradient(90deg, transparent, #00ff8744, transparent); }
        .score-input { width: 56px; height: 56px; background: #061020; border: 2px solid #1a2e48; border-radius: 10px; color: #fff; font-family: 'Barlow Condensed', sans-serif; font-size: 28px; font-weight: 800; text-align: center; outline: none; transition: border-color 0.2s; }
        .score-input:focus { border-color: #c8a84b; box-shadow: 0 0 0 3px #c8a84b22; }
        .score-input:disabled { opacity: 0.5; cursor: not-allowed; }
        .submit-btn { padding: 10px 20px; background: linear-gradient(135deg, #c8a84b, #a8882b); border: none; border-radius: 8px; color: #060d1a; font-family: 'Barlow Condensed', sans-serif; font-size: 14px; font-weight: 800; letter-spacing: 1px; text-transform: uppercase; cursor: pointer; transition: opacity 0.2s, transform 0.1s; }
        .submit-btn:hover { opacity: 0.9; transform: scale(1.02); }
        .submit-btn:disabled { opacity: 0.5; cursor: not-allowed; transform: none; }
        .toast { position: fixed; bottom: 24px; left: 50%; transform: translateX(-50%); padding: 12px 24px; border-radius: 10px; font-weight: 600; font-size: 14px; z-index: 1000; animation: slideUp 0.3s ease; pointer-events: none; }
        .toast.success { background: #0d2a1a; border: 1px solid #00ff87; color: #00ff87; }
        .toast.error { background: #2a0d0d; border: 1px solid #ff6b6b; color: #ff6b6b; }
        @keyframes slideUp { from { opacity: 0; transform: translateX(-50%) translateY(10px); } to { opacity: 1; transform: translateX(-50%) translateY(0); } }
        @keyframes pulse { 0%, 100% { opacity: 1; } 50% { opacity: 0.4; } }
      `}</style>

      <div style={{ position: "fixed", inset: 0, pointerEvents: "none", background: "radial-gradient(ellipse 60% 40% at 20% 10%, #1a3a6a22 0%, transparent 60%), radial-gradient(ellipse 50% 40% at 80% 80%, #1a4a1a22 0%, transparent 60%)" }} />

      <div style={{ position: "relative", maxWidth: 680, margin: "0 auto", padding: "0 16px 80px" }}>

        {/* Header */}
        <div style={{ padding: "28px 0 20px", textAlign: "center" }}>
          <div style={{ display: "flex", justifyContent: "flex-end", marginBottom: 12 }}>
            <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
              <span style={{ fontSize: 13, color: "#4a6a8a" }}>{user.username}</span>
              <button onClick={signOut} style={{ padding: "6px 14px", background: "transparent", border: "1px solid #1a2e48", borderRadius: 8, color: "#4a6a8a", fontSize: 12, cursor: "pointer", fontFamily: "Barlow Condensed", fontWeight: 700 }}>SIGN OUT</button>
            </div>
          </div>

          <h1 style={{ fontFamily: "'Barlow Condensed', sans-serif", fontSize: "clamp(36px, 8vw, 56px)", fontWeight: 800, fontStyle: "italic", lineHeight: 1, background: "linear-gradient(135deg, #fff 30%, #c8a84b)", WebkitBackgroundClip: "text", WebkitTextFillColor: "transparent" }}>
            PREDICT &<br />WIN
          </h1>

          <div style={{ display: "flex", justifyContent: "center", gap: 16, marginTop: 20, flexWrap: "wrap" }}>
            {[
              { label: "Your Points", value: userLeaderboardEntry?.total_points ?? user.total_points ?? 0, color: "#c8a84b" },
              { label: "Rank", value: userLeaderboardEntry ? `#${userLeaderboardEntry.rank}` : "—", color: "#87ceeb" },
              { label: "Predicted", value: `${totalPredicted}/${matches.length}`, color: "#00ff87" },
            ].map(s => (
              <div key={s.label} style={{ background: "#0d1e35", border: "1px solid #1a2e48", borderRadius: 12, padding: "10px 20px", textAlign: "center" }}>
                <div style={{ color: s.color, fontFamily: "Barlow Condensed", fontSize: 26, fontWeight: 800 }}>{s.value}</div>
                <div style={{ color: "#4a6a8a", fontSize: 11, letterSpacing: 1, textTransform: "uppercase", marginTop: 2 }}>{s.label}</div>
              </div>
            ))}
          </div>
        </div>

        {/* Tabs */}
        <div style={{ display: "flex", borderBottom: "1px solid #1a2e48", marginBottom: 24, gap: 4 }}>
          {[{ id: "predict", label: "🎯 Predict" }, { id: "leaderboard", label: "🏆 Leaderboard" }, { id: "scoring", label: "📋 Scoring" }]
            .concat(user?.role === "superAdmin" ? [{ id: "admin", label: "⚙️ Admin" }] : [])
            .map(t => (
              <button key={t.id} className={`tab-btn ${tab === t.id ? "active" : ""}`} onClick={() => setTab(t.id)}>{t.label}</button>
            ))}
        </div>

        {/* ── PREDICT TAB ── */}
        {tab === "predict" && (
          <div>
            {matches.length === 0 && <p style={{ color: "#4a6a8a", textAlign: "center", padding: 40 }}>Loading matches...</p>}
            {matches.map(match => {
              const pred = predictions[match.id] || {};
              const isLocked = pred.locked || match.is_locked;
              const hasResult = match.result_home !== null && match.result_away !== null;
              const pts = hasResult && pred.predicted_home !== undefined ? calcPoints(pred, match) : null;
              return (
                <div key={match.id} className={`match-card ${isLocked ? "locked" : ""}`}>
                  <div style={{ display: "flex", justifyContent: "space-between", marginBottom: 16, alignItems: "center" }}>
                    <div style={{ display: "flex", gap: 8 }}>
                      <span style={{ background: "#061020", border: "1px solid #1a2e48", borderRadius: 6, padding: "3px 10px", fontSize: 11, color: "#4a6a8a", fontFamily: "Barlow Condensed", fontWeight: 700, textTransform: "uppercase" }}>Group {match.group_name}</span>
                      <span style={{ background: "#061020", border: "1px solid #1a2e48", borderRadius: 6, padding: "3px 10px", fontSize: 11, color: "#4a6a8a" }}>
                        {new Date(match.match_date).toLocaleDateString("en-US", { month: "short", day: "numeric" })} · {match.match_time?.slice(0, 5)}
                      </span>
                    </div>
                    {pts && (
                      <span style={{ padding: "4px 12px", borderRadius: 20, background: pts.color + "22", border: `1px solid ${pts.color}55`, color: pts.color, fontSize: 13, fontFamily: "Barlow Condensed", fontWeight: 700 }}>
                        +{pts.pts}pts {pts.label}
                      </span>
                    )}
                    {isLocked && !pts && <span style={{ padding: "6px 14px", background: "#0d2a1a", border: "1px solid #1a5a2a", borderRadius: 8, color: "#00ff87", fontSize: 12, fontFamily: "Barlow Condensed", fontWeight: 700 }}>🔒 LOCKED</span>}
                  </div>

                  <div style={{ display: "flex", alignItems: "center", gap: 12 }}>
                    <div style={{ flex: 1, textAlign: "right" }}>
                      <div style={{ fontSize: 28, marginBottom: 4 }}>{match.home_flag}</div>
                      <div style={{ fontFamily: "Barlow Condensed", fontWeight: 700, fontSize: 16 }}>{match.home_team}</div>
                      <div style={{ fontSize: 11, color: "#4a6a8a", marginTop: 2 }}>HOME</div>
                    </div>
                    <div style={{ display: "flex", alignItems: "center", gap: 8, flexShrink: 0 }}>
                      <input type="number" min="0" max="99" className="score-input" value={pred.predicted_home ?? ""} disabled={isLocked} onChange={e => handleInput(match.id, "home", e.target.value)} placeholder="0" />
                      <span style={{ fontFamily: "Barlow Condensed", fontSize: 22, fontWeight: 800, color: "#2a4060" }}>:</span>
                      <input type="number" min="0" max="99" className="score-input" value={pred.predicted_away ?? ""} disabled={isLocked} onChange={e => handleInput(match.id, "away", e.target.value)} placeholder="0" />
                    </div>
                    <div style={{ flex: 1, textAlign: "left" }}>
                      <div style={{ fontSize: 28, marginBottom: 4 }}>{match.away_flag}</div>
                      <div style={{ fontFamily: "Barlow Condensed", fontWeight: 700, fontSize: 16 }}>{match.away_team}</div>
                      <div style={{ fontSize: 11, color: "#4a6a8a", marginTop: 2 }}>AWAY</div>
                    </div>
                  </div>

                  {hasResult && (
                    <div style={{ textAlign: "center", marginTop: 12, fontSize: 13, color: "#4a6a8a" }}>
                      Final: {match.home_team} <strong style={{ color: "#fff" }}>{match.result_home} – {match.result_away}</strong> {match.away_team}
                    </div>
                  )}

                  <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginTop: 16, paddingTop: 14, borderTop: "1px solid #1a2e48" }}>
                    <span style={{ fontSize: 12, color: "#2a4060" }}>📍 {match.venue}</span>
                    {!isLocked ? (
                      <button className="submit-btn" disabled={saving[match.id]} onClick={() => handleLock(match.id)}>
                        {saving[match.id] ? "Saving..." : "Lock Prediction"}
                      </button>
                    ) : (
                      <div style={{ fontSize: 13, color: "#00ff87", fontWeight: 600 }}>
                        Your pick: {pred.predicted_home} – {pred.predicted_away}
                      </div>
                    )}
                  </div>
                </div>
              );
            })}
          </div>
        )}

        {/* ── LEADERBOARD TAB ── */}
        {tab === "leaderboard" && (
          <div>
            <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: 20 }}>
              <div style={{ fontFamily: "Barlow Condensed", fontSize: 13, color: "#4a6a8a", letterSpacing: 1, textTransform: "uppercase" }}>
                {leaderboard.length} players competing
              </div>
              <div style={{ display: "flex", alignItems: "center", gap: 6, background: "#0d2a1a", border: "1px solid #1a5a2a", borderRadius: 20, padding: "4px 12px" }}>
                <span style={{ width: 7, height: 7, borderRadius: "50%", background: "#00ff87", display: "inline-block", boxShadow: "0 0 6px #00ff87", animation: "pulse 2s infinite" }} />
                <span style={{ color: "#00ff87", fontSize: 12, fontWeight: 700, fontFamily: "Barlow Condensed", letterSpacing: 1 }}>LIVE</span>
              </div>
            </div>

            {leaderboard.length >= 3 && (() => {
              const top3 = [leaderboard[1], leaderboard[0], leaderboard[2]];
              const heights = [100, 130, 80];
              const medals = ["🥈", "🥇", "🥉"];
              const colors = ["#8ab0d0", "#c8a84b", "#cd7f32"];
              const ranks = [2, 1, 3];
              return (
                <div style={{ display: "flex", justifyContent: "center", alignItems: "flex-end", marginBottom: 28, padding: "0 8px" }}>
                  {top3.map((player, i) => (
                    <div key={player.id} style={{ flex: 1, display: "flex", flexDirection: "column", alignItems: "center", gap: 8 }}>
                      <div style={{ fontSize: 28 }}>{player.avatar_emoji}</div>
                      <div style={{ fontFamily: "Barlow Condensed", fontWeight: 700, fontSize: 14, color: player.id === user?.id ? "#00ff87" : "#fff", textAlign: "center", maxWidth: 90, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>{player.username}</div>
                      <div style={{ fontFamily: "Barlow Condensed", fontWeight: 900, fontSize: 22, color: colors[i] }}>{player.total_points}<span style={{ fontSize: 12 }}>pts</span></div>
                      <div style={{ width: "100%", height: heights[i], display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "flex-start", paddingTop: 14, background: `linear-gradient(180deg, ${colors[i]}22 0%, #0d1e35 100%)`, border: `1px solid ${colors[i]}44`, borderBottom: "none", borderRadius: "12px 12px 0 0" }}>
                        <span style={{ fontSize: 28 }}>{medals[i]}</span>
                        <span style={{ fontFamily: "Barlow Condensed", fontWeight: 800, fontSize: 18, color: colors[i] }}>#{ranks[i]}</span>
                      </div>
                    </div>
                  ))}
                </div>
              );
            })()}

            <div style={{ display: "grid", gridTemplateColumns: "40px 1fr 60px 70px 70px", gap: 8, padding: "8px 16px", marginBottom: 4 }}>
              {["Rank", "Player", "Exact", "Correct", "Points"].map((h, i) => (
                <div key={h} style={{ fontSize: 11, color: "#2a4060", fontFamily: "Barlow Condensed", textTransform: "uppercase", letterSpacing: 1, textAlign: i >= 2 ? "center" : i === 4 ? "right" : "left" }}>{h}</div>
              ))}
            </div>

            {leaderboard.length === 0 && <p style={{ color: "#4a6a8a", textAlign: "center", padding: 40 }}>No players yet. Be the first!</p>}
            {leaderboard.map(player => {
              const isMe = player.id === user?.id;
              const isTop3 = player.rank <= 3;
              const rankColors = { 1: "#c8a84b", 2: "#8ab0d0", 3: "#cd7f32" };
              return (
                <div key={player.id} style={{ display: "grid", gridTemplateColumns: "40px 1fr 60px 70px 70px", gap: 8, alignItems: "center", padding: "12px 16px", borderRadius: 12, marginBottom: 6, background: isMe ? "linear-gradient(135deg, #0d2a1a, #0a1e14)" : isTop3 ? "linear-gradient(135deg, #0d1e35, #0a1628)" : "#0a1420", border: isMe ? "1px solid #1a5a2a" : isTop3 ? `1px solid ${rankColors[player.rank]}33` : "1px solid #111e30", boxShadow: isMe ? "0 0 16px #00ff8710" : "none" }}>
                  <div style={{ width: 32, height: 32, borderRadius: "50%", display: "flex", alignItems: "center", justifyContent: "center", fontFamily: "Barlow Condensed", fontSize: isTop3 ? 18 : 14, fontWeight: 800, background: player.rank === 1 ? "linear-gradient(135deg, #c8a84b, #a8882b)" : player.rank === 2 ? "#1a2e48" : player.rank === 3 ? "linear-gradient(135deg, #a0522d, #7a3b1e)" : "transparent", color: isTop3 ? "#fff" : "#2a4060", border: isTop3 ? "none" : "1px solid #1a2e48" }}>
                    {player.rank <= 3 ? ["🥇", "🥈", "🥉"][player.rank - 1] : player.rank}
                  </div>
                  <div style={{ display: "flex", alignItems: "center", gap: 8, minWidth: 0 }}>
                    <span style={{ fontSize: 20, flexShrink: 0 }}>{player.avatar_emoji}</span>
                    <div style={{ fontFamily: "Barlow Condensed", fontWeight: 700, fontSize: 15, color: isMe ? "#00ff87" : isTop3 ? rankColors[player.rank] : "#fff", overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>
                      {player.username}{isMe && <span style={{ fontSize: 11, marginLeft: 5, color: "#2a6a3a" }}>(You)</span>}
                    </div>
                  </div>
                  <div style={{ textAlign: "center", fontFamily: "Barlow Condensed", fontWeight: 700, fontSize: 16, color: "#00ff87" }}>{player.exact_scores}</div>
                  <div style={{ textAlign: "center", fontFamily: "Barlow Condensed", fontWeight: 700, fontSize: 16, color: "#87ceeb" }}>{player.correct_outcomes}</div>
                  <div style={{ textAlign: "right" }}>
                    <span style={{ fontFamily: "Barlow Condensed", fontWeight: 900, fontSize: 20, color: isMe ? "#00ff87" : isTop3 ? rankColors[player.rank] : "#fff" }}>{player.total_points}</span>
                    <span style={{ fontSize: 11, color: "#2a4060", marginLeft: 2 }}>pts</span>
                  </div>
                </div>
              );
            })}
            <div style={{ textAlign: "center", marginTop: 20, display: "flex", alignItems: "center", justifyContent: "center", gap: 8 }}>
              <span style={{ width: 7, height: 7, borderRadius: "50%", background: "#00ff87", display: "inline-block", boxShadow: "0 0 6px #00ff87" }} />
              <span style={{ fontSize: 12, color: "#2a4060" }}>Leaderboard updates automatically after every match result</span>
            </div>
          </div>
        )}

        {/* ── SCORING TAB ── */}
        {tab === "scoring" && (
          <div>
            {[
              { pts: 5, label: "Exact Score", desc: "Predict the precise scoreline", example: "Predict 2-1 → Result 2-1", color: "#00ff87" },
              { pts: 3, label: "Correct Goal Diff", desc: "Right outcome + correct goal difference", example: "Predict 2-0 → Result 3-1", color: "#ffd700" },
              { pts: 1, label: "Correct Outcome", desc: "Right result (Win / Draw / Loss)", example: "Predict 2-1 → Result 1-0", color: "#87ceeb" },
              { pts: 0, label: "Incorrect", desc: "Wrong outcome", example: "Predict 1-0 → Result 0-1", color: "#ff6b6b" },
            ].map(item => (
              <div key={item.pts} style={{ display: "flex", gap: 16, alignItems: "flex-start", background: "#0d1e35", border: "1px solid #1a2e48", borderRadius: 12, padding: "16px 20px", marginBottom: 12 }}>
                <div style={{ fontFamily: "Barlow Condensed", fontWeight: 800, fontSize: 28, color: item.color, minWidth: 48, textAlign: "center", lineHeight: 1 }}>
                  {item.pts}<span style={{ fontSize: 14 }}>pts</span>
                </div>
                <div>
                  <div style={{ fontWeight: 700, fontSize: 15, marginBottom: 4 }}>{item.label}</div>
                  <div style={{ fontSize: 13, color: "#4a6a8a", marginBottom: 6 }}>{item.desc}</div>
                  <div style={{ display: "inline-block", background: "#061020", border: `1px solid ${item.color}44`, borderRadius: 6, padding: "4px 12px", fontSize: 12, color: item.color, fontFamily: "Barlow Condensed", fontWeight: 700 }}>{item.example}</div>
                </div>
              </div>
            ))}
          </div>
        )}

        {/* ── ADMIN TAB ── */}
        {tab === "admin" && (
          <div>
            {user?.role !== "superAdmin" ? (
              <p style={{ color: "#ff6b6b", textAlign: "center", padding: 40, fontFamily: "Barlow Condensed", fontSize: 20 }}>❌ Access Denied.</p>
            ) : (
              <AdminDashboard />
            )}
          </div>
        )}
      </div>

      {toast && <div className={`toast ${toast.type}`}>{toast.msg}</div>}
    </div>
  );
}
