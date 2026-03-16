import { useEffect, useState } from 'react';
import { Routes, Route, useLocation } from 'react-router-dom';
import { TitleBar } from './components/TitleBar';
import { Sidebar } from './components/Sidebar';
import { StatusBar } from './components/StatusBar';
import { WelcomeModal } from './components/WelcomeModal';
import Dashboard from './pages/Dashboard';
import Portfolio from './pages/Portfolio';
import Watchlist from './pages/Watchlist';
import Alerts from './pages/Alerts';
import AdvancedCharts from './pages/AdvancedCharts';
import Technical from './pages/Technical';
import Compare from './pages/Compare';
import MultiChart from './pages/MultiChart';
import Screener from './pages/Screener';
import Heatmap from './pages/Heatmap';
import Orderbook from './pages/Orderbook';
import Correlation from './pages/Correlation';
import Risk from './pages/Risk';
import DataLab from './pages/DataLab';
import Templates from './pages/Templates';
import Backtester from './pages/Backtester';
import TaxReport from './pages/TaxReport';
import Sentiment from './pages/Sentiment';
import DeFi from './pages/DeFi';
import AskAI from './pages/AskAI';
import Learn from './pages/Learn';
import Settings from './pages/Settings';
import About from './pages/About';
import ExchangeImport from './pages/ExchangeImport';
import WalletTracker from './pages/WalletTracker';
import NftPortfolio from './pages/NftPortfolio';
import DefiPositions from './pages/DefiPositions';
import { ToastContainer } from './components/Toast';
import { useAppStore } from './stores/appStore';

function AnimatedRoutes() {
  const location = useLocation();
  const [displayKey, setDisplayKey] = useState(location.key);

  useEffect(() => {
    setDisplayKey(location.key);
  }, [location.key]);

  return (
    <div key={displayKey} className="page-enter">
      <Routes location={location}>
        <Route path="/" element={<Dashboard />} />
        <Route path="/portfolio" element={<Portfolio />} />
        <Route path="/watchlist" element={<Watchlist />} />
        <Route path="/alerts" element={<Alerts />} />
        <Route path="/charts" element={<AdvancedCharts />} />
        <Route path="/technical" element={<Technical />} />
        <Route path="/compare" element={<Compare />} />
        <Route path="/multi-chart" element={<MultiChart />} />
        <Route path="/screener" element={<Screener />} />
        <Route path="/heatmap" element={<Heatmap />} />
        <Route path="/orderbook" element={<Orderbook />} />
        <Route path="/correlation" element={<Correlation />} />
        <Route path="/risk" element={<Risk />} />
        <Route path="/datalab" element={<DataLab />} />
        <Route path="/templates" element={<Templates />} />
        <Route path="/backtester" element={<Backtester />} />
        <Route path="/tax-report" element={<TaxReport />} />
        <Route path="/sentiment" element={<Sentiment />} />
        <Route path="/defi" element={<DeFi />} />
        <Route path="/ask-ai" element={<AskAI />} />
        <Route path="/learn" element={<Learn />} />
        <Route path="/exchange-import" element={<ExchangeImport />} />
        <Route path="/wallet" element={<WalletTracker />} />
        <Route path="/nft-portfolio" element={<NftPortfolio />} />
        <Route path="/defi-positions" element={<DefiPositions />} />
        <Route path="/settings" element={<Settings />} />
        <Route path="/about" element={<About />} />
      </Routes>
    </div>
  );
}

export default function App() {
  const sidebarCollapsed = useAppStore((s) => s.sidebarCollapsed);

  return (
    <div className="flex flex-col h-screen bg-background text-white overflow-hidden noise-bg">
      {/* Background gradient orb */}
      <div className="gradient-orb" style={{ top: '-200px', right: '-200px' }} />
      <div className="gradient-orb" style={{ bottom: '-300px', left: '-100px', opacity: 0.5 }} />

      {/* Custom titlebar */}
      <TitleBar />
      <ToastContainer />

      <div className="flex flex-1 overflow-hidden relative z-10">
        <WelcomeModal />
        <Sidebar />

        <div
          className="flex flex-col flex-1 overflow-hidden transition-all duration-300 ease-out"
          style={{ marginLeft: sidebarCollapsed ? 64 : 220 }}
        >
          <main className="flex-1 overflow-y-auto p-6">
            <AnimatedRoutes />
          </main>

          <StatusBar />
        </div>
      </div>
    </div>
  );
}
