/* Copyright 2026 Elian Schock, Jonas Schwenk */
"use client";
/** OMEGA-PRIME — Secret boss. The embodiment of decay. Void entity, fractal corruption. */

interface Props { size: number; animated: boolean }

export function BossCustom_OmegaPrime({ size, animated }: Props) {
  const cx = size / 2, cy = size / 2;
  const r  = size * 0.33;

  // Fractal-like jagged outer ring points
  const outerPoints = Array.from({ length: 24 }, (_, i) => {
    const a = (i / 24) * Math.PI * 2;
    const rad = r * (i % 3 === 0 ? 1.55 : i % 3 === 1 ? 1.35 : 1.45);
    return `${(cx + Math.cos(a) * rad).toFixed(1)},${(cy + Math.sin(a) * rad).toFixed(1)}`;
  }).join(" ");

  const bodyPoints = Array.from({ length: 12 }, (_, i) => {
    const a = (i / 12) * Math.PI * 2;
    const rad = r * (i % 2 === 0 ? 1.0 : 0.82);
    return `${(cx + Math.cos(a) * rad).toFixed(1)},${(cy + Math.sin(a) * rad).toFixed(1)}`;
  }).join(" ");

  return (
    <svg width={size} height={size} viewBox={`0 0 ${size} ${size}`} style={{ overflow: "visible" }}>
      <defs>
        <filter id="om-glow">
          <feGaussianBlur stdDeviation="12" result="b" />
          <feComposite in="b" in2="SourceGraphic" operator="over" />
        </filter>
        <filter id="om-hard">
          <feGaussianBlur stdDeviation="4" result="b" />
          <feComposite in="b" in2="SourceGraphic" operator="over" />
        </filter>
        <radialGradient id="om-body" cx="50%" cy="50%">
          <stop offset="0%"   stopColor="#1f0030" stopOpacity="1" />
          <stop offset="60%"  stopColor="#0d001a" stopOpacity="1" />
          <stop offset="100%" stopColor="#050008" stopOpacity="1" />
        </radialGradient>
        <radialGradient id="om-core" cx="50%" cy="50%">
          <stop offset="0%"   stopColor="#d946ef" stopOpacity="1" />
          <stop offset="50%"  stopColor="#7e22ce" stopOpacity="0.9" />
          <stop offset="100%" stopColor="#1f0030" stopOpacity="0" />
        </radialGradient>
        <radialGradient id="om-aura" cx="50%" cy="50%">
          <stop offset="0%"   stopColor="#d946ef" stopOpacity="0.25" />
          <stop offset="60%"  stopColor="#7e22ce" stopOpacity="0.08" />
          <stop offset="100%" stopColor="#000" stopOpacity="0" />
        </radialGradient>
      </defs>

      {/* Pulsing void aura */}
      <circle cx={cx} cy={cy} r={r * 2.2} fill="url(#om-aura)">
        {animated && <animate attributeName="r" values={`${r*2.0};${r*2.5};${r*2.0}`} dur="4s" repeatCount="indefinite" />}
        {animated && <animate attributeName="opacity" values="1;0.4;1" dur="4s" repeatCount="indefinite" />}
      </circle>

      {/* Fractal corruption ring — outer */}
      <polygon points={outerPoints}
        fill="none" stroke="#d946ef" strokeWidth="1.5" strokeOpacity="0.4" filter="url(#om-glow)">
        {animated && (
          <animateTransform attributeName="transform" type="rotate"
            from={`0 ${cx} ${cy}`} to={`360 ${cx} ${cy}`}
            dur="20s" repeatCount="indefinite" />
        )}
      </polygon>

      {/* Counter-rotation mid ring */}
      <polygon points={bodyPoints}
        fill="url(#om-body)" stroke="#a855f7" strokeWidth="2.5" filter="url(#om-glow)">
        {animated && (
          <animateTransform attributeName="transform" type="rotate"
            from={`0 ${cx} ${cy}`} to={`-360 ${cx} ${cy}`}
            dur="14s" repeatCount="indefinite" />
        )}
      </polygon>

      {/* Inner void body */}
      <circle cx={cx} cy={cy} r={r * 0.62} fill="url(#om-body)" stroke="#7e22ce" strokeWidth="2" />

      {/* Core singularity */}
      <circle cx={cx} cy={cy} r={r * 0.28} fill="url(#om-core)" filter="url(#om-glow)">
        {animated && <animate attributeName="r" values={`${r*0.22};${r*0.35};${r*0.22}`} dur="2s" repeatCount="indefinite" />}
      </circle>

      {/* Eyes: three vertical slits */}
      {[-0.28, 0, 0.28].map((off, i) => (
        <ellipse key={i}
          cx={cx + off * r} cy={cy - r * 0.15}
          rx={r * 0.045} ry={r * 0.15}
          fill={i === 1 ? "#f0abfc" : "#d946ef"}
          filter="url(#om-hard)">
          {animated && <animate attributeName="ry" values={`${r*0.12};${r*0.18};${r*0.12}`} dur={`${1.2 + i * 0.3}s`} repeatCount="indefinite" />}
          {animated && <animate attributeName="fillOpacity" values="1;0.3;1" dur={`${1.5 + i * 0.2}s`} repeatCount="indefinite" />}
        </ellipse>
      ))}

      {/* Decay particles radiating outward */}
      {animated && Array.from({ length: 8 }, (_, i) => {
        const a = (i / 8) * Math.PI * 2;
        return (
          <circle key={i}
            cx={cx + Math.cos(a) * r * 0.7}
            cy={cy + Math.sin(a) * r * 0.7}
            r={r * 0.035}
            fill="#d946ef"
            fillOpacity="0.6"
            filter="url(#om-hard)">
            <animateTransform attributeName="transform" type="translate"
              from="0 0"
              to={`${Math.cos(a) * r * 0.6} ${Math.sin(a) * r * 0.6}`}
              dur={`${1.8 + i * 0.2}s`}
              repeatCount="indefinite"
              additive="sum" />
            <animate attributeName="opacity" values="0.8;0" dur={`${1.8 + i * 0.2}s`} repeatCount="indefinite" />
          </circle>
        );
      })}

      {/* Ω symbol at center */}
      <text x={cx} y={cy + r * 0.12} textAnchor="middle" dominantBaseline="middle"
        fontSize={size * 0.22} fill="#f0abfc" fillOpacity="0.85"
        filter="url(#om-hard)"
        style={{ fontFamily: "serif", fontWeight: 900, userSelect: "none" }}>
        Ω
      </text>

      {/* Corner void marks */}
      {[[0.06, 0.06], [0.94, 0.06], [0.06, 0.94], [0.94, 0.94]].map(([fx, fy], i) => (
        <circle key={i} cx={fx! * size} cy={fy! * size} r={size * 0.018}
          fill="#d946ef" fillOpacity="0.9" filter="url(#om-hard)" />
      ))}
    </svg>
  );
}
