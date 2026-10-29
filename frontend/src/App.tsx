import React, { useState, useEffect } from 'react';
import { Header } from './components/Header';
import type { TabType } from './components/Header';
import { TickerTape } from './components/TickerTape';
import { Home } from './pages/Home';
import { Dashboard } from './pages/Dashboard';
import { QuantLab } from './pages/QuantLab';
import { CapitalLab } from './pages/CapitalLab';
import { MarketPulse } from './pages/MarketPulse';
import { RagVault } from './pages/RagVault';
import { SystemArchitecture } from './pages/SystemArchitecture';
import { STOCK_DATABASE } from './data/mockData';
import type { Message, StockData } from './types';
import { analyzeWithBackend, AnalysisError, fetchStockData } from './services/api';
import './App.css';

export default function App() {
  const [activeTab, setActiveTab] = useState<TabType>('HOME');
  const [activeSymbol, setActiveSymbol] = useState('RELIANCE.NS');
  const [searchSymbol, setSearchSymbol] = useState('RELIANCE.NS');
  const [timeframe, setTimeframe] = useState<'1D' | '1W' | '1M' | '1Y'>('1W');
  const [modelMode, setModelMode] = useState<'FINE-TUNED' | 'CLOUD'>('FINE-TUNED');
  const [docCount, setDocCount] = useState(2340);

  const [messages, setMessages] = useState<Message[]>([]);
  /** True while an /api/analyze request is in-flight — prevents double-submission */
  const [isAnalyzing, setIsAnalyzing] = useState(false);
  /** True while live stock lookup is in-flight */
  const [isStockLoading, setIsStockLoading] = useState(false);
  const [stockError, setStockError] = useState<string | null>(null);

  const [currentStock, setCurrentStock] = useState<StockData>(() => ({
    symbol: 'RELIANCE.NS',
    name: 'Reliance Industries Limited',
    price: 1335.50,
    change: 12.40,
    changePct: 0.94,
    marketCap: '₹18.07 L Cr',
    currency: 'INR',
    exchange: 'NSE',
    peRatio: '25.6',
    forwardPe: '22.8',
    pegRatio: '1.8',
    evEbitda: '16.4',
    debtToEquity: '0.41',
    profitMargin: '12.8%',
    revenueGrowth: '+11.2%',
    buyPct: 82,
    holdPct: 15,
    sellPct: 3,
    points: {
      '1D': { labels: ['9:15', '11:00', '12:30', '14:00', '15:30'], values: [1325.0, 1330.2, 1328.5, 1332.0, 1335.5] },
      '1W': { labels: ['Mon', 'Tue', 'Wed', 'Thu', 'Fri'], values: [1310.0, 1318.5, 1324.0, 1328.0, 1335.5] },
      '1M': { labels: ['W1', 'W2', 'W3', 'W4'], values: [1290.0, 1305.0, 1320.0, 1335.5] },
      '1Y': { labels: ['Q1', 'Q2', 'Q3', 'Q4'], values: [1180.0, 1220.0, 1280.0, 1335.5] },
    },
    isSampleData: true,
  }));

  // Fetch live market data on initial mount
  useEffect(() => {
    loadStockData('RELIANCE.NS');
  }, []);

  /**
   * Converts a raw /api/analyze response into a Message ready for the chat list.
   * Only fields that are actually present in the response are mapped.
   */
  const buildAssistantMessage = (data: any, ticker: string): Message => {
    const verdict = data?.verdict;
    const toolRecords: any[] = data?.tool_records ?? [];
    const narrative: string = data?.narrative ?? '';

    // Build content from narrative (preferred) or fall back to quantitative_summary
    const content =
      narrative.trim() ||
      verdict?.quantitative_summary ||
      `Analysis complete for ${ticker}.`;

    // Tool names — only shown if the backend actually reported them
    const toolCalls: string[] =
      toolRecords.length > 0
        ? toolRecords.map((t: any) => t.tool_name).filter(Boolean)
        : [];

    // Verdict badge — only if stance and a numeric price range are present
    let verdictBadge: Message['verdict'] | undefined;
    if (
      verdict?.stance &&
      Array.isArray(verdict?.target_price_range) &&
      verdict.target_price_range.length === 2
    ) {
      const stance = String(verdict.stance).toUpperCase();
      if (stance === 'BULLISH' || stance === 'BEARISH' || stance === 'NEUTRAL') {
        verdictBadge = {
          stance: stance as 'BULLISH' | 'BEARISH' | 'NEUTRAL',
          targetRange: [
            Math.round(verdict.target_price_range[0]),
            Math.round(verdict.target_price_range[1]),
          ],
        };
      }
    }

    return {
      id: Date.now().toString(),
      role: 'assistant',
      content,
      toolCalls: toolCalls.length > 0 ? toolCalls : undefined,
      verdict: verdictBadge,
    };
  };

  /**
   * Core async handler used by both the Home CTA and the chat input.
   * Adds a loading bubble, sends the real request, replaces the bubble with
   * the real response, and clears loading state regardless of outcome.
   */
  const sendAnalysisMessage = async (query: string, ticker: string) => {
    if (isAnalyzing) return;
    setIsAnalyzing(true);

    // 1 — Show user message immediately
    const userMsg: Message = { id: Date.now().toString(), role: 'user', content: query };
    setMessages((prev) => [...prev, userMsg]);

    // 2 — Show loading bubble with a stable ID we can replace
    const loadingId = `loading-${Date.now()}`;
    const loadingMsg: Message = {
      id: loadingId,
      role: 'assistant',
      content: '',
      isLoading: true,
    };
    setMessages((prev) => [...prev, loadingMsg]);

    try {
      // 3 — Real backend call
      const data = await analyzeWithBackend(query, ticker);

      // 4 — Replace loading bubble with the real response
      const assistantMsg = buildAssistantMessage(data, ticker);
      setMessages((prev) => prev.map((m) => (m.id === loadingId ? assistantMsg : m)));
    } catch (err) {
      // 5 — Honest error message; never fabricate financial data
      let errorText: string;
      if (err instanceof AnalysisError) {
        errorText =
          err.status === 503
            ? 'The analysis engine is temporarily unavailable. Please try again shortly.'
            : `Analysis failed: ${err.detail}`;
      } else if (err instanceof Error && err.name === 'TimeoutError') {
        errorText = 'Request timed out. The backend may be starting up — please try again.';
      } else {
        errorText = 'Could not reach the backend. Check your connection and try again.';
      }

      const errMsg: Message = {
        id: loadingId,
        role: 'assistant',
        content: errorText,
      };
      setMessages((prev) => prev.map((m) => (m.id === loadingId ? errMsg : m)));
    } finally {
      setIsAnalyzing(false);
    }
  };

  const loadStockData = async (symbol: string) => {
    const sym = symbol.trim().toUpperCase();
    if (!sym || isStockLoading) return;

    setIsStockLoading(true);
    setStockError(null);

    try {
      const liveData = await fetchStockData(sym);
      setCurrentStock(liveData);
      setActiveSymbol(sym);
      setSearchSymbol(sym);
    } catch (err) {
      const message = err instanceof Error ? err.message : `Failed to load stock data for ${sym}`;
      if (STOCK_DATABASE[sym]) {
        setCurrentStock({
          ...STOCK_DATABASE[sym],
          isSampleData: true,
        });
        setActiveSymbol(sym);
        setSearchSymbol(sym);
        setStockError(`Live provider unavailable (${message}). Displaying sample historical data.`);
      } else {
        // Unknown ticker: NEVER assign an invented price!
        setStockError(message);
      }
    } finally {
      setIsStockLoading(false);
    }
  };

  const handleStartAnalysisFromHome = (query: string, detectedTicker: string) => {
    loadStockData(detectedTicker);
    setActiveTab('TERMINAL');
    // Defer one tick so the Dashboard has mounted before we mutate messages
    setTimeout(() => sendAnalysisMessage(query, detectedTicker), 0);
  };

  const handleSendMessage = (text: string) => {
    sendAnalysisMessage(text, activeSymbol);
  };

  const handleSearchSubmit = (e?: React.FormEvent) => {
    if (e) e.preventDefault();
    if (searchSymbol.trim()) {
      loadStockData(searchSymbol.trim());
    }
  };

  const handleTabChange = (tab: TabType) => {
    setActiveTab(tab);
  };

  return (
    <div style={{ minHeight: '100vh', backgroundColor: '#FFFFFF', display: 'flex', flexDirection: 'column' }}>
      <div style={{ padding: '16px 24px 0' }}>
        <Header
          activeTab={activeTab}
          onTabChange={handleTabChange}
          activeSymbol={activeSymbol}
          docCount={docCount}
        />
      </div>

      {/* Ticker tape — shown on all pages */}
      <TickerTape />

      {/* Tab pages — each wrapped in page-enter for fade transition */}
      <div
        key={activeTab}
        className="page-enter"
        style={{
          padding: activeTab === 'HOME' ? '0' : '0 24px 24px',
          flex: 1,
          display: 'flex',
          flexDirection: 'column',
        }}
      >
        {activeTab === 'HOME' && (
          <Home onStartAnalysis={handleStartAnalysisFromHome} onNavigate={handleTabChange} />
        )}

        {activeTab === 'TERMINAL' && (
          <Dashboard
            currentStock={currentStock}
            activeSymbol={activeSymbol}
            searchSymbol={searchSymbol}
            onSearchChange={(val) => setSearchSymbol(val)}
            onSearchSubmit={handleSearchSubmit}
            messages={messages}
            onSendMessage={handleSendMessage}
            isAnalyzing={isAnalyzing}
            isStockLoading={isStockLoading}
            stockError={stockError}
            timeframe={timeframe}
            onTimeframeChange={(tf) => setTimeframe(tf)}
            modelMode={modelMode}
            onModelModeChange={(mode) => setModelMode(mode)}
          />
        )}

        {activeTab === 'QUANT_LAB' && (
          <QuantLab currentStock={currentStock} />
        )}

        {activeTab === 'CAPITAL_LAB' && (
          <CapitalLab />
        )}

        {activeTab === 'NEWS' && (
          <MarketPulse currentStock={currentStock} />
        )}

        {activeTab === 'RAG_VAULT' && (
          <RagVault onDocCountChange={(newCount) => setDocCount(newCount)} />
        )}

        {activeTab === 'SYS_ARCH' && (
          <SystemArchitecture />
        )}
      </div>
    </div>
  );
}
