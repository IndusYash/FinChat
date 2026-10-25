import React, { useState } from 'react';
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
import './App.css';

export default function App() {
  const [activeTab, setActiveTab] = useState<TabType>('HOME');
  const [activeSymbol, setActiveSymbol] = useState('AAPL');
  const [searchSymbol, setSearchSymbol] = useState('AAPL');
  const [timeframe, setTimeframe] = useState<'1D' | '1W' | '1M' | '1Y'>('1W');
  const [modelMode, setModelMode] = useState<'FINE-TUNED' | 'CLOUD'>('FINE-TUNED');
  const [docCount, setDocCount] = useState(2340);

  const [messages, setMessages] = useState<Message[]>([]);

  const currentStock: StockData = STOCK_DATABASE[activeSymbol] || {
    symbol: activeSymbol,
    name: `${activeSymbol} Corp.`,
    price: 150.0,
    change: 1.8,
    changePct: 1.21,
    marketCap: '1.20T',
    peRatio: '24.5',
    forwardPe: '21.0',
    pegRatio: '1.8',
    evEbitda: '18.2',
    debtToEquity: '0.85',
    profitMargin: '18.5%',
    revenueGrowth: '+7.4%',
    buyPct: 70,
    holdPct: 25,
    sellPct: 5,
    points: {
      '1D': { labels: ['9:30', '11:00', '12:30', '14:00', '16:00'], values: [148, 149, 148.5, 149.5, 150] },
      '1W': { labels: ['Mon', 'Tue', 'Wed', 'Thu', 'Fri'], values: [145, 146.5, 147, 148.5, 150] },
      '1M': { labels: ['W1', 'W2', 'W3', 'W4'], values: [140, 143, 146, 150] },
      '1Y': { labels: ['Q1', 'Q2', 'Q3', 'Q4'], values: [130, 138, 144, 150] },
    },
  };

  const handleStartAnalysisFromHome = (query: string, detectedTicker: string) => {
    setActiveSymbol(detectedTicker);
    setSearchSymbol(detectedTicker);

    const userMsg: Message = { id: Date.now().toString(), role: 'user', content: query };
    setMessages((prev: Message[]) => [...prev, userMsg]);
    setActiveTab('TERMINAL');

    setTimeout(() => {
      const stock = STOCK_DATABASE[detectedTicker] || currentStock;
      const fairVal = stock.price * 1.08;
      const assistantMsg: Message = {
        id: (Date.now() + 1).toString(),
        role: 'assistant',
        toolCalls: ['get_live_quote', 'get_fundamentals', 'run_dcf_valuation', 'search_rag_10k'],
        verdict: {
          stance: 'BULLISH',
          targetRange: [Math.round(stock.price * 0.95), Math.round(fairVal * 1.05)],
        },
        content:
          `Audit complete for ${detectedTicker} (${stock.name}):\n\n` +
          `• Valuation Multiples: Trades at $${stock.price.toFixed(2)} with a trailing P/E of ${stock.peRatio} and EV/EBITDA of ${stock.evEbitda}.\n` +
          `• Deterministic DCF Model: Implied fair value is $${fairVal.toFixed(2)} based on a 9.0% WACC and 2.5% terminal growth rate.\n` +
          `• Wall Street Consensus: ${stock.buyPct}% Buy rating across major broker desks.\n` +
          `• 10-K Regulatory Grounding: Key risk factors center on supply chain dependencies and macroeconomic interest rate sensitivity.`,
      };
      setMessages((prev: Message[]) => [...prev, assistantMsg]);
    }, 500);
  };

  const handleSendMessage = (text: string) => {
    const userMsg: Message = { id: Date.now().toString(), role: 'user', content: text };
    setMessages((prev: Message[]) => [...prev, userMsg]);

    setTimeout(() => {
      const fairVal = currentStock.price * 1.06;
      const assistantMsg: Message = {
        id: (Date.now() + 1).toString(),
        role: 'assistant',
        toolCalls: ['get_live_quote', 'run_dcf_model', 'search_faiss_vault'],
        verdict: {
          stance: 'BULLISH',
          targetRange: [Math.round(currentStock.price * 0.96), Math.round(fairVal * 1.04)],
        },
        content:
          `Analysis for ${activeSymbol}:\n\n` +
          `• Live telemetry: Last price is $${currentStock.price.toFixed(2)} (+${currentStock.changePct}%).\n` +
          `• Quantitative standing: Free cash flow yield remains strong at ${currentStock.profitMargin} net profit margin.\n` +
          `• Consensus: ${currentStock.buyPct}% Buy / ${currentStock.holdPct}% Hold rating.`,
      };
      setMessages((prev: Message[]) => [...prev, assistantMsg]);
    }, 450);
  };

  const handleSearchSubmit = (e?: React.FormEvent) => {
    if (e) e.preventDefault();
    if (searchSymbol.trim()) {
      setActiveSymbol(searchSymbol.trim().toUpperCase());
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
