import { useState, useEffect, useRef, useCallback } from "react";
import { motion, useSpring, useTransform, AnimatePresence } from "framer-motion";
import { Wind, Scissors, Feather, Star, ChevronRight, RefreshCw } from "lucide-react";

// ─── CONTENT DATA ─────────────────────────────────────────────────────────────
const DECISIONS = [
  {
    id: 1,
    left: { label: "Roots", text: "Lean into the warmth of tradition and shared family history.", color: "#c084fc" },
    right: { label: "Pulse", text: "Sync with the energy of the modern world around you.", color: "#38bdf8" },
  },
  {
    id: 2,
    left: { label: "Legacy", text: "Honor the expectations of those who paved the way for you.", color: "#f472b6" },
    right: { label: "Self", text: "Forging a path that feels true to your own unique rhythm.", color: "#4ade80" },
  },
  {
    id: 3,
    left: { label: "Duty", text: "Build on the secure foundation of your family\'s sacrifices.", color: "#fb923c" },
    right: { label: "Dream", text: "Explore a creative calling that speaks to your personal vision.", color: "#a78bfa" },
  },
];

// ─── SPRING PHYSICS HOOK ───────────────────────────────────────────────────────
function useKitePhysics() {
  const x = useSpring(0, { stiffness: 40, damping: 12, mass: 1.8 });
  const y = useSpring(0, { stiffness: 40, damping: 12, mass: 1.8 });
  const rotate = useSpring(0, { stiffness: 60, damping: 15 });

  const setTarget = useCallback((tx, ty, tilt = 0) => {
    x.set(tx);
    y.set(ty);
    rotate.set(tilt);
  }, [x, y, rotate]);

  return { x, y, rotate, setTarget };
}

// ─── KITE SVG SHAPES ──────────────────────────────────────────────────────────
function KiteSVG({ shape, style, tailLength, tailType }) {
  const tailSegments = Math.max(3, Math.floor(tailLength / 20));

  const shapes = {
    Diamond: (
      <polygon points="0,-60 45,0 0,70 -45,0"
        fill={style === "Minimalist" ? "rgba(255,255,255,0.15)" : style === "Ethereal" ? "rgba(167,139,250,0.3)" : "rgba(255,255,255,0.9)"}
        stroke={style === "High-Contrast" ? "#fff" : "rgba(255,255,255,0.7)"}
        strokeWidth={style === "High-Contrast" ? "3" : "1.5"}
      />
    ),
    Hexagon: (
      <polygon points="0,-60 52,-30 52,30 0,60 -52,30 -52,-30"
        fill={style === "Minimalist" ? "rgba(255,255,255,0.1)" : style === "Ethereal" ? "rgba(196,181,253,0.25)" : "rgba(255,255,255,0.85)"}
        stroke={style === "High-Contrast" ? "#fff" : "rgba(255,255,255,0.6)"}
        strokeWidth={style === "High-Contrast" ? "3" : "1.5"}
      />
    ),
    Bird: (
      <path d="M0,-50 Q40,-30 60,10 Q30,0 0,20 Q-30,0 -60,10 Q-40,-30 0,-50Z"
        fill={style === "Minimalist" ? "rgba(255,255,255,0.12)" : style === "Ethereal" ? "rgba(251,191,36,0.25)" : "rgba(255,255,255,0.85)"}
        stroke={style === "High-Contrast" ? "#fbbf24" : "rgba(251,191,36,0.7)"}
        strokeWidth={style === "High-Contrast" ? "3" : "1.5"}
      />
    ),
    Plane: (
      <path d="M0,-65 L30,20 L0,5 L-30,20 Z"
        fill={style === "Minimalist" ? "rgba(255,255,255,0.1)" : style === "Ethereal" ? "rgba(52,211,153,0.25)" : "rgba(255,255,255,0.85)"}
        stroke={style === "High-Contrast" ? "#34d399" : "rgba(52,211,153,0.6)"}
        strokeWidth={style === "High-Contrast" ? "3" : "1.5"}
      />
    ),
  };

  const tailY = shape === "Diamond" ? 70 : shape === "Hexagon" ? 60 : shape === "Bird" ? 20 : 20;

  return (
    <svg width="140" height={200 + tailLength} viewBox={`-70 -70 140 ${200 + tailLength}`} style={{ overflow: "visible" }}>
      {/* Cross spars */}
      <line x1="-45" y1="0" x2="45" y2="0" stroke="rgba(255,255,255,0.3)" strokeWidth="1" />
      <line x1="0" y1="-60" x2="0" y2="70" stroke="rgba(255,255,255,0.3)" strokeWidth="1" />
      {shapes[shape]}
      {/* Shimmer overlay */}
      <ellipse cx="-10" cy="-20" rx="15" ry="20" fill="rgba(255,255,255,0.08)" transform="rotate(-20)" />
      {/* Tail */}
      {Array.from({ length: tailSegments }).map((_, i) => {
        const ty = tailY + i * (tailLength / tailSegments);
        const tx = Math.sin(i * 1.2) * 12;
        return tailType === "Ribbons" ? (
          <line key={i} x1={tx} y1={ty} x2={tx + Math.sin((i + 1) * 1.2) * 12} y2={ty + tailLength / tailSegments}
            stroke={`hsla(${(i * 40 + 200) % 360},80%,75%,0.7)`} strokeWidth="2.5" strokeLinecap="round" />
        ) : (
          <polygon key={i}
            points={`${tx},${ty} ${tx - 8},${ty + 16} ${tx + 8},${ty + 16}`}
            fill={`hsla(${(i * 50 + 260) % 360},70%,70%,0.6)`}
          />
        );
      })}
    </svg>
  );
}

// ─── DECISION BUBBLE ──────────────────────────────────────────────────────────
function DecisionBubble({ decision, side, onCollect, kiteX, kiteY, containerW, containerH }) {
  const [pos, setPos] = useState({
    x: side === "left" ? containerW * 0.2 : containerW * 0.75,
    y: -100,
  });
  const [collected, setCollected] = useState(false);
  const posRef = useRef(pos);
  posRef.current = pos;

  useEffect(() => {
    const interval = setInterval(() => {
      setPos(p => {
        const drift = side === "left" ? Math.sin(Date.now() / 1800) * 18 : Math.sin(Date.now() / 2100 + 1) * 18;
        const base = side === "left" ? containerW * 0.2 : containerW * 0.75;
        return { x: base + drift, y: p.y + 0.9 };
      });
    }, 16);
    return () => clearInterval(interval);
  }, [side, containerW]);

  useEffect(() => {
    if (collected) return;
    const bx = posRef.current.x;
    const by = posRef.current.y;
    const dx = kiteX - bx;
    const dy = kiteY - by;
    const dist = Math.sqrt(dx * dx + dy * dy);
    if (dist < 70) {
      setCollected(true);
      onCollect(side, decision);
    }
  }, [kiteX, kiteY, collected, side, decision, onCollect]);

  if (collected || pos.y > containerH + 100) return null;

  const col = decision[side].color;

  return (
    <motion.div
      style={{ position: "absolute", left: pos.x - 65, top: pos.y - 65, width: 130, height: 130 }}
      initial={{ opacity: 0, scale: 0.5 }}
      animate={{ opacity: 1, scale: 1 }}
      exit={{ opacity: 0, scale: 0.3 }}
    >
      <div style={{
        width: "100%", height: "100%", borderRadius: "50%",
        background: `radial-gradient(circle at 35% 35%, ${col}55, ${col}22)`,
        border: `1.5px solid ${col}88`,
        backdropFilter: "blur(12px)",
        display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center",
        padding: "12px", textAlign: "center",
        boxShadow: `0 0 24px ${col}44, inset 0 0 16px ${col}22`,
      }}>
        <span style={{ fontSize: "9px", fontFamily: "'Cinzel', serif", letterSpacing: "2px", color: col, textTransform: "uppercase", marginBottom: 4 }}>
          {decision[side].label}
        </span>
        <span style={{ fontSize: "10px", color: "rgba(255,255,255,0.85)", lineHeight: 1.4, fontFamily: "'Lora', serif" }}>
          {decision[side].text}
        </span>
      </div>
    </motion.div>
  );
}

// ─── STRING SVG ───────────────────────────────────────────────────────────────
function KiteStrings({ leftFinger, rightFinger, kiteX, kiteY }) {
  if (!leftFinger || !rightFinger) return null;
  return (
    <svg style={{ position: "absolute", inset: 0, width: "100%", height: "100%", pointerEvents: "none" }}>
      <line x1={leftFinger.x} y1={leftFinger.y} x2={kiteX} y2={kiteY}
        stroke="rgba(255,255,255,0.35)" strokeWidth="1.5" strokeDasharray="4 3" />
      <line x1={rightFinger.x} y1={rightFinger.y} x2={kiteX} y2={kiteY}
        stroke="rgba(255,255,255,0.35)" strokeWidth="1.5" strokeDasharray="4 3" />
    </svg>
  );
}

// ─── PHASE 1: WORKSHOP ────────────────────────────────────────────────────────
function WorkshopPhase({ onDone }) {
  const [shape, setShape] = useState("Diamond");
  const [tailLength, setTailLength] = useState(80);
  const [tailType, setTailType] = useState("Ribbons");
  const [style, setStyle] = useState("Ethereal");

  const shapes = ["Diamond", "Hexagon", "Bird", "Plane"];
  const styles = ["Minimalist", "Ethereal", "High-Contrast"];

  return (
    <div style={{ minHeight: "100vh", display: "flex", alignItems: "center", justifyContent: "center", padding: "24px" }}>
      <motion.div initial={{ opacity: 0, y: 40 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 1 }}
        style={{ maxWidth: 760, width: "100%", display: "grid", gridTemplateColumns: "1fr 1fr", gap: 32, alignItems: "start" }}>

        {/* Preview */}
        <div style={{ display: "flex", flexDirection: "column", alignItems: "center", gap: 16 }}>
          <p style={{ fontFamily: "'Cinzel', serif", letterSpacing: "4px", fontSize: 11, color: "rgba(255,255,255,0.5)", textTransform: "uppercase" }}>Your Kite</p>
          <motion.div animate={{ y: [0, -12, 0] }} transition={{ repeat: Infinity, duration: 3.5, ease: "easeInOut" }}>
            <KiteSVG shape={shape} style={style} tailLength={tailLength} tailType={tailType} />
          </motion.div>
        </div>

        {/* Controls */}
        <div style={{ display: "flex", flexDirection: "column", gap: 24 }}>
          <div>
            <p style={labelStyle}>Shape</p>
            <div style={{ display: "flex", flexWrap: "wrap", gap: 8 }}>
              {shapes.map(s => (
                <button key={s} onClick={() => setShape(s)} style={chipStyle(shape === s)}>
                  {s}
                </button>
              ))}
            </div>
          </div>
          <div>
            <p style={labelStyle}>Visual Style</p>
            <div style={{ display: "flex", flexWrap: "wrap", gap: 8 }}>
              {styles.map(s => (
                <button key={s} onClick={() => setStyle(s)} style={chipStyle(style === s)}>
                  {s}
                </button>
              ))}
            </div>
          </div>
          <div>
            <p style={labelStyle}>Tail Decoration</p>
            <div style={{ display: "flex", gap: 8 }}>
              {["Ribbons", "Triangles"].map(t => (
                <button key={t} onClick={() => setTailType(t)} style={chipStyle(tailType === t)}>
                  {t}
                </button>
              ))}
            </div>
          </div>
          <div>
            <p style={labelStyle}>Tail Length: {tailLength}px</p>
            <input type="range" min={40} max={160} value={tailLength}
              onChange={e => setTailLength(Number(e.target.value))}
              style={{ width: "100%", accentColor: "rgba(167,139,250,0.9)" }} />
          </div>
          <motion.button whileHover={{ scale: 1.04 }} whileTap={{ scale: 0.97 }}
            onClick={() => onDone({ shape, style, tailLength, tailType })}
            style={{
              marginTop: 8, padding: "14px 28px", borderRadius: 12,
              background: "linear-gradient(135deg, rgba(167,139,250,0.4), rgba(56,189,248,0.3))",
              border: "1px solid rgba(255,255,255,0.25)", color: "#fff",
              fontFamily: "'Cinzel', serif", letterSpacing: "3px", fontSize: 12,
              cursor: "pointer", display: "flex", alignItems: "center", gap: 10, justifyContent: "center",
              backdropFilter: "blur(8px)",
            }}>
            Launch Kite <ChevronRight size={16} />
          </motion.button>
        </div>
      </motion.div>
    </div>
  );
}

const labelStyle = {
  fontFamily: "'Cinzel', serif", letterSpacing: "3px", fontSize: 10,
  color: "rgba(255,255,255,0.5)", textTransform: "uppercase", marginBottom: 10
};

const chipStyle = (active) => ({
  padding: "8px 16px", borderRadius: 8, cursor: "pointer", fontSize: 12,
  fontFamily: "'Lora', serif",
  background: active ? "rgba(167,139,250,0.35)" : "rgba(255,255,255,0.07)",
  border: active ? "1px solid rgba(167,139,250,0.7)" : "1px solid rgba(255,255,255,0.12)",
  color: active ? "#e9d5ff" : "rgba(255,255,255,0.6)",
  backdropFilter: "blur(6px)", transition: "all 0.2s",
});

// ─── PHASE 2: ASCENT (CALIBRATION) ────────────────────────────────────────────
function AscentPhase({ onReady }) {
  const videoRef = useRef(null);
  const canvasRef = useRef(null);
  const handLandmarkerRef = useRef(null);
  const animFrameRef = useRef(null);
  const [status, setStatus] = useState("Initializing MediaPipe…");
  const [fingersDetected, setFingersDetected] = useState(0);
  const [ready, setReady] = useState(false);
  
  useEffect(() => {
    if (ready) {
      const timer = setTimeout(() => {
        onReady(); // Move to FlightPhase automatically
      }, 1800); // 1.8s delay so you can see the "Connection" message
      return () => clearTimeout(timer);
    }
  }, [ready, onReady]);
  
  useEffect(() => {
    let stream = null;

    async function init() {
      try {
        const { HandLandmarker, FilesetResolver } = await import(
          "https://cdn.jsdelivr.net/npm/@mediapipe/tasks-vision@0.10.3/+esm"
        );
        setStatus("Loading vision model…");
        const vision = await FilesetResolver.forVisionTasks(
          "https://cdn.jsdelivr.net/npm/@mediapipe/tasks-vision@0.10.3/wasm"
        );
        handLandmarkerRef.current = await HandLandmarker.createFromOptions(vision, {
          baseOptions: { modelAssetPath: "https://storage.googleapis.com/mediapipe-models/hand_landmarker/hand_landmarker/float16/1/hand_landmarker.task", 
            delegate: "GPU" },
          runningMode: "VIDEO", numHands: 2,
        });
       
        setStatus("Accessing webcam…");
        stream = await navigator.mediaDevices.getUserMedia({ video: { width: 640, height: 480, facingMode: "user" } });
        if (videoRef.current) {
          videoRef.current.srcObject = stream;
          await videoRef.current.play();
        }
        setStatus("Tracking fingers — hold up both hands");
        detectLoop();
      } catch (e) {
        setStatus("Error: " + e.message);
      }
    }

    function detectLoop() {
      if (!videoRef.current || !handLandmarkerRef.current || !canvasRef.current) {
        animFrameRef.current = requestAnimationFrame(detectLoop);
        return;
      }
      const results = handLandmarkerRef.current.detectForVideo(videoRef.current, performance.now());
      const ctx = canvasRef.current.getContext("2d");
      ctx.clearRect(0, 0, 640, 480);
      let count = 0;
      if (results.landmarks) {
        for (const lm of results.landmarks) {
          count++;
          const tip = lm[8];
          const cx = (1 - tip.x) * 640;
          const cy = tip.y * 480;
          ctx.beginPath();
          ctx.arc(cx, cy, 14, 0, Math.PI * 2);
          ctx.fillStyle = "rgba(167,139,250,0.6)";
          ctx.fill();
          ctx.strokeStyle = "#e9d5ff";
          ctx.lineWidth = 2;
          ctx.stroke();
          ctx.beginPath();
          ctx.arc(cx, cy, 5, 0, Math.PI * 2);
          ctx.fillStyle = "#fff";
          ctx.fill();
        }
      }
      setFingersDetected(count);
      if (count >= 2 && !ready) {
        setReady(true);
      }
      animFrameRef.current = requestAnimationFrame(detectLoop);
    }

    init();

    
    return () => {
      cancelAnimationFrame(animFrameRef.current);
      if (stream) stream.getTracks().forEach(t => t.stop());
      if (handLandmarkerRef.current) handLandmarkerRef.current.close();
    };
  }, []);

  return (
    <div style={{ minHeight: "100vh", display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center", gap: 24, padding: 24 }}>
      <motion.div initial={{ opacity: 0, y: -20 }} animate={{ opacity: 1, y: 0 }}
        style={{ textAlign: "center" }}>
        <p style={{ fontFamily: "'Cinzel', serif", letterSpacing: "5px", fontSize: 11, color: "rgba(255,255,255,0.45)", textTransform: "uppercase", marginBottom: 8 }}>
          The Ascent
        </p>
        <h2 style={{ fontFamily: "'Cinzel', serif", fontSize: 26, color: "#fff", fontWeight: 400, marginBottom: 6 }}>
          Calibrating Your Hands
        </h2>
        <p style={{ fontFamily: "'Lora', serif", color: "rgba(255,255,255,0.55)", fontSize: 13 }}>{status}</p>
      </motion.div>

      <div style={{ position: "relative", borderRadius: 20, overflow: "hidden", border: "1px solid rgba(255,255,255,0.15)", boxShadow: "0 0 60px rgba(167,139,250,0.2)" }}>
        <video ref={videoRef} width={400} height={300} style={{ display: "block", transform: "scaleX(-1)", opacity: 0.6 }} playsInline muted />
        <canvas ref={canvasRef} width={640} height={480} style={{ position: "absolute", inset: 0, width: "100%", height: "100%", transform: "scaleX(-1)" }} />
        <div style={{ position: "absolute", inset: 0, background: "linear-gradient(to bottom, transparent 60%, rgba(0,0,0,0.5))" }} />
        <div style={{ position: "absolute", bottom: 12, left: 0, right: 0, textAlign: "center" }}>
          <span style={{ fontFamily: "'Cinzel', serif", fontSize: 10, letterSpacing: "3px", color: fingersDetected >= 2 ? "#86efac" : "rgba(255,255,255,0.4)", textTransform: "uppercase" }}>
            {fingersDetected >= 2 ? "✦ Both Fingers Detected" : `Fingers: ${fingersDetected}/2`}
          </span>
        </div>
      </div>
    </div>
  );
}

// ─── PHASE 3: FLIGHT ──────────────────────────────────────────────────────────
function FlightPhase({ kiteConfig, onComplete }) {
  const videoRef = useRef(null);
  const handLandmarkerRef = useRef(null);
  const animFrameRef = useRef(null);
  const containerRef = useRef(null);
  const [containerSize, setContainerSize] = useState({ w: 800, h: 600 });
  const [leftFinger, setLeftFinger] = useState(null);
  const [rightFinger, setRightFinger] = useState(null);
  const [currentDecision, setCurrentDecision] = useState(0);
  const [choices, setChoices] = useState([]);
  const [bubbleKey, setBubbleKey] = useState(0);
  const kite = useKitePhysics();
  const [kiteScreenPos, setKiteScreenPos] = useState({ x: 400, y: 300 });

  useEffect(() => {
    if (containerRef.current) {
      const r = containerRef.current.getBoundingClientRect();
      setContainerSize({ w: r.width, h: r.height });
    }
  }, []);

  // Webcam + MediaPipe
  useEffect(() => {
    let stream = null;
    async function init() {
      const { HandLandmarker, FilesetResolver } = await import(
        "https://cdn.jsdelivr.net/npm/@mediapipe/tasks-vision@0.10.3/+esm"
      );
      const vision = await FilesetResolver.forVisionTasks(
        "https://cdn.jsdelivr.net/npm/@mediapipe/tasks-vision@0.10.3/wasm"
      );
      handLandmarkerRef.current = await HandLandmarker.createFromOptions(vision, {
        baseOptions: { modelAssetPath: "https://storage.googleapis.com/mediapipe-models/hand_landmarker/hand_landmarker/float16/1/hand_landmarker.task", delegate: "GPU" },
        runningMode: "VIDEO", numHands: 2,
      });
      stream = await navigator.mediaDevices.getUserMedia({ video: { width: 640, height: 480 } });
      if (videoRef.current) { videoRef.current.srcObject = stream; await videoRef.current.play(); }
      detectLoop();
    }

    function detectLoop() {
      if (!videoRef.current || !handLandmarkerRef.current) {
        animFrameRef.current = requestAnimationFrame(detectLoop);
        return;
      }
      const results = handLandmarkerRef.current.detectForVideo(videoRef.current, performance.now());
      if (results.landmarks && results.handednesses) {
        let lf = null, rf = null;
        results.landmarks.forEach((lm, i) => {
          const hand = results.handednesses[i]?.[0]?.categoryName;
          const tip = lm[8];
          // Mirror x
          const sx = (1 - tip.x) * containerRef.current?.offsetWidth || 800;
          const sy = tip.y * (containerRef.current?.offsetHeight || 600);
          if (hand === "Right") lf = { x: sx, y: sy };
          else rf = { x: sx, y: sy };
        });
        setLeftFinger(lf);
        setRightFinger(rf);
        // Kite target = midpoint
        if (lf && rf) {
          const mx = (lf.x + rf.x) / 2;
          const my = (lf.y + rf.y) / 2;
          const tilt = (rf.y - lf.y) * 0.3;
          kite.setTarget(mx, my, tilt);
        } else if (lf) {
          kite.setTarget(lf.x, lf.y - 80, 0);
        } else if (rf) {
          kite.setTarget(rf.x, rf.y - 80, 0);
        }
      }
      animFrameRef.current = requestAnimationFrame(detectLoop);
    }

    init();
    return () => {
      cancelAnimationFrame(animFrameRef.current);
      if (stream) stream.getTracks().forEach(t => t.stop());
      if (handLandmarkerRef.current) handLandmarkerRef.current.close();
    };
  }, []);

  // Track kite screen position for collision
  useEffect(() => {
    const unsub = kite.x.onChange(v => setKiteScreenPos(p => ({ ...p, x: v })));
    return unsub;
  }, [kite.x]);
  useEffect(() => {
    const unsub = kite.y.onChange(v => setKiteScreenPos(p => ({ ...p, y: v })));
    return unsub;
  }, [kite.y]);

  const handleCollect = useCallback((side, decision) => {
    setChoices(prev => [...prev, { side, text: decision[side].text, label: decision[side].label, color: decision[side].color }]);
    setTimeout(() => {
      setCurrentDecision(prev => {
        const next = prev + 1;
        if (next >= DECISIONS.length) {
          setTimeout(() => onComplete([...choices, { side, text: decision[side].text, label: decision[side].label, color: decision[side].color }]), 1200);
        } else {
          setBubbleKey(k => k + 1);
        }
        return next;
      });
    }, 800);
  }, [choices, onComplete]);

  const decision = DECISIONS[Math.min(currentDecision, DECISIONS.length - 1)];

  return (
    <div ref={containerRef} style={{ position: "fixed", inset: 0, overflow: "hidden" }}>
      {/* Hidden video */}
      <video ref={videoRef} style={{ display: "none" }} playsInline muted />

      {/* Floating clouds */}
      {[...Array(5)].map((_, i) => (
        <motion.div key={i}
          animate={{ x: ["0%", "110%"] }}
          transition={{ duration: 30 + i * 8, repeat: Infinity, delay: i * 6, ease: "linear" }}
          style={{
            position: "absolute", top: `${10 + i * 15}%`, left: "-15%",
            width: `${80 + i * 30}px`, height: `${30 + i * 10}px`,
            borderRadius: "50%", background: "rgba(255,255,255,0.06)",
            filter: "blur(12px)", pointerEvents: "none",
          }}
        />
      ))}

      {/* Strings */}
      <KiteStrings leftFinger={leftFinger} rightFinger={rightFinger} kiteX={kiteScreenPos.x} kiteY={kiteScreenPos.y} />

      {/* Decision Bubbles */}
      <AnimatePresence>
        {currentDecision < DECISIONS.length && (
          <>
            <DecisionBubble key={`L-${bubbleKey}`} decision={decision} side="left"
              onCollect={handleCollect} kiteX={kiteScreenPos.x} kiteY={kiteScreenPos.y}
              containerW={containerSize.w} containerH={containerSize.h} />
            <DecisionBubble key={`R-${bubbleKey}`} decision={decision} side="right"
              onCollect={handleCollect} kiteX={kiteScreenPos.x} kiteY={kiteScreenPos.y}
              containerW={containerSize.w} containerH={containerSize.h} />
          </>
        )}
      </AnimatePresence>

      {/* Kite */}
      <motion.div style={{ position: "absolute", x: kite.x, y: kite.y, rotate: kite.rotate, translateX: "-50%", translateY: "-50%" }}>
        <KiteSVG {...kiteConfig} />
      </motion.div>

      {/* Finger indicators */}
      <AnimatePresence>
        {leftFinger && (
          <motion.div initial={{ scale: 0 }} animate={{ scale: 1 }} exit={{ scale: 0 }}
            style={{ position: "absolute", left: leftFinger.x - 10, top: leftFinger.y - 10, width: 20, height: 20, borderRadius: "50%", background: "rgba(167,139,250,0.5)", border: "2px solid #a78bfa", pointerEvents: "none" }} />
        )}
        {rightFinger && (
          <motion.div initial={{ scale: 0 }} animate={{ scale: 1 }} exit={{ scale: 0 }}
            style={{ position: "absolute", left: rightFinger.x - 10, top: rightFinger.y - 10, width: 20, height: 20, borderRadius: "50%", background: "rgba(56,189,248,0.5)", border: "2px solid #38bdf8", pointerEvents: "none" }} />
        )}
      </AnimatePresence>

      {/* HUD */}
      <div style={{ position: "absolute", top: 20, left: "50%", transform: "translateX(-50%)", textAlign: "center" }}>
        <div style={{ ...glassPanel, padding: "10px 24px", display: "inline-flex", alignItems: "center", gap: 16 }}>
          <span style={{ fontFamily: "'Cinzel', serif", fontSize: 10, letterSpacing: "3px", color: "rgba(255,255,255,0.4)", textTransform: "uppercase" }}>
            Decision {Math.min(currentDecision + 1, DECISIONS.length)} of {DECISIONS.length}
           
          </span>
          <div style={{ display: "flex", gap: 6 }}>
            {DECISIONS.map((_, i) => (
              <div key={i} style={{ width: 8, height: 8, borderRadius: "50%", background: i < choices.length ? "#a78bfa" : "rgba(255,255,255,0.15)" }} />
            ))}
          </div>
    
        </div>
       
      </div>

      {/* Collected choices */}
      <div style={{ position: "absolute", bottom: 20, left: 20, display: "flex", flexDirection: "column", gap: 6 }}>
        {choices.map((c, i) => (
          <motion.div key={i} initial={{ opacity: 0, x: -20 }} animate={{ opacity: 1, x: 0 }}
            style={{ ...glassPanel, padding: "6px 14px", display: "flex", alignItems: "center", gap: 8 }}>
            <div style={{ width: 6, height: 6, borderRadius: "50%", background: c.color }} />
            <span style={{ fontSize: 10, color: "rgba(255,255,255,0.6)", fontFamily: "'Lora', serif" }}>
              <strong style={{ color: c.color }}>{c.label}</strong> — {c.text.slice(0, 40)}…
            </span>
          </motion.div>
        ))}
      </div>

      {/* Instructions */}
      {!leftFinger && !rightFinger && (
        <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }}
          style={{ position: "absolute", bottom: 100, left: "50%", transform: "translateX(-50%)", textAlign: "center" }}>
          <p style={{ fontFamily: "'Lora', serif", color: "rgba(255,255,255,0.4)", fontSize: 12 , fontSize: "1.3rem", fontWeight: "400"}}>
            ✦ Hold up your index fingers to fly.<br/>Guide the kite towards a bubble to select a decision. ✦
          </p>
        </motion.div>
      )}
    </div>
  );
}

// ─── PHASE 4: CONCLUSION ──────────────────────────────────────────────────────
function ConclusionPhase({ choices, onRestart }) {
  return (
    <div style={{ minHeight: "100vh", display: "flex", alignItems: "center", justifyContent: "center", padding: 32 }}>
      <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} transition={{ duration: 1.5 }}
        style={{ maxWidth: 620, width: "100%", textAlign: "center" }}>

        {/* Floating kite silhouette */}
        <motion.div animate={{ y: [0, -20, 0], rotate: [-3, 3, -3] }}
          transition={{ repeat: Infinity, duration: 5, ease: "easeInOut" }}
          style={{ marginBottom: 32, opacity: 0.6 }}>
          <svg width="60" height="80" viewBox="-35 -40 70 100" style={{ overflow: "visible" }}>
            <polygon points="0,-40 30,0 0,50 -30,0" fill="rgba(167,139,250,0.3)" stroke="rgba(167,139,250,0.7)" strokeWidth="1.5" />
            <line x1="0" y1="50" x2="0" y2="90" stroke="rgba(255,255,255,0.25)" strokeWidth="1.5" strokeDasharray="4 3" />
          </svg>
        </motion.div>

        <motion.p initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.4 }}
          style={{ fontFamily: "'Cinzel', serif", letterSpacing: "5px", fontSize: 10, color: "rgba(255,255,255,0.35)", textTransform: "uppercase", marginBottom: 16 }}>
          End of Flight
        </motion.p>

        <motion.h1 initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.7 }}
          style={{ fontFamily: "'Cinzel', serif", fontSize: 20, fontWeight: 400, color: "#e9d5ff", lineHeight: 1.7, marginBottom: 24 }}>
          Thank you for playing.
        </motion.h1>

        <motion.p initial={{ opacity: 0 }} animate={{ opacity: 1 }} transition={{ delay: 1.2 }}
          style={{ ...glassPanel, padding: "28px 36px", fontFamily: "'Lora', serif", fontSize: 16, color: "rgba(255,255,255,0.8)", lineHeight: 1.9, marginBottom: 32, fontStyle: "italic" }}>
        "Every choice has been a lesson in the architecture of balance. Growing up, I viewed my dual identity as a quiet tug-of-war, 
        a struggle to decide which part of me would hold the line and which would let go.
        I’ve realized that this tension isn't a conflict. It is my foundation. The grounding force of my heritage
        isn’t meant to restrict, and the driving winds of my modern world aren't meant to scatter. They are the two 
        essential energies that keep me aloft.  I am not caught between two worlds. I am supported by both. By leaning into the pull from my roots and the lift 
        from my surroundings, I have found a height that belongs entirely to me. I am no longer just navigating the sky. I am a part of it."
        </motion.p>

        {choices.length > 0 && (
          <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} transition={{ delay: 1.8 }}
            style={{ ...glassPanel, padding: "20px 28px", marginBottom: 32, textAlign: "left" }}>
            <p style={{ fontFamily: "'Cinzel', serif", fontSize: 10, letterSpacing: "3px", color: "rgba(255,255,255,0.35)", textTransform: "uppercase", marginBottom: 14 }}>Your Path</p>
            {choices.map((c, i) => (
              <motion.div key={i} initial={{ opacity: 0, x: -10 }} animate={{ opacity: 1, x: 0 }} transition={{ delay: 2 + i * 0.3 }}
                style={{ display: "flex", alignItems: "flex-start", gap: 12, marginBottom: 12 }}>
                <div style={{ width: 8, height: 8, borderRadius: "50%", background: c.color, marginTop: 5, flexShrink: 0 }} />
                <div>
                  <span style={{ fontFamily: "'Cinzel', serif", fontSize: 9, letterSpacing: "2px", color: c.color, textTransform: "uppercase" }}>{c.label} — </span>
                  <span style={{ fontFamily: "'Lora', serif", fontSize: 13, color: "rgba(255,255,255,0.65)" }}>{c.text}</span>
                </div>
              </motion.div>
            ))}
          </motion.div>
        )}

        <motion.button initial={{ opacity: 0 }} animate={{ opacity: 1 }} transition={{ delay: 2.5 }}
          whileHover={{ scale: 1.04 }} whileTap={{ scale: 0.97 }}
          onClick={onRestart}
          style={{
            padding: "12px 28px", borderRadius: 10,
            background: "rgba(255,255,255,0.07)",
            border: "1px solid rgba(255,255,255,0.15)", color: "rgba(255,255,255,0.5)",
            fontFamily: "'Cinzel', serif", letterSpacing: "3px", fontSize: 10,
            cursor: "pointer", display: "inline-flex", alignItems: "center", gap: 8,
          }}>
          <RefreshCw size={12} /> Fly Again
        </motion.button>
      </motion.div>
    </div>
  );
}

const glassPanel = {
  background: "rgba(255,255,255,0.06)",
  backdropFilter: "blur(16px)",
  border: "1px solid rgba(255,255,255,0.12)",
  borderRadius: 16,
};

// ─── ROOT APP ─────────────────────────────────────────────────────────────────
export default function App() {
  const [phase, setPhase] = useState("workshop");
  const [kiteConfig, setKiteConfig] = useState(null);
  const [choices, setChoices] = useState([]);

  return (
    <>
      <style>{`
        @import url('https://fonts.googleapis.com/css2?family=Cinzel:wght@400;500;600&family=Lora:ital,wght@0,400;0,500;1,400&display=swap');
        *, *::before, *::after { box-sizing: border-box; margin: 0; padding: 0; }
        body { overflow: hidden; }
        input[type=range] { -webkit-appearance: none; height: 4px; border-radius: 2px; background: rgba(255,255,255,0.15); outline: none; }
        input[type=range]::-webkit-slider-thumb { -webkit-appearance: none; width: 16px; height: 16px; border-radius: 50%; background: rgba(167,139,250,0.9); cursor: pointer; }

        @keyframes skyShift {
          0%   { background-position: 0% 0%; }
          50%  { background-position: 100% 100%; }
          100% { background-position: 0% 0%; }
        }

        .sky-bg {
          position: fixed; inset: 0; z-index: -1;
          background: linear-gradient(
            135deg,
            #0f0c29 0%,
            #302b63 20%,
            #1a1a4e 35%,
            #6b21a8 50%,
            #dc6a34 65%,
            #f59e0b 80%,
            #fbbf24 100%
          );
          background-size: 300% 300%;
          animation: skyShift 20s ease infinite;
        }

        .sky-bg::after {
          content: '';
          position: absolute; inset: 0;
          background: radial-gradient(ellipse at 50% 0%, rgba(255,255,255,0.04) 0%, transparent 70%);
        }

        /* Stars */
        .stars {
          position: fixed; inset: 0; z-index: -1; overflow: hidden;
        }
        .star {
          position: absolute; border-radius: 50%;
          background: rgba(255,255,255,0.7);
          animation: twinkle var(--dur) ease-in-out infinite;
        }
        @keyframes twinkle {
          0%, 100% { opacity: 0.2; transform: scale(1); }
          50% { opacity: 1; transform: scale(1.4); }
        }
      `}</style>

      {/* Sky */}
      <div className="sky-bg" />

      {/* Stars */}
      <div className="stars">
        {[...Array(40)].map((_, i) => (
          <div key={i} className="star" style={{
            left: `${Math.random() * 100}%`,
            top: `${Math.random() * 60}%`,
            width: `${1 + Math.random() * 2}px`,
            height: `${1 + Math.random() * 2}px`,
            "--dur": `${2 + Math.random() * 4}s`,
            animationDelay: `${Math.random() * 4}s`,
            opacity: Math.random() * 0.6 + 0.1,
          }} />
        ))}
      </div>

      <AnimatePresence mode="wait">
        {phase === "workshop" && (
          <motion.div key="workshop" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}>
            <div style={{ position: "absolute", top: 24, left: "50%", transform: "translateX(-50%)", textAlign: "center", width: "80%", zIndex: 10 }}>
              <h1 style={{ fontFamily: "'Cinzel', serif", fontSize: "2.5rem", fontWeight: "600", letterSpacing: "-0.02em", color: "rgba(255,255,255,0.35)", textTransform: "uppercase" }}>
                Design Your Kite
              </h1>
            </div>
            <WorkshopPhase onDone={(cfg) => { setKiteConfig(cfg); setPhase("ascent"); }} />
          </motion.div>
        )}

        {phase === "ascent" && (
          <motion.div key="ascent" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}>
            <AscentPhase onReady={() => setPhase("flight")} />
          </motion.div>
        )}

        {phase === "flight" && (
          <motion.div key="flight" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
            style={{ position: "fixed", inset: 0 }}>
            <FlightPhase kiteConfig={kiteConfig} onComplete={(c) => { setChoices(c); setPhase("conclusion"); }} />
          </motion.div>
        )}

        {phase === "conclusion" && (
          <motion.div key="conclusion" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}>
            <ConclusionPhase choices={choices} onRestart={() => { setChoices([]); setPhase("workshop"); }} />
          </motion.div>
        )}
      </AnimatePresence>
    </>
  );
}