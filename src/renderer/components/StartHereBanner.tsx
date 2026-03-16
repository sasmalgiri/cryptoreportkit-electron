import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { GraduationCap, X, ArrowRight } from 'lucide-react';

const BANNER_DISMISSED_KEY = 'crk-start-here-dismissed';
const FIRST_VISIT_KEY = 'crk-first-visit-ts';
const LEVEL_KEY = 'crk-user-level';
const SEVEN_DAYS = 7 * 24 * 60 * 60 * 1000;

/**
 * StartHereBanner — Persistent banner shown on the full dashboard
 * for users in their first 7 days. Dismissible, but comes back
 * until 7 days pass or user explicitly dismisses it permanently.
 */
export function StartHereBanner() {
  const [visible, setVisible] = useState(false);
  const navigate = useNavigate();

  useEffect(() => {
    // Don't show if already permanently dismissed
    if (localStorage.getItem(BANNER_DISMISSED_KEY)) return;

    // Don't show for experienced users
    const level = localStorage.getItem(LEVEL_KEY);
    if (level === 'pro') return;

    // Track first visit timestamp
    let firstVisit = localStorage.getItem(FIRST_VISIT_KEY);
    if (!firstVisit) {
      firstVisit = Date.now().toString();
      localStorage.setItem(FIRST_VISIT_KEY, firstVisit);
    }

    // Only show within first 7 days
    const elapsed = Date.now() - parseInt(firstVisit);
    if (elapsed > SEVEN_DAYS) return;

    setVisible(true);
  }, []);

  function dismiss() {
    localStorage.setItem(BANNER_DISMISSED_KEY, '1');
    setVisible(false);
  }

  if (!visible) return null;

  const level = localStorage.getItem(LEVEL_KEY);
  const isNew = level === 'new';

  return (
    <div className="bg-gradient-to-r from-emerald-500/10 to-blue-500/10 border border-emerald-500/20 rounded-xl p-4 mb-6">
      <div className="flex items-center justify-between gap-4">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-xl bg-emerald-500/20 flex items-center justify-center shrink-0">
            <GraduationCap className="w-5 h-5 text-emerald-400" />
          </div>
          <div>
            <p className="text-sm font-medium text-white">
              {isNew ? 'New to crypto? Start with the basics' : 'Get more out of CryptoReportKit'}
            </p>
            <p className="text-xs text-gray-400 mt-0.5">
              {isNew
                ? '8 bite-sized lessons to understand everything you see on this dashboard'
                : 'Explore our learning section with glossary, myths debunked, and guided lessons'}
            </p>
          </div>
        </div>

        <div className="flex items-center gap-2 shrink-0">
          <button
            type="button"
            onClick={() => navigate('/learn')}
            className="flex items-center gap-1.5 px-4 py-2 bg-emerald-600 hover:bg-emerald-700 rounded-lg text-sm font-medium transition-colors"
          >
            {isNew ? 'Start Learning' : 'Explore Learn'}
            <ArrowRight className="w-3.5 h-3.5" />
          </button>
          <button
            type="button"
            onClick={dismiss}
            className="p-1.5 text-gray-500 hover:text-white transition-colors rounded-lg hover:bg-gray-800/60"
            title="Don't show again"
          >
            <X className="w-4 h-4" />
          </button>
        </div>
      </div>
    </div>
  );
}
