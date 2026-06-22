"use client";
/** MASTERMIND — SECRET final boss. "Der Verfall in seiner reinsten Form."
 *  The platform's own logo corrupted. Brain entity, eye of knowledge, 5 orbiting shards. */

interface Props { size: number; animated: boolean }

export function BossCustom_Mastermind({ size, animated }: Props) {
  const cx = size / 2, cy = size / 2;
  const r  = size * 0.32;

  // 5 orbiting knowledge shards (pentagonic)
  const shards = Array.from({ length: 5 }, (_, i) => {
    const a = (i / 5) * Math.PI * 2 - Math.PI / 2;
    return { a, x: cx + Math.cos(a) * r * 1.45, y: cy + Math.sin(a) * r * 1.45 };
  });

  return (
    <svg width={size} height={size} viewBox={`0 0 ${size} ${size}`} style={{ overflow: "visible" }}>
      <defs>
        <filter id="mm-glow" x="-50%" y="-50%" width="200%" height="200%">
          <feGaussianBlur stdDeviation="10" result="b" />
          <feComposite in="b" in2="SourceGraphic" operator="over" />
        </filter>
        <filter id="mm-ultra" x="-80%" y="-80%" width="260%" height="260%">
          <feGaussianBlur stdDeviation="18" result="b" />
          <feComposite in="b" in2="SourceGraphic" operator="over" />
        </filter>
        <filter id="mm-mid">
          <feGaussianBlur stdDeviation="5" result="b" />
          <feComposite in="b" in2="SourceGraphic" operator="over" />
        </filter>

        <radialGradient id="mm-brain" cx="50%" cy="45%">
          <stop offset="0%"   stopColor="#fcd34d" stopOpacity="1" />
          <stop offset="40%"  stopColor="#f59e0b" stopOpacity="0.95" />
          <stop offset="100%" stopColor="#78350f" stopOpacity="0.8" />
        </radialGradient>
        <radialGradient id="mm-core" cx="50%" cy="50%">
          <stop offset="0%"   stopColor="#ffffff" stopOpacity="1" />
          <stop offset="30%"  stopColor="#fcd34d" stopOpacity="1" />
          <stop offset="100%" stopColor="#f59e0b" stopOpacity="0" />
        </radialGradient>
        <radialGradient id="mm-void" cx="50%" cy="50%">
          <stop offset="0%"   stopColor="#fcd34d" stopOpacity="0.4" />
          <stop offset="60%"  stopColor="#b45309" stopOpacity="0.12" />
          <stop offset="100%" stopColor="#000" stopOpacity="0" />
        </radialGradient>

        <clipPath id="mm-clip">
          <circle cx={cx} cy={cy} r={r} />
        </clipPath>
      </defs>

      {/* Void aura — massive */}
      <circle cx={cx} cy={cy} r={r * 2.4} fill="url(#mm-void)">
        {animated && <animate attributeName="r" values={`${r*2.2};${r*2.7};${r*2.2}`} dur="5s" repeatCount="indefinite" />}
        {animated && <animate attributeName="opacity" values="1;0.5;1" dur="5s" repeatCount="indefinite" />}
      </circle>

      {/* Outer fracture ring */}
      <circle cx={cx} cy={cy} r={r * 1.75}
        fill="none" stroke="#fcd34d" strokeWidth="1" strokeOpacity="0.25"
        strokeDasharray="3 9">
        {animated && (
          <animateTransform attributeName="transform" type="rotate"
            from={`0 ${cx} ${cy}`} to={`360 ${cx} ${cy}`}
            dur="30s" repeatCount="indefinite" />
        )}
      </circle>

      {/* 5 orbiting shards */}
      <g>
        {shards.map(({ a, x, y }, i) => {
          const dur = 10 + i * 0.7;
          const pts = Array.from({ length: 4 }, (_, j) => {
            const sa = a + (j / 4) * Math.PI * 2;
            const sr = r * 0.095;
            return `${(x + Math.cos(sa) * sr).toFixed(1)},${(y + Math.sin(sa) * sr).toFixed(1)}`;
          }).join(" ");
          return (
            <g key={i}>
              <polygon points={pts} fill="#fcd34d" fillOpacity="0.85"
                filter="url(#mm-glow)" stroke="#fbbf24" strokeWidth="1">
                {animated && (
                  <animateTransform attributeName="transform" type="rotate"
                    from={`0 ${cx} ${cy}`} to={`-360 ${cx} ${cy}`}
                    dur={`${dur}s`} repeatCount="indefinite" additive="sum" />
                )}
                {animated && <animate attributeName="fillOpacity" values="0.85;0.4;0.85" dur={`${1.5 + i * 0.3}s`} repeatCount="indefinite" />}
              </polygon>
            </g>
          );
        })}
        {animated && (
          <animateTransform attributeName="transform" type="rotate"
            from={`0 ${cx} ${cy}`} to={`360 ${cx} ${cy}`}
            dur="10s" repeatCount="indefinite" />
        )}
      </g>

      {/* Brain body: main circle */}
      <circle cx={cx} cy={cy} r={r} fill="url(#mm-brain)" stroke="#fcd34d" strokeWidth="3" filter="url(#mm-glow)" />

      {/* Brain texture: gyri folds */}
      {[
        `M ${cx - r*0.6} ${cy - r*0.1} Q ${cx - r*0.2} ${cy - r*0.55} ${cx + r*0.1} ${cy - r*0.3}`,
        `M ${cx - r*0.3} ${cy + r*0.1} Q ${cx + r*0.15} ${cy - r*0.15} ${cx + r*0.55} ${cy - r*0.05}`,
        `M ${cx - r*0.5} ${cy + r*0.35} Q ${cx} ${cy + r*0.15} ${cx + r*0.5} ${cy + r*0.3}`,
        `M ${cx - r*0.1} ${cy - r*0.75} Q ${cx + r*0.3} ${cy - r*0.6} ${cx + r*0.6} ${cy - r*0.15}`,
      ].map((d, i) => (
        <path key={i} d={d} fill="none" stroke="#78350f" strokeWidth={size * 0.012} strokeOpacity="0.5"
          strokeLinecap="round" clipPath="url(#mm-clip)" />
      ))}

      {/* Vertical split line: left brain / right brain */}
      <line x1={cx} y1={cy - r * 0.9} x2={cx} y2={cy + r * 0.9}
        stroke="#78350f" strokeWidth={size * 0.01} strokeOpacity="0.4" clipPath="url(#mm-clip)" />

      {/* The Eye — center */}
      <ellipse cx={cx} cy={cy + r * 0.08} rx={r * 0.42} ry={r * 0.28}
        fill="#1a0a00" stroke="#fcd34d" strokeWidth="1.5" />
      <circle cx={cx} cy={cy + r * 0.08} r={r * 0.2} fill="#f59e0b">
        {animated && <animate attributeName="r" values={`${r*0.18};${r*0.24};${r*0.18}`} dur="2s" repeatCount="indefinite" />}
      </circle>
      <circle cx={cx} cy={cy + r * 0.08} r={r * 0.12} fill="#000000" />
      <circle cx={cx} cy={cy + r * 0.08} r={r * 0.06} fill="url(#mm-core)" filter="url(#mm-ultra)">
        {animated && <animate attributeName="r" values={`${r*0.05};${r*0.09};${r*0.05}`} dur="1s" repeatCount="indefinite" />}
      </circle>

      {/* Pupil slit */}
      <ellipse cx={cx} cy={cy + r * 0.08} rx={r * 0.025} ry={r * 0.11}
        fill="#000" />

      {/* Eyelashes / lashes */}
      {[-0.32, -0.2, 0, 0.2, 0.32].map((off, i) => (
        <line key={i}
          x1={cx + off * r * 0.9} y1={cy + r * 0.08 - r * 0.25}
          x2={cx + off * r * 0.9} y2={cy + r * 0.08 - r * 0.33}
          stroke="#fcd34d" strokeWidth="1.5" strokeOpacity="0.7" />
      ))}

      {/* Text: MASTERMIND under the eye */}
      <text x={cx} y={cy + r * 0.58}
        textAnchor="middle" dominantBaseline="middle"
        fontSize={size * 0.045} fill="#fcd34d" fillOpacity="0.65" letterSpacing={size * 0.008}
        style={{ fontFamily: "monospace", fontWeight: 800, userSelect: "none" }}>
        MASTERMIND
      </text>

      {/* Flickering corruption effect */}
      {animated && (
        <rect x={0} y={0} width={size} height={size}
          fill="#fcd34d" fillOpacity="0" rx={size * 0.5}>
          <animate attributeName="fillOpacity"
            values="0;0;0;0;0;0;0;0;0.03;0;0;0;0;0.01;0"
            dur="6s" repeatCount="indefinite" />
        </rect>
      )}

      {/* SECRET corner diamonds */}
      {[[0.06, 0.06], [0.94, 0.06], [0.06, 0.94], [0.94, 0.94]].map(([fx, fy], i) => (
        <polygon key={i}
          points={[
            [fx! * size, fy! * size - size * 0.025],
            [fx! * size + size * 0.025, fy! * size],
            [fx! * size, fy! * size + size * 0.025],
            [fx! * size - size * 0.025, fy! * size],
          ].map(([x, y]) => `${x},${y}`).join(" ")}
          fill="#fcd34d" fillOpacity="0.9" filter="url(#mm-mid)">
          {animated && <animate attributeName="fillOpacity" values="0.9;0.3;0.9" dur={`${1.5 + i * 0.4}s`} repeatCount="indefinite" />}
        </polygon>
      ))}
    </svg>
  );
}
