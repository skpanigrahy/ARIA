import type { ReactNode } from 'react';
import { TrendingUp, TrendingDown, Minus } from 'lucide-react';

interface MetricCardProps {
  label: string;
  value: string | number;
  subLabel?: string;
  trend?: 'up' | 'down' | 'neutral';
  trendValue?: string;
  icon?: ReactNode;
  accentColor?: 'blue' | 'green' | 'red' | 'amber' | 'purple';
  className?: string;
}

const ACCENT_BORDER: Record<string, string> = {
  blue: 'border-t-2 border-t-[#1F6FEB]',
  green: 'border-t-2 border-t-[#2EA043]',
  red: 'border-t-2 border-t-[#DA3633]',
  amber: 'border-t-2 border-t-[#D29922]',
  purple: 'border-t-2 border-t-[#8957E5]',
};

const ACCENT_TEXT: Record<string, string> = {
  blue: 'text-[#58A6FF]',
  green: 'text-[#3FB950]',
  red: 'text-[#F85149]',
  amber: 'text-[#E3B341]',
  purple: 'text-[#BC8CFF]',
};

const ACCENT_BG: Record<string, string> = {
  blue: 'bg-[#1F6FEB]/10',
  green: 'bg-[#2EA043]/10',
  red: 'bg-[#DA3633]/10',
  amber: 'bg-[#D29922]/10',
  purple: 'bg-[#8957E5]/10',
};

export default function MetricCard({
  label,
  value,
  subLabel,
  trend,
  trendValue,
  icon,
  accentColor = 'blue',
  className = '',
}: MetricCardProps) {
  return (
    <div className={`bg-[#161B22] border border-[#21262D] rounded-xl p-5 ${ACCENT_BORDER[accentColor]} ${className}`}>
      <div className="flex items-start justify-between mb-3">
        <span className="text-[#8B949E] text-xs font-medium uppercase tracking-wide">{label}</span>
        {icon && (
          <div className={`w-7 h-7 rounded-lg flex items-center justify-center ${ACCENT_BG[accentColor]}`}>
            <span className={ACCENT_TEXT[accentColor]}>{icon}</span>
          </div>
        )}
      </div>
      <div className="flex items-end gap-2">
        <span className={`text-3xl font-bold tabular-nums ${ACCENT_TEXT[accentColor]}`}>{value}</span>
        {trend && trendValue && (
          <div className={`flex items-center gap-1 mb-1 text-xs font-medium ${
            trend === 'up' ? 'text-[#3FB950]' : trend === 'down' ? 'text-[#F85149]' : 'text-[#8B949E]'
          }`}>
            {trend === 'up' ? <TrendingUp size={12} /> : trend === 'down' ? <TrendingDown size={12} /> : <Minus size={12} />}
            {trendValue}
          </div>
        )}
      </div>
      {subLabel && (
        <p className="text-[#656D76] text-xs mt-1">{subLabel}</p>
      )}
    </div>
  );
}
