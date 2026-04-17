interface RiskBarProps {
  label: string;
  value: number;
  className?: string;
}

function getRiskColor(value: number): string {
  if (value >= 0.68) return '#F85149';
  if (value >= 0.38) return '#E3B341';
  return '#3FB950';
}

function getRiskLabel(value: number): string {
  if (value >= 0.68) return 'HIGH';
  if (value >= 0.38) return 'MEDIUM';
  return 'LOW';
}

export default function RiskBar({ label, value, className = '' }: RiskBarProps) {
  const color = getRiskColor(value);
  const riskLabel = getRiskLabel(value);
  const pct = Math.round(value * 100);

  return (
    <div className={className}>
      <div className="flex items-center justify-between mb-1.5">
        <span className="text-[#8B949E] text-xs">{label}</span>
        <div className="flex items-center gap-2">
          <span className="text-[10px] font-medium px-1.5 py-0.5 rounded" style={{ color, backgroundColor: `${color}18` }}>
            {riskLabel}
          </span>
          <span className="text-[#E6EDF3] text-xs font-mono font-semibold tabular-nums">{pct}</span>
        </div>
      </div>
      <div className="w-full h-2 bg-[#21262D] rounded-full overflow-hidden">
        <div
          className="h-full rounded-full transition-all duration-700 ease-out"
          style={{
            width: `${pct}%`,
            backgroundColor: color,
            boxShadow: `0 0 8px ${color}60`,
          }}
        />
      </div>
    </div>
  );
}

interface RiskGaugeProps {
  score: number;
  size?: number;
}

export function RiskGauge({ score, size = 120 }: RiskGaugeProps) {
  const color = getRiskColor(score);
  const label = score >= 0.68 ? 'HIGH RISK' : score >= 0.38 ? 'MEDIUM RISK' : 'LOW RISK';
  const pct = Math.round(score * 100);

  const cx = size / 2;
  const cy = size * 0.6;
  const r = size * 0.38;
  const strokeWidth = size * 0.065;

  const startAngle = Math.PI;
  const endAngle = 2 * Math.PI;
  const arcLength = (endAngle - startAngle) * r;

  const fillLength = arcLength * score;
  const gapLength = arcLength - fillLength;

  const startX = cx + r * Math.cos(startAngle);
  const startY = cy + r * Math.sin(startAngle);

  const describeArc = (start: number, end: number) => {
    const sx = cx + r * Math.cos(start);
    const sy = cy + r * Math.sin(start);
    const ex = cx + r * Math.cos(end);
    const ey = cy + r * Math.sin(end);
    const largeArc = end - start > Math.PI ? 1 : 0;
    return `M ${sx} ${sy} A ${r} ${r} 0 ${largeArc} 1 ${ex} ${ey}`;
  };

  return (
    <div className="relative inline-flex flex-col items-center">
      <svg width={size} height={size * 0.68}>
        <path
          d={describeArc(startAngle, endAngle)}
          fill="none"
          stroke="#21262D"
          strokeWidth={strokeWidth}
          strokeLinecap="round"
        />
        <path
          d={describeArc(startAngle, startAngle + (endAngle - startAngle) * score)}
          fill="none"
          stroke={color}
          strokeWidth={strokeWidth}
          strokeLinecap="round"
          style={{
            filter: `drop-shadow(0 0 6px ${color}80)`,
            transition: 'stroke-dashoffset 1s ease-out',
          }}
        />
        <text x={cx} y={cy - 4} textAnchor="middle" fill={color} fontSize={size * 0.22} fontWeight="bold" fontFamily="monospace">
          {pct}
        </text>
        <text x={cx} y={cy + 14} textAnchor="middle" fill="#656D76" fontSize={size * 0.09}>
          /100
        </text>
      </svg>
      <span className="text-xs font-bold tracking-widest mt-1" style={{ color }}>{label}</span>
    </div>
  );
}
