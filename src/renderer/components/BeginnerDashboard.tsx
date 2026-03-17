import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  GraduationCap, BookOpen, BarChart3, Brain,
  ArrowRight, ChevronRight, AlertTriangle,
  Eye, CheckCircle2, Lightbulb, Zap,
} from 'lucide-react';

const LEVEL_KEY = 'crk-user-level';

/**
 * BeginnerDashboard — Shown as the main dashboard for users who selected
 * "I'm brand new to crypto" during onboarding. Replaces the full market
 * dashboard with a guided, educational START HERE experience.
 *
 * The user can switch to the full dashboard at any time.
 */
export function BeginnerDashboard({ onShowFullDashboard }: { onShowFullDashboard: () => void }) {
  const navigate = useNavigate();
  const [checklist, setChecklist] = useState(() => {
    const saved = localStorage.getItem('crk-beginner-checklist');
    return saved ? JSON.parse(saved) : { learn: false, glossary: false, dashboard: false, askAi: false };
  });

  function toggleCheck(key: string) {
    const next = { ...checklist, [key]: !checklist[key] };
    setChecklist(next);
    localStorage.setItem('crk-beginner-checklist', JSON.stringify(next));
  }

  const completedCount = Object.values(checklist).filter(Boolean).length;
  const totalCount = Object.keys(checklist).length;

  return (
    <div className="space-y-6 max-w-3xl">
      {/* Hero */}
      <div className="bg-gradient-to-br from-emerald-500/10 to-blue-500/10 border border-emerald-500/20 rounded-2xl p-6">
        <div className="flex items-start gap-4">
          <div className="w-14 h-14 rounded-2xl bg-emerald-500/20 flex items-center justify-center shrink-0">
            <GraduationCap className="w-7 h-7 text-emerald-400" />
          </div>
          <div className="flex-1">
            <h1 className="text-2xl font-bold text-white mb-1">
              Welcome! Start Here
            </h1>
            <p className="text-gray-400 text-sm leading-relaxed">
              You're brand new to crypto — that's great. This page is your home base.
              Follow the steps below and you'll go from zero to understanding real market data.
              No rush, no jargon.
            </p>
          </div>
        </div>

        {/* Progress */}
        <div className="mt-5">
          <div className="flex items-center justify-between text-xs text-gray-500 mb-1.5">
            <span>Your progress</span>
            <span>{completedCount}/{totalCount} complete</span>
          </div>
          <div className="w-full h-2 bg-gray-700/50 rounded-full overflow-hidden">
            <div
              className="h-full bg-emerald-500 rounded-full transition-all duration-500"
              style={{ width: `${(completedCount / totalCount) * 100}%` }}
            />
          </div>
        </div>
      </div>

      {/* Checklist */}
      <div>
        <h2 className="text-sm font-medium text-gray-400 mb-3 flex items-center gap-2">
          <Lightbulb className="w-4 h-4 text-amber-400" />
          Your first 4 steps
        </h2>

        <div className="space-y-2">
          <ChecklistCard
            checked={checklist.learn}
            onToggle={() => toggleCheck('learn')}
            onGo={() => navigate('/learn')}
            icon={<BookOpen className="w-5 h-5 text-emerald-400" />}
            num={1}
            title="Read the basics"
            desc="8 plain-English lessons: what crypto is, how charts work, what scams look like"
            time="10 min"
            color="emerald"
          />
          <ChecklistCard
            checked={checklist.glossary}
            onToggle={() => toggleCheck('glossary')}
            onGo={() => navigate('/learn')}
            icon={<AlertTriangle className="w-5 h-5 text-amber-400" />}
            num={2}
            title="Learn the vocabulary"
            desc="30 key terms explained simply — market cap, RSI, DeFi, whale, and more"
            time="5 min"
            color="amber"
          />
          <ChecklistCard
            checked={checklist.dashboard}
            onToggle={() => toggleCheck('dashboard')}
            onGo={onShowFullDashboard}
            icon={<BarChart3 className="w-5 h-5 text-blue-400" />}
            num={3}
            title="Explore the market dashboard"
            desc="See live prices, market cap, volume — with tooltips explaining every number"
            time="5 min"
            color="blue"
          />
          <ChecklistCard
            checked={checklist.askAi}
            onToggle={() => toggleCheck('askAi')}
            onGo={() => navigate('/ask-ai')}
            icon={<Brain className="w-5 h-5 text-purple-400" />}
            num={4}
            title="Ask a question"
            desc="Try asking: 'What is market cap?' or 'Is Bitcoin safe?' — works offline"
            time="2 min"
            color="purple"
          />
        </div>
      </div>

      {/* Quick concepts */}
      <div>
        <h2 className="text-sm font-medium text-gray-400 mb-3 flex items-center gap-2">
          <Zap className="w-4 h-4 text-amber-400" />
          Key concepts to know first
        </h2>

        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
          <ConceptCard
            icon="💰"
            title="Market Cap ≠ Price"
            desc="A $0.001 coin isn't 'cheap' if there are trillions of tokens. Market Cap = Price × Supply. Always compare market caps."
          />
          <ConceptCard
            icon="📉"
            title="50% drops are normal"
            desc="Even Bitcoin has dropped 50%+ multiple times. This is normal in crypto. Never invest money you can't afford to lose."
          />
          <ConceptCard
            icon="🚫"
            title="No one can predict prices"
            desc="If someone promises guaranteed returns, it's a scam. Period. Real analysis is about probabilities, not certainties."
          />
          <ConceptCard
            icon="🛡️"
            title="Your keys, your crypto"
            desc="Never share your seed phrase. Never click links in DMs. If it sounds too good to be true, it is."
          />
        </div>
      </div>

      {/* Switch to full dashboard */}
      <div className="flex items-center justify-between bg-gray-800/40 border border-gray-700/30 rounded-xl p-4">
        <div className="flex items-center gap-3">
          <Eye className="w-5 h-5 text-gray-500" />
          <div>
            <p className="text-sm text-white font-medium">Ready for the full dashboard?</p>
            <p className="text-xs text-gray-500">You can always come back here from the sidebar</p>
          </div>
        </div>
        <div className="flex gap-2">
          <button
            type="button"
            onClick={onShowFullDashboard}
            className="flex items-center gap-2 px-4 py-2 bg-emerald-600 hover:bg-emerald-700 rounded-lg text-sm font-medium transition-colors"
          >
            Show Full Dashboard
            <ArrowRight className="w-4 h-4" />
          </button>
          <button
            type="button"
            onClick={() => {
              localStorage.setItem(LEVEL_KEY, 'some');
              onShowFullDashboard();
            }}
            className="px-4 py-2 text-xs text-gray-500 hover:text-white transition-colors"
          >
            I'm ready, skip this
          </button>
        </div>
      </div>
    </div>
  );
}

/* ─── Checklist Card ─── */

function ChecklistCard({
  checked, onToggle, onGo, icon, num, title, desc, time, color,
}: {
  checked: boolean;
  onToggle: () => void;
  onGo: () => void;
  icon: React.ReactNode;
  num: number;
  title: string;
  desc: string;
  time: string;
  color: string;
}) {
  const hoverBorderClasses: Record<string, string> = {
    emerald: 'hover:border-emerald-500/30',
    amber: 'hover:border-amber-500/30',
    blue: 'hover:border-blue-500/30',
    purple: 'hover:border-purple-500/30',
  };

  return (
    <div className={`flex items-center gap-3 p-4 rounded-xl bg-gray-800/60 border ${checked ? 'border-emerald-500/30 bg-emerald-500/5' : `border-gray-700/50 ${hoverBorderClasses[color] || ''}`} transition-all`}>
      {/* Checkbox */}
      <button
        type="button"
        onClick={onToggle}
        className={`w-7 h-7 rounded-full border-2 flex items-center justify-center shrink-0 transition-colors ${
          checked
            ? 'bg-emerald-500 border-emerald-500'
            : 'border-gray-600 hover:border-emerald-500/50'
        }`}
      >
        {checked ? (
          <CheckCircle2 className="w-4 h-4 text-white" />
        ) : (
          <span className="text-xs font-bold text-gray-500">{num}</span>
        )}
      </button>

      {/* Icon */}
      <div className="w-10 h-10 rounded-lg bg-gray-700/50 flex items-center justify-center shrink-0">
        {icon}
      </div>

      {/* Content */}
      <div className="flex-1 min-w-0">
        <div className={`text-sm font-medium ${checked ? 'text-gray-500 line-through' : 'text-white'}`}>
          {title}
        </div>
        <div className="text-xs text-gray-500 mt-0.5">{desc}</div>
      </div>

      {/* Time + Go */}
      <div className="flex items-center gap-2 shrink-0">
        <span className="text-[10px] text-gray-600 bg-gray-800 px-2 py-0.5 rounded-full">{time}</span>
        <button
          type="button"
          onClick={onGo}
          title={`Go to ${title}`}
          className="p-1.5 rounded-lg hover:bg-gray-700/50 transition-colors"
        >
          <ChevronRight className="w-4 h-4 text-gray-500 hover:text-emerald-400" />
        </button>
      </div>
    </div>
  );
}

/* ─── Concept Card ─── */

function ConceptCard({ icon, title, desc }: { icon: string; title: string; desc: string }) {
  return (
    <div className="bg-gray-800/60 border border-gray-700/50 rounded-xl p-4">
      <div className="flex items-center gap-2 mb-2">
        <span className="text-lg">{icon}</span>
        <span className="text-sm font-medium text-white">{title}</span>
      </div>
      <p className="text-xs text-gray-400 leading-relaxed">{desc}</p>
    </div>
  );
}
