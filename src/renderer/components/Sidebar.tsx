import { NavLink } from 'react-router-dom';
import {
  LayoutDashboard,
  Briefcase,
  Star,
  Settings,
  Info,
  PanelLeftClose,
  PanelLeftOpen,
  BarChart3,
  Activity,
  Scale,
  Grid3x3,
  Filter,
  Boxes,
  GitCompare,
  ShieldAlert,
  FlaskConical,
  Beaker,
  RotateCcw,
  FileSpreadsheet,
  Bell,
  TrendingUp,
  Landmark,
  BookOpen,
  Brain,
  GraduationCap,
  Wallet,
  ArrowDownUp,
  Image,
  Layers,
} from 'lucide-react';
import { useAppStore } from '../stores/appStore';

interface NavSection {
  title: string;
  items: { to: string; icon: React.ElementType; label: string }[];
}

const NAV_SECTIONS: NavSection[] = [
  {
    title: 'Overview',
    items: [
      { to: '/', icon: LayoutDashboard, label: 'Dashboard' },
      { to: '/portfolio', icon: Briefcase, label: 'Portfolio' },
      { to: '/watchlist', icon: Star, label: 'Watchlist' },
      { to: '/alerts', icon: Bell, label: 'Alerts' },
    ],
  },
  {
    title: 'Charts & Analysis',
    items: [
      { to: '/charts', icon: BarChart3, label: 'Advanced Charts' },
      { to: '/technical', icon: Activity, label: 'Technical Analysis' },
      { to: '/compare', icon: Scale, label: 'Compare' },
      { to: '/multi-chart', icon: Grid3x3, label: 'Multi-Chart' },
    ],
  },
  {
    title: 'Market Tools',
    items: [
      { to: '/screener', icon: Filter, label: 'Screener' },
      { to: '/heatmap', icon: Boxes, label: 'Heatmap' },
      { to: '/orderbook', icon: BookOpen, label: 'Orderbook' },
      { to: '/correlation', icon: GitCompare, label: 'Correlation' },
      { to: '/risk', icon: ShieldAlert, label: 'Risk' },
    ],
  },
  {
    title: 'Data & Labs',
    items: [
      { to: '/datalab', icon: FlaskConical, label: 'DataLab' },
      { to: '/templates', icon: Beaker, label: 'Experiment Lab' },
      { to: '/backtester', icon: RotateCcw, label: 'Backtester' },
      { to: '/tax-report', icon: FileSpreadsheet, label: 'Tax Report' },
      { to: '/exchange-import', icon: ArrowDownUp, label: 'Exchange Import' },
    ],
  },
  {
    title: 'Insights',
    items: [
      { to: '/sentiment', icon: TrendingUp, label: 'Sentiment' },
      { to: '/defi', icon: Landmark, label: 'DeFi' },
      { to: '/defi-positions', icon: Layers, label: 'DeFi Positions' },
      { to: '/ask-ai', icon: Brain, label: 'Ask AI' },
      { to: '/learn', icon: GraduationCap, label: 'Learn' },
    ],
  },
  {
    title: 'Web3',
    items: [
      { to: '/wallet', icon: Wallet, label: 'Multi-Chain Wallet' },
      { to: '/nft-portfolio', icon: Image, label: 'NFT Portfolio' },
    ],
  },
  {
    title: 'System',
    items: [
      { to: '/settings', icon: Settings, label: 'Settings' },
      { to: '/about', icon: Info, label: 'About' },
    ],
  },
];

export function Sidebar() {
  const collapsed = useAppStore((s) => s.sidebarCollapsed);
  const toggle = useAppStore((s) => s.toggleSidebar);

  return (
    <aside
      className="fixed left-0 top-9 h-[calc(100%-36px)] sidebar-glass border-r border-white/[0.04] flex flex-col transition-all duration-300 ease-out z-40"
      style={{ width: collapsed ? 64 : 220 }}
    >
      {/* Logo area */}
      <div className="flex items-center gap-3 px-4 h-14 border-b border-white/[0.04] shrink-0">
        <div className="w-8 h-8 rounded-lg bg-gradient-to-br from-emerald-400 to-emerald-600 flex items-center justify-center shrink-0 shadow-lg shadow-emerald-500/20">
          <span className="text-xs font-bold text-white">CRK</span>
        </div>
        {!collapsed && (
          <span className="text-sm font-semibold text-white truncate tracking-tight">
            CryptoReportKit
          </span>
        )}
      </div>

      {/* Navigation */}
      <nav className="flex-1 py-3 px-2 overflow-y-auto">
        {NAV_SECTIONS.map((section) => (
          <div key={section.title} className="mb-1">
            {!collapsed && (
              <div className="px-3 pt-4 pb-1.5 text-[10px] font-semibold text-gray-500/80 uppercase tracking-widest">
                {section.title}
              </div>
            )}
            {collapsed && <div className="pt-1.5" />}
            {section.items.map(({ to, icon: Icon, label }) => (
              <NavLink
                key={to}
                to={to}
                end={to === '/'}
                className={({ isActive }) =>
                  `flex items-center gap-3 px-3 py-2 rounded-lg text-[13px] transition-all duration-200 relative group ${
                    isActive
                      ? 'nav-active text-emerald-400 font-medium'
                      : 'text-gray-500 hover:text-gray-200 hover:bg-white/[0.04]'
                  }`
                }
                title={collapsed ? label : undefined}
              >
                <Icon className="w-[18px] h-[18px] shrink-0 relative z-10" />
                {!collapsed && <span className="truncate relative z-10">{label}</span>}
              </NavLink>
            ))}
          </div>
        ))}
      </nav>

      {/* Collapse toggle */}
      <div className="px-2 py-3 border-t border-white/[0.04] shrink-0">
        <button
          type="button"
          onClick={toggle}
          className="flex items-center gap-3 px-3 py-2 rounded-lg text-gray-500 hover:text-gray-300 hover:bg-white/[0.04] transition-all duration-200 w-full text-sm btn-press"
        >
          {collapsed ? (
            <PanelLeftOpen className="w-5 h-5 shrink-0" />
          ) : (
            <>
              <PanelLeftClose className="w-5 h-5 shrink-0" />
              <span>Collapse</span>
            </>
          )}
        </button>
      </div>
    </aside>
  );
}
