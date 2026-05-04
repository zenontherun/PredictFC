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
    <div style={{ background: "#161b22", border: "1px solid #ec7a26", borderRadius: 16, padding: "24px" }}>
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 24, flexWrap: "wrap", gap: 12 }}>
        <h2 style={{ fontFamily: "Barlow Condensed", fontSize: 32, color: "#ec7a26", margin: 0 }}>⚙️ SuperAdmin Dashboard</h2>
        <div style={{ display: "flex", gap: 8, background: "#010409", padding: 4, borderRadius: 12, border: "1px solid #30363d" }}>
          <button onClick={() => setView("matches")} style={{ padding: "8px 16px", background: view === "matches" ? "#30363d" : "transparent", color: view === "matches" ? "#fff" : "#8b949e", border: "none", borderRadius: 8, cursor: "pointer", fontWeight: "bold", fontFamily: "Barlow Condensed", fontSize: 16 }}>Manage Matches</button>
          <button onClick={() => setView("users")} style={{ padding: "8px 16px", background: view === "users" ? "#30363d" : "transparent", color: view === "users" ? "#fff" : "#8b949e", border: "none", borderRadius: 8, cursor: "pointer", fontWeight: "bold", fontFamily: "Barlow Condensed", fontSize: 16 }}>Manage Users</button>
        </div>
      </div>

      {loading && <p style={{ color: "#e6edf3" }}>Loading data...</p>}

      {!loading && view === "users" && (
        <div>
          <input
            type="text"
            placeholder="Search users by name or email..."
            value={search}
            onChange={e => setSearch(e.target.value)}
            style={{ width: "100%", padding: "12px", borderRadius: "8px", border: "1px solid #30363d", background: "#010409", color: "#fff", marginBottom: "16px", fontFamily: "Barlow, sans-serif" }}
          />
          <div style={{ overflowX: "auto" }}>
            <table style={{ width: "100%", borderCollapse: "collapse", fontSize: 14 }}>
              <thead>
                <tr style={{ background: "#30363d", color: "#e6edf3", textAlign: "left" }}>
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
                  <tr key={u.id} style={{ borderBottom: "1px solid #30363d" }}>
                    <td style={{ padding: "12px", fontWeight: "bold" }}>{u.username}</td>
                    <td style={{ padding: "12px", color: "#e6edf3" }}>{u.email}</td>
                    <td style={{ padding: "12px" }}>{new Date(u.created_at).toLocaleDateString()}</td>
                    <td style={{ padding: "12px", color: "#ec7a26", fontWeight: "bold" }}>{u.total_points}</td>
                    <td style={{ padding: "12px" }}>{u.predictions_made}</td>
                    <td style={{ padding: "12px" }}>
                      <span style={{ padding: "4px 8px", borderRadius: "4px", fontSize: 12, fontWeight: "bold", background: u.status === "active" ? "#1a5a2a" : "#5a1a1a", color: u.status === "active" ? "#00ff87" : "#ff6b6b" }}>
                        {u.status.toUpperCase()}
                      </span>
                    </td>
                    <td style={{ padding: "12px" }}>
                      <div style={{ display: "flex", gap: "8px", justifyContent: "flex-end" }}>
                        <button onClick={() => handleUpdatePoints(u)} style={{ padding: "6px 10px", background: "#484f58", color: "#fff", border: "none", borderRadius: "4px", cursor: "pointer", fontSize: 12, fontWeight: "bold" }}>Edit Pts</button>
                        <button onClick={() => handleToggleStatus(u)} style={{ padding: "6px 10px", background: u.status === "active" ? "#ff6b6b" : "#00ff87", color: "#0b0f14", border: "none", borderRadius: "4px", cursor: "pointer", fontSize: 12, fontWeight: "bold" }}>{u.status === "active" ? "Deactivate" : "Activate"}</button>
                        <button onClick={() => handleDelete(u)} style={{ padding: "6px 10px", background: "#ff0000", color: "#fff", border: "none", borderRadius: "4px", cursor: "pointer", fontSize: 12, fontWeight: "bold" }}>Delete</button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
            {filteredUsers.length === 0 && <p style={{ padding: 20, textAlign: "center", color: "#e6edf3" }}>No users found.</p>}
          </div>
        </div>
      )}

      {!loading && view === "matches" && (
        <div style={{ display: "flex", flexDirection: "column", gap: 12 }}>
          {matches.map(m => (
            <div key={m.id} style={{ display: "flex", justifyContent: "space-between", alignItems: "center", background: "#010409", padding: "16px 20px", borderRadius: 12, border: "1px solid #30363d", flexWrap: "wrap", gap: 12 }}>
              <div style={{ flex: 1 }}>
                <div style={{ fontSize: 12, color: "#e6edf3", fontWeight: "bold", marginBottom: 4 }}>Group {m.group_name} · {new Date(m.match_date).toLocaleDateString()}</div>
                <div style={{ fontSize: 18, fontFamily: "Barlow Condensed", fontWeight: "bold" }}>
                  {m.home_flag} {m.home_team} <span style={{ color: "#ec7a26" }}>{m.result_home ?? "-"} : {m.result_away ?? "-"}</span> {m.away_team} {m.away_flag}
                </div>
                {m.result_home !== null && <div style={{ fontSize: 11, color: "#00ff87", marginTop: 4 }}>✓ Result entered. Points calculated.</div>}
              </div>
              <div style={{ display: "flex", gap: 8, flexShrink: 0 }}>
                <button onClick={() => handleToggleLock(m)} style={{ padding: "8px 16px", background: m.is_locked ? "#5a1a1a" : "#30363d", color: m.is_locked ? "#ff6b6b" : "#8b949e", border: "none", borderRadius: 6, cursor: "pointer", fontWeight: "bold", fontSize: 13 }}>
                  {m.is_locked ? "🔒 Unlock" : "🔓 Lock"}
                </button>
                <button onClick={() => handleSetResult(m)} disabled={!m.is_locked} style={{ padding: "8px 16px", background: !m.is_locked ? "#0d1117" : "#484f58", color: !m.is_locked ? "#30363d" : "#fff", border: "none", borderRadius: 6, cursor: !m.is_locked ? "not-allowed" : "pointer", fontWeight: "bold", fontSize: 13, minWidth: 120 }}>
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
    <div style={{ minHeight: "100vh", background: "#0b0f14", display: "flex", alignItems: "center", justifyContent: "center", fontFamily: "'Barlow', sans-serif", padding: "20px" }}>
      <style>{`
        @import url('https://fonts.googleapis.com/css2?family=Barlow:wght@400;600&family=Barlow+Condensed:ital,wght@1,800;0,800;0,700&display=swap');
        .auth-input { width: 100%; padding: 14px 16px; border-radius: 10px; border: 1.5px solid #30363d; background: #010409; color: #fff; font-family: Barlow, sans-serif; font-size: 15px; outline: none; transition: border-color 0.2s, box-shadow 0.2s; box-sizing: border-box; }
        .auth-input:focus { border-color: #ec7a26; box-shadow: 0 0 0 3px #ec7a2618; }
        .auth-input::placeholder { color: #484f58; }
        .auth-btn-main { width: 100%; padding: 15px; border: none; border-radius: 10px; font-family: Barlow Condensed, sans-serif; font-size: 17px; font-weight: 800; letter-spacing: 1px; cursor: pointer; transition: opacity 0.2s, transform 0.1s; }
        .auth-btn-main:hover:not(:disabled) { opacity: 0.88; transform: scale(1.01); }
        .auth-btn-main:disabled { opacity: 0.6; cursor: not-allowed; }
        .mode-tab { flex: 1; padding: 10px; border: none; background: transparent; font-family: Barlow Condensed, sans-serif; font-size: 15px; font-weight: 700; letter-spacing: 1px; cursor: pointer; border-bottom: 2px solid transparent; transition: all 0.2s; color: #8b949e; }
        .mode-tab.active { color: #fff; border-bottom-color: #ec7a26; }
        .mode-tab:hover:not(.active) { color: #e6edf3; }
        .google-btn { width: 100%; padding: 13px; background: #fff; color: #222; border: none; border-radius: 10px; font-family: Barlow Condensed, sans-serif; font-size: 16px; font-weight: 700; cursor: pointer; display: flex; align-items: center; justify-content: center; gap: 10px; transition: background 0.2s, transform 0.1s; }
        .google-btn:hover { background: #f0f0f0; transform: scale(1.01); }
        @keyframes spin { to { transform: rotate(360deg); } }
        .spinner { width: 18px; height: 18px; border: 2px solid transparent; border-top-color: #0b0f14; border-radius: 50%; animation: spin 0.7s linear infinite; display: inline-block; }
        @keyframes fadeSlide { from { opacity: 0; transform: translateY(6px); } to { opacity: 1; transform: translateY(0); } }
        .auth-card { background: linear-gradient(135deg, #161b22, #0d1117); border: 1px solid #30363d; border-radius: 24px; padding: 40px 36px; max-width: 420px; width: 100%; animation: fadeSlide 0.4s ease; }
      `}</style>

      <div className="auth-card">
        {/* Logo */}
        <div style={{ textAlign: "center", marginBottom: 24 }}>
          <div style={{ fontSize: 52, marginBottom: 10 }}>⚽</div>
          <h1 style={{ fontFamily: "Barlow Condensed, sans-serif", fontStyle: "italic", fontSize: 38, fontWeight: 800, lineHeight: 1, background: "linear-gradient(135deg, #fff 30%, #ec7a26)", WebkitBackgroundClip: "text", WebkitTextFillColor: "transparent", marginBottom: 6 }}>WORLD CUP 2026<br />PREDICTOR</h1>
          <p style={{ color: "#8b949e", fontSize: 13 }}>Predict matches. Climb the leaderboard. Win glory.</p>
        </div>

        {/* Mode Toggle */}
        <div style={{ display: "flex", borderBottom: "1px solid #30363d", marginBottom: 24 }}>
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
          <button type="submit" className="auth-btn-main" disabled={authLoading} style={{ background: "linear-gradient(135deg, #ec7a26, #c05b11)", color: "#0b0f14", marginTop: 4 }}>
            {authLoading ? <span className="spinner" style={{ borderTopColor: "#0b0f14" }} /> : mode === "login" ? "LOG IN" : "CREATE ACCOUNT"}
          </button>
        </form>

        {/* Divider */}
        <div style={{ display: "flex", alignItems: "center", gap: 12, margin: "20px 0" }}>
          <div style={{ flex: 1, height: 1, background: "#30363d" }} />
          <span style={{ color: "#484f58", fontSize: 12, fontFamily: "Barlow Condensed", letterSpacing: 1 }}>OR</span>
          <div style={{ flex: 1, height: 1, background: "#30363d" }} />
        </div>

        {/* Google */}
        <button className="google-btn" onClick={handleGoogle}>
          <img src="https://www.gstatic.com/firebasejs/ui/2.0.0/images/auth/google.svg" alt="Google" style={{ width: 20, height: 20 }} />
          CONTINUE WITH GOOGLE
        </button>

        {/* Switch mode */}
        <p style={{ textAlign: "center", marginTop: 20, fontSize: 13, color: "#8b949e" }}>
          {mode === "login" ? "Don't have an account?" : "Already have an account?"}{" "}
          <button onClick={() => { setMode(mode === "login" ? "signup" : "login"); setError(""); setSuccess(""); }} style={{ background: "none", border: "none", color: "#ec7a26", cursor: "pointer", fontWeight: 700, fontSize: 13, padding: 0 }}>
            {mode === "login" ? "Sign up" : "Log in"}
          </button>
        </p>
      </div>
    </div>
  );
}

// ─── Helpers ────────────────────────────────
function calculateGroupStandings(matches) {
  const groups = {};

  matches.forEach(m => {
    if (!m.group_name || m.stage !== 'group') return;
    if (!groups[m.group_name]) groups[m.group_name] = {};

    const initTeam = (team, flag) => {
      if (!groups[m.group_name][team]) {
        groups[m.group_name][team] = { name: team, flag, pld: 0, w: 0, d: 0, l: 0, gf: 0, ga: 0, gd: 0, pts: 0 };
      }
    };

    initTeam(m.home_team, m.home_flag);
    initTeam(m.away_team, m.away_flag);

    if (m.result_home !== null && m.result_away !== null) {
      const h = groups[m.group_name][m.home_team];
      const a = groups[m.group_name][m.away_team];

      h.pld++; a.pld++;
      h.gf += m.result_home; h.ga += m.result_away;
      a.gf += m.result_away; a.ga += m.result_home;

      if (m.result_home > m.result_away) { h.w++; h.pts += 3; a.l++; }
      else if (m.result_home < m.result_away) { a.w++; a.pts += 3; h.l++; }
      else { h.d++; a.d++; h.pts += 1; a.pts += 1; }
      
      h.gd = h.gf - h.ga;
      a.gd = a.gf - a.ga;
    }
  });

  return Object.keys(groups).sort().reduce((acc, gn) => {
    acc[gn] = Object.values(groups[gn]).sort((a, b) => {
      if (b.pts !== a.pts) return b.pts - a.pts;
      if (b.gd !== a.gd) return b.gd - a.gd;
      return b.gf - a.gf;
    });
    return acc;
  }, {});
}

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

function getFlagUrl(countryName) {
  const codes = {
    'Mexico': 'mx', 'South Africa': 'za', 'Korea Republic': 'kr', 'Czechia': 'cz',
    'Canada': 'ca', 'Bosnia-Herzegovina': 'ba', 'USA': 'us', 'Paraguay': 'py',
    'Qatar': 'qa', 'Switzerland': 'ch', 'Brazil': 'br', 'Morocco': 'ma',
    'Haiti': 'ht', 'Scotland': 'gb-sct', 'Australia': 'au', 'Türkiye': 'tr',
    'Germany': 'de', 'Curaçao': 'cw', 'Netherlands': 'nl', 'Japan': 'jp',
    'Côte d\'Ivoire': 'ci', 'Ecuador': 'ec', 'Sweden': 'se', 'Tunisia': 'tn',
    'Spain': 'es', 'Cabo Verde': 'cv', 'Belgium': 'be', 'Egypt': 'eg',
    'Saudi Arabia': 'sa', 'Uruguay': 'uy', 'IR Iran': 'ir', 'New Zealand': 'nz',
    'England': 'gb-eng', 'Croatia': 'hr', 'Portugal': 'pt', 'Colombia': 'co',
    'Argentina': 'ar', 'Austria': 'at', 'France': 'fr', 'Senegal': 'sn',
    'Norway': 'no', 'Iraq': 'iq', 'Algeria': 'dz', 'Jordan': 'jo', 'Congo DR': 'cd',
    'Uzbekistan': 'uz', 'Panama': 'pa', 'Ghana': 'gh', 'Oman': 'om'
  };
  const code = codes[countryName] || 'un';
  return `https://flagcdn.com/w80/${code.toLowerCase()}.png`;
}

function formatMatchTimes(dateStr, timeStr) {
  if (!dateStr || !timeStr) return { npt: "TBD", utc: "TBD", date: "TBD" };
  
  const cleanTime = timeStr.includes(':') ? timeStr.split(':').slice(0, 2).join(':') : '00:00';
  const isoStr = `${dateStr}T${cleanTime}:00Z`;
  const date = new Date(isoStr);

  if (isNaN(date.getTime())) return { npt: "TBD", utc: "TBD", date: "TBD" };

  return {
    npt: date.toLocaleTimeString("en-US", { hour: "2-digit", minute: "2-digit", hour12: true, timeZone: "Asia/Kathmandu" }),
    utc: date.toLocaleTimeString("en-US", { hour: "2-digit", minute: "2-digit", hour12: true, timeZone: "UTC" }),
    date: date.toLocaleDateString("en-US", { month: "short", day: "numeric", timeZone: "Asia/Kathmandu" })
  };
}

// ─── Main App ───────────────────────────────
const POPULAR_PLAYERS = [
  { name: "Kylian Mbappé", country: "France" },
  { name: "Vinícius Júnior", country: "Brazil" },
  { name: "Jude Bellingham", country: "England" },
  { name: "Erling Haaland", country: "Norway" },
  { name: "Harry Kane", country: "England" },
  { name: "Lionel Messi", country: "Argentina" },
  { name: "Lamine Yamal", country: "Spain" },
  { name: "Jamal Musiala", country: "Germany" },
  { name: "Kevin De Bruyne", country: "Belgium" },
  { name: "Phil Foden", country: "England" },
  { name: "Rodrygo", country: "Brazil" },
  { name: "Florian Wirtz", country: "Germany" },
  { name: "Julian Alvarez", country: "Argentina" },
  { name: "Cristiano Ronaldo", country: "Portugal" },
  { name: "Rafael Leão", country: "Portugal" },
  { name: "Lautaro Martínez", country: "Argentina" },
  { name: "Bukayo Saka", country: "England" },
  { name: "Antoine Griezmann", country: "France" },
  { name: "Pedri", country: "Spain" },
  { name: "Neymar Jr", country: "Brazil" },
  { name: "Emiliano Martínez", country: "Argentina", isGk: true },
  { name: "Alisson Becker", country: "Brazil", isGk: true },
  { name: "Ederson", country: "Brazil", isGk: true },
  { name: "Gianluigi Donnarumma", country: "Italy", isGk: true },
  { name: "Mike Maignan", country: "France", isGk: true },
  { name: "Thibaut Courtois", country: "Belgium", isGk: true },
  { name: "Jordan Pickford", country: "England", isGk: true },
  { name: "Manuel Neuer", country: "Germany", isGk: true },
  { name: "Unai Simón", country: "Spain", isGk: true },
  { name: "Diogo Costa", country: "Portugal", isGk: true }
];

export default function App() {
  const [tab, setTab] = useState("predict");
  const [user, setUser] = useState(null);
  const [loading, setLoading] = useState(true);
  const [matches, setMatches] = useState([]);
  const [predictions, setPredictions] = useState({});
  const [leaderboard, setLeaderboard] = useState([]);
  const [saving, setSaving] = useState({});
  const [toast, setToast] = useState(null);
  const [showAllMatches, setShowAllMatches] = useState(false);
  const [search, setSearch] = useState("");
  const [selectedMatch, setSelectedMatch] = useState(null);
  const [showBracket, setShowBracket] = useState(false);
  const [hubTab, setHubTab] = useState("groups"); // groups | knockout
  const [bonusPicks, setBonusPicks] = useState({ golden_boot: '', golden_glove: '', player_of_tournament: '' });
  const [savingBonus, setSavingBonus] = useState(false);
  const [focusedInput, setFocusedInput] = useState(null); // For autocomplete dropdowns

  const showToast = (msg, type = "success") => {
    setToast({ msg, type });
    setTimeout(() => setToast(null), 3000);
  };

  useEffect(() => {
    const { data: { subscription } } = onAuthChange(async (authUser) => {
      if (authUser) {
        const profile = await getCurrentUser();
        setUser(profile);
        
        // Only auto-redirect if no hash exists
        if (!window.location.hash) {
          const defaultTab = profile?.role === "superAdmin" ? "admin" : "predict";
          setTab(defaultTab);
          window.history.replaceState(null, "", `#${defaultTab}`);
        }
      } else {
        setUser(null);
      }
      setLoading(false);
    });
    return () => subscription.unsubscribe();
  }, []);

  // Sync tab with URL hash
  useEffect(() => {
    const handleHashChange = () => {
      const hash = window.location.hash.replace("#", "");
      if (hash && ["predict", "bonus", "groups", "leaderboard", "scoring", "admin"].includes(hash)) {
        setTab(hash);
      }
    };

    window.addEventListener("popstate", handleHashChange);
    handleHashChange(); // Initial sync

    return () => window.removeEventListener("popstate", handleHashChange);
  }, []);

  const switchTab = (tabId) => {
    setTab(tabId);
    window.history.pushState(null, "", `#${tabId}`);
  };

  useEffect(() => { getMatches().then(setMatches).catch(console.error); }, []);

  useEffect(() => {
    if (!user) return;
    
    // Fetch match predictions
    getUserPredictions(user.id).then(data => {
      const map = {};
      data.forEach(p => { map[p.match_id] = p; });
      setPredictions(map);
    }).catch(console.error);

    // Fetch bonus predictions
    import("./supabase").then(({ getBonusPicks }) => {
      getBonusPicks(user.id).then(setBonusPicks).catch(console.error);
    });
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

  const handleSave = async (matchId) => {
    const pred = predictions[matchId];
    if (!pred || pred.predicted_home === undefined || pred.predicted_away === undefined ||
        pred.predicted_home === "" || pred.predicted_away === "") {
      showToast("Enter both scores first!", "error");
      return;
    }
    setSaving(s => ({ ...s, [matchId]: true }));
    try {
      const savedData = await savePrediction({ userId: user.id, matchId, predictedHome: parseInt(pred.predicted_home), predictedAway: parseInt(pred.predicted_away) });
      
      // Update local state with the returned data (including the ID)
      setPredictions(p => ({ 
        ...p, 
        [matchId]: { ...p[matchId], ...savedData } 
      }));
      
      showToast("Prediction saved! 💾");
    } catch (err) {
      showToast(err.message || "Failed to save.", "error");
    } finally {
      setSaving(s => ({ ...s, [matchId]: false }));
    }
  };

  const handleSaveBonus = async () => {
    setSavingBonus(true);
    try {
      const { saveBonusPicks } = await import("./supabase");
      const savedData = await saveBonusPicks(user.id, bonusPicks);
      setBonusPicks(savedData);
      showToast("Tournament picks saved! 🌟");
    } catch (err) {
      showToast(err.message || "Failed to save tournament picks.", "error");
    } finally {
      setSavingBonus(false);
    }
  };

  const totalPredicted = Object.values(predictions).filter(p => p.locked).length;
  const userLeaderboardEntry = leaderboard.find(l => l.id === user?.id);
  const isTournamentStarted = matches.some(m => m.is_locked);

  if (loading) return (
    <div style={{ minHeight: "100vh", background: "#0b0f14", display: "flex", alignItems: "center", justifyContent: "center" }}>
      <div style={{ fontFamily: "Barlow Condensed, sans-serif", color: "#ec7a26", fontSize: 22, fontWeight: 800, letterSpacing: 2 }}>LOADING...</div>
    </div>
  );

  if (!user) return <AuthScreen />;

  return (
    <div style={{ minHeight: "100vh", background: "#0b0f14", fontFamily: "'Barlow', sans-serif", color: "#fff", position: "relative" }}>
      <style>{`
        @import url('https://fonts.googleapis.com/css2?family=Barlow:wght@400;500;600&family=Barlow+Condensed:ital,wght@0,700;0,800;1,800&display=swap');
        * { box-sizing: border-box; margin: 0; padding: 0; }
        ::-webkit-scrollbar { width: 4px; }
        ::-webkit-scrollbar-track { background: #0d1a2e; }
        ::-webkit-scrollbar-thumb { background: #1e3a5f; border-radius: 2px; }
        input[type=number]::-webkit-inner-spin-button { -webkit-appearance: none; }
        input[type=number] { -moz-appearance: textfield; }
        .tab-btn { padding: 10px 24px; border: none; background: transparent; color: #8b949e; font-family: 'Barlow Condensed', sans-serif; font-size: 15px; font-weight: 700; letter-spacing: 1px; text-transform: uppercase; cursor: pointer; border-bottom: 3px solid transparent; transition: all 0.2s; }
        .tab-btn.active { color: #fff; border-bottom-color: #ec7a26; }
        .tab-btn:hover:not(.active) { color: #e6edf3; }
        .match-card { background: linear-gradient(135deg, #161b22 0%, #0d1117 100%); border: 1px solid #30363d; border-radius: 16px; padding: 20px 24px; margin-bottom: 16px; transition: border-color 0.2s, transform 0.2s; position: relative; overflow: hidden; }
        .match-card::before { content: ''; position: absolute; top: 0; left: 0; right: 0; height: 2px; background: linear-gradient(90deg, transparent, #ec7a2644, transparent); }
        .match-card:hover { border-color: #484f58; transform: translateY(-1px); }
        .match-card.locked { border-color: #1a3a1a; }
        .match-card.locked::before { background: linear-gradient(90deg, transparent, #00ff8744, transparent); }
        .score-input { width: 56px; height: 56px; background: #010409; border: 2px solid #30363d; border-radius: 10px; color: #fff; font-family: 'Barlow Condensed', sans-serif; font-size: 28px; font-weight: 800; text-align: center; outline: none; transition: border-color 0.2s; }
        .score-input:focus { border-color: #ec7a26; box-shadow: 0 0 0 3px #ec7a2622; }
        .score-input:disabled { opacity: 0.5; cursor: not-allowed; }
        .submit-btn { padding: 10px 20px; background: linear-gradient(135deg, #ec7a26, #c05b11); border: none; border-radius: 8px; color: #0b0f14; font-family: 'Barlow Condensed', sans-serif; font-size: 14px; font-weight: 800; letter-spacing: 1px; text-transform: uppercase; cursor: pointer; transition: opacity 0.2s, transform 0.1s; }
        .submit-btn:hover { opacity: 0.9; transform: scale(1.02); }
        .submit-btn:disabled { opacity: 0.5; cursor: not-allowed; transform: none; }
        .toast { position: fixed; bottom: 24px; left: 50%; transform: translateX(-50%); padding: 12px 24px; border-radius: 10px; font-weight: 600; font-size: 14px; z-index: 1000; animation: slideUp 0.3s ease; pointer-events: none; }
        .toast.success { background: #0d2a1a; border: 1px solid #00ff87; color: #00ff87; }
        .toast.error { background: #2a0d0d; border: 1px solid #ff6b6b; color: #ff6b6b; }
        @keyframes slideUp { from { opacity: 0; transform: translateX(-50%) translateY(10px); } to { opacity: 1; transform: translateX(-50%) translateY(0); } }
        @keyframes pulse { 0%, 100% { opacity: 1; } 50% { opacity: 0.4; } }
        .score-input-sm { 
          width: 44px; 
          height: 44px; 
          background: #0b0f14; 
          border: 1.5px solid #484f58; 
          border-radius: 10px; 
          color: #fff; 
          font-family: 'Barlow Condensed', sans-serif; 
          font-size: 24px; 
          font-weight: 800; 
          text-align: center; 
          outline: none; 
          transition: all 0.2s cubic-bezier(0.4, 0, 0.2, 1); 
          box-shadow: inset 0 2px 8px rgba(0,0,0,0.5);
        }
        .score-input-sm:focus { 
          border-color: #04844d; 
          background: #161b22;
          box-shadow: 0 0 15px rgba(4, 132, 77, 0.2), inset 0 2px 4px rgba(0,0,0,0.5);
          transform: scale(1.05);
        }
        .score-input-sm:disabled {
          opacity: 1;
          background: #0b0f14;
          border-color: #30363d;
          color: #04844d;
          cursor: default;
          box-shadow: none;
        }
        .lock-btn-sm { width: 100%; background: linear-gradient(135deg, #04844d, #025832); border: none; border-radius: 10px; color: #0b0f14; font-family: 'Barlow Condensed', sans-serif; font-weight: 800; font-size: 13px; cursor: pointer; transition: all 0.2s; box-shadow: 0 4px 12px rgba(4, 132, 77, 0.2); }
        .lock-btn-sm:hover { transform: translateY(-2px); box-shadow: 0 6px 16px rgba(4, 132, 77, 0.3); }
        .match-card-hover:hover { border-color: #ec7a2655 !important; transform: translateY(-2px); z-index: 10; }
        .score-box-container {
          display: flex; 
          flex-direction: column; 
          align-items: center; 
          background: linear-gradient(180deg, rgba(22, 27, 34, 0.9) 0%, rgba(13, 17, 23, 0.95) 100%); 
          padding: 12px; 
          border-radius: 18px; 
          border: 1px solid #484f58;
          box-shadow: 0 8px 32px rgba(0,0,0,0.4), inset 0 1px 1px rgba(255,255,255,0.05);
          backdrop-filter: blur(8px);
          transition: all 0.3s;
          min-width: 80px;
          gap: 4px;
        }
        .score-box-container.locked { background: linear-gradient(180deg, rgba(0, 255, 135, 0.05) 0%, rgba(0, 255, 135, 0.1) 100%); border-color: rgba(0, 255, 135, 0.3); }
        .score-box-container:focus-within {
          border-color: #04844d66;
          box-shadow: 0 8px 32px rgba(0,0,0,0.5), 0 0 15px rgba(4, 132, 77, 0.1);
        }

        /* Mobile Adjustments */
        @media (max-width: 768px) {
          .match-card-container { grid-template-columns: 1fr !important; }
          .match-card-content { flex-direction: column !important; gap: 20px !important; }
          .match-card-row { width: 100% !important; }
          .score-box-container { flex-direction: row !important; width: 100% !important; min-width: auto !important; padding: 12px 20px !important; justify-content: space-between !important; }
          .score-box-container > div { flex-direction: row !important; gap: 12px !important; width: auto !important; }
          .lock-btn-sm { width: 80px !important; }
          .tab-bar { overflow-x: auto !important; padding-bottom: 4px !important; }
          .tab-bar::-webkit-scrollbar { display: none; }
          .stats-bar { flex-direction: column !important; }
          .stats-card { width: 100% !important; }
          .hub-header { height: auto !important; padding: 20px !important; flex-direction: column !important; gap: 16px !important; }
          .hub-header > div { width: 100% !important; }
          .hub-tabs { overflow-x: auto !important; width: 100% !important; }
          .hub-search-container { width: 100% !important; }
          .hub-search-container input { width: 100% !important; }
          .group-grid { grid-template-columns: 1fr !important; }
          .leaderboard-row { grid-template-columns: 35px 1fr 40px 0px 60px !important; gap: 4px !important; }
          .leaderboard-col-hide { display: none !important; }
        }
      `}</style>

      {/* Flashy World Cup Background */}
      <div style={{ position: "fixed", inset: 0, pointerEvents: "none", zIndex: -1 }}>
        <div style={{ position: "absolute", inset: 0, backgroundImage: "url('/bg_image.png')", backgroundSize: "cover", backgroundPosition: "center", opacity: 0.5 }} />
        {/* Dark overlay to ensure readability while letting the image pop */}
        <div style={{ position: "absolute", inset: 0, background: "linear-gradient(to bottom, rgba(11, 15, 20, 0.7) 0%, rgba(11, 15, 20, 0.95) 100%)" }} />
      </div>

      <div style={{ position: "relative", maxWidth: 680, margin: "0 auto", padding: "0 16px 80px" }}>

        {/* Header */}
        <div style={{ padding: "28px 0 20px", textAlign: "center" }}>
          <div style={{ display: "flex", justifyContent: "flex-end", marginBottom: 12 }}>
            <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
              <span style={{ fontSize: 13, color: "#8b949e" }}>{user.username}</span>
              <button onClick={signOut} style={{ padding: "6px 14px", background: "#0b0f14", border: "1px solid #30363d", borderRadius: 8, color: "#8b949e", fontSize: 12, cursor: "pointer", fontFamily: "Barlow Condensed", fontWeight: 700 }}>SIGN OUT</button>
            </div>
          </div>

          <h1 style={{ fontFamily: "'Barlow Condensed', sans-serif", fontSize: "clamp(36px, 8vw, 56px)", fontWeight: 900, fontStyle: "italic", lineHeight: 1.1, margin: 0, paddingBottom: 8 }}>
            <span style={{ display: "block", background: "linear-gradient(135deg, #04844d, #025832)", WebkitBackgroundClip: "text", WebkitTextFillColor: "transparent" }}>FIFA WORLD CUP 26™</span>
            <span style={{ display: "block", background: "linear-gradient(135deg, #ec7a26, #c05b11)", WebkitBackgroundClip: "text", WebkitTextFillColor: "transparent" }}>PREDICT & WIN</span>
          </h1>

          <div className="stats-bar" style={{ display: "flex", justifyContent: "center", gap: 16, marginTop: 20, flexWrap: "wrap" }}>
            {[
              { label: "Your Points", value: userLeaderboardEntry?.total_points ?? user.total_points ?? 0, color: "#ec7a26" },
              { label: "Rank", value: userLeaderboardEntry ? `#${userLeaderboardEntry.rank}` : "—", color: "#8b949e" },
              { label: "Predicted", value: `${totalPredicted}/${matches.length}`, color: "#04844d" },
            ].map(s => (
              <div key={s.label} className="stats-card" style={{ background: "#161b22", border: "1px solid #30363d", borderRadius: 12, padding: "10px 20px", textAlign: "center" }}>
                <div style={{ color: s.color, fontFamily: "Barlow Condensed", fontSize: 26, fontWeight: 800 }}>{s.value}</div>
                <div style={{ color: "#8b949e", fontSize: 11, letterSpacing: 1, textTransform: "uppercase", marginTop: 2 }}>{s.label}</div>
              </div>
            ))}
          </div>
        </div>

        {/* Tabs */}
        <div className="tab-bar" style={{ display: "flex", borderBottom: "1px solid #30363d", marginBottom: 24, gap: 4, overflowX: "auto", whiteSpace: "nowrap", scrollbarWidth: "none" }}>
          {[{ id: "predict", label: "🎯 Predict" }, { id: "bonus", label: "🌟 Picks" }, { id: "groups", label: "🏁 Groups" }, { id: "leaderboard", label: "🏆 Leaderboard" }, { id: "scoring", label: "📋 Scoring" }]
            .concat(user?.role === "superAdmin" ? [{ id: "admin", label: "⚙️ Admin" }] : [])
            .map(t => (
              <button key={t.id} className={`tab-btn ${tab === t.id ? "active" : ""}`} onClick={() => switchTab(t.id)}>{t.label}</button>
            ))}
        </div>

        {/* ── PREDICT TAB ── */}
        {tab === "predict" && (
          <div style={{ maxWidth: 1000, margin: "0 auto" }}>
            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 24, flexWrap: "wrap", gap: 16 }}>
              <h2 style={{ fontFamily: "Barlow Condensed", fontSize: 32, fontStyle: "italic", fontWeight: 800 }}>Matches</h2>
              
              <div style={{ display: "flex", gap: 12, flex: 1, minWidth: 300, justifyContent: "flex-end" }}>
                <input 
                  type="text" 
                  placeholder="Search team or stadium..." 
                  value={search}
                  onChange={(e) => setSearch(e.target.value)}
                  style={{ background: "#010409", border: "1px solid #30363d", borderRadius: 8, padding: "8px 16px", color: "#fff", flex: 1, maxWidth: 300, outline: "none", fontSize: 14 }}
                />
                <button 
                  onClick={() => setShowBracket(true)}
                  style={{ background: "#0b0f14", border: "1px solid #30363d", borderRadius: 8, color: "#ec7a26", fontSize: 11, fontWeight: 800, padding: "6px 12px", cursor: "pointer", fontFamily: "Barlow Condensed" }}
                >
                  VIEW FULL SCHEDULE
                </button>
              </div>
            </div>

            {(() => {
              const upcoming = matches
                .filter(m => m.result_home === null)
                .sort((a, b) => new Date(`${a.match_date}T${a.match_time}`) - new Date(`${b.match_date}T${b.match_time}`));
              
              const filtered = (showAllMatches ? matches : upcoming).filter(m => 
                m.home_team.toLowerCase().includes(search.toLowerCase()) ||
                m.away_team.toLowerCase().includes(search.toLowerCase()) ||
                m.venue.toLowerCase().includes(search.toLowerCase())
              );

              // Group by date (converted to Nepal Time)
              const groups = {};
              filtered.forEach(m => {
                const nTime = formatMatchTimes(m.match_date, m.match_time);
                const header = `${m.stage === 'group' ? 'Group Stage' : 'Knockout Stage'} · ${nTime.date}`;
                if (!groups[header]) groups[header] = [];
                groups[header].push({ ...m, nTime });
              });

              if (filtered.length === 0) return <p style={{ color: "#8b949e", textAlign: "center", padding: 40 }}>No matches found.</p>;
              
              return Object.entries(groups).map(([header, matchGroup]) => (
                <div key={header} style={{ marginBottom: 32 }}>
                  <div style={{ background: "#30363d", padding: "10px 20px", borderRadius: "8px 8px 0 0", fontFamily: "Barlow Condensed", fontSize: 18, fontWeight: 700, color: "#e6edf3", marginBottom: 16 }}>
                    {header}
                  </div>
                  <div className="match-card-container" style={{ display: "grid", gridTemplateColumns: "repeat(auto-fill, minmax(450px, 1fr))", gap: 16 }}>
                    {matchGroup.map(match => {
                      const pred = predictions[match.id] || {};
                      const isLocked = match.is_locked;
                      const hasSaved = pred.id !== undefined; // If it has an ID, it's from the database
                      const hasResult = match.result_home !== null && match.result_away !== null;
                      const pts = hasResult && pred.predicted_home !== undefined ? calcPoints(pred, match) : null;
                      
                      return (
                        <div key={match.id} onClick={() => setSelectedMatch(match)} style={{ background: "#161b22", border: "1px solid #30363d", borderRadius: 12, padding: "16px 20px", position: "relative", transition: "transform 0.2s", cursor: "pointer" }} className="match-card-hover">
                          <div style={{ display: "flex", justifyContent: "space-between", marginBottom: 16 }}>
                            <div style={{ fontSize: 11, color: "#8b949e", fontWeight: 800, textTransform: "uppercase", letterSpacing: 1 }}>Group {match.group_name}</div>
                            <div style={{ textAlign: "right" }}>
                              <div style={{ fontSize: 13, fontWeight: 800, color: "#fff" }}>
                                {match.nTime.npt} <span style={{ color: "#8b949e", fontWeight: 500, fontSize: 11 }}>NPT</span>
                              </div>
                              <div style={{ fontSize: 10, color: "#8b949e", fontWeight: 700 }}>
                                {match.nTime.utc} <span style={{ fontWeight: 500 }}>UTC</span>
                              </div>
                            </div>
                          </div>

                          <div className="match-card-content" style={{ display: "flex", alignItems: "center", gap: 24 }}>
                            {/* Team & Score Section */}
                            <div className="match-card-row" style={{ flex: 1, display: "flex", flexDirection: "column", gap: 20 }}>
                              {/* Home Team Row */}
                              <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between" }}>
                                <div style={{ display: "flex", alignItems: "center", gap: 14 }}>
                                  <img src={getFlagUrl(match.home_team)} alt="" style={{ width: 32, height: 22, borderRadius: 3, objectFit: "cover", border: "1px solid #30363d" }} />
                                  <span style={{ fontFamily: "Barlow Condensed", fontWeight: 700, fontSize: 20, color: "#fff" }}>{match.home_team}</span>
                                </div>
                                <input 
                                  type="number" 
                                  className="score-input-sm" 
                                  value={pred.predicted_home ?? ""} 
                                  disabled={isLocked} 
                                  onChange={e => handleInput(match.id, "home", e.target.value)} 
                                  placeholder="-" 
                                  onClick={e => e.stopPropagation()}
                                />
                              </div>

                              {/* Away Team Row */}
                              <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between" }}>
                                <div style={{ display: "flex", alignItems: "center", gap: 14 }}>
                                  <img src={getFlagUrl(match.away_team)} alt="" style={{ width: 32, height: 22, borderRadius: 3, objectFit: "cover", border: "1px solid #30363d" }} />
                                  <span style={{ fontFamily: "Barlow Condensed", fontWeight: 700, fontSize: 20, color: "#away_team" }}>{match.away_team}</span>
                                </div>
                                <input 
                                  type="number" 
                                  className="score-input-sm" 
                                  value={pred.predicted_away ?? ""} 
                                  disabled={isLocked} 
                                  onChange={e => handleInput(match.id, "away", e.target.value)} 
                                  placeholder="-" 
                                  onClick={e => e.stopPropagation()}
                                />
                              </div>
                            </div>

                            {/* Lock Section */}
                            <div onClick={e => e.stopPropagation()} className={`score-box-container ${isLocked ? 'locked' : ''}`}>
                              {!isLocked ? (
                                <div style={{ display: "flex", flexDirection: "column", alignItems: "center", gap: 6 }}>
                                  <button className="lock-btn-sm" onClick={() => handleSave(match.id)} disabled={saving[match.id]}>
                                    {saving[match.id] ? "..." : "SAVE"}
                                  </button>
                                  {hasSaved && <span style={{ fontSize: 9, color: "#00ff87", fontWeight: 800 }}>✓ SAVED</span>}
                                </div>
                              ) : (
                                <div style={{ 
                                  fontSize: 9, 
                                  color: "#ff6b6b", 
                                  fontWeight: 900, 
                                  letterSpacing: 1,
                                  display: "flex",
                                  flexDirection: "column",
                                  alignItems: "center",
                                  gap: 4
                                }}>
                                  <span style={{ fontSize: 16 }}>🔒</span>
                                  <span>LOCKED</span>
                                </div>
                              )}
                            </div>
                          </div>

                          <div style={{ marginTop: 12, paddingTop: 10, borderTop: "1px solid #30363d", display: "flex", justifyContent: "space-between", alignItems: "center" }}>
                            <span style={{ fontSize: 10, color: "#8b949e", fontWeight: 700 }}>🏟️ {match.venue}</span>
                            {pts && (
                              <div style={{ padding: "4px 8px", background: pts.color + "11", border: `1px solid ${pts.color}33`, borderRadius: 6, color: pts.color, fontSize: 10, fontWeight: 800 }}>
                                +{pts.pts} PTS
                              </div>
                            )}
                          </div>
                          
                          {hasResult && !pts && (
                            <div style={{ marginTop: 8, textAlign: "center", fontSize: 11, color: "#8b949e", fontWeight: 600 }}>
                              FT: {match.result_home} - {match.result_away}
                            </div>
                          )}
                        </div>
                      );
                    })}
                  </div>
                </div>
              ));
            })()}
          </div>
        )}

        {/* ── BONUS TAB ── */}
        {tab === "bonus" && (
          <div style={{ maxWidth: 800, margin: "0 auto" }}>
            <div style={{ textAlign: "center", marginBottom: 40 }}>
              <h2 style={{ fontFamily: "Barlow Condensed", fontSize: 32, fontWeight: 800, color: "#ec7a26", textTransform: "uppercase", margin: 0 }}>Tournament Predictor</h2>
              <p style={{ color: "#8b949e", fontSize: 14 }}>
                {isTournamentStarted 
                  ? "The tournament has started! These picks are now locked." 
                  : "Predict the ultimate winners before the tournament kicks off!"}
              </p>
            </div>

            <div style={{ display: "grid", gap: 24 }}>
              {[
                { key: 'golden_boot', title: 'Golden Boot Winner', desc: 'Top Goalscorer of the Tournament', icon: '⚽', isGk: false },
                { key: 'golden_glove', title: 'Golden Glove Winner', desc: 'Best Goalkeeper of the Tournament', icon: '🧤', isGk: true },
                { key: 'player_of_tournament', title: 'Golden Ball Winner', desc: 'Best Player of the Tournament', icon: '🌟', isGk: false }
              ].map(pick => {
                const value = bonusPicks[pick.key];
                const isOpen = focusedInput === pick.key;
                
                // Filter players based on input and whether it's the GK award
                const filteredPlayers = value ? POPULAR_PLAYERS.filter(p => 
                  p.name.toLowerCase().includes(value.toLowerCase()) && 
                  (pick.isGk ? p.isGk : true)
                ).slice(0, 5) : [];

                return (
                  <div key={pick.key} style={{ position: "relative", zIndex: isOpen ? 100 : 1, background: "linear-gradient(135deg, #161b22, #0d1117)", border: "1px solid #30363d", borderRadius: 16, padding: "20px 24px", display: "flex", alignItems: "center", gap: 20, flexWrap: "wrap", boxShadow: isOpen ? "0 10px 40px rgba(0,0,0,0.5)" : "none", transition: "all 0.2s" }}>
                    <div style={{ fontSize: 36, background: "#0b0f14", width: 70, height: 70, borderRadius: "50%", display: "flex", alignItems: "center", justifyContent: "center", border: "1px solid #484f58", flexShrink: 0 }}>
                      {pick.icon}
                    </div>
                    <div style={{ flex: 1, minWidth: "250px" }}>
                      <div style={{ fontFamily: "Barlow Condensed", fontSize: 22, fontWeight: 800, color: "#fff", marginBottom: 4 }}>{pick.title}</div>
                      <div style={{ fontSize: 12, color: "#8b949e", marginBottom: 12 }}>{pick.desc}</div>
                      
                      <div style={{ position: "relative" }}>
                        <input 
                          type="text" 
                          placeholder={pick.isGk ? "Enter goalkeeper name..." : "Enter player name..."}
                          value={value}
                          onChange={e => setBonusPicks(prev => ({ ...prev, [pick.key]: e.target.value }))}
                          onFocus={() => !isTournamentStarted && setFocusedInput(pick.key)}
                          onBlur={() => setTimeout(() => setFocusedInput(null), 200)}
                          disabled={isTournamentStarted}
                          style={{ width: "100%", background: isTournamentStarted ? "#0d1117" : "#010409", border: "1px solid #484f58", borderRadius: 8, padding: "12px 16px", color: isTournamentStarted ? "#8b949e" : "#fff", fontSize: 16, fontFamily: "Barlow Condensed", fontWeight: 700, outline: "none", transition: "border-color 0.2s", cursor: isTournamentStarted ? "not-allowed" : "text" }}
                          onMouseOver={e => !isTournamentStarted && (e.target.style.borderColor = "#ec7a26")}
                          onMouseOut={e => !isTournamentStarted && (e.target.style.borderColor = focusedInput === pick.key ? "#ec7a26" : "#484f58")}
                        />
                        
                        {/* Custom Autocomplete Dropdown */}
                        {isOpen && !isTournamentStarted && filteredPlayers.length > 0 && (
                          <div style={{ position: "absolute", top: "100%", left: 0, right: 0, marginTop: 4, background: "#010409", border: "1px solid #ec7a26", borderRadius: 8, zIndex: 50, overflow: "hidden", boxShadow: "0 8px 32px rgba(0,0,0,0.5)" }}>
                            {filteredPlayers.map(p => (
                              <div 
                                key={p.name}
                                onClick={() => {
                                  setBonusPicks(prev => ({ ...prev, [pick.key]: p.name }));
                                  setFocusedInput(null);
                                }}
                                style={{ padding: "12px 16px", display: "flex", alignItems: "center", gap: 12, cursor: "pointer", borderBottom: "1px solid #30363d", transition: "background 0.2s" }}
                                onMouseOver={e => e.currentTarget.style.background = "#161b22"}
                                onMouseOut={e => e.currentTarget.style.background = "transparent"}
                              >
                                <img src={getFlagUrl(p.country)} alt={p.country} style={{ width: 24, height: 16, borderRadius: 2, objectFit: "cover" }} />
                                <span style={{ fontFamily: "Barlow Condensed", fontSize: 16, fontWeight: 700, color: "#fff" }}>{p.name}</span>
                                <span style={{ fontSize: 11, color: "#8b949e", marginLeft: "auto" }}>{p.country}</span>
                              </div>
                            ))}
                          </div>
                        )}
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>

            <div style={{ marginTop: 40, textAlign: "center" }}>
              <button 
                onClick={handleSaveBonus} 
                disabled={savingBonus || isTournamentStarted}
                style={{ background: isTournamentStarted ? "#30363d" : "linear-gradient(135deg, #ec7a26, #c05b11)", border: "none", borderRadius: 12, padding: "16px 40px", color: isTournamentStarted ? "#8b949e" : "#0b0f14", fontFamily: "Barlow Condensed", fontSize: 18, fontWeight: 900, cursor: isTournamentStarted ? "not-allowed" : "pointer", transition: "transform 0.2s", boxShadow: isTournamentStarted ? "none" : "0 8px 24px rgba(236, 122, 38, 0.2)" }}
                onMouseOver={e => !isTournamentStarted && (e.currentTarget.style.transform = "translateY(-2px)")}
                onMouseOut={e => !isTournamentStarted && (e.currentTarget.style.transform = "translateY(0)")}
              >
                {isTournamentStarted ? "🔒 PICKS LOCKED" : (savingBonus ? "SAVING..." : "LOCK IN TOURNAMENT PICKS")}
              </button>
            </div>
          </div>
        )}

        {/* ── GROUPS TAB ── */}
        {tab === "groups" && (
          <div className="group-grid" style={{ display: "grid", gridTemplateColumns: "1fr", gap: 32 }}>
            {(() => {
              const groupData = calculateGroupStandings(matches);
              return Object.entries(groupData).map(([groupName, teams]) => (
                <div key={groupName} style={{ background: "linear-gradient(135deg, #161b22 0%, #0d1117 100%)", border: "1px solid #30363d", borderRadius: 16, overflow: "hidden" }}>
                  <div style={{ padding: "16px 20px", background: "#30363d", display: "flex", justifyContent: "space-between", alignItems: "center" }}>
                    <h3 style={{ fontFamily: "Barlow Condensed", fontSize: 24, fontWeight: 800, fontStyle: "italic", color: "#ec7a26", margin: 0 }}>GROUP {groupName}</h3>
                    <div style={{ fontSize: 11, color: "#8b949e", fontWeight: 700, textTransform: "uppercase", letterSpacing: 1 }}>Official Standings</div>
                  </div>
                  <div style={{ overflowX: "auto" }}>
                    <table style={{ width: "100%", borderCollapse: "collapse", textAlign: "left", fontSize: 13 }}>
                      <thead>
                        <tr style={{ color: "#8b949e", borderBottom: "1px solid #30363d" }}>
                          <th style={{ padding: "12px 16px", fontWeight: 700 }}>POS</th>
                          <th style={{ padding: "12px 16px", fontWeight: 700 }}>TEAM</th>
                          <th style={{ padding: "12px 8px", textAlign: "center", fontWeight: 700 }}>PLD</th>
                          <th style={{ padding: "12px 8px", textAlign: "center", fontWeight: 700 }}>GD</th>
                          <th style={{ padding: "12px 16px", textAlign: "center", fontWeight: 700, color: "#ec7a26" }}>PTS</th>
                        </tr>
                      </thead>
                      <tbody>
                        {teams.map((team, idx) => (
                          <tr key={team.name} style={{ borderBottom: idx === teams.length - 1 ? "none" : "1px solid #010409", background: idx < 2 ? "#00ff8705" : "transparent" }}>
                            <td style={{ padding: "16px", fontWeight: 800, color: idx < 2 ? "#00ff87" : "#8b949e" }}>{idx + 1}</td>
                            <td style={{ padding: "16px" }}>
                              <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
                                <img src={getFlagUrl(team.name)} alt="" style={{ width: 24, height: 16, borderRadius: 2, objectFit: "cover", border: "1px solid #30363d" }} />
                                <span style={{ fontWeight: 700, fontFamily: "Barlow Condensed", fontSize: 16 }}>{team.name}</span>
                              </div>
                            </td>
                            <td style={{ padding: "16px 8px", textAlign: "center", color: "#fff", fontWeight: 600 }}>{team.pld}</td>
                            <td style={{ padding: "16px 8px", textAlign: "center", color: team.gd > 0 ? "#00ff87" : team.gd < 0 ? "#ff6b6b" : "#8b949e", fontWeight: 600 }}>{team.gd > 0 ? `+${team.gd}` : team.gd}</td>
                            <td style={{ padding: "16px", textAlign: "center" }}>
                              <span style={{ display: "inline-block", background: "#ec7a2622", color: "#ec7a26", padding: "4px 10px", borderRadius: 6, fontWeight: 800, fontSize: 15, fontFamily: "Barlow Condensed" }}>{team.pts}</span>
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                  {teams.length > 0 && (
                    <div style={{ padding: "10px 16px", background: "#01040933", borderTop: "1px solid #30363d", display: "flex", gap: 12 }}>
                      <div style={{ display: "flex", alignItems: "center", gap: 4 }}>
                        <div style={{ width: 8, height: 8, borderRadius: 2, background: "#00ff87" }}></div>
                        <span style={{ fontSize: 10, color: "#8b949e", textTransform: "uppercase", fontWeight: 700 }}>Promotion Zone</span>
                      </div>
                    </div>
                  )}
                </div>
              ));
            })()}
          </div>
        )}

        {/* ── LEADERBOARD TAB ── */}
        {tab === "leaderboard" && (
          <div>
            <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: 20 }}>
              <div style={{ fontFamily: "Barlow Condensed", fontSize: 13, color: "#8b949e", letterSpacing: 1, textTransform: "uppercase" }}>
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
              const colors = ["#e6edf3", "#ec7a26", "#cd7f32"];
              const ranks = [2, 1, 3];
              return (
                <div style={{ display: "flex", justifyContent: "center", alignItems: "flex-end", marginBottom: 28, padding: "0 8px" }}>
                  {top3.map((player, i) => (
                    <div key={player.id} style={{ flex: 1, display: "flex", flexDirection: "column", alignItems: "center", gap: 8 }}>
                      <div style={{ fontSize: 28 }}>{player.avatar_emoji}</div>
                      <div style={{ fontFamily: "Barlow Condensed", fontWeight: 700, fontSize: 14, color: player.id === user?.id ? "#00ff87" : "#fff", textAlign: "center", maxWidth: 90, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>{player.username}</div>
                      <div style={{ fontFamily: "Barlow Condensed", fontWeight: 900, fontSize: 22, color: colors[i] }}>{player.total_points}<span style={{ fontSize: 12 }}>pts</span></div>
                      <div style={{ width: "100%", height: heights[i], display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "flex-start", paddingTop: 14, background: `linear-gradient(180deg, ${colors[i]}22 0%, #161b22 100%)`, border: `1px solid ${colors[i]}44`, borderBottom: "none", borderRadius: "12px 12px 0 0" }}>
                        <span style={{ fontSize: 28 }}>{medals[i]}</span>
                        <span style={{ fontFamily: "Barlow Condensed", fontWeight: 800, fontSize: 18, color: colors[i] }}>#{ranks[i]}</span>
                      </div>
                    </div>
                  ))}
                </div>
              );
            })()}

            <div className="leaderboard-row" style={{ display: "grid", gridTemplateColumns: "40px 1fr 60px 70px 70px", gap: 8, padding: "8px 16px", marginBottom: 4 }}>
              {["Rank", "Player", "Exact", "Correct", "Points"].map((h, i) => (
                <div key={h} className={i === 3 ? "leaderboard-col-hide" : ""} style={{ fontSize: 11, color: "#484f58", fontFamily: "Barlow Condensed", textTransform: "uppercase", letterSpacing: 1, textAlign: i >= 2 ? "center" : i === 4 ? "right" : "left" }}>{h}</div>
              ))}
            </div>

            {leaderboard.length === 0 && <p style={{ color: "#8b949e", textAlign: "center", padding: 40 }}>No players yet. Be the first!</p>}
            {leaderboard.map(player => {
              const isMe = player.id === user?.id;
              const isTop3 = player.rank <= 3;
              const rankColors = { 1: "#ec7a26", 2: "#e6edf3", 3: "#cd7f32" };
              return (
                <div key={player.id} className="leaderboard-row" style={{ display: "grid", gridTemplateColumns: "40px 1fr 60px 70px 70px", gap: 8, alignItems: "center", padding: "12px 16px", borderRadius: 12, marginBottom: 6, background: isMe ? "linear-gradient(135deg, #0d2a1a, #0a1e14)" : isTop3 ? "linear-gradient(135deg, #161b22, #0d1117)" : "#0a1420", border: isMe ? "1px solid #1a5a2a" : isTop3 ? `1px solid ${rankColors[player.rank]}33` : "1px solid #111e30", boxShadow: isMe ? "0 0 16px #00ff8710" : "none" }}>
                  <div style={{ width: 32, height: 32, borderRadius: "50%", display: "flex", alignItems: "center", justifyContent: "center", fontFamily: "Barlow Condensed", fontSize: isTop3 ? 18 : 14, fontWeight: 800, background: player.rank === 1 ? "linear-gradient(135deg, #ec7a26, #c05b11)" : player.rank === 2 ? "#30363d" : player.rank === 3 ? "linear-gradient(135deg, #a0522d, #7a3b1e)" : "transparent", color: isTop3 ? "#fff" : "#484f58", border: isTop3 ? "none" : "1px solid #30363d" }}>
                    {player.rank <= 3 ? ["🥇", "🥈", "🥉"][player.rank - 1] : player.rank}
                  </div>
                  <div style={{ display: "flex", alignItems: "center", gap: 8, minWidth: 0 }}>
                    <span style={{ fontSize: 20, flexShrink: 0 }}>{player.avatar_emoji}</span>
                    <div style={{ fontFamily: "Barlow Condensed", fontWeight: 700, fontSize: 15, color: isMe ? "#00ff87" : isTop3 ? rankColors[player.rank] : "#fff", overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>
                      {player.username}
                    </div>
                  </div>
                  <div style={{ textAlign: "center", fontFamily: "Barlow Condensed", fontWeight: 700, fontSize: 16, color: "#00ff87" }}>{player.exact_scores}</div>
                  <div className="leaderboard-col-hide" style={{ textAlign: "center", fontFamily: "Barlow Condensed", fontWeight: 700, fontSize: 16, color: "#87ceeb" }}>{player.correct_outcomes}</div>
                  <div style={{ textAlign: "right" }}>
                    <span style={{ fontFamily: "Barlow Condensed", fontWeight: 900, fontSize: 20, color: isMe ? "#00ff87" : isTop3 ? rankColors[player.rank] : "#fff" }}>{player.total_points}</span>
                  </div>
                </div>
              );
            })}
            <div style={{ textAlign: "center", marginTop: 20, display: "flex", alignItems: "center", justifyContent: "center", gap: 8 }}>
              <span style={{ width: 7, height: 7, borderRadius: "50%", background: "#00ff87", display: "inline-block", boxShadow: "0 0 6px #00ff87" }} />
              <span style={{ fontSize: 12, color: "#484f58" }}>Leaderboard updates automatically after every match result</span>
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
              <div key={item.pts} style={{ display: "flex", gap: 16, alignItems: "flex-start", background: "#161b22", border: "1px solid #30363d", borderRadius: 12, padding: "16px 20px", marginBottom: 12 }}>
                <div style={{ fontFamily: "Barlow Condensed", fontWeight: 800, fontSize: 28, color: item.color, minWidth: 48, textAlign: "center", lineHeight: 1 }}>
                  {item.pts}<span style={{ fontSize: 14 }}>pts</span>
                </div>
                <div>
                  <div style={{ fontWeight: 700, fontSize: 15, marginBottom: 4 }}>{item.label}</div>
                  <div style={{ fontSize: 13, color: "#8b949e", marginBottom: 6 }}>{item.desc}</div>
                  <div style={{ display: "inline-block", background: "#010409", border: `1px solid ${item.color}44`, borderRadius: 6, padding: "4px 12px", fontSize: 12, color: item.color, fontFamily: "Barlow Condensed", fontWeight: 700 }}>{item.example}</div>
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

      {/* ── TOURNAMENT BRACKET OVERLAY ── */}
      {/* ── TOURNAMENT HUB OVERLAY ── */}
      {showBracket && (
        <div style={{ position: "fixed", inset: 0, background: "#0b0f14", zIndex: 3000, overflow: "hidden", display: "flex", flexDirection: "column" }}>
          <style>{`
            .hub-tab-btn { padding: 12px 24px; border: none; background: transparent; color: #8b949e; font-family: 'Barlow Condensed', sans-serif; font-size: 16px; font-weight: 700; letter-spacing: 1px; cursor: pointer; border-bottom: 3px solid transparent; transition: all 0.2s; }
            .hub-tab-btn.active { color: #ec7a26; border-bottom-color: #ec7a26; }
            .bracket-card { background: linear-gradient(135deg, #161b22, #0d1117); border: 1px solid #30363d; border-radius: 12px; padding: 12px 16px; box-shadow: 0 4px 20px rgba(0,0,0,0.3); transition: transform 0.2s, border-color 0.2s; z-index: 2; width: 220px; height: 90px; display: flex; flex-direction: column; justify-content: center; }
            .bracket-card:hover { border-color: #ec7a26; transform: scale(1.05); }
            .bracket-line { position: absolute; background: #30363d; z-index: 1; }
            .bracket-scroll::-webkit-scrollbar { height: 6px; }
            .bracket-scroll::-webkit-scrollbar-track { background: #0b0f14; }
            .bracket-scroll::-webkit-scrollbar-thumb { background: #30363d; border-radius: 3px; }
          `}</style>
          
          {/* Hub Header */}
          <div className="hub-header" style={{ padding: "0 40px", borderBottom: "1px solid #30363d", background: "#161b22", position: "relative" }}>
            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", height: 100, flexWrap: "wrap" }}>
              <div style={{ display: "flex", flexDirection: "column", gap: 4 }}>
                <h2 style={{ fontFamily: "Barlow Condensed", fontSize: 28, fontWeight: 800, fontStyle: "italic", margin: 0, color: "#fff", letterSpacing: 1 }}>TOURNAMENT HUB</h2>
                <div className="hub-tabs" style={{ display: "flex", gap: 16, marginTop: 4 }}>
                  <button className={`hub-tab-btn ${hubTab === "groups" ? "active" : ""}`} onClick={() => setHubTab("groups")} style={{ fontSize: 13, padding: "8px 12px" }}>GROUPS</button>
                  <button className={`hub-tab-btn ${hubTab === "knockout" ? "active" : ""}`} onClick={() => setHubTab("knockout")} style={{ fontSize: 13, padding: "8px 12px" }}>BRACKET</button>
                </div>
              </div>
              
              <div className="hub-search-container" style={{ display: "flex", alignItems: "center", gap: 12 }}>
                <div style={{ position: "relative" }}>
                  <input 
                    type="text" 
                    placeholder="Search teams..." 
                    value={search}
                    onChange={(e) => setSearch(e.target.value)}
                    style={{ background: "#010409", border: "1px solid #30363d", borderRadius: 20, padding: "8px 36px 8px 14px", color: "#fff", width: 180, outline: "none", fontSize: 12 }}
                  />
                  <span style={{ position: "absolute", right: 12, top: "50%", transform: "translateY(-50%)", fontSize: 12, opacity: 0.5 }}>🔍</span>
                </div>
                <button onClick={() => setShowBracket(false)} style={{ background: "rgba(255,255,255,0.05)", border: "none", borderRadius: "50%", width: 36, height: 36, color: "#fff", fontSize: 20, cursor: "pointer" }}>×</button>
              </div>
            </div>
          </div>

          {/* Hub Content */}
          <div className="bracket-scroll" style={{ flex: 1, overflow: "auto", background: "radial-gradient(circle at 50% 50%, #161b22 0%, #0b0f14 100%)" }}>
            
            {hubTab === "groups" ? (
              <div style={{ padding: "20px", maxWidth: 1400, margin: "0 auto" }}>
                <div className="group-grid" style={{ display: "grid", gridTemplateColumns: "repeat(auto-fill, minmax(300px, 1fr))", gap: 16 }}>
                  {(() => {
                    const groupData = calculateGroupStandings(matches);
                    return Object.entries(groupData).map(([gn, teams]) => {
                      const groupMatches = matches.filter(m => m.group_name === gn && (
                        m.home_team.toLowerCase().includes(search.toLowerCase()) ||
                        m.away_team.toLowerCase().includes(search.toLowerCase())
                      ));
                      if (search && groupMatches.length === 0) return null;

                      return (
                        <div key={gn} style={{ background: "rgba(13, 30, 53, 0.4)", backdropFilter: "blur(10px)", border: "1px solid #30363d", borderRadius: 20, padding: 24 }}>
                          <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 20 }}>
                            <h3 style={{ fontFamily: "Barlow Condensed", fontSize: 24, fontWeight: 800, color: "#ec7a26", margin: 0 }}>GROUP {gn}</h3>
                            <span style={{ fontSize: 10, color: "#8b949e", fontWeight: 800, letterSpacing: 1 }}>STANDINGS</span>
                          </div>
                          
                          <div style={{ display: "flex", flexDirection: "column", gap: 12 }}>
                            {teams.slice(0, 4).map((t, i) => (
                              <div key={t.name} style={{ display: "flex", alignItems: "center", gap: 12, padding: "8px 0", borderBottom: i === 3 ? "none" : "1px solid rgba(26, 46, 72, 0.3)" }}>
                                <span style={{ width: 16, fontSize: 12, fontWeight: 800, color: i < 2 ? "#00ff87" : "#8b949e" }}>{i + 1}</span>
                                <img src={getFlagUrl(t.name)} style={{ width: 20, height: 14, borderRadius: 2, objectFit: "cover" }} />
                                <span style={{ flex: 1, fontFamily: "Barlow Condensed", fontWeight: 700, fontSize: 15 }}>{t.name}</span>
                                <span style={{ fontWeight: 800, color: "#ec7a26" }}>{t.pts} <span style={{ fontSize: 9, opacity: 0.5 }}>PTS</span></span>
                              </div>
                            ))}
                          </div>

                          <button 
                            onClick={() => { setHubTab("groups"); setTab("groups"); setShowBracket(false); }}
                            style={{ width: "100%", marginTop: 20, padding: "10px", background: "rgba(236, 122, 38, 0.1)", border: "1px solid rgba(236, 122, 38, 0.2)", borderRadius: 10, color: "#ec7a26", fontSize: 11, fontWeight: 800, cursor: "pointer", fontFamily: "Barlow Condensed" }}
                          >
                            VIEW FULL GROUP DETAILS
                          </button>
                        </div>
                      );
                    });
                  })()}
                </div>
              </div>
            ) : (
              <div style={{ padding: "60px 40px" }}>
                <div style={{ display: "flex", gap: 80, minWidth: "max-content", paddingRight: 40, height: 1800 }}>
                  {(() => {
                    const rounds = [
                      { name: "Round of 32", key: "round_of_32", count: 16, date: "Jun 28 - Jul 03" },
                      { name: "Round of 16", key: "round_of_16", count: 8, date: "Jul 04 - Jul 07" },
                      { name: "Quarter-finals", key: "quarter", count: 4, date: "Jul 09 - Jul 11" },
                      { name: "Semi-finals", key: "semi", count: 2, date: "Jul 14 - Jul 15" },
                      { name: "Final", key: "final", count: 1, date: "Jul 19" }
                    ];

                    return rounds.map((round, rIdx) => {
                      const roundMatches = matches
                        .filter(m => m.stage === round.key)
                        .sort((a, b) => new Date(`${a.match_date}T${a.match_time}`) - new Date(`${b.match_date}T${b.match_time}`));

                      const vGap = rIdx === 0 ? 20 : (rIdx === 1 ? 130 : (rIdx === 2 ? 350 : (rIdx === 3 ? 790 : 0)));
                      const marginTop = rIdx === 0 ? 0 : (rIdx === 1 ? 55 : (rIdx === 2 ? 165 : (rIdx === 3 ? 385 : 825)));

                      return (
                        <div key={round.key} style={{ width: 220, paddingTop: marginTop }}>
                          <div style={{ textAlign: "center", marginBottom: 30, height: 50 }}>
                            <div style={{ fontFamily: "Barlow Condensed", fontSize: 18, fontWeight: 800, color: "#ec7a26", textTransform: "uppercase" }}>{round.name}</div>
                            <div style={{ fontSize: 11, color: "#8b949e", fontWeight: 600 }}>{round.date}</div>
                          </div>
                          
                          <div style={{ display: "flex", flexDirection: "column", gap: vGap }}>
                            {Array.from({ length: round.count }).map((_, mIdx) => {
                              const match = roundMatches[mIdx];
                              return (
                                <div key={mIdx} style={{ position: "relative" }}>
                                  <div className="bracket-card" onClick={() => match && setSelectedMatch(match)} style={{ cursor: match ? "pointer" : "default" }}>
                                    {match ? (
                                      <>
                                        <div style={{ fontSize: 9, color: "#8b949e", fontWeight: 700, marginBottom: 6, display: "flex", justifyContent: "space-between" }}>
                                          <span>{formatMatchTimes(match.match_date, match.match_time).date}</span>
                                          <span>{formatMatchTimes(match.match_date, match.match_time).utc}</span>
                                        </div>
                                        <div style={{ display: "flex", flexDirection: "column", gap: 6 }}>
                                          <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
                                            <img src={getFlagUrl(match.home_team)} style={{ width: 20, height: 14, borderRadius: 2, objectFit: "cover" }} />
                                            <span style={{ fontFamily: "Barlow Condensed", fontSize: 14, fontWeight: 700, color: "#fff", whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis", flex: 1 }}>{match.home_team}</span>
                                            {match.result_home !== null && <span style={{ color: "#ec7a26", fontWeight: 800 }}>{match.result_home}</span>}
                                          </div>
                                          <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
                                            <img src={getFlagUrl(match.away_team)} style={{ width: 20, height: 14, borderRadius: 2, objectFit: "cover" }} />
                                            <span style={{ fontFamily: "Barlow Condensed", fontSize: 14, fontWeight: 700, color: "#fff", whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis", flex: 1 }}>{match.away_team}</span>
                                            {match.result_away !== null && <span style={{ color: "#ec7a26", fontWeight: 800 }}>{match.result_away}</span>}
                                          </div>
                                        </div>
                                      </>
                                    ) : (
                                      <div style={{ textAlign: "center", color: "#484f58", fontFamily: "Barlow Condensed", fontWeight: 700, fontSize: 12 }}>MATCH TBD</div>
                                    )}
                                  </div>

                                  {rIdx < rounds.length - 1 && (
                                    <>
                                      <div className="bracket-line" style={{ right: -40, top: 45, width: 40, height: 2 }} />
                                      {mIdx % 2 === 0 ? (
                                        <>
                                          <div className="bracket-line" style={{ right: -40, top: 45, width: 2, height: (90 + vGap) / 2 + 2 }} />
                                          <div className="bracket-line" style={{ right: -80, top: 45 + (90 + vGap) / 2, width: 40, height: 2 }} />
                                        </>
                                      ) : (
                                        <div className="bracket-line" style={{ right: -40, bottom: 45, width: 2, height: (90 + vGap) / 2 + 2 }} />
                                      )}
                                    </>
                                  )}
                                </div>
                              );
                            })}
                          </div>
                        </div>
                      );
                    });
                  })()}
                </div>
              </div>
            )}
          </div>
        </div>
      )}
      {selectedMatch && (
        <div style={{ position: "fixed", inset: 0, background: "rgba(0,0,0,0.85)", backdropFilter: "blur(8px)", zIndex: 2000, display: "flex", alignItems: "center", justifyContent: "center", padding: 20 }}>
          <div style={{ background: "#161b22", border: "1px solid #ec7a26", borderRadius: 24, maxWidth: 500, width: "100%", maxHeight: "90vh", overflowY: "auto", position: "relative", boxShadow: "0 0 40px rgba(236, 122, 38, 0.2)" }}>
            <button onClick={(e) => { e.stopPropagation(); setSelectedMatch(null); }} style={{ position: "absolute", top: 20, right: 20, background: "#0b0f14", border: "none", color: "#8b949e", fontSize: 24, cursor: "pointer", fontWeight: 800 }}>×</button>
            
            <div style={{ padding: "40px 30px" }} onClick={e => e.stopPropagation()}>
              <div style={{ textAlign: "center", marginBottom: 30 }}>
                <div style={{ fontSize: 13, color: "#ec7a26", fontWeight: 800, textTransform: "uppercase", letterSpacing: 2, marginBottom: 8 }}>Match Insights</div>
                <div style={{ fontFamily: "Barlow Condensed", fontSize: 20, color: "#e6edf3", fontWeight: 700 }}>{selectedMatch.venue}</div>
              </div>

              <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: 40 }}>
                <div style={{ flex: 1, textAlign: "center" }}>
                  <img src={getFlagUrl(selectedMatch.home_team)} style={{ width: 64, height: 44, borderRadius: 6, marginBottom: 10, border: "2px solid #30363d" }} />
                  <div style={{ fontFamily: "Barlow Condensed", fontSize: 22, fontWeight: 800 }}>{selectedMatch.home_team}</div>
                </div>
                <div style={{ fontFamily: "Barlow Condensed", fontSize: 32, fontWeight: 900, color: "#ec7a26", padding: "0 20px", fontStyle: "italic" }}>VS</div>
                <div style={{ flex: 1, textAlign: "center" }}>
                  <img src={getFlagUrl(selectedMatch.away_team)} style={{ width: 64, height: 44, borderRadius: 6, marginBottom: 10, border: "2px solid #30363d" }} />
                  <div style={{ fontFamily: "Barlow Condensed", fontSize: 22, fontWeight: 800 }}>{selectedMatch.away_team}</div>
                </div>
              </div>

              <div style={{ background: "#010409", borderRadius: 16, padding: 20, border: "1px solid #30363d" }}>
                <h4 style={{ fontFamily: "Barlow Condensed", fontSize: 16, color: "#fff", marginBottom: 16, textTransform: "uppercase", letterSpacing: 1, borderBottom: "1px solid #30363d", paddingBottom: 10 }}>Last 5 Head-to-Head</h4>
                
                {(() => {
                  const h2h = {
                    'Mexico-South Africa': [
                      { date: 'Jun 11, 2010', comp: 'World Cup', score: '1 - 1' },
                      { date: 'Jul 08, 2005', comp: 'Gold Cup', score: '1 - 2' },
                      { date: 'Jun 07, 2000', comp: 'US Cup', score: '4 - 2' },
                      { date: 'Oct 06, 1993', comp: 'Friendly', score: '4 - 0' }
                    ],
                    'Korea Republic-Czechia': [
                      { date: 'Jun 05, 2016', comp: 'Friendly', score: '2 - 1' },
                      { date: 'Aug 15, 2001', comp: 'Friendly', score: '0 - 5' },
                      { date: 'May 27, 1998', comp: 'Friendly', score: '2 - 2' }
                    ],
                    'Brazil-Morocco': [
                      { date: 'Mar 25, 2023', comp: 'Friendly', score: '1 - 2' },
                      { date: 'Jun 16, 1998', comp: 'World Cup', score: '3 - 0' },
                      { date: 'Oct 09, 1997', comp: 'Friendly', score: '2 - 0' }
                    ],
                    'Spain-Uruguay': [
                      { date: 'Jun 16, 2013', comp: 'Confed Cup', score: '2 - 1' },
                      { date: 'Feb 06, 2013', comp: 'Friendly', score: '3 - 1' },
                      { date: 'Aug 17, 2005', comp: 'Friendly', score: '2 - 0' }
                    ]
                  };
                  const key = `${selectedMatch.home_team}-${selectedMatch.away_team}`;
                  const keyRev = `${selectedMatch.away_team}-${selectedMatch.home_team}`;
                  const data = h2h[key] || h2h[keyRev] || [];

                  if (data.length === 0) return <div style={{ color: "#8b949e", fontSize: 13, textAlign: "center", padding: "20px 0" }}>Limited historical data available. These teams rarely meet on the world stage.</div>;

                  return data.map((game, i) => (
                    <div key={i} style={{ display: "flex", justifyContent: "space-between", alignItems: "center", padding: "12px 0", borderBottom: i === data.length -1 ? "none" : "1px solid #161b22" }}>
                      <div>
                        <div style={{ fontSize: 13, fontWeight: 700, color: "#fff" }}>{game.score}</div>
                        <div style={{ fontSize: 11, color: "#8b949e" }}>{game.comp}</div>
                      </div>
                      <div style={{ fontSize: 11, color: "#e6edf3", fontWeight: 600 }}>{game.date}</div>
                    </div>
                  ));
                })()}
              </div>

              <div style={{ marginTop: 24, textAlign: "center" }}>
                <button onClick={() => setSelectedMatch(null)} style={{ background: "linear-gradient(135deg, #ec7a26, #c05b11)", border: "none", borderRadius: 8, padding: "12px 30px", color: "#0b0f14", fontFamily: "Barlow Condensed", fontSize: 14, fontWeight: 800, cursor: "pointer", width: "100%" }}>
                  CLOSE INSIGHTS
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
