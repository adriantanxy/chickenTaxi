import { db, auth } from "../auth/firebase"; // Adjust path if needed to point to your firebase.js
import { collection, addDoc, serverTimestamp } from "firebase/firestore";
import { useEffect, useRef, useState, useCallback } from "react";
import {
  ArrowLeft,
  Dumbbell,
  Play,
  Pause,
  Square,
  Camera,
  BookOpen,
  SkipBack,
  SkipForward,
} from "lucide-react";
import { AppShell, ActionButton, Card } from "../ui";
import { ROUTES } from "../routes";
import { C, pixel, D, M, USER as user } from "../theme";
import { getTrainingMode, getTrainingSessionCardStyle } from "../trainingModes";

// ─── Custom SVG Icons ──────────────────────────────────────────────────────
function PushUpIcon({ size = 16, color = "currentColor" }) {
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" fill={color} xmlns="http://www.w3.org/2000/svg">
      <path d="M20,16H18.82L18,12h.07a1,1,0,1,0-.44-2L8.78,12l-.1,0L3.37,13.82A2,2,0,0,0,2,15.72V17a1,1,0,0,0,2,0V15.72L9.27,14l6.8-1.53.79,4a2,2,0,0,0,2,1.61H20a1,1,0,0,0,0-2Z" />
      <path d="M9,14.5a1.5,1.5,0,0,1-.33-3l8-1.81a1.5,1.5,0,1,1,.66,2.93l-8,1.8A1.24,1.24,0,0,1,9,14.5Z" opacity="0.6" />
      <circle cx="19" cy="9" r="3" />
    </svg>
  );
}

function AccuracyIcon({ size = 16, color = "currentColor" }) {
  return (
    <svg width={size} height={size} viewBox="0 0 64 64" fill={color} xmlns="http://www.w3.org/2000/svg">
      <path d="M62.9,30.9h-7.8C54.6,19,45,9.4,33.1,8.9V1.1C33.1,0.5,32.6,0,32,0s-1.1,0.5-1.1,1.1v7.8C19,9.4,9.4,19,8.9,30.9H1.1C0.5,30.9,0,31.4,0,32s0.5,1.1,1.1,1.1h7.8c0.6,11.9,10.1,21.4,22,22v7.8c0,0.6,0.5,1.1,1.1,1.1s1.1-0.5,1.1-1.1v-7.8c11.9-0.6,21.4-10.1,22-22h7.8c0.6,0,1.1-0.5,1.1-1.1S63.5,30.9,62.9,30.9zM52.9,30.9h-4.1c-0.5-8.4-7.3-15.1-15.7-15.7v-4.1C43.8,11.7,52.3,20.2,52.9,30.9zM30.9,30.9H17.4C18,23.7,23.7,18,30.9,17.4V30.9zM30.9,33.1v13.5C23.7,46,18,40.3,17.4,33.1H30.9zM33.1,33.1h13.5C46,40.3,40.3,46,33.1,46.6V33.1zM33.1,30.9V17.4C40.3,18,46,23.7,46.6,30.9H33.1zM30.9,11.1v4.1c-8.4,0.5-15.1,7.3-15.7,15.7h-4.1C11.7,20.2,20.2,11.7,30.9,11.1zM11.1,33.1h4.1c0.5,8.4,7.3,15.1,15.7,15.7v4.1C20.2,52.3,11.7,43.8,11.1,33.1zM33.1,52.9v-4.1c8.4-0.5,15.1-7.3,15.7-15.7h4.1C52.3,43.8,43.8,52.3,33.1,52.9z" />
    </svg>
  );
}

function DurationIcon({ size = 16, color = "currentColor" }) {
  return (
    <svg width={size} height={size} viewBox="0 0 512 512" fill={color} xmlns="http://www.w3.org/2000/svg">
      <path d="M392,294.54h0a135.56,135.56,0,0,0-39.15-95.39,8.36,8.36,0,0,0-.68-.79,8.47,8.47,0,0,0-.8-.68A135.54,135.54,0,0,0,256,158.52h0a135.54,135.54,0,0,0-95.38,39.16,7.36,7.36,0,0,0-1.48,1.47A135.56,135.56,0,0,0,120,294.54h0a135.55,135.55,0,0,0,39.15,95.38,8.36,8.36,0,0,0,.68.79,8.59,8.59,0,0,0,.8.69A135.57,135.57,0,0,0,256,430.55h0a135.57,135.57,0,0,0,95.38-39.15,7.78,7.78,0,0,0,1.48-1.48A135.55,135.55,0,0,0,392,294.54Zm-29.25,8h13a119.5,119.5,0,0,1-29.45,71l-9.14-9.13a8,8,0,0,0-11.31,11.31l9.13,9.13a119.45,119.45,0,0,1-71,29.46v-13a8,8,0,1,0-16,0v13a119.57,119.57,0,0,1-71-29.46l9.13-9.13a8,8,0,1,0-11.31-11.32l-9.14,9.14a119.5,119.5,0,0,1-29.45-71h13a8,8,0,0,0,0-16h-13a119.53,119.53,0,0,1,29.45-71l9.14,9.14a8,8,0,0,0,11.31-11.31L177,204.25a119.5,119.5,0,0,1,71-29.45v13a8,8,0,0,0,16,0v-13a119.5,119.5,0,0,1,71,29.45l-9.13,9.14a8,8,0,0,0,11.31,11.31l9.14-9.14a119.53,119.53,0,0,1,29.45,71h-13a8,8,0,0,0,0,16Zm26.52-110.17,25.66-25.65a8,8,0,0,0,0-11.32l-19.8-19.8a8,8,0,0,0-11.32,0l-25.65,25.65A167.15,167.15,0,0,0,278,128V99.77h20.67a8,8,0,0,0,8-8V57.45a8,8,0,0,0-8-8H213.33a8,8,0,0,0-8,8V91.77a8,8,0,0,0,8,8H234V128a167.11,167.11,0,0,0-80.17,33.28L128.18,135.6a8,8,0,0,0-11.32,0l-19.8,19.8a8,8,0,0,0,0,11.32l25.66,25.65A167.14,167.14,0,0,0,88,294.54c0,92.64,75.37,168,168,168s168-75.37,168-168A167.14,167.14,0,0,0,389.28,192.37Zm.2-39.8,8.49,8.49L378.9,180.11q-4.08-4.38-8.48-8.48ZM221.33,65.45h69.34V83.77H221.33ZM250,99.77h12v26.87c-2-.07-4-.12-6-.12s-4,0-6,.12ZM114,161.06l8.49-8.49,19.06,19.06q-4.4,4.1-8.49,8.48ZM256,446.55c-83.82,0-152-68.19-152-152s68.19-152,152-152,152,68.2,152,152S339.82,446.55,256,446.55ZM291.83,319a8,8,0,0,1-11.32,11.31L250.34,300.2h0c-.18-.18-.36-.38-.53-.58l-.22-.3-.24-.33c-.08-.12-.15-.24-.22-.36a3.14,3.14,0,0,1-.18-.31,2.64,2.64,0,0,1-.18-.38c-.06-.11-.11-.22-.16-.33s-.09-.25-.14-.37-.09-.24-.12-.37-.07-.25-.1-.37-.07-.26-.09-.39,0-.3-.07-.45,0-.21-.05-.32a7,7,0,0,1,0-.79V216.82a8,8,0,0,1,16,0v74.4Z" />
    </svg>
  );
}


// ─── MediaPipe loader ──────────────────────────────────────────────────────
async function loadMediaPipe() {
  // Dynamically import MediaPipe from CDN so this page works without bundler config
  if (window._mpPose) return window._mpPose;

  await new Promise((res, rej) => {
    if (document.getElementById("mp-pose-script")) return res();
    const s = document.createElement("script");
    s.id = "mp-pose-script";
    s.src =
      "https://cdn.jsdelivr.net/npm/@mediapipe/pose@0.5.1675469404/pose.js";
    s.crossOrigin = "anonymous";
    s.onload = res;
    s.onerror = rej;
    document.head.appendChild(s);
  });
  await new Promise((res, rej) => {
    if (document.getElementById("mp-cam-script")) return res();
    const s = document.createElement("script");
    s.id = "mp-cam-script";
    s.src =
      "https://cdn.jsdelivr.net/npm/@mediapipe/camera_utils@0.3.1640029074/camera_utils.js";
    s.crossOrigin = "anonymous";
    s.onload = res;
    s.onerror = rej;
    document.head.appendChild(s);
  });
  await new Promise((res, rej) => {
    if (document.getElementById("mp-draw-script")) return res();
    const s = document.createElement("script");
    s.id = "mp-draw-script";
    s.src =
      "https://cdn.jsdelivr.net/npm/@mediapipe/drawing_utils@0.3.1620248257/drawing_utils.js";
    s.crossOrigin = "anonymous";
    s.onload = res;
    s.onerror = rej;
    document.head.appendChild(s);
  });

  window._mpPose = true;
  return true;
}

// ─── Angle helper ──────────────────────────────────────────────────────────
function calcAngle(a, b, c) {
  const rad =
    Math.atan2(c.y - b.y, c.x - b.x) - Math.atan2(a.y - b.y, a.x - b.x);
  let deg = Math.abs((rad * 180) / Math.PI);
  if (deg > 180) deg = 360 - deg;
  return deg;
}

// ─── Push-up rep + form analyser — mirrors ippt.py exactly ───────────────
//
// Python reference (ippt.py):
//   angle  = calculate_angle(shoulder, elbow, wrist)   ← LEFT side only
//   angle2 = calculate_angle(shoulder, hip, knee)       ← LEFT side only
//   stage "up"   when angle > 170
//   rep counted  when angle < 65 AND stage=="up" AND angle2 > 150
//   feedback:    "MAINTAIN FORM" if angle<65 AND angle2>150, else "GO LOWER"
//
// On top of that we add:
//   - visibility gates so bad detections don't silently count
//   - shoulder-width proximity check ("move back")
//   - visibility-based accuracy score with form deductions
//
function analysePushup(landmarks, stateRef) {
  const LM = window.POSE_LANDMARKS || {};

  // ── Left-side only (matches Python) ──────────────────────────────────
  const shoulder = landmarks[LM.LEFT_SHOULDER ?? 11]; // ls
  const elbow    = landmarks[LM.LEFT_ELBOW    ?? 13]; // le
  const wrist    = landmarks[LM.LEFT_WRIST    ?? 15]; // lw
  const hip      = landmarks[LM.LEFT_HIP      ?? 23]; // lh
  const knee     = landmarks[LM.LEFT_KNEE     ?? 25]; // lk

  // Also grab right-side + ankles for visibility checks and framing only
  const rs = landmarks[LM.RIGHT_SHOULDER ?? 12];
  const re = landmarks[LM.RIGHT_ELBOW    ?? 14];
  const rh = landmarks[LM.RIGHT_HIP      ?? 24];
  const la = landmarks[LM.LEFT_ANKLE     ?? 27];
  const ra = landmarks[LM.RIGHT_ANKLE    ?? 28];

  const vis = (lm) => lm?.visibility ?? 0;

  // Average visibility across both sides for robustness
  const shoulderVis = (vis(shoulder) + vis(rs)) / 2;
  const elbowVis    = (vis(elbow)    + vis(re)) / 2;
  const hipVis      = (vis(hip)      + vis(rh)) / 2;
  const ankleVis    = (vis(la)       + vis(ra)) / 2;

  const { reps, phase } = stateRef.current;

  // ── Framing gates: visibility too low → return actionable message ────
  if (shoulderVis < 0.5)
    return { status: "no_body",   issues: ["No body detected — step into frame"], accuracy: 0,  reps, elbowAngle: null, bodyAngle: null, phase };
  if (elbowVis < 0.4)
    return { status: "too_close", issues: ["Move back — arms are cut off"],        accuracy: 10, reps, elbowAngle: null, bodyAngle: null, phase };
  if (hipVis < 0.35)
    return { status: "too_close", issues: ["Move back — show full body"],           accuracy: 20, reps, elbowAngle: null, bodyAngle: null, phase };
  if (!shoulder || !elbow || !wrist || !hip)
    return null;

  // ── Orientation gate: must be horizontal (lying in push-up position) ──
  // MediaPipe y increases downward. Standing = large shoulder-to-hip y gap.
  // Lying horizontal = shoulder.y ≈ hip.y (gap < 0.2 in normalised coords).
  const bodyVerticalDiff = Math.abs(shoulder.y - hip.y);
  if (bodyVerticalDiff >= 0.2) {
    return {
      status: "not_ready",
      issues: ["Get into push-up position"],
      accuracy: 0,
      reps: stateRef.current.reps,
      elbowAngle: null,
      bodyAngle: null,
      phase: stateRef.current.phase,
    };
  }

  // ── Angles — exact Python formula, left side only ────────────────────
  const angle  = calcAngle(shoulder, elbow, wrist);
  const angle2 = knee ? calcAngle(shoulder, hip, knee) : null;

  // ── Rep counting — exact Python thresholds ───────────────────────────
  const s = stateRef.current;
  if (angle > 170 && s.phase !== "up") {
    stateRef.current = { ...s, phase: "up" };
  }
  if (angle < 65 && s.phase === "up" && angle2 !== null && angle2 > 150) {
    stateRef.current = { ...s, phase: "down", reps: s.reps + 1 };
  }

  // ── Feedback ─────────────────────────────────────────────────────────
  const atBottom     = angle < 65;
  const atTop        = angle > 150;
  const bodyStr      = angle2 !== null && angle2 > 150;
  const maintainForm = atBottom && bodyStr;

  const issues = [];

  if (maintainForm) {
    // Perfect bottom — green badge
  } else if (atBottom && !bodyStr) {
    issues.push("Keep hips level");
  } else if (!atTop && !atBottom) {
    issues.push("Go lower");
  }
  // atTop between reps → no issues → green

  // ── Additional framing cues (beyond Python) ───────────────────────────
  // Shoulder width in normalised coords — how far back the user is
  const shoulderWidth = rs ? Math.abs(shoulder.x - rs.x) : null;
  if (shoulderWidth !== null && shoulderWidth < 0.12)
    issues.unshift("Move backward — too close");
  else if (shoulderWidth !== null && shoulderWidth > 0.55)
    issues.unshift("Move closer to camera");

  if (ankleVis < 0.2 && hipVis > 0.5)
    issues.push("Move back — legs cut off");

  // ── Accuracy: visibility base − form deductions ───────────────────────
  const visScore = Math.round(
    (shoulderVis * 0.3 + elbowVis * 0.4 + hipVis * 0.3) * 100
  );
  let deductions = 0;
  if (angle2 !== null && angle2 < 160) deductions += Math.round((160 - angle2) * 1.2); // hip sag
  if (shoulderWidth !== null && shoulderWidth < 0.15) deductions += 20;                 // too close
  const accuracy = Math.max(0, Math.min(99, visScore - deductions));

  return {
    status: maintainForm ? "maintain" : "go_lower",
    reps: stateRef.current.reps,
    elbowAngle: Math.round(angle),
    bodyAngle: angle2 !== null ? Math.round(angle2) : null,
    issues,
    accuracy,
    phase: stateRef.current.phase,
  };
}

function HeartSignalIcon({ size = 14, color = "#ff4444" }) {
  return (
    <svg width={size} height={size} viewBox="0 0 16 16" xmlns="http://www.w3.org/2000/svg">
      <g transform="translate(0,1)" fill={color}>
        <path d="M9.953,7.107 L8.649,9.492 C8.587,9.608 8.464,9.675 8.318,9.662 C8.181,9.649 8.068,9.557 8.031,9.432 L7.056,6.116 L5.843,10.062 C5.806,10.202 5.676,10.301 5.526,10.304 L5.517,10.304 C5.371,10.304 5.241,10.211 5.198,10.075 L3.44,4.447 L2.303,6.933 C2.245,7.039 2.177,7.152 2.052,7.152 L0.492,7.152 C2.178,11.741 8.047,14.049 8.047,14.049 C8.047,14.049 13.892,11.754 15.558,7.107 L9.953,7.107 Z" />
        <path d="M1.801,5.945 L3.226,2.837 C3.288,2.715 3.416,2.641 3.554,2.656 C3.691,2.67 3.805,2.763 3.844,2.894 L5.491,8.405 L6.712,4.245 C6.748,4.098 6.88,3.994 7.031,3.992 L7.035,3.992 C7.185,3.992 7.318,4.092 7.358,4.236 L8.447,8.104 L9.454,6.176 C9.512,6.066 9.627,5.945 9.75,5.945 L15.756,5.945 C15.91,5.33 16,4.732 16,4.044 C16,1.817 14.195,0.013 11.969,0.013 C10.046,0.013 8.44,1.361 8.037,3.162 C7.618,1.359 6.005,0.013 4.073,0.013 C1.823,0.013 0,1.837 0,4.086 C0,4.758 0.09,5.342 0.244,5.945 L1.801,5.945 Z" />
      </g>
    </svg>
  );
}

// ─── Sub-components ────────────────────────────────────────────────────────

function FeedbackBadge({ issues, status }) {
  if (!issues || issues.length === 0)
    return (
      <div className="rounded px-3 py-1 text-center"
        style={{ background: "#2d4a1e", border: "1px solid #4caf50" }}>
        <span style={{ ...pixel, color: "#7dde5b", fontSize: 20 }}>
          {status === "maintain" ? "✓ MAINTAIN FORM" : "✓ GOOD FORM"}
        </span>
      </div>
    );
  // Neutral amber for positional/setup cues (not form errors)
  if (status === "not_ready")
    return (
      <div className="rounded px-3 py-1 text-center"
        style={{ background: "#3a2e08", border: "1px solid #cc9900" }}>
        <span style={{ ...pixel, color: "#ffd040", fontSize: 25 }}>
          ⬇ {issues[0].toUpperCase()}
        </span>
      </div>
    );
  return (
    <div className="rounded px-3 py-1 text-center"
      style={{ background: "#4a1e1e", border: "1px solid #cc4444" }}>
      <span style={{ ...pixel, color: "#ff6b6b", fontSize: 25 }}>
        ⚠ {issues[0].toUpperCase()}
      </span>
    </div>
  );
}

// Consistency chart points (mock weekly data similar to screenshot)
const MOCK_CONSISTENCY = [75, 90, 82, 78, 85, 88, 92];
const DAYS = ["MON", "TUE", "WED", "THU", "FRI", "SAT", "SUN"];

function ConsistencyChart({ current }) {
  const data = [...MOCK_CONSISTENCY.slice(0, 6), current ?? 92];
  const MIN = 60, MAX = 100;
  // SVG dimensions — leave left margin for Y labels, right space for sticky note
  const PL = 32, PR = 6, PT = 6, PB = 16;
  const W = 280, H = 75;
  const chartW = W - PL - PR;
  const chartH = H - PT - PB;

  const toX = (i) => PL + (i / (data.length - 1)) * chartW;
  const toY = (v) => PT + chartH - ((v - MIN) / (MAX - MIN)) * chartH;

  const pts = data.map((v, i) => `${toX(i)},${toY(v)}`).join(" ");

  const yLabels = [100, 90, 80, 70, 60];

  return (
    <div style={{ position: "relative" }}>
      <svg viewBox={`0 0 ${W} ${H}`} style={{ width: "100%", display: "block" }}>
        {/* Horizontal grid lines + Y labels */}
        {yLabels.map((v) => {
          const y = toY(v);
          return (
            <g key={v}>
              <line x1={PL} y1={y} x2={W - PR} y2={y}
                stroke="#5a5030" strokeWidth="0.5" strokeDasharray="3,3" />
              <text x={PL - 4} y={y + 3.5} textAnchor="end"
                style={{ fontFamily: "monospace", fontSize: 6, fill: "#8a7a5a", fontWeight: "bold" }}>
                {v}%
              </text>
            </g>
          );
        })}

        {/* Line */}
        <polyline points={pts} fill="none" stroke="#4a6a2a" strokeWidth="2.5" strokeLinejoin="round" />

        {/* Dots + day labels */}
        {data.map((v, i) => {
          const x = toX(i);
          const y = toY(v);
          const isLast = i === data.length - 1;
          return (
            <g key={i}>
              {/* outer ring on last point */}
              {isLast && <circle cx={x} cy={y} r={7} fill="none" stroke="#4a6a2a" strokeWidth="1.5" />}
              <circle cx={x} cy={y} r={isLast ? 4 : 3}
                fill={isLast ? "#4a6a2a" : "#6a8a4a"} />
              {/* day label */}
              <text x={x} y={H - 3} textAnchor="middle"
                style={{ fontFamily: "monospace", fontSize: 6, fill: "#8a7a5a", fontWeight: "bold" }}>
                {DAYS[i]}
              </text>
            </g>
          );
        })}
      </svg>
    </div>
  );
}

// ─── SETUP VIEW ────────────────────────────────────────────────────────────
function SetupView({ selectedMode, onStart }) {
  return (
    <div className="mx-auto grid w-full max-w-[1400px] grid-cols-1 gap-4 p-3 sm:p-6 lg:grid-cols-3">
      <Card title="SELECTED SESSION" className="lg:col-span-2">
        <div className="flex flex-col items-center gap-6 md:flex-row">
          <div
            aria-label={selectedMode.label}
            role="img"
            className="shrink-0 rounded-lg"
            style={getTrainingSessionCardStyle(selectedMode.key, 300)}
          />
          <div className="min-w-0 flex-1">
            <p style={{ ...pixel, ...D }} className="text-[38px] leading-none">
              {selectedMode.label}
            </p>
            <p style={{ ...pixel, ...M }} className="mt-2 text-[18px]">
              {selectedMode.subtitle}
            </p>
            <div className="mt-5 rounded-lg px-4 py-3" style={{ background: C.cardInner }}>
              <p style={{ ...pixel, ...M }} className="text-[14px]">TRAINING MODE</p>
              <p style={{ ...pixel, ...D }} className="text-[24px] leading-none">{selectedMode.key}</p>
            </div>
          </div>
        </div>
      </Card>
      <Card title="READY">
        <div className="flex flex-col gap-3">
          <div className="rounded-lg p-3" style={{ background: C.cardInner }}>
            <div className="flex items-center gap-2" style={{ ...pixel, ...M, fontSize: 14, fontWeight: 600 }} >
              <Camera size={20} style={{ ...M }} />
              <span>CAMERA REQUIRED</span>
            </div>
            <p style={{ ...pixel, ...M, fontSize: 12, marginTop: 4 }}>
              MediaPipe will analyse your push-up form in real time via webcam. No data leaves your device.
            </p>
          </div>
          <button
            className="wgt-press flex w-full items-center justify-center gap-2 rounded-lg border-2 py-3"
            style={{ borderColor: C.gold + "80", background: C.green, color: C.textGold }}
            onClick={onStart}
          >
            <Play size={18} />
            <span style={pixel} className="text-[22px]">START</span>
          </button>
        </div>
      </Card>
    </div>
  );
}

// ─── ACTIVE TRAINING VIEW ─────────────────────────────────────────────────
function ActiveView({ videoRef, canvasRef, stats, elapsed, onPause, onEnd, isPaused }) {
  const mm = String(Math.floor(elapsed / 60)).padStart(2, "0");
  const ss = String(elapsed % 60).padStart(2, "0");

  // Two-layer card: outer parchment border, inner darker inset — matches screenshot
  const outerCard = {
    background: C.card,
    border: `2px solid ${C.border}`,
    borderRadius: 6,
    padding: "6px",
  };
  const innerBox = {
    // background: C.cardInner,
    backgroundImage: "url('/assets/squad/bigger_board.png')",
    backgroundPosition: "center",
    backgroundSize: "auto",
    backgroundRepeat: "no-repeat",
    borderRadius: 4,
    padding: "8px 10px 10px",
  };

  const TRACKS = [
    { title: "Recruit's Anthem", sub: "Focus Session", ytId: "xjkWcjeRAN4" },
    { title: "Who Else", sub: "High Tempo", ytId: "ii_zijseIaM" },
    { title: "Frontline Soldiers", sub: "Endurance Set", ytId: "bQMZqnevnJI" },
  ];
  const [trackIdx, setTrackIdx] = useState(0);
  const [musicPlaying, setMusicPlaying] = useState(true);
  const [progress, setProgress] = useState(0);
  const [duration, setDuration] = useState(0);
  const track = TRACKS[trackIdx];
  const ytRef = useRef(null);
  const ytContainerRef = useRef(null);
  const progressTimerRef = useRef(null);

  // Load YouTube IFrame API once
  useEffect(() => {
    if (!window.YT) {
      const tag = document.createElement("script");
      tag.src = "https://www.youtube.com/iframe_api";
      document.head.appendChild(tag);
    }
  }, []);

  // Init / reinit player when track changes
  useEffect(() => {
    let player;
    const initPlayer = () => {
      if (!window.YT || !window.YT.Player || !ytContainerRef.current) return;
      if (ytRef.current) {
        ytRef.current.destroy();
        ytRef.current = null;
      }
      player = new window.YT.Player(ytContainerRef.current, {
        height: "1",
        width: "1",
        videoId: TRACKS[trackIdx].ytId,
        playerVars: { autoplay: 1, controls: 0, rel: 0, modestbranding: 1 },
        events: {
          onReady: (e) => {
            e.target.playVideo();
            setDuration(e.target.getDuration() || 0);
            clearInterval(progressTimerRef.current);
            progressTimerRef.current = setInterval(() => {
              const t = e.target.getCurrentTime?.() || 0;
              const d = e.target.getDuration?.() || 1;
              setProgress(Math.round((t / d) * 100));
              setDuration(d);
            }, 1000);
          },
          onStateChange: (e) => {
            // YT.PlayerState.ENDED = 0
            if (e.data === 0) setTrackIdx((i) => (i + 1) % TRACKS.length);
          },
        },
      });
      ytRef.current = player;
    };

    if (window.YT && window.YT.Player) {
      initPlayer();
    } else {
      window.onYouTubeIframeAPIReady = initPlayer;
    }

    return () => {
      clearInterval(progressTimerRef.current);
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [trackIdx]);

  // Sync play/pause state to YT player
  useEffect(() => {
    if (!ytRef.current) return;
    if (musicPlaying) ytRef.current.playVideo?.();
    else ytRef.current.pauseVideo?.();
  }, [musicPlaying]);

  const fmtTime = (secs) => {
    const m = String(Math.floor(secs / 60)).padStart(2, "0");
    const s = String(Math.floor(secs % 60)).padStart(2, "0");
    return `${m}:${s}`;
  };
  const currentSecs = Math.round((progress / 100) * duration);

  const MOTTOS = [
    ["Stay focused. Trust the process.", "Small steps. Stronger tomorrow."],
    ["Pain is temporary. Glory is forever.", "Push harder. You've got this."],
    ["Every rep counts. Keep going.", "No shortcuts. No excuses."],
  ];
  const motto = MOTTOS[trackIdx % MOTTOS.length];

  return (
    <div className="mx-auto flex w-full max-w-[1400px] flex-col gap-3 p-3 sm:p-4">
      {/* Main row: stats + camera */}
      <div className="grid grid-cols-1 gap-3 lg:grid-cols-[200px_1fr]">
        {/* Left stats panel */}
        <div className="grid grid-cols-2 gap-3 lg:flex lg:flex-col">

          {/* PUSH-UPS card */}
          <div style={outerCard} className="col-span-2 lg:col-span-1">
            <div style={{ backgroundImage: "url('/assets/training/training_overview/card_background.png')", backgroundPosition: "center", backgroundSize: "130% 115%", backgroundRepeat: "no-repeat", borderRadius: 3, padding: "10px 12px", height: "100%", display: "flex", flexDirection: "column", justifyContent: "center", alignItems: "center", textAlign: "center" }}>
              <div className="flex items-center gap-1 mb-1">
                <PushUpIcon size={25} color="black" />
                <span style={{ ...pixel, ...D, fontSize: 25, letterSpacing: 1 }}>PUSH-UPS</span>
              </div>
              <p style={{ ...pixel, ...D, fontSize: 100, lineHeight: 1 }}>{stats.reps}</p>
              <div className="flex items-center gap-1 mt-1">
                <span style={{ ...pixel, ...M, fontSize: 20 }}>REPS</span>
              </div>
            </div>
          </div>

          {/* FORM ACCURACY card */}
          <div style={outerCard}>
            <div style={{ backgroundImage: "url('/assets/squad/rectangle_board.png')", backgroundPosition: "center", backgroundSize: "110% 160%", backgroundRepeat: "no-repeat", borderRadius: 10, padding: "10px 12px", height: "100%", display: "flex", flexDirection: "column", justifyContent: "center", alignItems: "center", textAlign: "center" }}>
              <div className="flex items-center gap-1 mb-1">
                <AccuracyIcon size={25} color="black" />
                <span style={{ ...pixel, ...D, fontSize: 18, letterSpacing: 1 }}>FORM ACCURACY</span>
              </div>
              <p style={{ ...pixel, ...D, fontSize: 38, lineHeight: 1 }}>{stats.accuracy}%</p>
            </div>
          </div>

          {/* SESSION DURATION card */}
          <div style={outerCard}>
            <div style={{ backgroundImage: "url('/assets/squad/rectangle_board.png')", backgroundPosition: "center", backgroundSize: "110% 160%", backgroundRepeat: "no-repeat", borderRadius: 10, padding: "10px 12px", height: "100%", display: "flex", flexDirection: "column", justifyContent: "center", alignItems: "center", textAlign: "center" }}>
              <div className="flex items-center gap-1 mb-1">
                <DurationIcon size={25} color="black" />
                <span style={{ ...pixel, ...D, fontSize: 18, letterSpacing: 1 }}>SESSION DURATION</span>
              </div>
              <p style={{ ...pixel, ...D, fontSize: 34, lineHeight: 1 }}>{mm}:{ss}</p>
            </div>
          </div>

          {/* PAUSE / RESUME button */}
          <button
            className="wgt-press w-full flex justify-center"
            onClick={onPause}
            style={{ background: "none", border: "none", padding: 0 }}
          >
            <img
              src={
                isPaused
                  ? "/assets/training/training_overview/resume.png"
                  : "/assets/training/training_overview/pause.png"
              }
              alt={isPaused ? "Resume" : "Pause"}
              style={{
                width: "min(220px, 90%)",
                height: "auto",
              }}
            />
          </button>

          {/* END SESSION button */}
          <button
            className="wgt-press w-full flex justify-center"
            onClick={onEnd}
            style={{
              background: "none",
              border: "none",
              padding: 0,
            }}
          >
            <img
              src="/assets/training/training_overview/end_session.png"
              alt="End Session"
              style={{
                width: "min(220px, 90%)",
                height: "auto",
              }}
            />
          </button>
        </div>

        {/* Camera + canvas overlay */}
        <div className="relative rounded-lg overflow-hidden" style={{ background: "#111", minHeight: 360, isolation: "isolate" }}>
          {/* Tiny Camera ON badge */}
          <div
            className="absolute top-3 right-3 z-20 flex items-center gap-1 rounded px-2 py-1"
            style={{ backgroundImage: "url('/assets/training/training_overview/camera_on.png')", backgroundSize: "100%", backgroundRepeat: "no-repeat", borderRadius: 4, height: "100%", padding: "4%" }}
          >
          </div>

          <div className="absolute top-3 left-3 z-20 flex items-center gap-2">
            <img
              src="/assets/training/training_overview/body_point_markers.png"
              width={140} className="rounded"
            />
            <img
              src="/assets/training/training_overview/angle_guideline.png"
              width={140} className="rounded"
            />
          </div>

          {stats.elbowAngle && (
            <div
              className="absolute top-3 left-80 z-20 flex items-center gap-2"
            >
              <div className="rounded px-4 py-2" style={{ background: "#1a1a1acc" }}>
                <span style={{ ...pixel, fontSize: 12, color: "#ffd700" }}>
                  ELBOW: {stats.elbowAngle}°
                </span>
                {stats.bodyAngle && (
                  <span style={{ ...pixel, fontSize: 12, color: "#a0c0ff", display: "block" }}>
                    BODY: {stats.bodyAngle}°
                  </span>
                )}
              </div>
            </div>
          )}

          {/* Form feedback */}
          <div className="absolute bottom-3 left-0 right-0 z-20 flex justify-center">
            <FeedbackBadge issues={stats.issues} status={stats.status} />
          </div>

          <video
            ref={videoRef}
            className="absolute inset-0 w-full h-full"
            style={{ transform: "scaleX(-1)", WebkitTransform: "scaleX(-1)", opacity: 0.85, objectFit: "cover", background: "#000" }}
            autoPlay
            muted
            playsInline
          />
          <canvas
            ref={canvasRef}
            className="absolute inset-0 w-full h-full"
            style={{ transform: "scaleX(-1)", WebkitTransform: "scaleX(-1)", position: "absolute", pointerEvents: "none" }}
          />

          {isPaused && (
            <div className="absolute inset-0 z-30 flex flex-col items-center justify-center"
              style={{ background: "#000000cc" }}>
              <p style={{ ...pixel, ...D, fontSize: 48 }}>PAUSED</p>
            </div>
          )}
        </div>
      </div>

      {/* Bottom bar: music player + motivation card */}
      <div className="grid grid-cols-1 gap-3 lg:grid-cols-[200px_1fr_1fr]">

        {/* Spacer to align with left stats column on desktop */}
        <div className="hidden lg:block" />

        {/* Hidden YouTube player mount point */}
        <div ref={ytContainerRef} style={{ position: "absolute", width: 1, height: 1, opacity: 0, pointerEvents: "none" }} />

        {/* Music Player */}
        <div style={{ ...outerCard }}>
          <div style={{ backgroundImage: "url('/assets/sidebar/profile_backdrop.png')", backgroundPosition: "center", backgroundSize: "123% 155%", backgroundRepeat: "no-repeat", borderRadius: 4, padding: "10px 12px", height: "100%", padding: "8px 12px" }}>
            <div className="flex items-center gap-3">
              {/* Album art thumbnail */}
              <div className="shrink-0 rounded overflow-hidden" style={{ width: 44, height: 44, background: "#1a1a0e", border: `1px solid ${C.border}` }}>
                <img
                  src={`https://img.youtube.com/vi/${track.ytId}/default.jpg`}
                  alt={track.title}
                  style={{ width: "100%", height: "100%", objectFit: "cover", opacity: 0.85 }}
                />
              </div>
              {/* Track info */}
              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-1 mb-0.5">
                  <span style={{ ...pixel, fontSize: 12, color: C.green, letterSpacing: 1 }}>NOW PLAYING</span>
                  <span style={{ fontSize: 9, color: C.green }}>★</span>
                </div>
                <p style={{ ...pixel, ...D, fontSize: 18, lineHeight: 1.2 }}>{track.title}</p>
                <p style={{ ...pixel, color: C.inkSoft, fontSize: 14 }}>{track.sub}</p>
              </div>
              {/* Current / total time */}
              <div className="shrink-0 text-right">
                <p style={{ ...pixel, color: C.green, fontSize: 14 }}>{fmtTime(currentSecs)}</p>
                <p style={{ ...pixel, color: C.inkSoft, fontSize: 14 }}>{fmtTime(duration)}</p>
              </div>
            </div>

            {/* Progress bar */}
            <div className="mt-2 h-1.5 rounded-full overflow-hidden" style={{ background: "#2a2a1a" }}>
              <div className="h-full rounded-full" style={{ background: C.green, width: `${progress}%`, transition: "width 0.5s" }} />
            </div>

            {/* Controls */}
            <div className="flex items-center justify-center gap-4 mt-2">
              <button
                className="wgt-press"
                style={{ color: C.green, background: "none", border: "none", cursor: "pointer", padding: 2 }}
                onClick={() => setTrackIdx((i) => (i - 1 + TRACKS.length) % TRACKS.length)}
              >
                <SkipBack size={20} />
              </button>
              <button
                className="wgt-press rounded-full flex items-center justify-center"
                style={{ width: 35, height: 35, border: `2px solid ${C.greenLit}90`, color: C.green, cursor: "pointer" }}
                onClick={() => setMusicPlaying((p) => !p)}
              >
                {musicPlaying ? <Pause size={23} /> : <Play size={23} />}
              </button>
              <button
                className="wgt-press"
                style={{ color: C.green, background: "none", border: "none", cursor: "pointer", padding: 2 }}
                onClick={() => setTrackIdx((i) => (i + 1) % TRACKS.length)}
              >
                <SkipForward size={20} />
              </button>
            </div>
          </div>
        </div>

        {/* Motivation card */}
        <div style={{ ...outerCard }}>
          <div style={{ backgroundImage: "url('/assets/common/stickyCard.png')", backgroundPosition: "center", backgroundSize: "160% 220%", backgroundRepeat: "no-repeat", borderRadius: 5, padding: "10px 12px", height: "100%", padding: "34px 12px" }} className="flex items-center gap-3">
            {/* Pixel soldier avatar */}
            <div className="shrink-0 flex items-center justify-center rounded" style={{ width: 50, height: 50 }}>
              <img src="..\..\assets\journal\talking_soldier.png"></img>
            </div>
            {/* Text */}
            <div className="flex-1">
              <p style={{ ...pixel, ...D, fontSize: 17, lineHeight: 1.4 }}>{motto[0]}</p>
              <p style={{ ...pixel, ...D, fontSize: 17, lineHeight: 1.4 }}>{motto[1]}</p>
            </div>
            {/* Heart icon */}
            <div className="shrink-0">
              <img src="..\..\assets\journal\milestone.png" width="50"></img>
            </div>
          </div>
        </div>

      </div>
    </div>
  );
}

// ─── SUMMARY VIEW ─────────────────────────────────────────────────────────
function SummaryView({ stats, elapsed, onNavigate }) {
  const mm = String(Math.floor(elapsed / 60)).padStart(2, "0");
  const ss = String(elapsed % 60).padStart(2, "0");
  const xp = Math.round(stats.reps * 3.5 + stats.accuracy);
  const cal = Math.round(stats.reps * 0.32 * 10);
  // const [reflection, setReflection] = useState("");

  const oc = { background: C.card, border: `2px solid ${C.border}`, borderRadius: 6, padding: "5px" };
  const ib = { backgroundImage: "url('/assets/squad/bigger_board.png')", backgroundPosition: "center", backgroundSize: "auto", backgroundRepeat: "no-repeat", borderRadius: 4, padding: "10px 12px", height: "100%" };

  return (
    <div className="mx-auto w-full max-w-[1400px] p-3 sm:p-4" style={{
      display: "grid",
      gap: 6,
      gridTemplateColumns: "190px 1fr 1fr 220px",
      gridTemplateRows: "auto auto auto auto",
      gridTemplateAreas: `
        "pushups   formcard  chart    chart"
        "accuracy  formcard  summary  missions"
        "duration  formcard  summary  missions"
        ".         .         .        save"
      `,
    }}>

      {/* PUSH-UPS */}
      <div style={{ gridArea: "pushups", ...oc }}>
        <div style={{ backgroundImage: "url('/assets/training/training_overview/card_background.png')", backgroundPosition: "center", backgroundSize: "120% 110%", backgroundRepeat: "no-repeat", borderRadius: 4, padding: "10px 12px", height: "100%", display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center", textAlign: "center" }}>
          <div className="flex items-center gap-1 mb-1">
            <PushUpIcon size={30} color="black" />
            <span style={{ ...pixel, ...D, fontSize: 25 }}>PUSH-UPS</span>
          </div>
          <p style={{ ...pixel, ...D, fontSize: 70, lineHeight: 1 }}>{stats.reps}</p>
          <div className="flex items-center gap-1 mt-1">
            <span style={{ ...pixel, color: "grey", fontSize: 15 }}>REPS</span>
          </div>
        </div>
      </div>

      {/* FORM ACCURACY */}
      <div style={{ gridArea: "accuracy", ...oc }}>
        <div style={{ backgroundImage: "url('/assets/squad/rectangle_board.png')", backgroundPosition: "center", backgroundSize: "120% 150%", backgroundRepeat: "no-repeat", borderRadius: 4, padding: "10px 12px", height: "100%", display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center", textAlign: "center" }}>
          <div className="flex items-center gap-1 mb-1">
            <AccuracyIcon size={20} color="black" />
            <span style={{ ...pixel, ...D, fontSize: 15 }}>FORM ACCURACY</span>
          </div>
          <p style={{ ...pixel, ...D, fontSize: 34, lineHeight: 1 }}>{stats.accuracy}%</p>
        </div>
      </div>

      {/* SESSION DURATION */}
      <div style={{ gridArea: "duration", ...oc }}>
        <div style={{ backgroundImage: "url('/assets/squad/rectangle_board.png')", backgroundPosition: "center", backgroundSize: "120% 150%", backgroundRepeat: "no-repeat", borderRadius: 4, padding: "10px 12px", height: "100%", display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center", textAlign: "center" }}>
          <div className="flex items-center gap-1 mb-1">
            <DurationIcon size={20} color="black" />
            <span style={{ ...pixel, ...D, fontSize: 15 }}>SESSION DURATION</span>
          </div>
          <p style={{ ...pixel, ...D, fontSize: 30, lineHeight: 1 }}>{mm}:{ss}</p>
        </div>
      </div>

      {/* FORM TRAINING card — spans 3 rows */}
      <div style={{ gridArea: "formcard", ...oc }}>
        <div style={{ backgroundImage: "url('/assets/squad/bigger_board.png')", backgroundPosition: "center", backgroundSize: "110% 115%", backgroundRepeat: "no-repeat", borderRadius: 4, padding: "10px 12px", height: "100%", display: "flex", flexDirection: "column", gap: 1 }}>
          <div className="text-center">
            <p style={{ ...pixel, ...D, fontSize: 30 }}>FORM TRAINING</p>
            <p style={{ ...pixel, color: C.inkSoft, fontSize: 17 }}>FORM CHECK SESSION</p>
          </div>
          <div className="flex justify-center flex-1 items-center" >
            <img src="..\..\assets\training\training_overview\pushup.png" width="170" height="170"></img>
          </div>
          <div className="flex flex-col gap-1.5">
            {[
              ["FORM ACCURACY", `${stats.accuracy}%`, true],
              ["TOTAL REPS", stats.reps, false],
              ["SETS COMPLETED", "1 / 4", false],
              ["REST EFFICIENCY", "85%", false],
            ].map(([k, v, star]) => (
              // <div key={k} className="flex justify-between items-center"
              //   style={{ borderBottom: `1px solid ${C.border}33`, paddingBottom: 3 }}>
              //   <span style={{ ...pixel, ...D, fontSize: 16 }}>{k}</span>
              //   <span style={{ ...pixel, ...D, fontSize: 19 }}>{v}{star ? " ⭐" : ""}</span>
              // </div>
              <div key={k} className="flex justify-between items-center"
                style={{ borderBottom: `1px solid ${C.border}33`, paddingBottom: 3, }}>
                <span style={{ ...pixel, ...D, fontSize: 16 }}>{k}</span>
                <span className="flex items-center gap-1" style={{ ...pixel, ...D, fontSize: 19 }}>
                  {v}{star && (<img src="../../assets/journal/milestone.png" width={30} />)}
                </span>
              </div>
            ))}
          </div>
          <div className="rounded px-3 py-2 flex items-center justify-center gap-2"
            style={{ background: "#3a3010", border: `1px solid ${C.gold}55` }}>
            <img src="..\..\assets\training\training_overview\medal_gold.png" width="10" height="10"></img>
            <span style={{ ...pixel, color: C.gold, fontSize: 13 }}>PERSONAL BEST!</span>
          </div>
        </div>
      </div>

      {/* FORM CONSISTENCY CHART */}
      <div style={{ gridArea: "chart", ...oc }}>
        <div style={{ backgroundImage: "url('/assets/squad/rectangle_board.png')", backgroundPosition: "center", backgroundSize: "110% 160%", backgroundRepeat: "no-repeat", borderRadius: 4, padding: "10px 12px", height: "100%", display: "flex", flexDirection: "column", gap: 4 }}>
          <p style={{ ...pixel, ...D, fontSize: 20, textAlign: "center" }}>FORM CONSISTENCY (%)</p>
          <div style={{ display: "flex", alignItems: "stretch", gap: 6 }}>
            <div style={{ flex: 1, minWidth: 0 }}>
              <ConsistencyChart current={stats.accuracy} />
              <div className="mt-2 rounded p-2" style={{ background: "#3a3010" }}>
                <p style={{ ...pixel, color: C.gold, fontSize: 13, textAlign: "center" }}>
                  GOOD FORM BUILDS STRONG FOUNDATIONS.
                </p>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* SESSION SUMMARY — spans 2 rows */}
      <div style={{ gridArea: "summary", ...oc }}>
        <div style={{ backgroundImage: "url('/assets/sidebar/profile_backdrop.png')", backgroundPosition: "center", backgroundSize: "120% 155%", backgroundRepeat: "no-repeat", borderRadius: 4, padding: "10px 12px", height: "100%", display: "flex", flexDirection: "column", gap: 8 }}>
          <p className="text-center" style={{ ...pixel, ...D, fontSize: 20, letterSpacing: 1 }}>Session Summary</p>
          <div className="flex items-center">
            <div className="shrink-0 flex items-end justify-center" style={{ width: 50, height: 50 }}>
              <img src="..\..\assets\training\training_overview\situp.png"></img>
            </div>
            <div className="flex flex-1 gap-2">
              {[
                { label: "REPS", value: stats.reps, sub: "" },
                { label: "CALORIES", value: cal, sub: "kcal" },
                { label: "XP EARNED", value: `+${xp}`, sub: "XP" },
              ].map(({ label, value, sub }) => (
                <div key={label} className="flex-1 rounded p-1.5 text-center"
                  style={{ background: C.card, border: `1px solid ${C.border}44` }}>
                  <p style={{ ...pixel, color: C.textDark, fontSize: 16 }}>{label}</p>
                  <p style={{ ...pixel, ...D, fontSize: 20, lineHeight: 1.1 }}>{value}</p>
                  {sub && <p style={{ ...pixel, ...M, fontSize: 12 }}>{sub}</p>}
                </div>
              ))}
            </div>
          </div>
          <div className="rounded px-3 py-1.5 flex items-center justify-center gap-2"
            style={{ background: "#3a3010", border: `1px solid ${C.gold}55` }}>
            <span style={{ ...pixel, color: C.gold, fontSize: 14 }}>GREAT WORK, BUDDY!</span>
          </div>
        </div>
      </div>

      {/* DAILY MISSION + WEEK PROGRESS — spans 2 rows */}
      <div style={{ gridArea: "missions", ...oc }}>
        <div style={{ backgroundImage: "url('/assets/squad/square_black_board.png')", backgroundPosition: "center", backgroundSize: "135% 130%", backgroundRepeat: "no-repeat", borderRadius: 4, padding: "10px 12px", height: "100%", display: "flex", flexDirection: "column", gap: 10 }}>
          {/* Daily mission */}
          <div className="flex items-start gap-2">
            <img src="..\..\assets\training\training_overview\checklist.png" width="20" height="20"></img>
            <div className="flex-1">
              <div className="flex justify-between items-center">
                <p style={{ ...pixel, color: C.gold, fontSize: 13 }}>Daily Mission</p>
                <img src="..\..\assets\journal\milestone.png" width="30"></img>
              </div>
              <p style={{ ...pixel, color: C.cardLight, fontSize: 13 }}>Burn 500 calories</p>
              <div className="mt-1 h-2 rounded overflow-hidden" style={{ background: "#363628" }}>
                <div className="h-full rounded" style={{ background: C.gold, width: `${Math.min(100, (cal / 500) * 100)}%` }} />
              </div>
              <div className="flex justify-between mt-0.5">
                <p style={{ ...pixel, color: C.cardLight, fontSize: 12 }}>{cal} / 500</p>
                <p style={{ ...pixel, color: C.cardLight, fontSize: 12 }}>×15</p>
              </div>
            </div>
          </div>

          <div style={{ background: C.border + "55" }} />

          {/* Week progress */}
          <div className="flex items-center gap-2">
            <div className="flex items-center justify-center rounded shrink-0">
              <img src="..\..\assets\training\training_overview\calendar.png" width="20" height="20"></img>
            </div>
            <div className="flex-1">
              <div className="flex justify-between items-center">
                <p style={{ ...pixel, color: C.gold, fontSize: 13 }}>Week 3 Progress</p>
                <img src="..\..\assets\journal\milestone.png" width="30"></img>
              </div>
              <div className="mt-1 h-2 rounded overflow-hidden" style={{ background: "#363628" }}>
                <div className="h-full rounded" style={{ background: C.gold, width: "67%" }} />
              </div>
              <p style={{ ...pixel, color: C.cardLight, fontSize: 12, marginTop: 2 }}>2,350 / 3,500 XP</p>
            </div>
          </div>
        </div>
      </div>

      {/* TODAY'S REFLECTION — spans 2 cols */}
      {/* <div style={{ gridArea: "reflect", ...oc }}>
        <div style={{ backgroundImage: "url('/assets/squad/bigger_board.png')", backgroundPosition: "center", backgroundSize: "110% 120%", backgroundRepeat: "no-repeat", borderRadius: 4, padding: "10px 12px", height: "100%", display:"flex", flexDirection:"column", gap: 8 }}>
          <div className="flex justify-between items-center">
            <p style={{ ...pixel, ...D, fontSize: 20 }}>TODAY'S REFLECTION</p>
            <div className="flex items-center gap-2">
              <p style={{ ...pixel, color: C.inkSoft, fontSize: 15 }}>
                {new Date().toLocaleDateString("en-GB",{day:"2-digit",month:"short",year:"numeric"}).toUpperCase()}
              </p>
            </div>
          </div>
          <p style={{ ...pixel, color: C.inkSoft, fontSize: 14 }}>
            How did the session feel?<br/>What went well? What can be improved?
          </p>
          <textarea
            className="w-full rounded p-2 resize-none flex-1"
            style={{
              background: C.cardInner, border: `1px solid ${C.border}`,
              color: C.ink, ...pixel, fontSize: 13,
              minHeight: 48, outline: "none",
            }}
            placeholder="Write your reflection here..."
            value={reflection}
            onChange={(e) => setReflection(e.target.value)}
          />
        </div>
      </div> */}

      {/* SAVE TO JOURNAL — spans 2 cols */}
      {/* <div style={{ gridArea: "journal", ...oc }}>
        <div style={{ backgroundImage: "url('/assets/common/stickyCard.png')", backgroundPosition: "center", backgroundSize: "160% 230%", backgroundRepeat: "no-repeat", borderRadius: 6, padding: "10px 12px", height: "100%", display:"flex", flexDirection:"column", alignItems:"center", justifyContent:"center", gap: 10, textAlign:"center" }}>
          <p style={{ ...pixel, ...D, fontSize: 25 }}>SAVE THIS SESSION TO JOURNAL?</p>
          <p style={{ ...pixel, color: C.inkSoft, fontSize: 15, lineHeight: 1.6 }}>
            Keep a detailed record of this workout<br/>and your reflections.
          </p>
          <button
            className="wgt-press flex items-center justify-center gap-2 rounded-lg border-1 px-6 py-3 w-full"
            style={{ borderColor: C.gold + "80", backgroundImage: "url('/assets/squad/green_board.png')",backgroundPosition: "center", backgroundSize: "650px 80px", backgroundRepeat: "no-repeat", color: C.textGold }}
            onClick={() => onNavigate(ROUTES.TRAINING)}
          >
            <BookOpen size={18} />
            <span style={{ ...pixel, fontSize: 18 }}>SAVE TO JOURNAL</span>
          </button>
        </div>
      </div> */}

      {/* SAVE RECORD */}
      <div style={{ gridArea: "save", ...oc }}>
        <button
          className="wgt-press flex items-center justify-center gap-2 rounded-lg px-8 py-3"
          style={{
            border: `1px solid ${C.gold}80`,
            backgroundImage: "url('/assets/squad/green_board.png')",
            backgroundPosition: "center",
            backgroundSize: "117%",
            backgroundRepeat: "no-repeat",
            color: C.textGold,
            minWidth: "100%",
          }}
          // CHANGE THIS: Add the function call here!
          onClick={async () => {
            try {
              const currentUser = auth.currentUser;
              if (!currentUser) {
                console.error("No authenticated user found!");
                alert("Please log in to save your session.");
                return;
              }

              // Add to Firestore using trackingSessions collection
              await addDoc(collection(db, "trainingSessions"), {
                userId: currentUser.uid, // Satisfies your Firestore Security Rule!
                mode: stats.mode || "pushup",
                duration: elapsed, // saved as total seconds elapsed
                stats: {
                  reps: stats.reps,
                  accuracy: stats.accuracy
                },
                timestamp: serverTimestamp(),
              });

              console.log("Session saved successfully!");

              // Navigate away only after the data saves successfully
              onNavigate(ROUTES.TRAINING);
            } catch (error) {
              console.error("Firestore error details:", error);
              alert("Failed to save session: " + error.message);
            }
          }}
        >
          <BookOpen size={18} />
          <span style={{ ...pixel, fontSize: 18 }}> SAVE RECORD </span>
        </button>
      </div>
    </div>
  );
}

// ─── MAIN PAGE ─────────────────────────────────────────────────────────────
export default function TrainingSessionPage({ mode, onNavigate }) {
  const selectedMode = getTrainingMode(mode);

  // phase: "setup" | "active" | "summary"
  const [phase, setPhase] = useState("setup");
  const [isPaused, setIsPaused] = useState(false);
  const [elapsed, setElapsed] = useState(0);
  const [stats, setStats] = useState({
    reps: 0,
    accuracy: 0,
    elbowAngle: null,
    bodyAngle: null,
    issues: ["Waiting for detection..."],
    status: "no_body",
    phase: "up",
  });

  const videoRef = useRef(null);
  const canvasRef = useRef(null);
  const poseRef = useRef(null);
  const cameraRef = useRef(null);
  const timerRef = useRef(null);
  const repStateRef = useRef({ phase: "up", reps: 0 });
  const isPausedRef = useRef(false);

  // keep isPausedRef in sync
  useEffect(() => {
    isPausedRef.current = isPaused;
  }, [isPaused]);

  // ── MediaPipe setup ──
  const startCamera = useCallback(async () => {
    try {
      await loadMediaPipe();

      const { Pose, POSE_LANDMARKS } = window;
      if (!Pose) throw new Error("MediaPipe Pose not loaded");

      // expose for calcAngle helper
      window.POSE_LANDMARKS = POSE_LANDMARKS;

      const pose = new Pose({
        locateFile: (f) =>
          `https://cdn.jsdelivr.net/npm/@mediapipe/pose@0.5.1675469404/${f}`,
      });
      pose.setOptions({
        modelComplexity: 1,
        smoothLandmarks: true,
        enableSegmentation: false,
        minDetectionConfidence: 0.5,
        minTrackingConfidence: 0.5,
      });

      pose.onResults((results) => {
        if (isPausedRef.current) return;

        const canvas = canvasRef.current;
        const video = videoRef.current;
        if (!canvas || !video) return;

        const ctx = canvas.getContext("2d");
        canvas.width = video.videoWidth || 640;
        canvas.height = video.videoHeight || 480;
        ctx.clearRect(0, 0, canvas.width, canvas.height);

        if (results.poseLandmarks) {
          const lms = results.poseLandmarks;

          // ── Only draw body landmarks (indices 11–28), skip face (0–10) ──
          // Connections: [fromIdx, toIdx] — shoulders, arms, torso, legs only
          const BODY_CONNECTIONS = [
            [11, 12], [11, 23], [12, 24], [23, 24], // torso
            [11, 13], [13, 15],                       // left arm
            [12, 14], [14, 16],                       // right arm
            [23, 25], [25, 27],                       // left leg
            [24, 26], [26, 28],                       // right leg
          ];
          const KEY_JOINTS = [11, 12, 13, 14, 15, 16, 23, 24, 25, 26]; // yellow
          const BODY_JOINTS = [11, 12, 13, 14, 15, 16, 17, 18, 19, 20, 21, 22, 23, 24, 25, 26, 27, 28]; // red dots

          // Helper: landmark → canvas coords, null if below visibility threshold
          const pt = (idx, minVis = 0.4) => {
            const lm = lms[idx];
            if (!lm || (lm.visibility ?? 1) < minVis) return null;
            return { x: lm.x * canvas.width, y: lm.y * canvas.height };
          };

          // Gate: require at least one shoulder visible
          const bodyInFrame = pt(11, 0.5) || pt(12, 0.5);
          if (!bodyInFrame) {
            setStats((prev) => ({
              ...prev,
              accuracy: 0,
              issues: ["No body detected — step into frame"],
              status: "no_body",
              elbowAngle: null,
              bodyAngle: null,
            }));
            return;
          }

          // Draw connections
          ctx.lineWidth = 2;
          ctx.strokeStyle = "#ffffffaa";
          BODY_CONNECTIONS.forEach(([a, b]) => {
            const pA = pt(a), pB = pt(b);
            if (!pA || !pB) return;
            ctx.beginPath();
            ctx.moveTo(pA.x, pA.y);
            ctx.lineTo(pB.x, pB.y);
            ctx.stroke();
          });

          // Small red dots for all body joints
          BODY_JOINTS.forEach((idx) => {
            const p = pt(idx);
            if (!p) return;
            ctx.beginPath();
            ctx.arc(p.x, p.y, 4, 0, 2 * Math.PI);
            ctx.fillStyle = "#ff4444";
            ctx.fill();
          });

          // Large yellow highlights on key push-up joints
          KEY_JOINTS.forEach((idx) => {
            const p = pt(idx, 0.5);
            if (!p) return;
            ctx.beginPath();
            ctx.arc(p.x, p.y, 8, 0, 2 * Math.PI);
            ctx.fillStyle = "#ffd700";
            ctx.fill();
          });

          // Analyse and update stats
          const analysis = analysePushup(lms, repStateRef);
          if (analysis) {
            setStats({
              reps: analysis.reps,
              accuracy: analysis.accuracy,
              elbowAngle: analysis.elbowAngle,
              bodyAngle: analysis.bodyAngle,
              issues: analysis.issues,
              status: analysis.status ?? "ok",
            });
          }
        } else {
          // No landmarks at all — camera sees nothing
          setStats((prev) => ({
            ...prev,
            accuracy: 0,
            issues: ["No body detected — step into frame"],
            status: "no_body",
            elbowAngle: null,
            bodyAngle: null,
          }));
        }
      });

      poseRef.current = pose;

      const { Camera } = window;
      if (!Camera) throw new Error("MediaPipe Camera not loaded");

      const camera = new Camera(videoRef.current, {
        onFrame: async () => {
          await pose.send({ image: videoRef.current });
        },
        width: 1280,
        height: 720,
      });
      await camera.start();
      cameraRef.current = camera;
    } catch (err) {
      console.error("MediaPipe init error:", err);
      // Gracefully degrade – still show UI without pose overlay
    }
  }, []);

  const stopCamera = useCallback(() => {
    cameraRef.current?.stop();
    poseRef.current?.close();
    cameraRef.current = null;
    poseRef.current = null;
  }, []);

  // ── Timer ──
  const startTimer = useCallback(() => {
    timerRef.current = setInterval(() => {
      if (!isPausedRef.current) setElapsed((e) => e + 1);
    }, 1000);
  }, []);

  const stopTimer = useCallback(() => {
    clearInterval(timerRef.current);
  }, []);

  // ── Lifecycle ──
  const handleStart = useCallback(async () => {
    setPhase("active");
    setIsPaused(false);
    setElapsed(0);
    repStateRef.current = { phase: "up", reps: 0 };
    setStats({ reps: 0, accuracy: 0, elbowAngle: null, bodyAngle: null, issues: ["Step into frame and get into push-up position"], status: "no_body" });
    await startCamera();
    startTimer();
  }, [startCamera, startTimer]);

  const handlePause = useCallback(() => {
    setIsPaused((p) => !p);
  }, []);

  const saveWorkoutSession = async () => {
    const currentUser = auth.currentUser;
    if (!currentUser) {
      console.error("No authenticated user found. Session not saved.");
      return;
    }

    // Calculate overall accuracy from stats object
    const totalReps = stats.reps || 0;
    const goodReps = stats.goodReps || 0;
    const accuracy = totalReps > 0 ? Math.round((goodReps / totalReps) * 100) : 0;

    // Format elapsed time to a readable string (MM:SS)
    const minutes = Math.floor(elapsed / 60).toString().padStart(2, '0');
    const seconds = (elapsed % 60).toString().padStart(2, '0');
    const durationStr = `${minutes}:${seconds}`;

    try {
      const sessionData = {
        userId: currentUser.uid,          // Matches security rule requirements
        exerciseType: selectedMode.id,     // e.g., 'pushup'
        exerciseLabel: selectedMode.label, // e.g., 'PUSH-UPS'
        reps: totalReps,
        goodReps: goodReps,
        accuracy: accuracy,
        duration: durationStr,
        durationSeconds: elapsed,
        timestamp: serverTimestamp(),      // Safe server time tracking
      };

      console.log("Saving workout session data:", sessionData);

      // Add document to the top-level 'trainingSessions' collection
      await addDoc(collection(db, "trainingSessions"), sessionData);
      console.log("Workout session successfully saved to Firebase!");
    } catch (error) {
      console.error("Error saving workout session to Firestore:", error);
    }
  };

  const handleEnd = useCallback(() => {
    stopCamera();
    stopTimer();
    setPhase("summary"); // Just transition straight to the summary page safely
  }, [stopCamera, stopTimer]);

  // Cleanup on unmount
  useEffect(() => {
    return () => {
      stopCamera();
      stopTimer();
    };
  }, [stopCamera, stopTimer]);

  const subtitle =
    phase === "setup"
      ? "SESSION SETUP"
      : phase === "active"
        ? "Focus on proper technique and movement quality."
        : "SESSION COMPLETE";

  return (
    <AppShell
      active={ROUTES.TRAINING}
      onNavigate={onNavigate}
      user={user}
      icon={<Dumbbell size={36} />}
      title={selectedMode.label}
      subtitle={subtitle}
      action={
        <ActionButton
          icon={<ArrowLeft size={18} />}
          onClick={() => {
            stopCamera();
            stopTimer();
            onNavigate(ROUTES.TRAINING);
          }}
        >
          BACK
        </ActionButton>
      }
    >
      {phase === "setup" && (
        <SetupView selectedMode={selectedMode} onStart={handleStart} />
      )}

      {phase === "active" && (
        <ActiveView
          videoRef={videoRef}
          canvasRef={canvasRef}
          stats={stats}
          elapsed={elapsed}
          isPaused={isPaused}
          onPause={handlePause}
          onEnd={handleEnd}
        />
      )}

      {phase === "summary" && (
        <SummaryView stats={stats} elapsed={elapsed} onNavigate={onNavigate} />
      )}
    </AppShell>
  );
}