import {
  LayoutDashboard,
  Bot,
  Zap,
  Search,
  Activity,
  Network,
  ChevronRight,
  Shield,
} from 'lucide-react';
import type { NavigationPage } from '../../types';

interface NavItem {
  id: NavigationPage;
  label: string;
  icon: React.ComponentType<{ size?: number; className?: string }>;
  badge?: string;
}

const NAV_ITEMS: NavItem[] = [
  { id: 'dashboard', label: 'Dashboard', icon: LayoutDashboard },
  { id: 'agents', label: 'Agent Registry', icon: Bot, badge: '5' },
  { id: 'decision-engine', label: 'Decision Engine', icon: Zap },
  { id: 'decision-intelligence', label: 'Decision Intelligence', icon: Search },
  { id: 'production-feedback', label: 'Production Feedback', icon: Activity },
  { id: 'architecture', label: 'Architecture', icon: Network },
];

interface SidebarProps {
  activePage: NavigationPage;
  onNavigate: (page: NavigationPage) => void;
}

export default function Sidebar({ activePage, onNavigate }: SidebarProps) {
  return (
    <aside className="fixed left-0 top-0 h-screen w-60 bg-[#0D1117] border-r border-[#21262D] flex flex-col z-20">
      <div className="flex items-center gap-3 px-5 py-5 border-b border-[#21262D]">
        <div className="w-8 h-8 rounded-lg bg-gradient-to-br from-[#1F6FEB] to-[#0D47A1] flex items-center justify-center shadow-lg shadow-blue-900/40">
          <Shield size={16} className="text-white" />
        </div>
        <div>
          <span className="text-[#E6EDF3] font-bold text-base tracking-tight">ARIA</span>
          <p className="text-[#656D76] text-[10px] leading-none mt-0.5">Trust Intelligence Platform</p>
        </div>
      </div>

      <nav className="flex-1 px-3 py-4 space-y-0.5 overflow-y-auto">
        <p className="text-[#656D76] text-[10px] font-semibold uppercase tracking-widest px-2 mb-3">Navigation</p>
        {NAV_ITEMS.map((item) => {
          const isActive = activePage === item.id;
          const Icon = item.icon;
          return (
            <button
              key={item.id}
              onClick={() => onNavigate(item.id)}
              className={`w-full flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm transition-all duration-150 group ${
                isActive
                  ? 'bg-[#1F6FEB]/15 text-[#58A6FF] border border-[#1F6FEB]/30'
                  : 'text-[#8B949E] hover:text-[#E6EDF3] hover:bg-[#161B22]'
              }`}
            >
              <Icon
                size={16}
                className={isActive ? 'text-[#58A6FF]' : 'text-[#8B949E] group-hover:text-[#E6EDF3]'}
              />
              <span className="flex-1 text-left">{item.label}</span>
              {item.badge && (
                <span className={`text-[10px] px-1.5 py-0.5 rounded-full font-medium ${
                  isActive ? 'bg-[#1F6FEB]/30 text-[#58A6FF]' : 'bg-[#21262D] text-[#8B949E]'
                }`}>
                  {item.badge}
                </span>
              )}
              {isActive && <ChevronRight size={12} className="text-[#58A6FF]" />}
            </button>
          );
        })}
      </nav>

      <div className="px-4 py-4 border-t border-[#21262D]">
        <div className="flex items-center gap-2 mb-3">
          <div className="w-1.5 h-1.5 rounded-full bg-[#2EA043] animate-pulse" />
          <span className="text-[#8B949E] text-xs">System Operational</span>
        </div>
        <div className="bg-[#161B22] rounded-lg px-3 py-2.5 border border-[#21262D]">
          <div className="flex justify-between items-center mb-1">
            <span className="text-[#656D76] text-[10px]">ACES Integration</span>
            <span className="text-[#D29922] text-[10px] font-medium">Planned</span>
          </div>
          <div className="w-full bg-[#21262D] rounded-full h-1">
            <div className="bg-gradient-to-r from-[#1F6FEB] to-[#D29922] h-1 rounded-full" style={{ width: '35%' }} />
          </div>
          <p className="text-[#656D76] text-[10px] mt-1.5">Phase 2 Roadmap</p>
        </div>
        <p className="text-[#656D76] text-[10px] mt-3 text-center">ARIA v1.0 · JPMC Innovation Week 2026</p>
      </div>
    </aside>
  );
}
