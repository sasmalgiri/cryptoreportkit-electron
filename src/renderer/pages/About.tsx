import { Heart, Github, Globe } from 'lucide-react';

export default function About() {
  const openLink = (url: string) => window.electronAPI?.openExternal(url);

  return (
    <div className="max-w-2xl mx-auto space-y-8 py-8">
      {/* App Info */}
      <div className="text-center">
        <div className="text-5xl mb-4">&#9931;</div>
        <h1 className="text-2xl font-bold text-white">CryptoReportKit Desktop</h1>
        <p className="text-gray-400 mt-2">Privacy-First Crypto Analytics</p>
        <p className="text-gray-600 text-sm mt-1">Version 1.0.0</p>
      </div>

      {/* Features */}
      <div className="bg-gray-800/60 border border-gray-700/50 rounded-xl p-6 space-y-4">
        <h2 className="font-semibold text-white">What makes this different</h2>

        <div className="space-y-3">
          {[
            {
              title: 'True BYOK Privacy',
              desc: 'Your CoinGecko API key is stored in your OS keychain and calls go directly from your machine.',
            },
            {
              title: 'Local-First Storage',
              desc: 'Portfolio, watchlist, and cached data live in a local SQLite database on your computer.',
            },
            {
              title: 'Offline Ready',
              desc: 'Market data is cached locally. The app works even without an internet connection.',
            },
            {
              title: 'Lightweight Desktop App',
              desc: 'Built with Electron + React. Full desktop experience with system tray integration.',
            },
            {
              title: 'System Tray',
              desc: 'Live BTC and ETH prices in your system tray. Always visible without opening the app.',
            },
          ].map((f) => (
            <div key={f.title} className="flex items-start gap-3">
              <div className="w-1.5 h-1.5 rounded-full bg-emerald-400 mt-2 shrink-0" />
              <div>
                <div className="text-sm text-white font-medium">{f.title}</div>
                <div className="text-xs text-gray-500">{f.desc}</div>
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* Links */}
      <div className="flex gap-3 justify-center">
        <button
          type="button"
          onClick={() => openLink('https://cryptoreportkit.com')}
          className="flex items-center gap-2 px-4 py-2 bg-gray-800 hover:bg-gray-700 border border-gray-700 rounded-lg text-sm transition"
        >
          <Globe className="w-4 h-4" />
          Website
        </button>
        <button
          type="button"
          onClick={() => openLink('https://github.com/cryptoreportkit')}
          className="flex items-center gap-2 px-4 py-2 bg-gray-800 hover:bg-gray-700 border border-gray-700 rounded-lg text-sm transition"
        >
          <Github className="w-4 h-4" />
          GitHub
        </button>
      </div>

      {/* Footer */}
      <div className="text-center text-gray-600 text-xs">
        <p className="flex items-center justify-center gap-1">
          Built with <Heart className="w-3 h-3 text-red-400" /> by the
          CryptoReportKit Team
        </p>
        <p className="mt-1">Powered by Electron + React</p>
      </div>
    </div>
  );
}
