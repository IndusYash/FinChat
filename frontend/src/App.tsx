import React, { useState, useRef, useEffect } from 'react';
import { 
  Search, 
  Send, 
  TrendingUp, 
  TrendingDown, 
  BookOpen, 
  Layers,
  Copy,
  Check
} from 'lucide-react';
import { 
  ResponsiveContainer, 
  LineChart, 
  Line, 
  XAxis, 
  YAxis, 
  Tooltip, 
  CartesianGrid 
} from 'recharts';
import './App.css';

// ── TYPES ────────────────────────────────────────────────────────
interface Message {
  id: string;
  role: 'user' | 'bot';
  content: string;
  sources?: string[];
  provider_used?: string;
  fallback_active?: boolean;
  fallback_reason?: string;
  resolved_ticker?: string;
}

interface StockData {
  symbol: string;
  name: string;
  price: number;
  change: number;
  changePercent: number;
  marketCap: string;
  peRatio: number;
  dividendYield: string;
  volume: string;
  fiftyTwoWeekRange: string;
  analystConsensus: {
    buy: number;
    hold: number;
    sell: number;
  };
  chartData: { date: string; price: number }[];
  news: {
    id: string;
    headline: string;
    summary: string;
    source: string;
    sentiment: 'positive' | 'neutral' | 'negative';
    time: string;
  }[];
}

// ── CONFIG ───────────────────────────────────────────────────────
const BACKEND_URL = import.meta.env.VITE_BACKEND_URL || (
  window.location.hostname === 'localhost' || window.location.hostname === '127.0.0.1'
    ? 'http://localhost:8000'
    : 'https://indusyash-coordinator-rag.hf.space'
);

// ── MOCK DATA FOR DEMO ──────────────────────────────────────────
const MOCK_STOCKS: Record<string, StockData> = {
  AAPL: {
    symbol: 'AAPL',
    name: 'Apple Inc.',
    price: 187.50,
    change: 2.45,
    changePercent: 1.32,
    marketCap: '2.94T',
    peRatio: 28.4,
    dividendYield: '0.52%',
    volume: '52.4M',
    fiftyTwoWeekRange: '$164.08 - $199.62',
    analystConsensus: { buy: 75, hold: 20, sell: 5 },
    chartData: [
      { date: 'Mon', price: 182.10 },
      { date: 'Tue', price: 183.45 },
      { date: 'Wed', price: 182.90 },
      { date: 'Thu', price: 185.12 },
      { date: 'Fri', price: 187.50 },
    ],
    news: [
      {
        id: '1',
        headline: 'Apple Declares Quarterly Dividend Ahead of Earnings Call',
        summary: 'Apple announced a regular dividend payout, signaling stable balance sheet health and consistent shareholder distributions.',
        source: 'Finnhub News',
        sentiment: 'positive',
        time: '2h ago'
      },
      {
        id: '2',
        headline: 'Regulators Face Growing Pressure over App Store Policies',
        summary: 'EU antitrust commissioners are tightening scrutiny on tech platforms, which could create mild headwind friction for services segment margins.',
        source: 'SEC Filings Feed',
        sentiment: 'negative',
        time: '5h ago'
      },
      {
        id: '3',
        headline: 'Berkshire Hathaway Maintains Major Ownership Stake in Apple',
        summary: 'Warren Buffett reaffirmed Apple as a cornerstone holding, citing extreme consumer loyalty and powerful pricing power in the latest letter.',
        source: 'Berkshire Archives',
        sentiment: 'positive',
        time: '1d ago'
      }
    ]
  },
  TSLA: {
    symbol: 'TSLA',
    name: 'Tesla Inc.',
    price: 174.20,
    change: -4.80,
    changePercent: -2.68,
    marketCap: '554B',
    peRatio: 41.2,
    dividendYield: 'N/A (0.0%)',
    volume: '88.1M',
    fiftyTwoWeekRange: '$138.80 - $299.29',
    analystConsensus: { buy: 40, hold: 45, sell: 15 },
    chartData: [
      { date: 'Mon', price: 184.50 },
      { date: 'Tue', price: 180.20 },
      { date: 'Wed', price: 179.10 },
      { date: 'Thu', price: 177.00 },
      { date: 'Fri', price: 174.20 },
    ],
    news: [
      {
        id: '1',
        headline: 'Tesla Deliveries Fall Short of Estimates on Production Adjustments',
        summary: 'Tesla quarterly delivery figures missed consensus forecasts slightly, citing plant shutdowns for model refreshes and logistics constraints.',
        source: 'Market Stack Feed',
        sentiment: 'negative',
        time: '30m ago'
      },
      {
        id: '2',
        headline: 'Automaker Unveils Next-Generation Model Production Roadmap',
        summary: 'Tesla engineers confirmed plans to implement advanced gigacasting processes, potentially slashing margins of assembly costs by 30%.',
        source: 'Finnhub News',
        sentiment: 'positive',
        time: '6h ago'
      }
    ]
  },
  MSFT: {
    symbol: 'MSFT',
    name: 'Microsoft Corp.',
    price: 421.90,
    change: 5.12,
    changePercent: 1.23,
    marketCap: '3.13T',
    peRatio: 36.8,
    dividendYield: '0.71%',
    volume: '22.8M',
    fiftyTwoWeekRange: '$315.18 - $430.82',
    analystConsensus: { buy: 85, hold: 12, sell: 3 },
    chartData: [
      { date: 'Mon', price: 412.50 },
      { date: 'Tue', price: 415.80 },
      { date: 'Wed', price: 413.20 },
      { date: 'Thu', price: 418.00 },
      { date: 'Fri', price: 421.90 },
    ],
    news: [
      {
        id: '1',
        headline: 'Cloud Revenue Drives Record Earnings Surge at Microsoft',
        summary: 'Azure growth accelerated to 31% year-over-year, beating conservative guidance models and showcasing dominant corporate enterprise cloud expansion.',
        source: 'Alpha Vantage',
        sentiment: 'positive',
        time: '1h ago'
      },
      {
        id: '2',
        headline: 'Microsoft Capital Expenditure Guidance Raised for Infrastructure',
        summary: 'Capex targets were adjusted upwards to fund next-generation datacentres, which analysts note may temporarily restrict free cash flow yields.',
        source: 'Finnhub News',
        sentiment: 'neutral',
        time: '4h ago'
      }
    ]
  }
};

export default function App() {
  const [ticker, setTicker] = useState<string>('AAPL');
  const [searchInput, setSearchInput] = useState<string>('');
  const [stock, setStock] = useState<StockData>(MOCK_STOCKS.AAPL);
  const [messages, setMessages] = useState<Message[]>([
    {
      id: 'welcome',
      role: 'bot',
      content: 'Hello. I am FinChat. I can retrieve and analyze any global stock ticker (e.g., AAPL, TSLA, MSFT, NVDA, AMZN). Search for a symbol above to load its real-time metrics, or ask me any question.',
      provider_used: 'system'
    }
  ]);
  const [chatInput, setChatInput] = useState<string>('');
  const [isTyping, setIsTyping] = useState<boolean>(false);
  const [isSearching, setIsSearching] = useState<boolean>(false);
  const [backendStatus, setBackendStatus] = useState<'ONLINE' | 'OFFLINE'>('OFFLINE');
  const [timeframe, setTimeframe] = useState<'1D' | '1W' | '1M' | '1Y'>('1W');
  const [provider, setProvider] = useState<'fine-tuned' | 'cloud'>('fine-tuned');
  const [showWaitPrompt, setShowWaitPrompt] = useState<boolean>(false);
  const [syncedTicker, setSyncedTicker] = useState<string | null>(null);
  const [copiedId, setCopiedId] = useState<string | null>(null);

  const historyEndRef = useRef<HTMLDivElement>(null);
  const abortControllerRef = useRef<AbortController | null>(null);

  // Auto-scroll to bottom of chat
  useEffect(() => {
    historyEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages, isTyping]);

  const [typingMsg, setTypingMsg] = useState<string>("FinChat is executing CPU GGUF inference. This may take 60-90 seconds...");

  // Rotate typing description messages for GGUF CPU inference
  useEffect(() => {
    if (isTyping && provider === 'fine-tuned') {
      setTypingMsg("FinChat is executing CPU GGUF inference. This may take 60-90 seconds...");
      const interval = setInterval(() => {
        setTypingMsg(prev => 
          prev.includes("GGUF") 
            ? "Responses are limited to 150-200 tokens due to compute limitations..."
            : "FinChat is executing CPU GGUF inference. This may take 60-90 seconds..."
        );
      }, 5000);
      return () => clearInterval(interval);
    }
  }, [isTyping, provider]);

  // Helper to fetch live stock metrics from our FastAPI server
  const fetchStockData = async (symbol: string) => {
    try {
      const res = await fetch(`${BACKEND_URL}/api/stock/${symbol}`);
      if (res.ok) {
        const data = await res.json();
        setStock(data);
        setTicker(symbol);
        return data;
      }
    } catch (err) {
      console.error("Error fetching live stock metrics:", err);
    }
    return null;
  };

  // Ping backend to check if FastAPI is running locally
  useEffect(() => {
    const checkBackend = async () => {
      try {
        const res = await fetch(`${BACKEND_URL}/`);
        if (res.ok) {
          setBackendStatus('ONLINE');
          // Load live Apple data from backend immediately
          await fetchStockData('AAPL');
        } else {
          setBackendStatus('OFFLINE');
        }
      } catch (err) {
        setBackendStatus('OFFLINE');
      }
    };
    checkBackend();
  }, []);

  const handleSearch = async (e: React.FormEvent) => {
    e.preventDefault();
    const cleanTicker = searchInput.toUpperCase().trim();
    if (!cleanTicker) return;

    if (backendStatus === 'ONLINE') {
      setIsSearching(true);
      const data = await fetchStockData(cleanTicker);
      setIsSearching(false);
      
      if (data) {
        setSearchInput('');
      } else {
        alert(`Failed to fetch data for "${cleanTicker}" from API.`);
      }
    } else {
      // Fallback mode
      if (MOCK_STOCKS[cleanTicker]) {
        setTicker(cleanTicker);
        setStock(MOCK_STOCKS[cleanTicker]);
        setSearchInput('');
      } else {
        alert(`Ticker "${cleanTicker}" not found in mock data. (API server is offline). Try AAPL, TSLA, or MSFT.`);
      }
    }
  };

  // Helper to trigger fallback to cloud from the UI
  const triggerManualFallback = () => {
    if (abortControllerRef.current) {
      abortControllerRef.current.abort();
    }
    setShowWaitPrompt(false);
    
    // Inject a message indicating manual switch
    setMessages(prev => [...prev, {
      id: `bot-fallback-info-${Date.now()}`,
      role: 'bot',
      content: "⚠️ Switching to Cloud API because GGUF inference was taking too long...",
      provider_used: 'system'
    }]);
    
    // Find the last user message in history
    const lastUserMessage = [...messages].reverse().find(m => m.role === 'user');
    if (lastUserMessage) {
      setIsTyping(true);
      sendChatMessage(lastUserMessage.content, 'cloud');
    } else {
      setIsTyping(false);
    }
  };

  const sendChatMessage = async (text: string, activeProvider: 'fine-tuned' | 'cloud') => {
    let timeoutId: any;
    
    if (activeProvider === 'fine-tuned') {
      setShowWaitPrompt(false);
      // Set a timer to show wait prompt after 60s
      timeoutId = setTimeout(() => {
        setShowWaitPrompt(true);
      }, 60000);

      const controller = new AbortController();
      abortControllerRef.current = controller;
    }

    try {
      const fetchOptions: RequestInit = {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ message: text, ticker: ticker, provider: activeProvider })
      };

      if (activeProvider === 'fine-tuned' && abortControllerRef.current) {
        fetchOptions.signal = abortControllerRef.current.signal;
      }

      const response = await fetch(`${BACKEND_URL}/chat`, fetchOptions);

      if (response.ok) {
        const data = await response.json();
        setMessages(prev => [...prev, {
          id: `bot-${Date.now()}`,
          role: 'bot',
          content: data.answer,
          sources: data.sources,
          provider_used: data.provider_used,
          fallback_active: data.fallback_active,
          fallback_reason: data.fallback_reason,
          resolved_ticker: data.resolved_ticker
        }]);

        if (data.resolved_ticker) {
          const resolvedUpper = data.resolved_ticker.toUpperCase();
          fetchStockData(resolvedUpper);
          setSyncedTicker(resolvedUpper);
          setTimeout(() => setSyncedTicker(null), 3000);
        }
      } else {
        throw new Error('API failed');
      }
    } catch (err: any) {
      if (err.name === 'AbortError') {
        console.log("Request aborted by user switching providers.");
        return; // Don't add error bubble since we manually triggered fallback
      }
      setMessages(prev => [...prev, {
        id: `bot-err-${Date.now()}`,
        role: 'bot',
        content: "I encountered an error querying the FastAPI server. Please check that it is running.",
        provider_used: 'error'
      }]);
    } finally {
      if (timeoutId) {
        clearTimeout(timeoutId);
      }
      setShowWaitPrompt(false);
      setIsTyping(false);
    }
  };

  const handleSendMessage = async (e: React.FormEvent) => {
    e.preventDefault();
    const text = chatInput.trim();
    if (!text) return;

    // Add user message
    const userMsg: Message = {
      id: `user-${Date.now()}`,
      role: 'user',
      content: text
    };
    setMessages(prev => [...prev, userMsg]);
    setChatInput('');
    setIsTyping(true);

    if (backendStatus === 'ONLINE') {
      await sendChatMessage(text, provider);
    } else {
      // Simulate answer after 1.5s
      setTimeout(() => {
        let reply = "";
        let sources: string[] = [];

        // Simple pattern matching for mockup demo
        const lower = text.toLowerCase();
        if (lower.includes('dividend') || lower.includes('payout')) {
          reply = `${stock.name} pays a dividend of ${stock.dividendYield}. Historically, dividend payouts have been supported by steady operating cash flow margins, as outlined in the Berkshire reports and SEC filings.`;
          sources = [`${stock.symbol.toLowerCase()}.pdf`, 'mutual funds.pdf'];
        } else if (lower.includes('risk') || lower.includes('double') || lower.includes('savings')) {
          reply = `Putting all your capital into a single asset class like ${stock.name} violates the core principle of diversification. Wall Street consensus recommends allocating among index funds, fixed income, and equities to mitigate volatility risks.`;
          sources = ['sebi.pdf', 'sec.pdf'];
        } else if (lower.includes('news') || lower.includes('headline')) {
          reply = `The latest news indicates: "${stock.news[0].headline}". This event has been marked as ${stock.news[0].sentiment} by market analysis models.`;
          sources = ['finnhub.pdf'];
        } else {
          reply = `Regarding ${stock.name} (${stock.symbol}), current trading stands at $${stock.price}. From an asset valuation standpoint, it shows a P/E ratio of ${stock.peRatio} and an analyst consensus of ${stock.analystConsensus.buy}% Buy. Is there a specific document metric you would like me to retrieve?`;
          sources = ['embeddings.pdf'];
        }

        setMessages(prev => [...prev, {
          id: `bot-${Date.now()}`,
          role: 'bot',
          content: reply,
          sources: sources,
          provider_used: 'mock'
        }]);
        setIsTyping(false);
      }, 1200);
    }
  };

  const isUp = stock.change >= 0;
  const isIndian = stock.symbol.toUpperCase().endsWith('.NS') || stock.symbol.toUpperCase().endsWith('.BO') || stock.symbol.toUpperCase().endsWith('.XNSE') || stock.symbol.toUpperCase().endsWith('.XBOM');
  const currencySymbol = isIndian ? '₹' : '$';

  return (
    <div className="app-container">
      {/* ── HEADER ──────────────────────────────────────────────── */}
      <header className="app-header">
        <div className="header-logo">
          <Layers size={18} strokeWidth={2.5} />
          <span className="logo-text">FINCHAT / RAG HUB</span>
        </div>
        <div className="header-status">
          <div className="status-badge">
            <span>ACTIVE FOCUS: {ticker}</span>
          </div>
          <div className="status-badge">
            <span className="status-indicator"></span>
            <span>RAG DATABASE: 2,340 DOCS</span>
          </div>
          <div className="status-badge">
            <span className="status-indicator" style={{ backgroundColor: backendStatus === 'ONLINE' ? 'var(--accent-green)' : 'var(--accent-red)' }}></span>
            <span>API SERVER: {backendStatus}</span>
          </div>
        </div>
      </header>

      {/* ── WORKSPACE ────────────────────────────────────────────── */}
      <main className="workspace">
        
        {/* ── LEFT PANEL: DASHBOARD ──────────────────────────────── */}
        <section className="dashboard-panel">
          
          {/* Ticker Search */}
          <div className="search-section">
            <form onSubmit={handleSearch} className="search-box">
              <input 
                type="text" 
                className="search-input" 
                placeholder="Search symbol (AAPL, TSLA, MSFT)..." 
                value={searchInput}
                onChange={e => setSearchInput(e.target.value)}
              />
              <button type="submit" className="search-button" disabled={isSearching}>
                <Search size={14} />
                <span>{isSearching ? 'LOADING...' : 'LOAD'}</span>
              </button>
            </form>
          </div>

          {/* Sync Banner — flashes when chat auto-detects a new company */}
          {syncedTicker && (
            <div className="sync-banner">
              ⚡ Dashboard synced to {syncedTicker}
            </div>
          )}

          {/* Real-time Ticker stats */}
          <div className="overview-grid">
            <div className="overview-card">
              <span className="card-label">SYMBOL</span>
              <span className="card-value">{stock.symbol}</span>
            </div>
            <div className="overview-card">
              <span className="card-label">LAST PRICE</span>
              <span className="card-value">{currencySymbol}{(stock.price ?? 0).toFixed(2)}</span>
            </div>
            <div className="overview-card">
              <span className="card-label">CHANGE</span>
              <span className={`card-change ${isUp ? 'up' : 'down'}`}>
                {isUp ? <TrendingUp size={14} /> : <TrendingDown size={14} />}
                <span>{isUp ? '+' : ''}{(stock.change ?? 0).toFixed(2)}</span>
              </span>
            </div>
            <div className="overview-card">
              <span className="card-label">CHANGE %</span>
              <span className={`card-change ${isUp ? 'up' : 'down'}`}>
                <span>{isUp ? '+' : ''}{(stock.changePercent ?? 0).toFixed(2)}%</span>
              </span>
            </div>
          </div>

          {/* Interactive Chart */}
          <div className="chart-panel">
            <div className="chart-header">
              <div className="chart-title">PRICE PERFORMANCE HISTORICAL</div>
              <div className="chart-timeframes">
                {(['1D', '1W', '1M', '1Y'] as const).map(tf => (
                  <button 
                    key={tf} 
                    className={`timeframe-btn ${timeframe === tf ? 'active' : ''}`}
                    onClick={() => setTimeframe(tf)}
                  >
                    {tf}
                  </button>
                ))}
              </div>
            </div>
            <div style={{ width: '100%', height: 220 }}>
              <ResponsiveContainer>
                <LineChart 
                  data={stock.chartData}
                  margin={{ top: 5, right: 10, left: -20, bottom: 5 }}
                >
                  <CartesianGrid strokeDasharray="3 3" stroke="#f0f0f0" />
                  <XAxis 
                    dataKey="date" 
                    tick={{ fontFamily: 'Space Mono', fontSize: 10, fill: '#6b7280' }} 
                    stroke="#e5e7eb"
                  />
                  <YAxis 
                    tick={{ fontFamily: 'Space Mono', fontSize: 10, fill: '#6b7280' }}
                    stroke="#e5e7eb"
                    domain={['dataMin - 5', 'dataMax + 5']}
                  />
                  <Tooltip 
                    contentStyle={{ 
                      backgroundColor: '#ffffff', 
                      border: '1px solid #000000', 
                      borderRadius: 0,
                      fontFamily: 'Space Mono',
                      fontSize: 12
                    }}
                  />
                  <Line 
                    type="monotone" 
                    dataKey="price" 
                    stroke={isUp ? '#16a34a' : '#dc2626'}
                    strokeWidth={2}
                    dot={{ stroke: isUp ? '#16a34a' : '#dc2626', strokeWidth: 2, r: 3, fill: '#ffffff' }}
                    activeDot={{ r: 5, fill: isUp ? '#16a34a' : '#dc2626' }}
                  />
                </LineChart>
              </ResponsiveContainer>
            </div>
          </div>

          {/* Subpanels: Fundamentals & Analyst trends */}
          <div className="subpanels-grid">
            
            {/* Fundamental metrics */}
            <div className="subpanel">
              <div className="subpanel-header">COMPANY KEY STATS</div>
              <div className="fundamental-list">
                <div className="fundamental-row">
                  <span className="fundamental-label">Company Name</span>
                  <span className="fundamental-value">{stock.name}</span>
                </div>
                <div className="fundamental-row">
                  <span className="fundamental-label">Market Capitalization</span>
                  <span className="fundamental-value">{stock.marketCap}</span>
                </div>
                <div className="fundamental-row">
                  <span className="fundamental-label">P/E Ratio</span>
                  <span className="fundamental-value">{stock.peRatio}</span>
                </div>
                <div className="fundamental-row">
                  <span className="fundamental-label">Dividend Yield</span>
                  <span className="fundamental-value">{stock.dividendYield}</span>
                </div>
                <div className="fundamental-row">
                  <span className="fundamental-label">Volume</span>
                  <span className="fundamental-value">{stock.volume}</span>
                </div>
                <div className="fundamental-row">
                  <span className="fundamental-label">52 Week Range</span>
                  <span className="fundamental-value" style={{ fontSize: '0.75rem' }}>{stock.fiftyTwoWeekRange}</span>
                </div>
              </div>
            </div>

            {/* Analyst recommendations */}
            <div className="subpanel">
              <div className="subpanel-header">WALL STREET consensus</div>
              <div className="consensus-container">
                <div className="consensus-stats">
                  <div className="consensus-bar-label">
                    <span>BUY</span>
                    <span>{stock.analystConsensus.buy}%</span>
                  </div>
                  <div className="consensus-bar-wrapper">
                    <div className="consensus-bar-fill" style={{ width: `${stock.analystConsensus.buy}%`, backgroundColor: 'var(--accent-green)' }}></div>
                  </div>
                </div>
                <div className="consensus-stats">
                  <div className="consensus-bar-label">
                    <span>HOLD</span>
                    <span>{stock.analystConsensus.hold}%</span>
                  </div>
                  <div className="consensus-bar-wrapper">
                    <div className="consensus-bar-fill" style={{ width: `${stock.analystConsensus.hold}%`, backgroundColor: 'var(--text-muted)' }}></div>
                  </div>
                </div>
                <div className="consensus-stats">
                  <div className="consensus-bar-label">
                    <span>SELL</span>
                    <span>{stock.analystConsensus.sell}%</span>
                  </div>
                  <div className="consensus-bar-wrapper">
                    <div className="consensus-bar-fill" style={{ width: `${stock.analystConsensus.sell}%`, backgroundColor: 'var(--accent-red)' }}></div>
                  </div>
                </div>
              </div>
            </div>

          </div>

          {/* Market / Company News */}
          <div className="news-panel">
            <div className="subpanel-header" style={{ marginBottom: 20 }}>LIVE NEWS & DOCUMENT EVENTS</div>
            <div className="news-list">
              {stock.news.map(n => (
                <div key={n.id} className="news-card">
                  <div className="news-meta">
                    <span>{n.source}</span>
                    <span className={`news-sentiment ${n.sentiment}`}>
                      {n.sentiment}
                    </span>
                  </div>
                  <h3 className="news-headline">{n.headline}</h3>
                  <p className="news-summary">{n.summary}</p>
                </div>
              ))}
            </div>
          </div>

        </section>

        {/* ── RIGHT PANEL: CHATBOT ──────────────────────────────── */}
        <section className="chat-panel">
          <div className="chat-panel-header">
            <span className="chat-header-title">ASK FINCHAT</span>
            <div className="provider-selector">
              <button 
                type="button"
                className={`provider-tab ${provider === 'fine-tuned' ? 'active' : ''}`}
                onClick={() => {
                  setProvider('fine-tuned');
                  setShowWaitPrompt(false);
                }}
                title="Use fine-tuned Llama 3.2 3B model hosted on Hugging Face Docker Space"
              >
                <span>FINE-TUNED (CPU)</span>
              </button>
              <button 
                type="button"
                className={`provider-tab ${provider === 'cloud' ? 'active' : ''}`}
                onClick={() => {
                  setProvider('cloud');
                  setShowWaitPrompt(false);
                }}
                title="Use cloud model via Groq / OpenRouter API"
              >
                <span>CLOUD API</span>
              </button>
            </div>
          </div>

          <div className="chat-history">
            {messages.map(m => (
              <div key={m.id} className={`chat-message-row ${m.role}`}>
                <div className="message-meta">
                  {m.role === 'user' ? 'USER QUERY' : 'FINCHAT'}
                </div>
                <div className="message-bubble">
                  {m.role === 'bot' && m.provider_used && (
                    <span className="provider-badge">
                      {m.provider_used === 'fine-tuned' && '🤖 Fine-Tuned (HF Space)'}
                      {m.provider_used === 'groq' && '⚡ Cloud (Groq)'}
                      {m.provider_used === 'openrouter' && '🌐 Cloud (OpenRouter)'}
                      {m.provider_used === 'mock' && '⚙️ Offline Mock'}
                      {m.provider_used === 'system' && '🛠️ System info'}
                      {m.provider_used === 'error' && '❌ Error Log'}
                    </span>
                  )}
                  <div>{m.content}</div>

                  {m.role === 'bot' && (
                    <button
                      className="copy-btn"
                      onClick={() => {
                        navigator.clipboard.writeText(m.content);
                        setCopiedId(m.id);
                        setTimeout(() => setCopiedId(null), 2000);
                      }}
                      title="Copy response"
                    >
                      {copiedId === m.id ? <Check size={11} /> : <Copy size={11} />}
                      <span>{copiedId === m.id ? 'Copied' : 'Copy'}</span>
                    </button>
                  )}

                  {m.fallback_active && (
                    <div className="fallback-warning">
                      <strong>⚠️ Auto-Shifted to Cloud API</strong>
                      <span>Reason: {m.fallback_reason || "Connection Timeout"}</span>
                    </div>
                  )}
                  
                  {m.sources && m.sources.length > 0 && (
                    <div className="message-sources">
                      <span>CITED REFERENCE DOCUMENTS:</span>
                      <ul style={{ listStyle: 'none', marginTop: 4 }}>
                        {m.sources.map((src, i) => (
                          <li key={i} style={{ display: 'flex', alignItems: 'center', gap: 4 }}>
                            <BookOpen size={10} />
                            <span>{src}</span>
                          </li>
                        ))}
                      </ul>
                    </div>
                  )}
                </div>
              </div>
            ))}

            {isTyping && (
              <div className="typing-container">
                <div className="typing-bubble">
                  <span className="typing-dot pulsing"></span>
                  <span className="typing-dot pulsing" style={{ animationDelay: '0.2s' }}></span>
                  <span className="typing-dot pulsing" style={{ animationDelay: '0.4s' }}></span>
                </div>
                {provider === 'fine-tuned' && (
                  <span className="typing-description">
                    {typingMsg}
                  </span>
                )}
              </div>
            )}

            {showWaitPrompt && isTyping && (
              <div className="chat-message-row bot" style={{ marginTop: '10px' }}>
                <div className="message-meta">SYSTEM NOTIFICATION</div>
                <div className="message-bubble wait-bubble">
                  <p>⏳ Inference is running on your Hugging Face Space (no error has occurred).</p>
                  <p style={{ marginTop: '4px', fontSize: '0.75rem', color: 'var(--text-muted)' }}>
                    Because CPU-based Spaces run slowly, you can choose to continue waiting or switch immediately to the cloud model.
                  </p>
                  <div className="fallback-prompt-actions">
                    <button type="button" onClick={triggerManualFallback} className="fallback-now-btn">
                      Fallback to Cloud Model Now
                    </button>
                  </div>
                </div>
              </div>
            )}
            
            <div ref={historyEndRef} />
          </div>

          <form onSubmit={handleSendMessage} className="chat-input-area">
            <div className="chat-input-box">
              <input 
                type="text" 
                className="chat-text-input" 
                placeholder="Ask FinChat a question..." 
                value={chatInput}
                onChange={e => setChatInput(e.target.value)}
              />
              <button type="submit" className="chat-send-btn">
                <Send size={14} />
                <span>SEND</span>
              </button>
            </div>
          </form>
        </section>

      </main>
    </div>
  );
}
