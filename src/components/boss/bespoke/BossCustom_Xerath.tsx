"use client";
/** Xerath — Zahlenkönig. Legendary Mathematik boss. Crown + floating number runes. */

interface Props { size: number; animated: boolean }

export function BossCustom_Xerath({ size, animated }: Props) {
  const cx = size / 2, cy = size / 2;
  const r  = size * 0.3;
  const color = "#f97316"; // legendary orange

  const runes = ["∑", "∏", "∫", "√", "∞", "π", "φ", "∂"];

  return (
    <svg width={size} height={size} viewBox={`0 0 ${size} ${size}`} style={{ overflow: "visible" }}>
      <defs>
        <filter id="xerath-glow">
          <feGaussianBlur stdDeviation="8" result="b" />
          <feComposite in="b" in2="SourceGraphic" operator="over" />
        </filter>
        <radialGradient id="xerath-body" cx="50%" cy="50%">
          <stop offset="0%"   stopColor="#f97316" stopOpacity="0.6" />
          <stop offset="100%" stopColor="#dc2626" stopOpacity="0.2" />
        </radialGradient>
      </defs>

      {/* Outer aura */}
      <circle cx={cx} cy={cy} r={r * 1.6} fill="#f9731611" stroke="#f97316" strokeWidth="1" strokeOpacity="0.3">
        {animated && <animate attributeName="r" values={`${r*1.5};${r*1.7};${r*1.5}`} dur="3s" repeatCount="indefinite" />}
      </circle>

      {/* Crown base */}
      <polygon
        points={`${cx},${cy - r * 1.45} ${cx + r * 0.35},${cy - r * 1.0} ${cx + r * 0.7},${cy - r * 1.35} ${cx + r * 0.55},${cy - r * 0.85} ${cx},${cy - r * 1.05} ${cx - r * 0.55},${cy - r * 0.85} ${cx - r * 0.7},${cy - r * 1.35} ${cx - r * 0.35},${cy - r * 1.0}`}
        fill="#f9731633"
        stroke="#f97316"
        strokeWidth="2.5"
        filter="url(#xerath-glow)"
      />

      {/* Body: angular hexagon */}
      <polygon
        points={`${cx},${cy - r} ${cx + r * 0.87},${cy - r * 0.5} ${cx + r * 0.87},${cy + r * 0.5} ${cx},${cy + r} ${cx - r * 0.87},${cy + r * 0.5} ${cx - r * 0.87},${cy - r * 0.5}`}
        fill="url(#xerath-body)"
        stroke="#f97316"
        strokeWidth="3"
        filter="url(#xerath-glow)"
      />

      {/* Inner core */}
      <polygon
        points={`${cx},${cy - r * 0.5} ${cx + r * 0.43},${cy - r * 0.25} ${cx + r * 0.43},${cy + r * 0.25} ${cx},${cy + r * 0.5} ${cx - r * 0.43},${cy + r * 0.25} ${cx - r * 0.43},${cy - r * 0.25}`}
        fill="#f97316"
        fillOpacity="0.4"
        stroke="#fbbf24"
        strokeWidth="1.5"
      />

      {/* Eyes — fierce & angular */}
      <g fill="#fbbf24" filter="url(#xerath-glow)">
        <polygon points={`${cx - r * 0.32},${cy - r * 0.22} ${cx - r * 0.12},${cy - r * 0.3} ${cx - r * 0.12},${cy - r * 0.12}`} />
        <polygon points={`${cx + r * 0.32},${cy - r * 0.22} ${cx + r * 0.12},${cy - r * 0.3} ${cx + r * 0.12},${cy - r * 0.12}`} />
      </g>

      {/* Crown jewels */}
      {[0, -0.35, 0.35].map((off, i) => (
        <circle key={i} cx={cx + off * r} cy={cy - r * 1.45 + (i === 0 ? 0 : r * 0.42)}
          r={r * 0.07} fill={i === 0 ? "#fbbf24" : "#f97316"} filter="url(#xerath-glow)">
          {animated && <animate attributeName="opacity" values="1;0.5;1" dur={`${1.2 + i * 0.3}s`} repeatCount="indefinite" />}
        </circle>
      ))}

      {/* Floating number runes */}
      {animated && runes.map((rune, i) => {
        const angle  = (i / runes.length) * Math.PI * 2;
        const runeR  = r * 1.55;
        const rx     = cx + Math.cos(angle) * runeR;
        const ry     = cy + Math.sin(angle) * runeR;
        const dur    = 6 + i * 0.4;
        return (
          <text key={i} x={rx} y={ry} textAnchor="middle" dominantBaseline="middle"
            fontSize={size * 0.07} fill={color} fillOpacity={0.7}
            style={{ fontFamily: "monospace", fontWeight: 700 }}>
            {rune}
            <animateTransform attributeName="transform" type="rotate"
              from={`${(i / runes.length) * 360} ${cx} ${cy}`}
              to={`${(i / runes.length) * 360 + 360} ${cx} ${cy}`}
              dur={`${dur}s`} repeatCount="indefinite" additive="sum" />
          </text>
        );
      })}

      {/* Emoji */}
      <text x={cx} y={cy + r * 0.18} textAnchor="middle" dominantBaseline="middle"
        fontSize={size * 0.22} style={{ userSelect: "none" }}>👑</text>

      {/* Corner rarity marks */}
      {[[0.08, 0.08], [0.92, 0.08], [0.08, 0.92], [0.92, 0.92]].map(([fx, fy], i) => (
        <circle key={i} cx={fx! * size} cy={fy! * size} r={size * 0.02}
          fill="#f97316" fillOpacity="0.8" />
      ))}
    </svg>
  );
}
