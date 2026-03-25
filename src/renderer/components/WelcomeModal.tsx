import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  X, ArrowRight, ChevronRight, GraduationCap, BarChart3,
  MessageSquare, Shield, BookOpen, AlertTriangle,
  Sparkles, Eye, Lock, TrendingUp, Key,
} from 'lucide-react';

const STORAGE_KEY = 'crk-desktop-onboarded';
const LEVEL_KEY = 'crk-user-level';

type UserLevel = 'new' | 'some' | 'pro' | null;

export function WelcomeModal() {
  const [open, setOpen] = useState(false);
  const [level, setLevel] = useState<UserLevel>(null);
  const [step, setStep] = useState(0);
  const navigate = useNavigate();

  useEffect(() => {
    try {
      if (!localStorage.getItem(STORAGE_KEY)) {
        setOpen(true);
      }
    } catch {
      setOpen(true);
    }
  }, []);

  function dismiss() {
    try {
      localStorage.setItem(STORAGE_KEY, '1');
      if (level) localStorage.setItem(LEVEL_KEY, level);
    } catch { /* silently fail — user will see modal again next time */ }
    setOpen(false);
  }

  function goTo(path: string) {
    dismiss();
    navigate(path);
  }

  if (!open) return null;

  // ─── STEP 0: Full-screen "What's your level?" ───
  if (step === 0) {
    return (
      <div className="fixed inset-0 z-[100] bg-gray-900 flex items-center justify-center overflow-y-auto">
        <div className="max-w-2xl w-full px-6 py-12">
          {/* Hero */}
          <div className="text-center mb-10">
            <div className="text-5xl mb-4">📊</div>
            <h1 className="text-3xl font-bold text-white mb-3">
              Welcome to CryptoReportKit
            </h1>
            <p className="text-gray-400 text-lg max-w-md mx-auto">
              Free crypto analytics on your desktop. Private, offline-capable, no account needed.
            </p>
          </div>

          {/* Trust strip */}
          <div className="flex flex-wrap justify-center gap-6 mb-10 text-xs text-gray-500">
            <span className="flex items-center gap-1.5">
              <Lock className="w-3.5 h-3.5 text-emerald-400" />
              Your data stays on your machine
            </span>
            <span className="flex items-center gap-1.5">
              <Eye className="w-3.5 h-3.5 text-blue-400" />
              No tracking, no ads
            </span>
            <span className="flex items-center gap-1.5">
              <Shield className="w-3.5 h-3.5 text-amber-400" />
              Education first, not hype
            </span>
          </div>

          {/* Level selection */}
          <p className="text-center text-white font-medium text-lg mb-6">
            How much do you know about crypto?
          </p>

          <div className="space-y-3 max-w-md mx-auto">
            <button
              type="button"
              onClick={() => { setLevel('new'); setStep(1); }}
              className="w-full flex items-center gap-4 p-5 rounded-xl bg-emerald-500/[0.07] border-2 border-emerald-500/20 hover:border-emerald-500/50 text-left transition-all group"
            >
              <div className="w-12 h-12 rounded-xl bg-emerald-500/20 flex items-center justify-center shrink-0">
                <span className="text-2xl">🌱</span>
              </div>
              <div className="flex-1">
                <div className="text-white font-semibold group-hover:text-emerald-400 transition-colors">
                  I'm brand new to crypto
                </div>
                <div className="text-sm text-gray-500 mt-0.5">
                  Start from zero — we'll explain everything in plain English
                </div>
              </div>
              <ChevronRight className="w-5 h-5 text-gray-600 group-hover:text-emerald-400 transition-colors shrink-0" />
            </button>

            <button
              type="button"
              onClick={() => { setLevel('some'); setStep(2); }}
              className="w-full flex items-center gap-4 p-5 rounded-xl bg-blue-500/[0.07] border-2 border-blue-500/20 hover:border-blue-500/50 text-left transition-all group"
            >
              <div className="w-12 h-12 rounded-xl bg-blue-500/20 flex items-center justify-center shrink-0">
                <span className="text-2xl">📈</span>
              </div>
              <div className="flex-1">
                <div className="text-white font-semibold group-hover:text-blue-400 transition-colors">
                  I know the basics
                </div>
                <div className="text-sm text-gray-500 mt-0.5">
                  Show me the tools — charts, screener, analytics
                </div>
              </div>
              <ChevronRight className="w-5 h-5 text-gray-600 group-hover:text-blue-400 transition-colors shrink-0" />
            </button>

            <button
              type="button"
              onClick={() => { setLevel('pro'); setStep(3); }}
              className="w-full flex items-center gap-4 p-5 rounded-xl bg-purple-500/[0.07] border-2 border-purple-500/20 hover:border-purple-500/50 text-left transition-all group"
            >
              <div className="w-12 h-12 rounded-xl bg-purple-500/20 flex items-center justify-center shrink-0">
                <span className="text-2xl">🔬</span>
              </div>
              <div className="flex-1">
                <div className="text-white font-semibold group-hover:text-purple-400 transition-colors">
                  I'm experienced
                </div>
                <div className="text-sm text-gray-500 mt-0.5">
                  Skip the tour — just set up my API key
                </div>
              </div>
              <ChevronRight className="w-5 h-5 text-gray-600 group-hover:text-purple-400 transition-colors shrink-0" />
            </button>
          </div>
        </div>
      </div>
    );
  }

  // ─── STEP 1: Brand new — guided learning path ───
  if (step === 1) {
    return (
      <div className="fixed inset-0 z-[100] bg-gray-900 flex items-center justify-center overflow-y-auto">
        <div className="max-w-lg w-full px-6 py-10">
          <button
            type="button"
            onClick={() => setStep(0)}
            className="text-sm text-gray-500 hover:text-gray-300 transition-colors mb-6"
          >
            ← Back
          </button>

          <div className="text-center mb-8">
            <div className="w-16 h-16 rounded-2xl bg-emerald-500/20 flex items-center justify-center mx-auto mb-4">
              <GraduationCap className="w-8 h-8 text-emerald-400" />
            </div>
            <h2 className="text-2xl font-bold text-white mb-2">
              Perfect — let's start from scratch
            </h2>
            <p className="text-gray-400">
              No jargon, no hype. Just clear explanations and real data.
            </p>
          </div>

          <div className="space-y-3 mb-8">
            <p className="text-sm text-gray-500 font-medium uppercase tracking-wider mb-2">
              Your first 3 steps:
            </p>

            <RouteCard
              num={1}
              icon={<BookOpen className="w-5 h-5 text-emerald-400" />}
              title="Learn the basics"
              desc="8 bite-sized lessons: what crypto is, how to read charts, what market cap means, and how to avoid scams"
              onClick={() => goTo('/learn')}
              color="emerald"
            />
            <RouteCard
              num={2}
              icon={<AlertTriangle className="w-5 h-5 text-amber-400" />}
              title="Bust the myths"
              desc="'Cheap coins have more room to grow' and 7 other dangerous myths debunked with math"
              onClick={() => goTo('/learn')}
              color="amber"
            />
            <RouteCard
              num={3}
              icon={<BarChart3 className="w-5 h-5 text-blue-400" />}
              title="Explore real market data"
              desc="See actual crypto prices, market caps, and trends — with tooltips explaining every number"
              onClick={() => goTo('/')}
              color="blue"
            />
          </div>

          <div className="flex items-center justify-between">
            <p className="text-xs text-gray-600">
              You can always find Learn in the sidebar
            </p>
            <button
              type="button"
              onClick={() => goTo('/learn')}
              className="flex items-center gap-2 px-6 py-3 bg-emerald-600 hover:bg-emerald-700 rounded-xl font-medium text-sm transition-colors"
            >
              Start Learning
              <ArrowRight className="w-4 h-4" />
            </button>
          </div>
        </div>
      </div>
    );
  }

  // ─── STEP 2: Know basics — show the tools ───
  if (step === 2) {
    return (
      <div className="fixed inset-0 z-[100] bg-gray-900 flex items-center justify-center overflow-y-auto">
        <div className="max-w-lg w-full px-6 py-10">
          <button
            type="button"
            onClick={() => setStep(0)}
            className="text-sm text-gray-500 hover:text-gray-300 transition-colors mb-6"
          >
            ← Back
          </button>

          <div className="text-center mb-8">
            <div className="w-16 h-16 rounded-2xl bg-blue-500/20 flex items-center justify-center mx-auto mb-4">
              <Sparkles className="w-8 h-8 text-blue-400" />
            </div>
            <h2 className="text-2xl font-bold text-white mb-2">
              Great — here are your power tools
            </h2>
            <p className="text-gray-400">
              22 tools, all free. Here are the most popular ones to start with.
            </p>
          </div>

          <div className="space-y-3 mb-8">
            <RouteCard
              icon={<TrendingUp className="w-5 h-5 text-emerald-400" />}
              title="Market Dashboard"
              desc="Live prices, market cap, volume, and Fear & Greed — all in one view"
              onClick={() => goTo('/')}
              color="emerald"
            />
            <RouteCard
              icon={<BarChart3 className="w-5 h-5 text-blue-400" />}
              title="Technical Analysis"
              desc="RSI, MACD, Bollinger Bands, moving averages — for 8 major coins"
              onClick={() => goTo('/technical')}
              color="blue"
            />
            <RouteCard
              icon={<Shield className="w-5 h-5 text-amber-400" />}
              title="Risk Analysis"
              desc="Sharpe ratio, max drawdown, Value at Risk — know the risk before you invest"
              onClick={() => goTo('/risk')}
              color="amber"
            />
            <RouteCard
              icon={<MessageSquare className="w-5 h-5 text-purple-400" />}
              title="Ask AI"
              desc="Ask any crypto question — works offline with a built-in knowledge base"
              onClick={() => goTo('/ask-ai')}
              color="purple"
            />
          </div>

          <div className="flex items-center justify-between">
            <button
              type="button"
              onClick={() => setStep(3)}
              className="text-sm text-gray-500 hover:text-gray-300 transition-colors"
            >
              Set up API key first →
            </button>
            <button
              type="button"
              onClick={() => goTo('/')}
              className="flex items-center gap-2 px-6 py-3 bg-blue-600 hover:bg-blue-700 rounded-xl font-medium text-sm transition-colors"
            >
              Open Dashboard
              <ArrowRight className="w-4 h-4" />
            </button>
          </div>
        </div>
      </div>
    );
  }

  // ─── STEP 3: Experienced / API key setup ───
  return (
    <div className="fixed inset-0 z-[100] flex items-center justify-center bg-black/60 backdrop-blur-sm">
      <div className="bg-gray-800 border border-gray-700 rounded-2xl w-full max-w-md mx-4 shadow-2xl">
        <div className="flex items-center justify-between p-5 border-b border-gray-700/50">
          <div className="flex items-center gap-3">
            <Key className="w-6 h-6 text-amber-400" />
            <h2 className="text-lg font-semibold text-white">Connect Your Data</h2>
          </div>
          <button
            type="button"
            onClick={dismiss}
            className="text-gray-500 hover:text-white transition-colors p-1"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        <div className="p-5 space-y-4">
          <p className="text-sm text-gray-300">
            To see live data, add a free CoinGecko API key. Takes 2 minutes.
          </p>

          <div className="space-y-3">
            <StepItem num={1} text="Go to coingecko.com/en/api and sign up (free)" />
            <StepItem num={2} text="Copy your Demo API key" />
            <StepItem num={3} text='Open Settings in the sidebar and paste it' />
          </div>

          <div className="bg-emerald-500/10 border border-emerald-500/20 rounded-lg p-3">
            <p className="text-xs text-emerald-400">
              <Lock className="w-3 h-3 inline mr-1" />
              Your key is stored in your OS keychain (Windows Credential Manager / macOS Keychain) — never in plain text, never sent to any server.
            </p>
          </div>
        </div>

        <div className="flex items-center justify-between p-5 border-t border-gray-700/50">
          {level !== 'pro' ? (
            <button
              type="button"
              onClick={() => setStep(level === 'new' ? 1 : 2)}
              className="text-sm text-gray-500 hover:text-gray-300 transition-colors"
            >
              ← Back
            </button>
          ) : (
            <button
              type="button"
              onClick={() => setStep(0)}
              className="text-sm text-gray-500 hover:text-gray-300 transition-colors"
            >
              ← Back
            </button>
          )}
          <div className="flex gap-2">
            <button
              type="button"
              onClick={dismiss}
              className="px-4 py-2 text-sm text-gray-400 hover:text-white transition-colors"
            >
              I'll do it later
            </button>
            <button
              type="button"
              onClick={() => goTo('/settings')}
              className="flex items-center gap-2 px-4 py-2 bg-amber-600 hover:bg-amber-700 rounded-lg text-sm font-medium transition-colors"
            >
              Open Settings
              <ArrowRight className="w-4 h-4" />
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}

/* ─── Helper components ─── */

function RouteCard({
  num,
  icon,
  title,
  desc,
  onClick,
  color,
}: {
  num?: number;
  icon: React.ReactNode;
  title: string;
  desc: string;
  onClick: () => void;
  color: string;
}) {
  const borderHover: Record<string, string> = {
    emerald: 'hover:border-emerald-500/40',
    blue: 'hover:border-blue-500/40',
    amber: 'hover:border-amber-500/40',
    purple: 'hover:border-purple-500/40',
  };

  return (
    <button
      type="button"
      onClick={onClick}
      className={`w-full flex items-center gap-4 p-4 rounded-xl bg-gray-800/60 border border-gray-700/50 ${borderHover[color] || ''} text-left transition-all group`}
    >
      {num != null && (
        <div className="w-7 h-7 rounded-full bg-gray-700 flex items-center justify-center text-xs font-bold text-gray-300 shrink-0">
          {num}
        </div>
      )}
      <div className="w-10 h-10 rounded-lg bg-gray-700/50 flex items-center justify-center shrink-0">
        {icon}
      </div>
      <div className="flex-1 min-w-0">
        <div className="text-sm font-medium text-white group-hover:text-emerald-400 transition-colors">
          {title}
        </div>
        <div className="text-xs text-gray-500 mt-0.5">{desc}</div>
      </div>
      <ArrowRight className="w-4 h-4 text-gray-600 group-hover:text-emerald-400 transition-colors shrink-0" />
    </button>
  );
}

function StepItem({ num, text }: { num: number; text: string }) {
  return (
    <div className="flex items-start gap-3">
      <div className="w-6 h-6 rounded-full bg-amber-500/20 flex items-center justify-center text-xs font-bold text-amber-400 shrink-0 mt-0.5">
        {num}
      </div>
      <p className="text-sm text-gray-300">{text}</p>
    </div>
  );
}
