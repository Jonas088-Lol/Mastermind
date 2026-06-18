/**
 * CoinIcon — custom coin symbol for MasterMind's virtual currency.
 *
 * Design: flat coin (circle + inner rim) with a 4-pointed star motif.
 * Uses currentColor so it picks up whatever text-* class you apply.
 */
interface Props {
  className?: string;
  /** Override both width and height (default: uses CSS sizing from className). */
  size?: number;
  style?: React.CSSProperties;
}

export function CoinIcon({ className, size, style }: Props) {
  return (
    <svg
      xmlns="http://www.w3.org/2000/svg"
      viewBox="0 0 24 24"
      fill="none"
      width={size}
      height={size}
      className={className}
      style={style}
      aria-hidden="true"
    >
      {/* Coin face — subtle fill */}
      <circle cx="12" cy="12" r="9.5" fill="currentColor" fillOpacity="0.14" />
      {/* Coin rim — outer ring */}
      <circle cx="12" cy="12" r="9.5" stroke="currentColor" strokeWidth="1.5" />
      {/* Inner detail ring */}
      <circle cx="12" cy="12" r="6.75" stroke="currentColor" strokeWidth="0.75" strokeOpacity="0.45" />
      {/* 4-pointed star motif — coin imprint */}
      <path
        d="M12 8.5L13.1 10.9L15.5 12L13.1 13.1L12 15.5L10.9 13.1L8.5 12L10.9 10.9Z"
        fill="currentColor"
      />
    </svg>
  );
}
