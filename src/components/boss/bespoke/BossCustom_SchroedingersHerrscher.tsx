/* Copyright 2026 Elian Schock, Jonas Schwenk */
"use client";
/** Schrödingers Herrscher — Mythic Physik. Quantum superposition: two overlapping states, waveform aura. */

interface Props { size: number; animated: boolean }

export function BossCustom_SchroedingersHerrscher({ size, animated }: Props) {
  const cx = size / 2, cy = size / 2;
  const r  = size * 0.3;

  return (
    <svg width={size} height={size} viewBox={`0 0 ${size} ${size}`} style={{ overflow: "visible" }}>
      <defs>
        <filter id="qm-glow">
          <feGaussianBlur stdDeviation="8" result="b" />
          <feComposite in="b" in2="SourceGraphic" operator="over" />
        </filter>
        <filter id="qm-blur">
          <feGaussianBlur stdDeviation="3" />
        </filter>
        <radialGradient id="qm-body-a" cx="40%" cy="50%">
          <stop offset="0%"   stopColor="#06b6d4" stopOpacity="0.9" />
          <stop offset="100%" stopColor="#0e7490" stopOpacity="0.5" />
        </radialGradient>
        <radialGradient id="qm-body-b" cx="60%" cy="50%">
          <stop offset="0%"   stopColor="#8b5cf6" stopOpacity="0.9" />
          <stop offset="100%" stopColor="#5b21b6" stopOpacity="0.5" />
        </radialGradient>
        <radialGradient id="qm-aura" cx="50%" cy="50%">
          <stop offset="0%"   stopColor="#06b6d4" stopOpacity="0.2" />
          <stop offset="50%"  stopColor="#8b5cf6" stopOpacity="0.1" />
          <stop offset="100%" stopColor="#06b6d4" stopOpacity="0" />
        </radialGradient>
      </defs>

      {/* Waveform probability aura */}
      <circle cx={cx} cy={cy} r={r * 2.0} fill="url(#qm-aura)">
        {animated && <animate attributeName="r" values={`${r*1.9};${r*2.2};${r*1.9}`} dur="3s" repeatCount="indefinite" />}
        {animated && <animate attributeName="opacity" values="1;0.5;1" dur="3s" repeatCount="indefinite" />}
      </circle>

      {/* Wavefunction sine curve (probability wave) */}
      {animated && (
        <path
          d={`M ${cx - r * 1.6} ${cy} Q ${cx - r} ${cy - r * 0.5} ${cx} ${cy} Q ${cx + r} ${cy + r * 0.5} ${cx + r * 1.6} ${cy}`}
          fill="none" stroke="#06b6d4" strokeWidth="1.5" strokeOpacity="0.5" filter="url(#qm-glow)">
          <animate attributeName="d"
            values={`M ${cx - r * 1.6} ${cy} Q ${cx - r} ${cy - r * 0.5} ${cx} ${cy} Q ${cx + r} ${cy + r * 0.5} ${cx + r * 1.6} ${cy};M ${cx - r * 1.6} ${cy} Q ${cx - r} ${cy + r * 0.5} ${cx} ${cy} Q ${cx + r} ${cy - r * 0.5} ${cx + r * 1.6} ${cy};M ${cx - r * 1.6} ${cy} Q ${cx - r} ${cy - r * 0.5} ${cx} ${cy} Q ${cx + r} ${cy + r * 0.5} ${cx + r * 1.6} ${cy}`}
            dur="2s" repeatCount="indefinite" />
        </path>
      )}

      {/* State A: cyan body (observed) */}
      <circle cx={cx - r * 0.18} cy={cy} r={r} fill="url(#qm-body-a)" stroke="#06b6d4" strokeWidth="2.5" filter="url(#qm-glow)">
        {animated && <animate attributeName="opacity" values="1;0.35;1" dur="2.5s" repeatCount="indefinite" />}
        {animated && <animate attributeName="cx" values={`${cx - r*0.18};${cx};${cx - r*0.18}`} dur="2.5s" repeatCount="indefinite" />}
      </circle>

      {/* State B: purple body (unobserved) — phase-offset */}
      <circle cx={cx + r * 0.18} cy={cy} r={r} fill="url(#qm-body-b)" stroke="#8b5cf6" strokeWidth="2.5" filter="url(#qm-glow)">
        {animated && <animate attributeName="opacity" values="0.35;1;0.35" dur="2.5s" repeatCount="indefinite" />}
        {animated && <animate attributeName="cx" values={`${cx + r*0.18};${cx};${cx + r*0.18}`} dur="2.5s" repeatCount="indefinite" />}
      </circle>

      {/* Superposition overlap core */}
      <circle cx={cx} cy={cy} r={r * 0.35} fill="white" fillOpacity="0.15" filter="url(#qm-glow)">
        {animated && <animate attributeName="fillOpacity" values="0.1;0.3;0.1" dur="1.5s" repeatCount="indefinite" />}
      </circle>

      {/* Eyes: dual state (left=cyan, right=purple) */}
      <circle cx={cx - r * 0.28} cy={cy - r * 0.22} r={r * 0.1} fill="#06b6d4" filter="url(#qm-glow)">
        {animated && <animate attributeName="opacity" values="1;0.2;1" dur="2.5s" repeatCount="indefinite" />}
      </circle>
      <circle cx={cx + r * 0.28} cy={cy - r * 0.22} r={r * 0.1} fill="#8b5cf6" filter="url(#qm-glow)">
        {animated && <animate attributeName="opacity" values="0.2;1;0.2" dur="2.5s" repeatCount="indefinite" />}
      </circle>

      {/* Orbit ellipse: probability orbit */}
      <ellipse cx={cx} cy={cy} rx={r * 1.35} ry={r * 0.55}
        fill="none" stroke="#06b6d4" strokeWidth="1" strokeOpacity="0.4" strokeDasharray="5 4">
        {animated && (
          <animateTransform attributeName="transform" type="rotate"
            from={`0 ${cx} ${cy}`} to={`360 ${cx} ${cy}`}
            dur="6s" repeatCount="indefinite" />
        )}
      </ellipse>

      {/* Floating physics symbols */}
      {["ħ", "ψ", "Ĥ", "∇", "⟩", "⟨"].map((sym, i) => {
        const a = (i / 6) * Math.PI * 2;
        const sr = r * 1.55;
        const dur = 7 + i * 0.5;
        return (
          <text key={i}
            x={cx + Math.cos(a) * sr}
            y={cy + Math.sin(a) * sr}
            textAnchor="middle" dominantBaseline="middle"
            fontSize={size * 0.065}
            fill={i % 2 === 0 ? "#06b6d4" : "#8b5cf6"}
            fillOpacity="0.75"
            style={{ fontFamily: "serif" }}
            filter="url(#qm-glow)">
            {sym}
            {animated && (
              <animateTransform attributeName="transform" type="rotate"
                from={`${(i / 6) * 360} ${cx} ${cy}`}
                to={`${(i / 6) * 360 - 360} ${cx} ${cy}`}
                dur={`${dur}s`} repeatCount="indefinite" additive="sum" />
            )}
          </text>
        );
      })}

      {/* Emoji (question-mark cat — Schrödinger reference) */}
      <text x={cx} y={cy + r * 0.2} textAnchor="middle" dominantBaseline="middle"
        fontSize={size * 0.16} style={{ userSelect: "none" }}>🐱</text>
      {animated && (
        <text x={cx} y={cy + r * 0.2} textAnchor="middle" dominantBaseline="middle"
          fontSize={size * 0.16} style={{ userSelect: "none" }} fillOpacity="0">
          ☠️
          <animate attributeName="fillOpacity" values="0;0;0;1;0;0;0" dur="5s" repeatCount="indefinite" />
        </text>
      )}

      {/* Uncertainty band */}
      <rect x={cx - r * 1.1} y={cy - r * 0.04} width={r * 2.2} height={r * 0.08}
        fill="white" fillOpacity="0.08" />
    </svg>
  );
}
