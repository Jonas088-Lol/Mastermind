/* Copyright 2026 Elian Schock, Jonas Schwenk */
"use client";
/** Der Schwarze Prophet — Mythic Deutsch. Dark robed figure, ink tendrils, forbidden glyphs. */

interface Props { size: number; animated: boolean }

export function BossCustom_SchwarzeProphet({ size, animated }: Props) {
  const cx = size / 2, cy = size / 2;
  const r  = size * 0.32;

  const glyphs = ["Ω", "Ψ", "Λ", "Δ", "Σ", "Φ"];

  return (
    <svg width={size} height={size} viewBox={`0 0 ${size} ${size}`} style={{ overflow: "visible" }}>
      <defs>
        <filter id="sp-glow">
          <feGaussianBlur stdDeviation="10" result="b" />
          <feComposite in="b" in2="SourceGraphic" operator="over" />
        </filter>
        <filter id="sp-dark">
          <feGaussianBlur stdDeviation="20" result="b" />
          <feComposite in="b" in2="SourceGraphic" operator="over" />
        </filter>
        <radialGradient id="sp-body" cx="50%" cy="35%">
          <stop offset="0%"   stopColor="#4c1d95" stopOpacity="0.9" />
          <stop offset="60%"  stopColor="#1e0a3c" stopOpacity="0.95" />
          <stop offset="100%" stopColor="#0a0015" stopOpacity="1" />
        </radialGradient>
        <radialGradient id="sp-aura" cx="50%" cy="50%">
          <stop offset="0%"   stopColor="#7c3aed" stopOpacity="0.3" />
          <stop offset="100%" stopColor="#4c1d95" stopOpacity="0" />
        </radialGradient>
      </defs>

      {/* Dark void aura */}
      <circle cx={cx} cy={cy} r={r * 1.9} fill="url(#sp-aura)">
        {animated && <animate attributeName="r" values={`${r*1.8};${r*2.1};${r*1.8}`} dur="5s" repeatCount="indefinite" />}
      </circle>

      {/* Ink tendrils radiating outward */}
      {[0, 45, 90, 135, 180, 225, 270, 315].map((deg, i) => {
        const a = (deg / 180) * Math.PI;
        const x1 = cx + Math.cos(a) * r * 0.85;
        const y1 = cy + Math.sin(a) * r * 0.85;
        const x2 = cx + Math.cos(a) * r * 1.6;
        const y2 = cy + Math.sin(a) * r * 1.6;
        return (
          <line key={i} x1={x1} y1={y1} x2={x2} y2={y2}
            stroke="#7c3aed" strokeWidth={i % 2 === 0 ? 2 : 1} strokeOpacity="0.5"
            filter="url(#sp-glow)">
            {animated && <animate attributeName="strokeOpacity" values="0.5;0.9;0.5" dur={`${2 + i * 0.3}s`} repeatCount="indefinite" />}
          </line>
        );
      })}

      {/* Robe: triangular silhouette */}
      <path
        d={`M ${cx} ${cy - r} L ${cx + r * 0.85} ${cy + r} L ${cx - r * 0.85} ${cy + r} Z`}
        fill="url(#sp-body)"
        stroke="#7c3aed"
        strokeWidth="2.5"
        filter="url(#sp-glow)"
      />

      {/* Hood curve at top */}
      <ellipse cx={cx} cy={cy - r * 0.68} rx={r * 0.48} ry={r * 0.42}
        fill="#1e0a3c" stroke="#7c3aed" strokeWidth="2" />

      {/* Face: void with single eye */}
      <ellipse cx={cx} cy={cy - r * 0.72} rx={r * 0.32} ry={r * 0.28}
        fill="#0a0015" />

      {/* Single glowing eye */}
      <circle cx={cx} cy={cy - r * 0.72} r={r * 0.1} fill="#a855f7" filter="url(#sp-glow)">
        {animated && <animate attributeName="r" values={`${r*0.08};${r*0.13};${r*0.08}`} dur="2s" repeatCount="indefinite" />}
        {animated && <animate attributeName="fillOpacity" values="1;0.5;1" dur="2s" repeatCount="indefinite" />}
      </circle>
      <circle cx={cx} cy={cy - r * 0.72} r={r * 0.04} fill="#e9d5ff" />

      {/* Dark script lines on robe */}
      {[-0.2, 0, 0.2].map((off, i) => (
        <line key={i}
          x1={cx - r * 0.3} y1={cy + off * r * 0.8}
          x2={cx + r * 0.3} y2={cy + off * r * 0.8}
          stroke="#7c3aed" strokeWidth="1" strokeOpacity="0.35" />
      ))}

      {/* Floating forbidden glyphs */}
      {glyphs.map((g, i) => {
        const a = (i / glyphs.length) * Math.PI * 2 - Math.PI / 2;
        const gr = r * 1.42;
        const dur = 9 + i * 0.8;
        return (
          <text key={i}
            x={cx + Math.cos(a) * gr}
            y={cy + Math.sin(a) * gr}
            textAnchor="middle" dominantBaseline="middle"
            fontSize={size * 0.065} fill="#a855f7" fillOpacity="0.7"
            style={{ fontFamily: "serif", fontWeight: 700 }}
            filter="url(#sp-glow)">
            {g}
            {animated && (
              <animateTransform attributeName="transform" type="rotate"
                from={`${(i / glyphs.length) * 360} ${cx} ${cy}`}
                to={`${(i / glyphs.length) * 360 + 360} ${cx} ${cy}`}
                dur={`${dur}s`} repeatCount="indefinite" additive="sum" />
            )}
          </text>
        );
      })}

      {/* Ink drips at robe bottom */}
      {[-0.55, -0.3, 0, 0.3, 0.55].map((off, i) => (
        <ellipse key={i}
          cx={cx + off * r * 0.8}
          cy={cy + r + (Math.abs(off) > 0.4 ? r * 0.05 : r * 0.12)}
          rx={r * 0.04} ry={r * (0.06 + Math.abs(off) * 0.02)}
          fill="#7c3aed" fillOpacity="0.6">
          {animated && <animate attributeName="ry" values={`${r*0.05};${r*0.09};${r*0.05}`} dur={`${1.5 + i * 0.4}s`} repeatCount="indefinite" />}
        </ellipse>
      ))}

      {/* Emoji */}
      <text x={cx} y={cy + r * 0.25} textAnchor="middle" dominantBaseline="middle"
        fontSize={size * 0.12} style={{ userSelect: "none" }}>🖤</text>
    </svg>
  );
}
