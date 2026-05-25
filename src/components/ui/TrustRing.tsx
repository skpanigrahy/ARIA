interface TrustRingProps {
  score: number;
  size?: number;
  strokeWidth?: number;
  showLabel?: boolean;
}

function getTrustColor(score: number): string {
  if (score >= 0.7) return "#3FB950";
  if (score >= 0.45) return "#E3B341";
  return "#F85149";
}

function getTrustGradientId(score: number): string {
  if (score >= 0.7) return "trust-high";
  if (score >= 0.45) return "trust-med";
  return "trust-low";
}

export default function TrustRing({
  score,
  size = 80,
  strokeWidth = 7,
  showLabel = true,
}: TrustRingProps) {
  const radius = (size - strokeWidth * 2) / 2;
  const circumference = 2 * Math.PI * radius;
  const offset = circumference * (1 - score);
  const color = getTrustColor(score);
  const gradId = getTrustGradientId(score);
  const cx = size / 2;
  const cy = size / 2;

  return (
    <div className="relative inline-flex items-center justify-center">
      <svg width={size} height={size} style={{ transform: "rotate(-90deg)" }}>
        <defs>
          <linearGradient id={gradId} x1="0%" y1="0%" x2="100%" y2="100%">
            <stop offset="0%" stopColor={color} stopOpacity="0.6" />
            <stop offset="100%" stopColor={color} stopOpacity="1" />
          </linearGradient>
        </defs>
        <circle
          cx={cx}
          cy={cy}
          r={radius}
          fill="none"
          stroke="#21262D"
          strokeWidth={strokeWidth}
        />
        <circle
          cx={cx}
          cy={cy}
          r={radius}
          fill="none"
          stroke={`url(#${gradId})`}
          strokeWidth={strokeWidth}
          strokeDasharray={circumference}
          strokeDashoffset={offset}
          strokeLinecap="round"
          style={{ transition: "stroke-dashoffset 0.8s ease-in-out" }}
        />
      </svg>
      {showLabel && (
        <div className="absolute inset-0 flex flex-col items-center justify-center">
          <span
            className="font-bold leading-none"
            style={{ fontSize: size * 0.22, color }}
          >
            {Math.round(score * 100)}
          </span>
          {size >= 70 && (
            <span
              className="text-[#656D76] leading-none mt-0.5"
              style={{ fontSize: size * 0.12 }}
            >
              /100
            </span>
          )}
        </div>
      )}
    </div>
  );
}

interface MiniTrustBarProps {
  score: number;
  showPercent?: boolean;
}

export function MiniTrustBar({ score, showPercent = true }: MiniTrustBarProps) {
  const color = getTrustColor(score);
  const pct = Math.round(score * 100);

  return (
    <div className="flex items-center gap-2">
      <div className="flex-1 h-1.5 bg-[#21262D] rounded-full overflow-hidden">
        <div
          className="h-full rounded-full transition-all duration-700"
          style={{ width: `${pct}%`, backgroundColor: color }}
        />
      </div>
      {showPercent && (
        <span className="text-xs font-medium tabular-nums" style={{ color }}>
          {pct}%
        </span>
      )}
    </div>
  );
}
