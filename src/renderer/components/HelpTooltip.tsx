import { useState } from 'react';
import { HelpCircle } from 'lucide-react';

interface HelpTooltipProps {
  text: string;
  className?: string;
}

export function HelpTooltip({ text, className = '' }: HelpTooltipProps) {
  const [show, setShow] = useState(false);

  return (
    <span
      className={`relative inline-flex ${className}`}
      onMouseEnter={() => setShow(true)}
      onMouseLeave={() => setShow(false)}
    >
      <HelpCircle className="w-3.5 h-3.5 text-gray-500 hover:text-emerald-400 cursor-help transition-colors" />
      {show && (
        <span className="absolute z-50 bottom-full left-1/2 -translate-x-1/2 mb-2 px-3 py-2 bg-gray-700 border border-gray-600 rounded-lg text-xs text-gray-200 leading-relaxed w-56 text-center shadow-xl pointer-events-none">
          {text}
          <span className="absolute top-full left-1/2 -translate-x-1/2 -mt-px border-4 border-transparent border-t-gray-700" />
        </span>
      )}
    </span>
  );
}
