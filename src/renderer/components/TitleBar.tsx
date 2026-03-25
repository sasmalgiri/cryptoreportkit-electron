import { useState, useEffect } from 'react';
import { Minus, Square, X } from 'lucide-react';

export function TitleBar() {
  const [isMaximized, setIsMaximized] = useState(false);

  useEffect(() => {
    const cleanup = window.electronAPI?.onMaximizedChanged((val: boolean) => setIsMaximized(val));
    window.electronAPI?.isMaximized().then(setIsMaximized);
    return () => cleanup?.();
  }, []);

  const handleMinimize = () => window.electronAPI?.minimize();
  const handleToggleMaximize = () => window.electronAPI?.maximize();
  const handleClose = () => window.electronAPI?.close();

  return (
    <div
      style={{ WebkitAppRegion: 'drag' } as React.CSSProperties}
      className="h-9 bg-gray-900/80 backdrop-blur-md border-b border-gray-800/50 flex items-center justify-between shrink-0 select-none z-50"
    >
      {/* Left: App branding */}
      <div className="flex items-center gap-2 pl-4">
        <div className="w-5 h-5 rounded bg-gradient-to-br from-emerald-400 to-emerald-600 flex items-center justify-center">
          <span className="text-[8px] font-bold text-white leading-none">C</span>
        </div>
        <span className="text-xs text-gray-400 font-medium">
          CryptoReportKit
        </span>
      </div>

      {/* Right: Window controls */}
      <div className="flex items-center h-full" style={{ WebkitAppRegion: 'no-drag' } as React.CSSProperties}>
        <button
          type="button"
          onClick={handleMinimize}
          className="h-full px-3.5 flex items-center justify-center text-gray-500 hover:text-white hover:bg-gray-700/50 transition-colors"
        >
          <Minus className="w-3.5 h-3.5" />
        </button>
        <button
          type="button"
          onClick={handleToggleMaximize}
          className="h-full px-3.5 flex items-center justify-center text-gray-500 hover:text-white hover:bg-gray-700/50 transition-colors"
        >
          {isMaximized ? (
            <svg className="w-3 h-3" viewBox="0 0 10 10" fill="none" stroke="currentColor" strokeWidth="1.2">
              <rect x="2" y="3" width="6" height="6" rx="0.5" />
              <polyline points="3,3 3,1.5 8.5,1.5 8.5,7 7,7" />
            </svg>
          ) : (
            <Square className="w-3 h-3" />
          )}
        </button>
        <button
          type="button"
          onClick={handleClose}
          className="h-full px-3.5 flex items-center justify-center text-gray-500 hover:text-white hover:bg-red-500/80 transition-colors"
        >
          <X className="w-3.5 h-3.5" />
        </button>
      </div>
    </div>
  );
}
