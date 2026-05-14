import { useRef } from "react";
import { motion, useInView } from "framer-motion";

// Reusable scroll-reveal wrapper
function Reveal({ children, delay = 0, direction = "up" }) {
  const ref = useRef(null);
  const isInView = useInView(ref, { once: true, margin: "-60px" });
  const dirs = { up: [40, 0], down: [-40, 0], left: [40, 0], right: [-40, 0] };
  const [from] = dirs[direction] || dirs.up;
  return (
    <motion.div ref={ref}
      initial={{ opacity: 0, y: direction === "up" ? from : 0, x: direction === "left" ? from : direction === "right" ? -from : 0 }}
      animate={isInView ? { opacity: 1, y: 0, x: 0 } : {}}
      transition={{ duration: 0.7, delay, ease: [0.22, 1, 0.36, 1] }}>
      {children}
    </motion.div>
  );
}

// Animated counter
function Counter({ value, suffix = "" }) {
  const ref = useRef(null);
  const isInView = useInView(ref, { once: true });
  return (
    <motion.span ref={ref}
      initial={{ opacity: 0 }}
      animate={isInView ? { opacity: 1 } : {}}
      transition={{ duration: 0.5 }}>
      {isInView ? value : 0}{suffix}
    </motion.span>
  );
}

const FC = "Barlow Condensed, sans-serif";
const F = "Barlow, sans-serif";

export default function HomePage({ user, matches, leaderboard, predictions, totalPredicted, userLeaderboardEntry, switchTab, getFlagUrl, formatMatchTimes }) {
  const upcoming = matches
    .filter(m => m.result_home === null)
    .sort((a, b) => new Date(`${a.match_date}T${a.match_time}`) - new Date(`${b.match_date}T${b.match_time}`))
    .slice(0, 3);

  const top7 = leaderboard.slice(0, 7);

  return (
    <div style={{ overflow: "hidden" }}>

      {/* ═══ HERO ═══ */}
      <section style={{ minHeight: "70vh", display: "flex", alignItems: "center", position: "relative", padding: "60px 0 40px" }}>
        {/* Floating particles */}
        {[...Array(5)].map((_, i) => (
          <motion.div key={i}
            style={{ position: "absolute", width: 6, height: 6, borderRadius: "50%", background: i % 2 === 0 ? "#ec7a26" : "#04844d", opacity: 0.4, top: `${15 + i * 18}%`, left: `${60 + i * 8}%` }}
            animate={{ y: [0, -20, 0], opacity: [0.2, 0.6, 0.2] }}
            transition={{ duration: 3 + i, repeat: Infinity, ease: "easeInOut" }}
          />
        ))}

        <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", width: "100%", flexWrap: "wrap", gap: 40 }}>
          {/* Left text */}
          <div style={{ flex: 1, minWidth: 320 }}>
            <Reveal>
              <div style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: 20 }}>
                <span style={{ width: 8, height: 8, borderRadius: "50%", background: "#ec7a26", display: "inline-block" }} />
                <span style={{ fontFamily: FC, fontSize: 12, fontWeight: 700, letterSpacing: 3, textTransform: "uppercase", color: "#9CA3AF" }}>FIFA WORLD CUP · USA · CANADA · MEXICO</span>
              </div>
            </Reveal>

            <Reveal delay={0.1}>
              <h1 style={{ fontFamily: FC, fontWeight: 900, fontStyle: "italic", fontSize: "clamp(48px, 7vw, 80px)", lineHeight: 0.95, margin: "0 0 8px" }}>
                YOUR PICKS.
              </h1>
            </Reveal>
            <Reveal delay={0.2}>
              <h1 style={{ fontFamily: FC, fontWeight: 900, fontStyle: "italic", fontSize: "clamp(48px, 7vw, 80px)", lineHeight: 0.95, margin: "0 0 8px" }}>
                YOUR <span style={{ color: "#ec7a26" }}>GLORY.</span>
              </h1>
            </Reveal>
            <Reveal delay={0.3}>
              <h1 style={{ fontFamily: FC, fontWeight: 900, fontStyle: "italic", fontSize: "clamp(48px, 7vw, 80px)", lineHeight: 0.95, margin: "0 0 24px", color: "#333", WebkitTextStroke: "1px #444" }}>
                YOUR CUP.
              </h1>
            </Reveal>

            <Reveal delay={0.4}>
              <p style={{ fontFamily: F, fontSize: 15, color: "#9CA3AF", lineHeight: 1.7, maxWidth: 460, marginBottom: 32 }}>
                The ultimate FIFA World Cup 2026 score-prediction arena. Lock in scores, stack points, climb the global leaderboard and walk away with glory.
              </p>
            </Reveal>

            <Reveal delay={0.5}>
              <div style={{ display: "flex", gap: 16, flexWrap: "wrap" }}>
                <motion.button whileHover={{ scale: 1.04 }} whileTap={{ scale: 0.97 }}
                  onClick={() => switchTab("predict")}
                  style={{ background: "#04844d", color: "#fff", border: "none", borderRadius: 10, padding: "14px 32px", fontFamily: FC, fontSize: 15, fontWeight: 800, letterSpacing: 1, cursor: "pointer", display: "flex", alignItems: "center", gap: 8 }}>
                  MAKE YOUR PREDICTION <span>→</span>
                </motion.button>
                <motion.button whileHover={{ scale: 1.04 }} whileTap={{ scale: 0.97 }}
                  onClick={() => switchTab("leaderboard")}
                  style={{ background: "transparent", color: "#fff", border: "1px solid #333", borderRadius: 10, padding: "14px 28px", fontFamily: FC, fontSize: 15, fontWeight: 800, letterSpacing: 1, cursor: "pointer", display: "flex", alignItems: "center", gap: 8 }}>
                  VIEW LEADERBOARD <span style={{ fontSize: 12 }}>↗</span>
                </motion.button>
              </div>
            </Reveal>

            {/* Stats row */}
            <Reveal delay={0.6}>
              <div style={{ display: "flex", gap: 40, marginTop: 48 }}>
                {[
                  { value: `${matches.length}`, label: "MATCHES", suffix: "" },
                  { value: "48", label: "TEAMS", suffix: "" },
                  { value: `${leaderboard.length}`, label: "PREDICTORS", suffix: "+" },
                ].map(s => (
                  <div key={s.label}>
                    <div style={{ fontFamily: FC, fontSize: 36, fontWeight: 900, color: "#fff" }}>
                      <Counter value={s.value} suffix={s.suffix} />
                    </div>
                    <div style={{ fontFamily: FC, fontSize: 11, fontWeight: 700, letterSpacing: 2, color: "#666", marginTop: 2 }}>{s.label}</div>
                  </div>
                ))}
              </div>
            </Reveal>
          </div>

          {/* Right — football image */}
          <motion.div style={{ flex: "0 0 auto", position: "relative" }}
            initial={{ opacity: 0, scale: 0.8, rotate: -10 }}
            animate={{ opacity: 1, scale: 1, rotate: 0 }}
            transition={{ duration: 1.2, delay: 0.3, ease: [0.22, 1, 0.36, 1] }}>
            <motion.div
              style={{ width: "clamp(260px, 30vw, 420px)", aspectRatio: "1", borderRadius: "50%", overflow: "hidden", position: "relative" }}
              animate={{ y: [0, -12, 0] }}
              transition={{ duration: 4, repeat: Infinity, ease: "easeInOut" }}
            >
              <img src="/hero-football.png" alt="World Cup Ball"
                style={{ width: "100%", height: "100%", objectFit: "cover", display: "block" }}
              />
              {/* Feathered edge to blend into page background */}
              <div style={{ position: "absolute", inset: 0, borderRadius: "50%", boxShadow: "inset 0 0 40px 20px #0a0a0a", pointerEvents: "none" }} />
            </motion.div>
          </motion.div>
        </div>
      </section>

      {/* ═══ MARQUEE ═══ */}
      <Reveal>
        <div style={{ overflow: "hidden", borderTop: "1px solid #222", borderBottom: "1px solid #222", padding: "14px 0", margin: "20px 0 60px" }}>
          <motion.div
            animate={{ x: ["0%", "-50%"] }}
            transition={{ duration: 20, repeat: Infinity, ease: "linear" }}
            style={{ display: "flex", gap: 60, width: "max-content" }}>
            {[...Array(2)].flatMap((_, r) => [
              "PREDICT. SCORE. WIN.",
              "⭐ 48 TEAMS · 104 MATCHES · 1 CHAMPION ⭐",
              `USA 26   CANADA 26   MEXICO 26`,
              "PREDICT. SCORE. WIN.",
              "⭐ 48 TEAMS · 104 MATCHES · 1 CHAMPION ⭐",
              `USA 26   CANADA 26   MEXICO 26`,
            ].map((text, i) => (
              <span key={`${r}-${i}`} style={{ fontFamily: FC, fontSize: 14, fontWeight: 800, letterSpacing: 2, textTransform: "uppercase", color: text.includes("⭐") ? "#ec7a26" : "#555", whiteSpace: "nowrap" }}>{text}</span>
            )))}
          </motion.div>
        </div>
      </Reveal>

      {/* ═══ THREE STEPS ═══ */}
      <section style={{ marginBottom: 80 }}>
        <Reveal>
          <div style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: 12 }}>
            <span style={{ fontSize: 14 }}>⚡</span>
            <span style={{ fontFamily: FC, fontSize: 11, fontWeight: 700, letterSpacing: 3, color: "#04844d", textTransform: "uppercase" }}>The Game Plan</span>
          </div>
        </Reveal>
        <Reveal delay={0.1}>
          <h2 style={{ fontFamily: FC, fontWeight: 900, fontStyle: "italic", fontSize: "clamp(40px, 5vw, 68px)", lineHeight: 0.95, marginBottom: 40 }}>
            THREE STEPS TO<br /><span style={{ background: "#ec7a26", color: "#000", padding: "2px 12px", display: "inline-block" }}>GLORY.</span>
          </h2>
        </Reveal>

        <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(280px, 1fr))", gap: 20 }}>
          {[
            { num: "01", title: "PREDICT", desc: "Lock in your exact scores, goalscorers and outcomes before kickoff. Every match is a chance.", icon: "🎯", gradient: "rgba(236,122,38,0.08)" },
            { num: "02", title: "SCORE", desc: "Bag points for correct results, exact scores, MOTM and bonus calls. Streaks multiply your haul.", icon: "⚡", gradient: "rgba(4,132,77,0.08)" },
            { num: "03", title: "WIN", desc: "Surge up the global leaderboard. Exact scores earn 5pts, goal diff 3pts, correct outcome 1pt.", icon: "🏆", gradient: "rgba(212,168,67,0.08)" },
          ].map((step, i) => (
            <Reveal key={step.num} delay={i * 0.15}>
              <motion.div whileHover={{ y: -4, borderColor: "#444" }}
                style={{ background: "#111", border: "1px solid #222", borderRadius: 16, padding: "32px 28px", position: "relative", overflow: "hidden", cursor: "default", transition: "border-color 0.3s", height: "100%" }}>
                <div style={{ position: "absolute", inset: 0, background: `radial-gradient(circle at bottom right, ${step.gradient}, transparent 70%)`, pointerEvents: "none" }} />
                <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", marginBottom: 24, position: "relative" }}>
                  <span style={{ fontFamily: FC, fontSize: 48, fontWeight: 900, color: "#222" }}>{step.num}</span>
                  <span style={{ fontSize: 24, background: "#1a1a1a", width: 44, height: 44, borderRadius: "50%", display: "flex", alignItems: "center", justifyContent: "center", border: "1px solid #333" }}>{step.icon}</span>
                </div>
                <h3 style={{ fontFamily: FC, fontSize: 28, fontWeight: 900, marginBottom: 10, position: "relative" }}>{step.title}</h3>
                <p style={{ fontFamily: F, fontSize: 14, color: "#888", lineHeight: 1.7, position: "relative" }}>{step.desc}</p>
              </motion.div>
            </Reveal>
          ))}
        </div>
      </section>

      {/* ═══ NEXT MATCHES ═══ */}
      <section style={{ marginBottom: 80 }}>
        <Reveal>
          <div style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: 12 }}>
            <span style={{ fontSize: 14 }}>📅</span>
            <span style={{ fontFamily: FC, fontSize: 11, fontWeight: 700, letterSpacing: 3, color: "#9CA3AF", textTransform: "uppercase" }}>Upcoming Fixtures · Lock Predictions Before Kickoff</span>
          </div>
        </Reveal>
        <Reveal delay={0.1}>
          <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-end", marginBottom: 32, flexWrap: "wrap", gap: 16 }}>
            <h2 style={{ fontFamily: FC, fontWeight: 900, fontStyle: "italic", lineHeight: 0.95, margin: 0 }}>
              <span style={{ fontSize: "clamp(40px, 5vw, 64px)", display: "block" }}>NEXT <span style={{ color: "#ec7a26" }}>MATCHES</span></span>
              <span style={{ fontSize: "clamp(40px, 5vw, 64px)", color: "#333", display: "block" }}>ON THE PITCH</span>
            </h2>
            <motion.button whileHover={{ scale: 1.03 }} whileTap={{ scale: 0.97 }}
              onClick={() => switchTab("predict")}
              style={{ background: "transparent", border: "1px solid #333", borderRadius: 8, padding: "10px 20px", color: "#fff", fontFamily: FC, fontSize: 13, fontWeight: 700, letterSpacing: 1, cursor: "pointer" }}>
              VIEW ALL {matches.length} MATCHES →
            </motion.button>
          </div>
        </Reveal>

        <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(290px, 1fr))", gap: 16 }}>
          {upcoming.map((match, i) => {
            const nTime = formatMatchTimes(match.match_date, match.match_time);
            return (
              <Reveal key={match.id} delay={i * 0.12}>
                <motion.div whileHover={{ y: -4, borderColor: "#ec7a26" }}
                  style={{ background: "#111", border: "1px solid #222", borderRadius: 16, padding: "24px", cursor: "pointer", transition: "border-color 0.3s" }}
                  onClick={() => switchTab("predict")}>
                  <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 20 }}>
                    <span style={{ fontFamily: FC, fontSize: 11, fontWeight: 700, letterSpacing: 2, color: "#666", textTransform: "uppercase" }}>GROUP {match.group_name}</span>
                    <span style={{ fontFamily: FC, fontSize: 11, fontWeight: 700, color: "#ec7a26" }}>{nTime.date}</span>
                  </div>

                  <div style={{ display: "flex", alignItems: "center", justifyContent: "space-around", marginBottom: 20 }}>
                    <div style={{ textAlign: "center" }}>
                      <img src={getFlagUrl(match.home_team)} alt="" style={{ width: 40, height: 28, borderRadius: 4, objectFit: "cover", marginBottom: 8, boxShadow: "0 2px 8px rgba(0,0,0,0.4)" }} />
                      <div style={{ fontFamily: FC, fontWeight: 800, fontSize: 14, textTransform: "uppercase" }}>{match.home_team}</div>
                    </div>
                    <span style={{ fontFamily: FC, fontSize: 16, color: "#555", fontWeight: 700 }}>VS</span>
                    <div style={{ textAlign: "center" }}>
                      <img src={getFlagUrl(match.away_team)} alt="" style={{ width: 40, height: 28, borderRadius: 4, objectFit: "cover", marginBottom: 8, boxShadow: "0 2px 8px rgba(0,0,0,0.4)" }} />
                      <div style={{ fontFamily: FC, fontWeight: 800, fontSize: 14, textTransform: "uppercase" }}>{match.away_team}</div>
                    </div>
                  </div>

                  <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", paddingTop: 16, borderTop: "1px solid #222" }}>
                    <div>
                      <div style={{ fontFamily: FC, fontSize: 10, fontWeight: 700, letterSpacing: 1, color: "#666", textTransform: "uppercase" }}>Kickoff</div>
                      <div style={{ fontFamily: FC, fontSize: 14, fontWeight: 800, color: "#fff" }}>{nTime.npt} <span style={{ color: "#666", fontSize: 10 }}>NPT</span></div>
                    </div>
                    <motion.div whileHover={{ scale: 1.05 }}
                      style={{ background: "#04844d", color: "#fff", borderRadius: 8, padding: "8px 18px", fontFamily: FC, fontSize: 12, fontWeight: 800, letterSpacing: 1 }}>
                      PREDICT →
                    </motion.div>
                  </div>
                </motion.div>
              </Reveal>
            );
          })}
        </div>
      </section>

      {/* ═══ GLOBAL STANDINGS ═══ */}
      <section style={{ marginBottom: 80 }}>
        <div style={{ display: "flex", gap: 60, flexWrap: "wrap" }}>
          {/* Left */}
          <div style={{ flex: "0 0 340px", minWidth: 280 }}>
            <Reveal>
              <div style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: 12 }}>
                <span style={{ fontSize: 14 }}>📈</span>
                <span style={{ fontFamily: FC, fontSize: 11, fontWeight: 700, letterSpacing: 3, color: "#9CA3AF", textTransform: "uppercase" }}>Live · Updated Every Match</span>
              </div>
            </Reveal>
            <Reveal delay={0.1}>
              <h2 style={{ fontFamily: FC, fontWeight: 900, fontStyle: "italic", fontSize: "clamp(40px, 5vw, 64px)", lineHeight: 0.95, marginBottom: 20 }}>
                GLOBAL<br />
                <span>STAND</span><span style={{ color: "#ec7a26" }}>IN</span><span style={{ color: "#04844d" }}>GS.</span>
              </h2>
            </Reveal>
            <Reveal delay={0.2}>
              <p style={{ fontFamily: F, fontSize: 14, color: "#888", lineHeight: 1.7, marginBottom: 24 }}>
                The world's sharpest football brains, ranked in real time. Every perfect call pushes you closer to the top.
              </p>
            </Reveal>
            <Reveal delay={0.3}>
              <motion.button whileHover={{ scale: 1.03 }} whileTap={{ scale: 0.97 }}
                onClick={() => switchTab("leaderboard")}
                style={{ background: "transparent", border: "1px solid #333", borderRadius: 8, padding: "12px 24px", color: "#fff", fontFamily: FC, fontSize: 13, fontWeight: 700, letterSpacing: 1, cursor: "pointer" }}>
                SEE FULL TABLE →
              </motion.button>
            </Reveal>
          </div>

          {/* Right — leaderboard preview */}
          <div style={{ flex: 1, minWidth: 320 }}>
            <Reveal delay={0.15}>
              <div style={{ background: "#111", border: "1px solid #222", borderRadius: 16, overflow: "hidden" }}>
                <div style={{ display: "flex", justifyContent: "space-between", padding: "14px 20px", borderBottom: "1px solid #222" }}>
                  <span style={{ fontFamily: FC, fontSize: 13, fontWeight: 800, letterSpacing: 1, color: "#ec7a26", textTransform: "uppercase" }}>🏆 Top Predictors</span>
                  <div style={{ display: "flex", gap: 20 }}>
                    <span style={{ fontFamily: FC, fontSize: 11, fontWeight: 700, color: "#666", letterSpacing: 1 }}>PTS</span>
                  </div>
                </div>
                {top7.length === 0 && <div style={{ padding: 30, textAlign: "center", color: "#666", fontFamily: FC }}>No players yet — be the first!</div>}
                {top7.map((player, i) => (
                  <motion.div key={player.id}
                    initial={{ opacity: 0, x: 20 }}
                    animate={{ opacity: 1, x: 0 }}
                    transition={{ delay: 0.3 + i * 0.08 }}
                    style={{ display: "flex", alignItems: "center", gap: 14, padding: "14px 20px", borderBottom: i === top7.length - 1 ? "none" : "1px solid #1a1a1a", background: player.id === user?.id ? "rgba(4,132,77,0.08)" : "transparent" }}>
                    <span style={{ fontFamily: FC, fontSize: 16, fontWeight: 900, color: i === 0 ? "#ec7a26" : i === 1 ? "#ccc" : i === 2 ? "#b45309" : "#555", width: 28 }}>
                      {String(i + 1).padStart(2, "0")}
                    </span>
                    <span style={{ fontSize: 16 }}>{player.avatar_emoji}</span>
                    <div style={{ flex: 1 }}>
                      <div style={{ fontFamily: FC, fontSize: 15, fontWeight: 800, color: player.id === user?.id ? "#04844d" : "#fff", textTransform: "uppercase" }}>{player.username}</div>
                    </div>
                    <span style={{ fontFamily: FC, fontSize: 18, fontWeight: 900, color: "#ec7a26" }}>
                      {player.total_points}<span style={{ fontSize: 10, color: "#666", marginLeft: 2 }}>PTS</span>
                    </span>
                  </motion.div>
                ))}
              </div>
            </Reveal>
          </div>
        </div>
      </section>

      {/* ═══ REWARDS ═══ */}
      <section style={{ marginBottom: 80 }}>
        <div style={{ display: "flex", gap: 60, flexWrap: "wrap", alignItems: "center" }}>
          {/* Trophy */}
          <Reveal>
            <motion.div style={{ flex: "0 0 auto", position: "relative" }}
              animate={{ y: [0, -8, 0] }}
              transition={{ duration: 3, repeat: Infinity, ease: "easeInOut" }}>
              <img src="/golden-trophy.png" alt="Trophy" style={{ width: "clamp(200px, 20vw, 320px)", filter: "drop-shadow(0 0 40px rgba(212,168,67,0.3))" }} />
            </motion.div>
          </Reveal>

          {/* Text + cards */}
          <div style={{ flex: 1, minWidth: 320 }}>
            <Reveal>
              <div style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: 12 }}>
                <span style={{ fontSize: 14 }}>🏅</span>
                <span style={{ fontFamily: FC, fontSize: 11, fontWeight: 700, letterSpacing: 3, color: "#d4a843", textTransform: "uppercase" }}>The Spoils</span>
              </div>
            </Reveal>
            <Reveal delay={0.1}>
              <h2 style={{ fontFamily: FC, fontWeight: 900, fontStyle: "italic", fontSize: "clamp(40px, 5vw, 64px)", lineHeight: 0.95, marginBottom: 32 }}>
                LEGENDARY<br /><span style={{ color: "#ec7a26" }}>REWARDS.</span>
              </h2>
            </Reveal>

            {[
              { tier: "GOLD TIER", title: "🥇 BRAGGING RIGHTS", desc: "Top predictor earns the ultimate glory — eternal bragging rights among your peers.", color: "#d4a843" },
              { tier: "SILVER TIER", title: "🥈 LEADERBOARD FAME", desc: "Top 3 predictors featured permanently on the global leaderboard hall of fame.", color: "#c0c0c0" },
              { tier: "BRONZE TIER", title: "🥉 PREDICTION STREAK", desc: "Longest prediction streak earns special recognition and bonus points.", color: "#b45309" },
            ].map((reward, i) => (
              <Reveal key={reward.tier} delay={0.15 + i * 0.1}>
                <motion.div whileHover={{ x: 6, borderColor: reward.color + "66" }}
                  style={{ background: "#111", border: "1px solid #222", borderRadius: 12, padding: "18px 24px", marginBottom: 12, display: "flex", alignItems: "center", gap: 16, cursor: "default", transition: "all 0.3s" }}>
                  <div style={{ flex: 1 }}>
                    <div style={{ fontFamily: FC, fontSize: 10, fontWeight: 700, letterSpacing: 2, color: reward.color, marginBottom: 4 }}>{reward.tier}</div>
                    <div style={{ fontFamily: FC, fontSize: 18, fontWeight: 800 }}>{reward.title}</div>
                    <div style={{ fontFamily: F, fontSize: 13, color: "#888", marginTop: 4 }}>{reward.desc}</div>
                  </div>
                  <span style={{ color: "#555", fontSize: 18 }}>→</span>
                </motion.div>
              </Reveal>
            ))}
          </div>
        </div>
      </section>

      {/* ═══ FOOTER CTA ═══ */}
      <Reveal>
        <section style={{ textAlign: "center", padding: "60px 0 40px", borderTop: "1px solid #222" }}>
          <h2 style={{ fontFamily: FC, fontWeight: 900, fontStyle: "italic", fontSize: "clamp(32px, 4vw, 52px)", marginBottom: 16 }}>
            READY TO <span style={{ color: "#ec7a26" }}>PREDICT?</span>
          </h2>
          <p style={{ fontFamily: F, fontSize: 15, color: "#888", marginBottom: 28, maxWidth: 480, margin: "0 auto 28px" }}>
            Join the arena. Every match. Every prediction. Your glory awaits.
          </p>
          <motion.button whileHover={{ scale: 1.05 }} whileTap={{ scale: 0.95 }}
            onClick={() => switchTab("predict")}
            style={{ background: "linear-gradient(135deg, #ec7a26, #c05b11)", color: "#000", border: "none", borderRadius: 12, padding: "16px 48px", fontFamily: FC, fontSize: 18, fontWeight: 900, letterSpacing: 1, cursor: "pointer", boxShadow: "0 8px 32px rgba(236,122,38,0.3)" }}>
            START PREDICTING →
          </motion.button>
          <div style={{ marginTop: 40, fontFamily: FC, fontSize: 12, color: "#444", letterSpacing: 1 }}>
            © 2026 WORLD CUP PREDICTOR · BUILT WITH ❤️
          </div>
        </section>
      </Reveal>
    </div>
  );
}
