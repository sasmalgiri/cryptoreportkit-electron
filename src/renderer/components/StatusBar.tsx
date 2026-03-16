import { useEffect, useState } from 'react';
import { WifiOff, Clock, Shield } from 'lucide-react';
import { useAppStore } from '../stores/appStore';

export function StatusBar() {
  const isOnline = useAppStore((s) => s.isOnline);
  const lastUpdate = useAppStore((s) => s.lastUpdate);
  const [timeAgo, setTimeAgo] = useState('never');

  useEffect(() => {
    const tick = () => {
      if (lastUpdate) {
        const secs = Math.round((Date.now() - lastUpdate) / 1000);
        setTimeAgo(secs < 60 ? `${secs}s ago` : `${Math.round(secs / 60)}m ago`);
      }
    };
    tick();
    const id = setInterval(tick, 1000);
    return () => clearInterval(id);
  }, [lastUpdate]);

  return (
    <div className="h-7 bg-background/80 backdrop-blur-sm border-t border-white/[0.04] px-4 flex items-center justify-between text-[11px] text-gray-600 shrink-0 select-none">
      <div className="flex items-center gap-4">
        {/* Connection status */}
        <div className="flex items-center gap-1.5">
          {isOnline ? (
            <>
              <div className="live-dot" />
              <span className="text-gray-500">Connected</span>
            </>
          ) : (
            <>
              <WifiOff className="w-3 h-3 text-red-400" />
              <span className="text-red-400/80">Offline</span>
            </>
          )}
        </div>

        {/* BYOK indicator */}
        <div className="flex items-center gap-1 text-gray-600">
          <Shield className="w-3 h-3" />
          <span>BYOK</span>
        </div>
      </div>

      <div className="flex items-center gap-4">
        <div className="flex items-center gap-1 text-gray-600">
          <Clock className="w-3 h-3" />
          {timeAgo}
        </div>
        <span className="text-gray-700">v1.0.0</span>
      </div>
    </div>
  );
}
