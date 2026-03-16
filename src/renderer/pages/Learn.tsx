import { useState, useMemo } from 'react';
import { GraduationCap, ChevronDown, ChevronUp, Search, BookOpen } from 'lucide-react';

/* ─── Crypto Basics Accordion ─── */

interface BasicsTopic {
  title: string;
  content: string[];
}

const BASICS: BasicsTopic[] = [
  {
    title: 'What is Cryptocurrency?',
    content: [
      'Cryptocurrency is digital money that works without banks or governments. Transactions are verified by a network of computers and recorded on a public ledger called a blockchain.',
      'Unlike traditional currencies controlled by central banks, most cryptocurrencies have a fixed or predictable supply. Bitcoin, the first cryptocurrency, has a maximum supply of 21 million coins.',
      'You don\'t need to buy a whole coin. Bitcoin is divisible to 8 decimal places — you can buy $10 worth even when the price is $60,000.',
    ],
  },
  {
    title: 'What is Market Cap and Why It Matters',
    content: [
      'Market Cap = Price × Circulating Supply. This is the single most important metric for comparing cryptocurrencies.',
      'A coin priced at $0.001 is NOT "cheaper" than one at $1,000 if the cheap coin has trillions of tokens. Always compare market caps, never unit prices.',
      'Example: Shiba Inu at $0.00001 with 589 trillion tokens has a $5.9 billion market cap. For SHIB to reach $1, its market cap would need to be $589 trillion — more than all money on Earth.',
    ],
  },
  {
    title: 'Wallets and Security',
    content: [
      'A crypto wallet stores your private keys — the passwords that let you send your crypto. Your wallet doesn\'t actually "hold" coins; the coins exist on the blockchain.',
      'Hot wallets (apps like MetaMask, Trust Wallet) are convenient but connected to the internet. Cold wallets (hardware devices like Ledger, Trezor) are offline and more secure.',
      'Your seed phrase (12 or 24 words) is your master backup. Write it down on paper, store it safely. Never share it. Never enter it on a website. Anyone with your seed phrase can take all your crypto.',
    ],
  },
  {
    title: 'Reading Price Charts',
    content: [
      'A candlestick chart shows four prices for each time period: open, high, low, close. Green candles mean the price went up. Red candles mean it went down.',
      'The body of the candle shows the open-to-close range. The thin wicks show the highest and lowest prices during that period.',
      'Volume bars at the bottom show how much was traded. High volume on a price move means the move is more likely to continue. Low volume suggests the move may reverse.',
    ],
  },
  {
    title: 'DeFi — Decentralized Finance',
    content: [
      'DeFi recreates traditional financial services (lending, borrowing, trading) using smart contracts on a blockchain. No banks, no middlemen.',
      'Yield farming means providing liquidity to DeFi protocols in exchange for rewards. Sustainable yields on stablecoins are 2-8%. If you see 100%+ APY, the risk is very high.',
      'Impermanent loss is a hidden risk in liquidity pools. When the prices of your deposited tokens diverge, you end up with less value than if you just held them.',
    ],
  },
  {
    title: 'Risk Management Basics',
    content: [
      'Never invest more than you can afford to lose completely. Crypto is volatile — 50% drawdowns are normal, even for Bitcoin.',
      'Position sizing: limit any single investment to 1-5% of your portfolio. This way, even a total loss won\'t devastate you.',
      'Dollar Cost Averaging (DCA): invest a fixed amount at regular intervals. This removes the stress of timing the market and averages out your entry price over time.',
    ],
  },
  {
    title: 'Security and Scam Prevention',
    content: [
      'If someone promises guaranteed returns, it\'s a scam. No one can predict crypto prices.',
      'Never click links in DMs. Never share your seed phrase. Never "validate" or "sync" your wallet on a website someone sent you.',
      'Common scams: fake airdrops, phishing sites that look like real exchanges, "investment groups" on Telegram, pump-and-dump schemes promoted by influencers.',
    ],
  },
  {
    title: 'Common Myths Debunked',
    content: [
      'Myth: "Cheap coins have more room to grow." Reality: Price per unit is meaningless without knowing the supply. A $0.001 coin with 100 billion supply already has a $100M market cap.',
      'Myth: "Crypto always goes up long term." Reality: Bitcoin has, but thousands of altcoins have gone to zero. Survivorship bias — you only hear about the winners.',
      'Myth: "Diamond hands — never sell!" Reality: Having an exit plan is smart, not weak. Professional investors take profits and cut losses. Blind holding is the absence of strategy.',
    ],
  },
];

/* ─── Glossary ─── */

interface GlossaryTerm {
  term: string;
  definition: string;
}

const GLOSSARY: GlossaryTerm[] = [
  { term: 'Altcoin', definition: 'Any cryptocurrency other than Bitcoin. Includes Ethereum, Solana, XRP, etc.' },
  { term: 'APY', definition: 'Annual Percentage Yield — the yearly return including compound interest. High APYs in DeFi often come with high risk.' },
  { term: 'ATH', definition: 'All-Time High — the highest price a coin has ever reached.' },
  { term: 'Bear Market', definition: 'A prolonged period of falling prices, typically 20%+ decline from recent highs lasting months or years.' },
  { term: 'Blockchain', definition: 'A chain of data blocks linked together. Each block contains transactions. Once recorded, data cannot be changed.' },
  { term: 'Bollinger Bands', definition: 'A technical indicator with a moving average and bands 2 standard deviations above/below. Measures volatility.' },
  { term: 'Bull Market', definition: 'A prolonged period of rising prices and optimism in the market.' },
  { term: 'Circulating Supply', definition: 'The number of coins currently available and circulating in the market.' },
  { term: 'Cold Wallet', definition: 'A hardware device that stores crypto keys offline, away from internet threats.' },
  { term: 'DCA', definition: 'Dollar Cost Averaging — investing a fixed amount at regular intervals regardless of price.' },
  { term: 'DeFi', definition: 'Decentralized Finance — financial services built on blockchain without traditional intermediaries.' },
  { term: 'DEX', definition: 'Decentralized Exchange — a platform for trading crypto without a central authority (e.g., Uniswap, SushiSwap).' },
  { term: 'Drawdown', definition: 'The peak-to-trough decline in an investment. Bitcoin has historically had 80%+ drawdowns.' },
  { term: 'DYOR', definition: 'Do Your Own Research — a reminder that you are responsible for your investment decisions.' },
  { term: 'EMA', definition: 'Exponential Moving Average — similar to SMA but gives more weight to recent prices.' },
  { term: 'Fear & Greed Index', definition: 'A 0-100 scale measuring market sentiment. 0 = extreme fear, 100 = extreme greed.' },
  { term: 'FOMO', definition: 'Fear Of Missing Out — the anxiety that drives buying at tops. Usually a bad signal.' },
  { term: 'FUD', definition: 'Fear, Uncertainty, Doubt — negative information spread to drive prices down.' },
  { term: 'Gas', definition: 'The fee paid to process transactions on blockchains like Ethereum. Varies with network congestion.' },
  { term: 'HODL', definition: 'Hold On for Dear Life — slang for holding crypto long-term regardless of price swings.' },
  { term: 'Impermanent Loss', definition: 'The loss incurred when providing liquidity to a DEX pool and the token prices diverge from your entry ratio.' },
  { term: 'Layer 2', definition: 'A secondary protocol built on top of a blockchain (like Arbitrum on Ethereum) for faster, cheaper transactions.' },
  { term: 'Liquidity', definition: 'How easily an asset can be bought or sold without significantly affecting its price.' },
  { term: 'MACD', definition: 'Moving Average Convergence Divergence — a momentum indicator showing the relationship between two moving averages.' },
  { term: 'Market Cap', definition: 'Price × Circulating Supply. The total market value of a cryptocurrency. THE metric for comparing coins.' },
  { term: 'MVRV', definition: 'Market Value to Realized Value — an on-chain metric comparing current price to the average price at which all coins last moved.' },
  { term: 'RSI', definition: 'Relative Strength Index — a 0-100 oscillator. Above 70 = overbought, below 30 = oversold.' },
  { term: 'Rug Pull', definition: 'A scam where developers abandon a project and run away with investor funds.' },
  { term: 'Seed Phrase', definition: 'A 12 or 24 word backup phrase for your wallet. Anyone with this can access your funds. Never share it.' },
  { term: 'Sharpe Ratio', definition: 'Return per unit of risk. Above 1.0 is decent, above 2.0 is excellent. Used to compare investments objectively.' },
  { term: 'SMA', definition: 'Simple Moving Average — the average price over N periods. Common: 50-day and 200-day SMAs.' },
  { term: 'Smart Contract', definition: 'A self-executing program on a blockchain. Powers DeFi, NFTs, DAOs. Bugs can lead to total loss of funds.' },
  { term: 'Stablecoin', definition: 'A crypto token pegged to a stable asset like USD. Examples: USDC, USDT, DAI.' },
  { term: 'TVL', definition: 'Total Value Locked — the total amount of crypto deposited in a DeFi protocol.' },
  { term: 'Volatility', definition: 'The degree of price fluctuation. Crypto is significantly more volatile than stocks or bonds.' },
  { term: 'Whale', definition: 'An individual or entity holding a large amount of a cryptocurrency, capable of moving the market.' },
];

function BasicsAccordion({ topic }: { topic: BasicsTopic }) {
  const [open, setOpen] = useState(false);

  return (
    <div className="border border-gray-700/50 rounded-lg overflow-hidden">
      <button
        onClick={() => setOpen(!open)}
        className="w-full flex items-center justify-between p-4 text-left hover:bg-gray-800/40 transition-colors"
      >
        <span className="text-sm font-medium text-white">{topic.title}</span>
        {open ? (
          <ChevronUp className="w-4 h-4 text-gray-500 flex-shrink-0" />
        ) : (
          <ChevronDown className="w-4 h-4 text-gray-500 flex-shrink-0" />
        )}
      </button>
      {open && (
        <div className="px-4 pb-4 space-y-2.5">
          {topic.content.map((para, i) => (
            <p key={i} className="text-sm text-gray-400 leading-relaxed">
              {para}
            </p>
          ))}
        </div>
      )}
    </div>
  );
}

export default function Learn() {
  const [tab, setTab] = useState<'basics' | 'glossary'>('basics');
  const [search, setSearch] = useState('');

  const filteredGlossary = useMemo(() => {
    if (!search.trim()) return GLOSSARY;
    const q = search.toLowerCase();
    return GLOSSARY.filter(
      (g) =>
        g.term.toLowerCase().includes(q) || g.definition.toLowerCase().includes(q),
    );
  }, [search]);

  return (
    <div className="space-y-5">
      {/* Header */}
      <div>
        <h1 className="text-2xl font-bold text-white flex items-center gap-2">
          <GraduationCap className="w-6 h-6 text-emerald-400" />
          Learn
        </h1>
        <p className="text-gray-400 text-sm mt-1">
          Crypto education — from absolute beginner to confident analyst
        </p>
      </div>

      {/* Tab switcher */}
      <div className="flex gap-1 bg-gray-800 border border-gray-700/50 rounded-lg p-0.5 w-fit">
        <button
          onClick={() => setTab('basics')}
          className={`px-4 py-2 rounded-md text-sm transition-colors ${
            tab === 'basics'
              ? 'bg-emerald-600 text-white'
              : 'text-gray-400 hover:text-white'
          }`}
        >
          <BookOpen className="w-4 h-4 inline mr-1.5" />
          Crypto Basics
        </button>
        <button
          onClick={() => setTab('glossary')}
          className={`px-4 py-2 rounded-md text-sm transition-colors ${
            tab === 'glossary'
              ? 'bg-emerald-600 text-white'
              : 'text-gray-400 hover:text-white'
          }`}
        >
          <Search className="w-4 h-4 inline mr-1.5" />
          Glossary
        </button>
      </div>

      {/* Basics Tab */}
      {tab === 'basics' && (
        <div className="space-y-2">
          {BASICS.map((topic) => (
            <BasicsAccordion key={topic.title} topic={topic} />
          ))}
        </div>
      )}

      {/* Glossary Tab */}
      {tab === 'glossary' && (
        <div className="space-y-4">
          <div className="relative">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-500" />
            <input
              type="text"
              placeholder="Search terms..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="w-full pl-10 pr-4 py-2.5 bg-gray-800 border border-gray-700/50 rounded-lg text-sm text-white placeholder-gray-500 focus:outline-none focus:border-emerald-500/50"
            />
          </div>

          <div className="space-y-1.5 max-h-[600px] overflow-y-auto pr-1">
            {filteredGlossary.map((g) => (
              <div
                key={g.term}
                className="bg-gray-800/40 border border-gray-700/30 rounded-lg p-3"
              >
                <span className="text-sm font-medium text-emerald-400">{g.term}</span>
                <p className="text-sm text-gray-400 mt-0.5">{g.definition}</p>
              </div>
            ))}
            {filteredGlossary.length === 0 && (
              <p className="text-gray-500 text-sm text-center py-8">
                No terms match &quot;{search}&quot;
              </p>
            )}
          </div>
        </div>
      )}
    </div>
  );
}
