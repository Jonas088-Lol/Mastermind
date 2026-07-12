/* Copyright 2026 Elian Schock, Jonas Schwenk */
"use client";
/** KALKULON — Mythic Mathematik. Living calculator with spinning gears + energy core. */

interface Props { size: number; animated: boolean }

export function BossCustom_Kalkulon({ size, animated }: Props) {
  const cx = size / 2, cy = size / 2;
  const r  = size * 0.32;

  return (
    <svg width={size} height={size} viewBox={`0 0 ${size} ${size}`} style={{ overflow: "visible" }}>
      <defs>
        <filter id="kal-glow">
          <feGaussianBlur stdDeviation="12" result="b" />
          <feComposite in="b" in2="SourceGraphic" operator="over" />
        </filter>
        <radialGradient id="kal-core" cx="50%" cy="50%">
          <stop offset="0%"   stopColor="#ef4444" stopOpacity="1" />
          <stop offset="50%"  stopColor="#dc2626" stopOpacity="0.8" />
          <stop offset="100%" stopColor="#7f1d1d" stopOpacity="0.3" />
        </radialGradient>
        <radialGradient id="kal-outer" cx="50%" cy="50%">
          <stop offset="0%"   stopColor="#ef4444" stopOpacity="0.15" />
          <stop offset="100%" stopColor="#ef4444" stopOpacity="0" />
        </radialGradient>
      </defs>

      {/* Dark background aura */}
      <circle cx={cx} cy={cy} r={r * 1.8} fill="url(#kal-outer)">
        {animated && <animate attributeName="r" values={`${r*1.7};${r*2};${r*1.7}`} dur="4s" repeatCount="indefinite" />}
      </circle>

      {/* Outer spinning ring */}
      <g>
        <circle cx={cx} cy={cy} r={r * 1.3} fill="none" stroke="#ef4444" strokeWidth="2" strokeOpacity="0.4" strokeDasharray="8 6">
          {animated && <animateTransform attributeName="transform" type="rotate" from={`0 ${cx} ${cy}`} to={`360 ${cx} ${cy}`} dur="8s" repeatCount="indefinite" />}
        </circle>
      </g>

      {/* Counter-rotating inner ring */}
      <g>
        <circle cx={cx} cy={cy} r={r * 1.0} fill="none" stroke="#fbbf24" strokeWidth="1.5" strokeOpacity="0.6" strokeDasharray="4 4">
          {animated && <animateTransform attributeName="transform" type="rotate" from={`0 ${cx} ${cy}`} to={`-360 ${cx} ${cy}`} dur="5s" repeatCount="indefinite" />}
        </circle>
      </g>

      {/* Main body: octagon */}
      <polygon
        points={Array.from({ length: 8 }, (_, i) => {
          const a = (i / 8) * Math.PI * 2 - Math.PI / 8;
          return `${(cx + Math.cos(a) * r).toFixed(1)},${(cy + Math.sin(a) * r).toFixed(1)}`;
        }).join(" ")}
        fill="#1a0505"
        stroke="#ef4444"
        strokeWidth="3"
        filter="url(#kal-glow)"
      />

      {/* Circuit-board lines inside */}
      {[[-0.5, -0.3], [0.5, -0.3], [-0.5, 0.3], [0.5, 0.3]].map(([dx, dy], i) => (
        <line key={i} x1={cx} y1={cy} x2={cx + dx! * r * 0.8} y2={cy + dy! * r * 0.8}
          stroke="#ef4444" strokeWidth="1" strokeOpacity="0.4" />
      ))}

      {/* Core energy */}
      <circle cx={cx} cy={cy} r={r * 0.38} fill="url(#kal-core)" filter="url(#kal-glow)">
        {animated && <animate attributeName="r" values={`${r*0.35};${r*0.42};${r*0.35}`} dur="1.5s" repeatCount="indefinite" />}
      </circle>

      {/* Eyes: scan-line style */}
      <rect x={cx - r * 0.38} y={cy - r * 0.18} width={r * 0.24} height={r * 0.09}
        fill="#fbbf24" rx={2} filter="url(#kal-glow)">
        {animated && <animate attributeName="opacity" values="1;0.2;1" dur="0.8s" repeatCount="indefinite" />}
      </rect>
      <rect x={cx + r * 0.14} y={cy - r * 0.18} width={r * 0.24} height={r * 0.09}
        fill="#fbbf24" rx={2} filter="url(#kal-glow)">
        {animated && <animate attributeName="opacity" values="1;0.2;1" dur="0.8s" begin="0.4s" repeatCount="indefinite" />}
      </rect>

      {/* Digits on body */}
      {["0", "1", "0", "1"].map((d, i) => {
        const a = (i / 4) * Math.PI * 2;
        return (
          <text key={i} x={cx + Math.cos(a) * r * 0.65} y={cy + Math.sin(a) * r * 0.65}
            textAnchor="middle" dominantBaseline="middle"
            fontSize={size * 0.06} fill="#ef4444" fillOpacity={0.6}
            style={{ fontFamily: "monospace", fontWeight: 700 }}>
            {d}
          </text>
        );
      })}

      {/* Emoji */}
      <text x={cx} y={cy + r * 0.42} textAnchor="middle" dominantBaseline="middle"
        fontSize={size * 0.18} style={{ userSelect: "none" }}>🌠</text>

      {/* Floating binary particles */}
      {animated && ["1", "0", "1", "1", "0"].map((bit, i) => {
        const angle = (i / 5) * Math.PI * 2;
        const pr = r * 1.55;
        const dur = 4 + i * 0.6;
        return (
          <text key={i}
            x={cx + Math.cos(angle) * pr}
            y={cy + Math.sin(angle) * pr}
            textAnchor="middle" dominantBaseline="middle"
            fontSize={size * 0.055} fill="#ef4444" fillOpacity={0.5}
            style={{ fontFamily: "monospace" }}>
            {bit}
            <animateTransform attributeName="transform" type="rotate"
              from={`${(i / 5) * 360} ${cx} ${cy}`}
              to={`${(i / 5) * 360 + 360} ${cx} ${cy}`}
              dur={`${dur}s`} repeatCount="indefinite" additive="sum" />
          </text>
        );
      })}
    </svg>
  );
}
