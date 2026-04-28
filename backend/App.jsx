// ============================================
// App.jsx — Full app with Supabase backend
// Make sure supabase.js is in the same /src folder
// ============================================

import { useState, useEffect, useCallback } from "react";
import {
  supabase,
  signInWithGoogle,
  signOut,
  getCurrentUser,
  onAuthChange,
  getMatches,
  getUserPredictions,
  savePrediction,
  getLeaderboard,
  subscribeToLeaderboard,
} from "./supabase";

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
  const [predictions, setPredictions] = useState({}); // { matchId: { predicted_home, predicted_away } }
  const [leaderboard, setLeaderboard] = useState([]);
  const [saving, setSaving] = useState({});
  const [toast, setToast] = useState(null);

  const showToast = (msg, type = "success") => {
    setToast({ msg, type });
    setTimeout(() => setToast(null), 3000);
  };

  // ── Auth listener ──
  useEffect(() => {
    const { data: { subscription } } = onAuthChange(async (authUser) => {
      if (authUser) {
        const profile = await getCurrentUser();
        setUser(profile);
      } else {
        setUser(null);
      }
      setLoading(false);
    });
    return () => subscription.unsubscribe();
  }, []);

  // ── Load matches ──
  useEffect(() => {
    getMatches().then(setMatches).catch(console.error);
  }, []);

  // ── Load user predictions ──
  useEffect(() => {
    if (!user) return;
    getUserPredictions(user.id).then(data => {
      const map = {};
      data.forEach(p => { map[p.match_id] = p; });
      setPredictions(map);
    }).catch(console.error);
  }, [user]);

  // ── Real-time leaderboard ──
  useEffect(() => {
    getLeaderboard().then(setLeaderboard).catch(console.error);
    const channel = subscribeToLeaderboard(setLeaderboard);
    return () => supabase.removeChannel(channel);
  }, []);

  // ── Handle prediction input ──
  const handleInput = (matchId, side, value) => {
    setPredictions(p => ({
      ...p,
      [matchId]: { ...(p[matchId] || {}), [side === "home" ? "predicted_home" : "predicted_away"]: value }
    }));
  };

  // ── Lock prediction ──
  const handleLock = async (matchId) => {
    const pred = predictions[matchId];
    if (!pred || pred.predicted_home === undefined || pred.predicted_away === undefined ||
        pred.predicted_home === "" || pred.predicted_away === "") {
      showToast("Enter both scores first!", "error");
      return;
    }
    setSaving(s => ({ ...s, [matchId]: true }));
    try {
      await savePrediction({
        userId: user.id,
        matchId,
        predictedHome: parseInt(pred.predicted_home),
        predictedAway: parseInt(pred.predicted_away),
      });
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

  // ─────────────────────────────────────────
  // RENDER
  // ─────────────────────────────────────────
  if (loading) return (
    <div style={{ minHeight: "100vh", background: "#060d1a", display: "flex", alignItems: "center", justifyContent: "center" }}>
      <div style={{ fontFamily: "Barlow Condensed, sans-serif", color: "#c8a84b", fontSize: 22, fontWeight: 800, letterSpacing: 2 }}>LOADING...</div>
    </div>
  );

  // ── LOGIN SCREEN ──
  if (!user) return (
    <div style={{
      minHeight: "100vh", background: "#060d1a",
      display: "flex", alignItems: "center", justifyContent: "center",
      fontFamily: "'Barlow', sans-serif",
    }}>
      <style>{`@import url('https://fonts.googleapis.com/css2?family=Barlow:wght@400;600&family=Barlow+Condensed:ital,wght@1,800;0,800;0,700&display=swap');`}</style>
      <div style={{
        background: "linear-gradient(135deg, #0d1e35, #0a1628)",
        border: "1px solid #1a2e48", borderRadius: 20,
        padding: "48px 40px", textAlign: "center", maxWidth: 400, width: "90%",
      }}>
        <div style={{ fontSize: 56, marginBottom: 16 }}>⚽</div>
        <h1 style={{
          fontFamily: "Barlow Condensed, sans-serif", fontStyle: "italic",
          fontSize: 40, fontWeight: 800, color: "#fff", marginBottom: 8,
          background: "linear-gradient(135deg, #fff 30%, #c8a84b)",
          WebkitBackgroundClip: "text", WebkitTextFillColor: "transparent",
        }}>WORLD CUP 2026<br />PREDICTOR</h1>
        <p style={{ color: "#4a6a8a", fontSize: 14, marginBottom: 32 }}>
          Sign in with your company Google account to play
        </p>
        <button onClick={signInWithGoogle} style={{
          width: "100%", padding: "14px 24px",
          background: "#fff", border: "none", borderRadius: 10,
          display: "flex", alignItems: "center", justifyContent: "center", gap: 12,
          fontFamily: "Barlow, sans-serif", fontWeight: 600, fontSize: 15,
          cursor: "pointer", transition: "opacity 0.2s",
        }}
          onMouseEnter={e => e.target.style.opacity = 0.9}
          onMouseLeave={e => e.target.style.opacity = 1}
        >
          <svg width="20" height="20" viewBox="0 0 48 48">
            <path fill="#FFC107" d="M43.6 20H24v8h11.3C33.6 33.1 29.3 36 24 36c-6.6 0-12-5.4-12-12s5.4-12 12-12c3 0 5.8 1.1 7.9 3l5.7-5.7C34 6.5 29.3 4 24 4 12.9 4 4 12.9 4 24s8.9 20 20 20c11 0 19.7-8 19.7-20 0-1.3-.1-2.7-.1-4z"/>
            <path fill="#FF3D00" d="m6.3 14.7 6.6 4.8C14.6 15.1 18.9 12 24 12c3 0 5.8 1.1 7.9 3l5.7-5.7C34 6.5 29.3 4 24 4 16.3 4 9.7 8.4 6.3 14.7z"/>
            <path fill="#4CAF50" d="M24 44c5.2 0 9.9-1.9 13.5-5l-6.2-5.2C29.5 35.5 26.9 36 24 36c-5.2 0-9.6-2.9-11.3-7.1l-6.5 5C9.6 39.6 16.3 44 24 44z"/>
            <path fill="#1976D2" d="M43.6 20H24v8h11.3c-.9 2.5-2.5 4.6-4.6 6l6.2 5.2C40.9 35.5 44 30.1 44 24c0-1.3-.1-2.7-.4-4z"/>
          </svg>
          Sign in with Google
        </button>
        <p style={{ color: "#2a4060", fontSize: 12, marginTop: 16 }}>
          Only @yourcompany.com accounts can access
        </p>
      </div>
    </div>
  );

  // ── MAIN APP ──
  return (
    <div style={{
      minHeight: "100vh", background: "#060d1a",
      fontFamily: "'Barlow', sans-serif", color: "#fff",
      position: "relative",
    }}>
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
        .leaderboard-row { display: flex; align-items: center; gap: 14px; padding: 14px 20px; border-radius: 12px; margin-bottom: 8px; background: #0d1e35; border: 1px solid #1a2e48; transition: border-color 0.2s; }
        .leaderboard-row.user { background: linear-gradient(135deg, #1a2e10, #0d1e08); border-color: #2a5a1a; box-shadow: 0 0 20px #00ff8715; }
        .toast { position: fixed; bottom: 24px; left: 50%; transform: translateX(-50%); padding: 12px 24px; border-radius: 10px; font-weight: 600; font-size: 14px; z-index: 1000; animation: slideUp 0.3s ease; pointer-events: none; }
        .toast.success { background: #0d2a1a; border: 1px solid #00ff87; color: #00ff87; }
        .toast.error { background: #2a0d0d; border: 1px solid #ff6b6b; color: #ff6b6b; }
        @keyframes slideUp { from { opacity: 0; transform: translateX(-50%) translateY(10px); } to { opacity: 1; transform: translateX(-50%) translateY(0); } }
      `}</style>

      {/* Ambient BG */}
      <div style={{ position: "fixed", inset: 0, pointerEvents: "none", background: "radial-gradient(ellipse 60% 40% at 20% 10%, #1a3a6a22 0%, transparent 60%), radial-gradient(ellipse 50% 40% at 80% 80%, #1a4a1a22 0%, transparent 60%)" }} />

      <div style={{ position: "relative", maxWidth: 680, margin: "0 auto", padding: "0 16px 80px" }}>

        {/* Header */}
        <div style={{ padding: "28px 0 20px", textAlign: "center" }}>
          <div style={{ display: "flex", justifyContent: "flex-end", marginBottom: 12 }}>
            <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
              <span style={{ fontSize: 13, color: "#4a6a8a" }}>{user.username}</span>
              <button onClick={signOut} style={{
                padding: "6px 14px", background: "transparent",
                border: "1px solid #1a2e48", borderRadius: 8,
                color: "#4a6a8a", fontSize: 12, cursor: "pointer",
                fontFamily: "Barlow Condensed", fontWeight: 700,
              }}>SIGN OUT</button>
            </div>
          </div>

          <h1 style={{
            fontFamily: "'Barlow Condensed', sans-serif", fontSize: "clamp(36px, 8vw, 56px)",
            fontWeight: 800, fontStyle: "italic", lineHeight: 1,
            background: "linear-gradient(135deg, #fff 30%, #c8a84b)",
            WebkitBackgroundClip: "text", WebkitTextFillColor: "transparent",
          }}>PREDICT &<br />WIN</h1>

          {/* Stats */}
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
          {[{ id: "predict", label: "🎯 Predict" }, { id: "leaderboard", label: "🏆 Leaderboard" }, { id: "scoring", label: "📋 Scoring" }].map(t => (
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
                      <input type="number" min="0" max="99" className="score-input"
                        value={pred.predicted_home ?? ""}
                        disabled={isLocked}
                        onChange={e => handleInput(match.id, "home", e.target.value)}
                        placeholder="0"
                      />
                      <span style={{ fontFamily: "Barlow Condensed", fontSize: 22, fontWeight: 800, color: "#2a4060" }}>:</span>
                      <input type="number" min="0" max="99" className="score-input"
                        value={pred.predicted_away ?? ""}
                        disabled={isLocked}
                        onChange={e => handleInput(match.id, "away", e.target.value)}
                        placeholder="0"
                      />
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
            {leaderboard.length === 0 && <p style={{ color: "#4a6a8a", textAlign: "center", padding: 40 }}>Loading leaderboard...</p>}
            {leaderboard.map((player) => (
              <div key={player.id} className={`leaderboard-row ${player.id === user?.id ? "user" : ""}`}>
                <div style={{
                  width: 32, height: 32, borderRadius: "50%", display: "flex", alignItems: "center", justifyContent: "center",
                  fontFamily: "Barlow Condensed", fontSize: 15, fontWeight: 800, flexShrink: 0,
                  background: player.rank === 1 ? "linear-gradient(135deg, #c8a84b, #a8882b)" : player.rank === 2 ? "#1a2e48" : player.rank === 3 ? "#2a1a0a" : "#061020",
                  color: player.rank <= 3 ? "#fff" : "#4a6a8a",
                  border: player.rank > 3 ? "1px solid #1a2e48" : "none",
                }}>
                  {player.rank <= 3 ? ["🥇","🥈","🥉"][player.rank - 1] : player.rank}
                </div>
                <div style={{ fontSize: 26 }}>{player.avatar_emoji}</div>
                <div style={{ flex: 1 }}>
                  <div style={{ fontFamily: "Barlow Condensed", fontWeight: 700, fontSize: 17, color: player.id === user?.id ? "#00ff87" : "#fff" }}>
                    {player.username} {player.id === user?.id && <span style={{ fontSize: 12, color: "#2a6a3a" }}>(You)</span>}
                  </div>
                  <div style={{ display: "flex", gap: 8, marginTop: 4 }}>
                    <span style={{ padding: "3px 10px", background: "#061020", borderRadius: 20, fontSize: 12, color: "#4a6a8a" }}>🎯 {player.exact_scores} exact</span>
                    <span style={{ padding: "3px 10px", background: "#061020", borderRadius: 20, fontSize: 12, color: "#4a6a8a" }}>✅ {player.correct_outcomes} correct</span>
                  </div>
                </div>
                <div style={{ textAlign: "right" }}>
                  <div style={{ fontFamily: "Barlow Condensed", fontWeight: 800, fontSize: 22, color: player.id === user?.id ? "#00ff87" : "#fff" }}>{player.total_points}</div>
                  <div style={{ fontSize: 11, color: "#4a6a8a" }}>pts</div>
                </div>
              </div>
            ))}
            <div style={{ textAlign: "center", marginTop: 16, fontSize: 12, color: "#2a4060" }}>
              🔴 Updates live after each match result
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
      </div>

      {toast && <div className={`toast ${toast.type}`}>{toast.msg}</div>}
    </div>
  );
}
