import { useState, useRef, useEffect } from 'react';
import { Brain, Send, Trash2 } from 'lucide-react';
import { getSimplePrice, getFearGreed } from '../hooks/useElectron';
import { formatNumber } from '../utils/export';

interface Message { role: 'user' | 'assistant'; content: string; }

const KNOWLEDGE_BASE: Record<string, string> = {
  'market sentiment': 'Market sentiment reflects the overall attitude of investors. The Fear & Greed Index measures this on a 0-100 scale. Extreme Fear (0-25) often indicates buying opportunities, while Extreme Greed (75-100) suggests caution. Always combine sentiment with technical and fundamental analysis.',
  'bitcoin': 'Bitcoin (BTC) is the first and largest cryptocurrency by market cap. It operates on a proof-of-work consensus mechanism with a fixed supply of 21 million coins. Bitcoin halving events occur roughly every 4 years, reducing the block reward and historically preceding bull runs.',
  'ethereum': 'Ethereum (ETH) is the leading smart contract platform. Since "The Merge" in 2022, it uses proof-of-stake. Key features include smart contracts, DeFi protocols, NFTs, and layer-2 scaling solutions like Optimism and Arbitrum.',
  'defi': 'DeFi (Decentralized Finance) refers to financial services built on blockchain, including lending (Aave, Compound), DEXes (Uniswap, SushiSwap), and yield farming. Key metrics include TVL (Total Value Locked). Risks include smart contract bugs, impermanent loss, and liquidation.',
  'portfolio': 'Portfolio diversification in crypto typically includes: BTC (40-60%) for stability, ETH (20-30%) for smart contract exposure, and altcoins (10-30%) for growth potential. Rebalance quarterly. Never invest more than you can afford to lose.',
  'dollar cost averaging': 'Dollar Cost Averaging (DCA) means investing a fixed amount at regular intervals regardless of price. This reduces the impact of volatility and removes emotional decision-making. Studies show DCA often outperforms lump-sum investing in volatile markets like crypto.',
  'technical analysis': 'Key technical indicators: RSI (overbought >70, oversold <30), MACD (signal line crossovers), Bollinger Bands (volatility), SMA/EMA crossovers (trend). No single indicator is reliable alone — use multiple together.',
  'risk': 'Risk management in crypto: 1) Never invest more than 5-10% of net worth, 2) Use stop-losses, 3) Diversify across assets, 4) Understand Sharpe Ratio (risk-adjusted returns), 5) Monitor max drawdown, 6) Consider VaR (Value at Risk) for position sizing.',
  'staking': 'Staking involves locking up crypto to validate transactions on proof-of-stake networks. Rewards vary: ETH ~3-5% APY, SOL ~6-8%, DOT ~12-15%. Risks include slashing penalties, lock-up periods, and smart contract risk with liquid staking.',
  'altcoin': 'Altcoins are any cryptocurrency other than Bitcoin. Categories include: Layer-1s (ETH, SOL, AVAX), Layer-2s (MATIC, ARB, OP), DeFi tokens, meme coins, and utility tokens. Higher potential returns but also higher risk than BTC.',
  'nft': 'NFTs (Non-Fungible Tokens) are unique digital assets on blockchain. Used for art, gaming, identity, and more. The market has matured since the 2021-22 boom. Key platforms: OpenSea, Blur, Magic Eden. Evaluate utility beyond speculation.',
  'security': 'Crypto security essentials: 1) Use hardware wallets for large holdings, 2) Enable 2FA everywhere, 3) Never share seed phrases, 4) Verify URLs before connecting wallets, 5) Use separate wallets for DeFi interaction, 6) Be wary of phishing and social engineering.',
};

const QUICK_QUESTIONS = [
  "What's the current market sentiment?",
  "Explain Bitcoin basics",
  "What is DeFi?",
  "How should I diversify my portfolio?",
  "What is dollar cost averaging?",
  "Explain key technical indicators",
];

function findAnswer(question: string): string {
  const q = question.toLowerCase();
  for (const [key, answer] of Object.entries(KNOWLEDGE_BASE)) {
    const keywords = key.split(' ');
    if (keywords.some(k => q.includes(k))) return answer;
  }
  if (q.includes('hello') || q.includes('hi ') || q.startsWith('hi')) return 'Hello! I\'m the CryptoReportKit assistant. I can help with crypto concepts, market analysis, portfolio strategy, and more. Try asking about Bitcoin, DeFi, technical analysis, or risk management!';
  if (q.includes('thank')) return 'You\'re welcome! Feel free to ask more questions about crypto, markets, or trading strategies.';
  return 'I don\'t have a specific answer for that in my offline knowledge base. For AI-powered detailed analysis, use the web app at cryptoreportkit.com. Try asking about: Bitcoin, Ethereum, DeFi, portfolio diversification, technical analysis, risk management, or staking.';
}

export default function AskAI() {
  const [messages, setMessages] = useState<Message[]>([]);
  const [input, setInput] = useState('');
  const [thinking, setThinking] = useState(false);
  const [marketCtx, setMarketCtx] = useState('');
  const scrollRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    (async () => {
      try {
        const [prices, fg] = await Promise.allSettled([
          getSimplePrice('bitcoin,ethereum'),
          getFearGreed(),
        ]);
        const parts: string[] = [];
        if (prices.status === 'fulfilled') {
          const btc = prices.value.bitcoin;
          const eth = prices.value.ethereum;
          if (btc?.usd) parts.push(`BTC: $${formatNumber(btc.usd)} (${(btc.usd_24h_change ?? 0) >= 0 ? '+' : ''}${(btc.usd_24h_change ?? 0).toFixed(1)}%)`);
          if (eth?.usd) parts.push(`ETH: $${formatNumber(eth.usd)}`);
        }
        if (fg.status === 'fulfilled' && fg.value.data?.[0]) {
          parts.push(`Fear & Greed: ${fg.value.data[0].value} (${fg.value.data[0].value_classification})`);
        }
        if (parts.length) setMarketCtx(parts.join(' | '));
      } catch { /* ignore */ }
    })();
  }, []);

  useEffect(() => {
    scrollRef.current?.scrollTo({ top: scrollRef.current.scrollHeight, behavior: 'smooth' });
  }, [messages]);

  const send = async (text: string) => {
    if (!text.trim()) return;
    const userMsg: Message = { role: 'user', content: text };
    setMessages(prev => [...prev, userMsg]);
    setInput('');
    setThinking(true);

    // Small delay for visual feedback, then respond from local knowledge base
    await new Promise(r => setTimeout(r, 150));

    let answer = findAnswer(text);
    if (text.toLowerCase().includes('sentiment') || text.toLowerCase().includes('market')) {
      if (marketCtx) answer = `Current market: ${marketCtx}\n\n${answer}`;
    }

    setMessages(prev => [...prev, { role: 'assistant', content: answer }]);
    setThinking(false);
  };

  return (
    <div className="flex flex-col h-full -m-6">
      {/* Header */}
      <div className="flex items-center justify-between px-6 py-4 border-b border-gray-800">
        <div className="flex items-center gap-3">
          <Brain className="w-6 h-6 text-emerald-400" />
          <div>
            <h1 className="text-lg font-bold">Ask AI</h1>
            <p className="text-xs text-gray-500">Offline knowledge base</p>
          </div>
        </div>
        {messages.length > 0 && (
          <button type="button" onClick={() => setMessages([])} className="p-2 text-gray-500 hover:text-white transition">
            <Trash2 className="w-4 h-4" />
          </button>
        )}
      </div>

      {/* Messages */}
      <div ref={scrollRef} className="flex-1 overflow-y-auto px-6 py-4 space-y-4">
        {messages.length === 0 && (
          <div className="text-center py-12">
            <Brain className="w-16 h-16 text-gray-700 mx-auto mb-4" />
            <p className="text-gray-400 text-lg mb-2">How can I help?</p>
            <p className="text-gray-500 text-sm mb-6">Ask me about crypto, markets, or trading strategies</p>
            {marketCtx && <p className="text-xs text-gray-600 mb-6">{marketCtx}</p>}
            <div className="flex flex-wrap gap-2 justify-center max-w-lg mx-auto">
              {QUICK_QUESTIONS.map(q => (
                <button key={q} type="button" onClick={() => send(q)}
                  className="px-3 py-1.5 bg-gray-800 border border-gray-700 rounded-full text-xs text-gray-300 hover:text-white hover:border-emerald-500/30 transition">
                  {q}
                </button>
              ))}
            </div>
          </div>
        )}

        {messages.map((msg, i) => (
          <div key={i} className={`flex ${msg.role === 'user' ? 'justify-end' : 'justify-start'}`}>
            <div className={`max-w-[75%] rounded-2xl px-4 py-3 text-sm ${
              msg.role === 'user'
                ? 'bg-emerald-500/20 text-emerald-100 rounded-br-md'
                : 'bg-gray-800 text-gray-200 rounded-bl-md'
            }`}>
              {msg.role === 'assistant' && (
                <div className="flex items-center gap-2 mb-1.5">
                  <div className="w-5 h-5 rounded bg-emerald-500/20 flex items-center justify-center text-emerald-400 text-[10px] font-bold">CRK</div>
                  <span className="text-xs text-gray-500">CryptoReportKit</span>
                </div>
              )}
              <p className="whitespace-pre-wrap">{msg.content}</p>
            </div>
          </div>
        ))}

        {thinking && (
          <div className="flex justify-start">
            <div className="bg-gray-800 rounded-2xl rounded-bl-md px-4 py-3">
              <div className="flex gap-1">
                <span className="w-2 h-2 bg-gray-500 rounded-full animate-bounce" style={{ animationDelay: '0ms' }} />
                <span className="w-2 h-2 bg-gray-500 rounded-full animate-bounce" style={{ animationDelay: '150ms' }} />
                <span className="w-2 h-2 bg-gray-500 rounded-full animate-bounce" style={{ animationDelay: '300ms' }} />
              </div>
            </div>
          </div>
        )}
      </div>

      {/* Input */}
      <div className="px-6 py-4 border-t border-gray-800">
        <div className="flex gap-2">
          <input value={input} onChange={e => setInput(e.target.value)}
            onKeyDown={e => e.key === 'Enter' && !e.shiftKey && send(input)}
            placeholder="Ask about crypto, markets, strategies..."
            className="flex-1 bg-gray-800 border border-gray-700 rounded-xl px-4 py-3 text-sm focus:outline-none focus:border-emerald-500/50" />
          <button type="button" onClick={() => send(input)} disabled={!input.trim() || thinking}
            className="px-4 bg-emerald-500 hover:bg-emerald-600 disabled:opacity-40 text-white rounded-xl transition">
            <Send className="w-4 h-4" />
          </button>
        </div>
        <p className="text-[10px] text-gray-600 mt-2 text-center">AI responses are for educational purposes only. Not financial advice.</p>
      </div>
    </div>
  );
}
