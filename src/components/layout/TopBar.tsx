import { Bell, User, ChevronDown } from 'lucide-react';
import type { NavigationPage } from '../../types';

const PAGE_TITLES: Record<NavigationPage, { title: string; subtitle: string }> = {
  dashboard: { title: 'Dashboard', subtitle: 'Real-time trust intelligence overview' },
  agents: { title: 'Agent Registry', subtitle: 'AI agent profiles and trust history' },
  'decision-engine': { title: 'Decision Engine', subtitle: 'Live ARIA evaluation & risk analysis' },
  'decision-intelligence': { title: 'Decision Intelligence', subtitle: 'Full decision history and reasoning trails' },
  'production-feedback': { title: 'Production Feedback', subtitle: 'Outcomes feeding back into trust scores' },
  architecture: { title: 'Architecture', subtitle: 'Platform design and component overview' },
  integrations: { title: 'Integrations', subtitle: 'Webhook endpoints and connected systems' },
};

interface TopBarProps {
  activePage: NavigationPage;
}

export default function TopBar({ activePage }: TopBarProps) {
  const { title, subtitle } = PAGE_TITLES[activePage];

  return (
    <header className="fixed top-0 left-60 right-0 h-[60px] bg-[#0D1117]/95 backdrop-blur-sm border-b border-[#21262D] flex items-center justify-between px-6 z-10">
      <div>
        <h1 className="text-[#E6EDF3] font-semibold text-base leading-tight">{title}</h1>
        <p className="text-[#8B949E] text-xs">{subtitle}</p>
      </div>

      <div className="flex items-center gap-3">
        <div className="flex items-center gap-1.5 bg-[#161B22] border border-[#21262D] rounded-lg px-3 py-1.5">
          <div className="w-1.5 h-1.5 rounded-full bg-[#2EA043]" />
          <span className="text-[#8B949E] text-xs">Live</span>
        </div>

        <button className="relative w-8 h-8 flex items-center justify-center rounded-lg hover:bg-[#161B22] transition-colors group">
          <Bell size={16} className="text-[#8B949E] group-hover:text-[#E6EDF3]" />
          <span className="absolute top-1 right-1 w-2 h-2 bg-[#DA3633] rounded-full border border-[#0D1117]" />
        </button>

        <button className="flex items-center gap-2 bg-[#161B22] border border-[#21262D] rounded-lg px-3 py-1.5 hover:border-[#30363D] transition-colors">
          <div className="w-5 h-5 rounded-full bg-gradient-to-br from-[#1F6FEB] to-[#0D47A1] flex items-center justify-center">
            <User size={10} className="text-white" />
          </div>
          <span className="text-[#E6EDF3] text-xs font-medium">JPMC User</span>
          <ChevronDown size={12} className="text-[#8B949E]" />
        </button>
      </div>
    </header>
  );
}
