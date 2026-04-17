import type { DecisionType, TrustLevel, Criticality } from '../../types';

interface DecisionBadgeProps {
  decision: DecisionType;
  size?: 'sm' | 'md' | 'lg';
}

const DECISION_STYLES: Record<DecisionType, string> = {
  ALLOW: 'bg-[#2EA043]/15 text-[#3FB950] border-[#2EA043]/40',
  REVIEW: 'bg-[#D29922]/15 text-[#E3B341] border-[#D29922]/40',
  BLOCK: 'bg-[#DA3633]/15 text-[#F85149] border-[#DA3633]/40',
};

const DECISION_DOTS: Record<DecisionType, string> = {
  ALLOW: 'bg-[#3FB950]',
  REVIEW: 'bg-[#E3B341]',
  BLOCK: 'bg-[#F85149]',
};

const DECISION_SIZE: Record<string, string> = {
  sm: 'text-[10px] px-1.5 py-0.5',
  md: 'text-xs px-2.5 py-1',
  lg: 'text-sm px-3 py-1.5',
};

export function DecisionBadge({ decision, size = 'md' }: DecisionBadgeProps) {
  return (
    <span className={`inline-flex items-center gap-1.5 font-semibold rounded-full border ${DECISION_STYLES[decision]} ${DECISION_SIZE[size]}`}>
      <span className={`w-1.5 h-1.5 rounded-full ${DECISION_DOTS[decision]}`} />
      {decision}
    </span>
  );
}

interface TrustBadgeProps {
  level: TrustLevel;
  size?: 'sm' | 'md';
}

const TRUST_STYLES: Record<TrustLevel, string> = {
  HIGH: 'bg-[#2EA043]/15 text-[#3FB950] border-[#2EA043]/30',
  MEDIUM: 'bg-[#D29922]/15 text-[#E3B341] border-[#D29922]/30',
  LOW: 'bg-[#DA3633]/15 text-[#F85149] border-[#DA3633]/30',
};

export function TrustBadge({ level, size = 'md' }: TrustBadgeProps) {
  return (
    <span className={`inline-flex items-center font-medium rounded-full border ${TRUST_STYLES[level]} ${size === 'sm' ? 'text-[10px] px-1.5 py-0.5' : 'text-xs px-2 py-0.5'}`}>
      {level}
    </span>
  );
}

interface CriticalityBadgeProps {
  level: Criticality;
  size?: 'sm' | 'md';
}

const CRITICALITY_STYLES: Record<Criticality, string> = {
  LOW: 'bg-[#8B949E]/15 text-[#8B949E] border-[#8B949E]/30',
  MEDIUM: 'bg-[#D29922]/15 text-[#E3B341] border-[#D29922]/30',
  HIGH: 'bg-[#DA3633]/15 text-[#F85149] border-[#DA3633]/30',
  CRITICAL: 'bg-[#DA3633]/25 text-[#FF7B72] border-[#DA3633]/50',
};

export function CriticalityBadge({ level, size = 'md' }: CriticalityBadgeProps) {
  return (
    <span className={`inline-flex items-center font-medium rounded-full border uppercase tracking-wide ${CRITICALITY_STYLES[level]} ${size === 'sm' ? 'text-[9px] px-1.5 py-0.5' : 'text-[10px] px-2 py-0.5'}`}>
      {level}
    </span>
  );
}

interface AgentTypeBadgeProps {
  type: 'external' | 'internal' | 'mcp';
}

export function AgentTypeBadge({ type }: AgentTypeBadgeProps) {
  const styles: Record<string, string> = {
    external: 'bg-[#1F6FEB]/15 text-[#58A6FF] border-[#1F6FEB]/30',
    internal: 'bg-[#8957E5]/15 text-[#BC8CFF] border-[#8957E5]/30',
    mcp: 'bg-[#D29922]/15 text-[#E3B341] border-[#D29922]/30',
  };
  return (
    <span className={`inline-flex items-center text-[10px] font-medium rounded-full border uppercase tracking-wide px-1.5 py-0.5 ${styles[type]}`}>
      {type}
    </span>
  );
}

interface SeverityBadgeProps {
  severity: 'LOW' | 'MEDIUM' | 'HIGH' | 'CRITICAL';
}

const SEVERITY_STYLES: Record<string, string> = {
  LOW: 'bg-[#8B949E]/10 text-[#8B949E] border-[#8B949E]/20',
  MEDIUM: 'bg-[#D29922]/15 text-[#E3B341] border-[#D29922]/30',
  HIGH: 'bg-[#DA3633]/15 text-[#F85149] border-[#DA3633]/30',
  CRITICAL: 'bg-[#DA3633]/25 text-[#FF7B72] border-[#DA3633]/50',
};

export function SeverityBadge({ severity }: SeverityBadgeProps) {
  return (
    <span className={`inline-flex items-center text-[10px] font-semibold rounded-full border uppercase px-2 py-0.5 ${SEVERITY_STYLES[severity]}`}>
      {severity}
    </span>
  );
}
