import React, { useState, useRef, useEffect } from 'react';
import { Search, Send, ArrowUpRight, Wrench, FileText, Share2, Check, HelpCircle } from 'lucide-react';
import type { StockData, Message } from '../types';
import { ResearchMemoModal } from '../components/ResearchMemoModal';
import { StockComparison } from '../components/StockComparison';
import { WatchlistBar } from '../components/WatchlistBar';
import { WhatIfCalculator } from '../components/WhatIfCalculator';
import { checkBackendHealth } from '../services/api';

interface DashboardProps {
  currentStock: StockData;
  activeSymbol: string;
  searchSymbol: string;
  onSearchChange: (val: string) => void;
  onSearchSubmit: (e?: React.FormEvent) => void;
  messages: Message[];
  onSendMessage: (text: string) => void;
  timeframe: '1D' | '1W' | '1M' | '1Y';
  onTimeframeChange: (tf: '1D' | '1W' | '1M' | '1Y') => void;
  modelMode: 'FINE-TUNED' | 'CLOUD';
  onModelModeChange: (mode: 'FINE-TUNED' | 'CLOUD') => void;
}

export const Dashboard: React.FC<DashboardProps> = ({
  currentStock,
  activeSymbol,
  searchSymbol,
  onSearchChange,
  onSearchSubmit,
  messages,
  onSendMessage,
  timeframe,
  onTimeframeChange,
  modelMode,
  onModelModeChange,
}) => {
  const [inputQuestion, setInputQuestion] = useState('');
  const [showMemo, setShowMemo] = useState(false);
  const [viewMode, setViewMode] = useState<'SINGLE' | 'COMPARE'>('SINGLE');
  const [backendOnline, setBackendOnline] = useState<boolean | null>(null);
  const [plainEnglish, setPlainEnglish] = useState(false);
  const [shareToast, setShareToast] = useState(false);
  const messagesEndRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    checkBackendHealth().then((res) => setBackendOnline(res.online));
  }, []);

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages]);

  const handleFormSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!inputQuestion.trim()) return;
    onSendMessage(inputQuestion.trim());
    setInputQuestion('');
  };

  const handleShareStock = () => {
    const text = `📈 FINCHAT BRIEF: ${currentStock.name} ($${currentStock.symbol})
• Price: $${currentStock.price.toFixed(2)} (${currentStock.changePct >= 0 ? '+' : ''}${currentStock.changePct.toFixed(2)}%)
• Market Cap: ${currentStock.marketCap} | P/E: ${currentStock.peRatio}x
• Consensus: ${currentStock.buyPct}% BUY / ${currentStock.holdPct}% HOLD
• Fair Value (DCF): $${(currentStock.price * 0.92).toFixed(1)} - $${(currentStock.price * 1.08).toFixed(1)}
Explore on FinChat: https://investo-bot-xi.vercel.app/`;

    navigator.clipboard.writeText(text);
    setShareToast(true);
    setTimeout(() => setShareToast(false), 2500);
  };

  // SVG Chart rendering
  const chartData = currentStock.points[timeframe] || currentStock.points['1W'];
  const minVal = Math.min(...chartData.values) * 0.98;
  const maxVal = Math.max(...chartData.values) * 1.02;
  const range = maxVal - minVal || 1;
  const svgWidth = 650;
  const svgHeight = 195;
  const paddingX = 40;
  const paddingY = 22;

  const pointsString = chartData.values
    .map((val, idx) => {
      const x = paddingX + (idx / (chartData.values.length - 1)) * (svgWidth - paddingX * 2);
      const y = svgHeight - paddingY - ((val - minVal) / range) * (svgHeight - paddingY * 2);
      return `${x},${y}`;
    })
    .join(' ');

  return (
    <>
      {showMemo && <ResearchMemoModal stock={currentStock} onClose={() => setShowMemo(false)} />}

      <div style={{ display: 'grid', gridTemplateColumns: '1.55fr 1.0fr', gap: '24px', alignItems: 'start' }}>
        {/* Left Column (Market Overview or Comparison) */}
        <div>
          {/* Top Control Bar: Mode Toggle + Export Memo */}
          <div
            style={{
              display: 'flex',
              justifyContent: 'space-between',
              alignItems: 'center',
              marginBottom: '14px',
              flexWrap: 'wrap',
              gap: '8px',
            }}
          >
            {/* View Mode Toggle */}
            <div style={{ display: 'flex', border: '1px solid #000000' }}>
              <button
                type="button"
                onClick={() => setViewMode('SINGLE')}
                className="mono"
                style={{
                  backgroundColor: viewMode === 'SINGLE' ? '#000000' : '#FFFFFF',
                  color: viewMode === 'SINGLE' ? '#FFFFFF' : '#000000',
                  border: 'none',
                  borderRight: '1px solid #000000',
                  padding: '4px 12px',
                  fontSize: '11px',
                  fontWeight: 700,
                  cursor: 'pointer',
                }}
              >
                📊 SINGLE TERMINAL
              </button>
              <button
                type="button"
                onClick={() => setViewMode('COMPARE')}
                className="mono"
                style={{
                  backgroundColor: viewMode === 'COMPARE' ? '#000000' : '#FFFFFF',
                  color: viewMode === 'COMPARE' ? '#FFFFFF' : '#000000',
                  border: 'none',
                  padding: '4px 12px',
                  fontSize: '11px',
                  fontWeight: 700,
                  cursor: 'pointer',
                }}
              >
                ⚖️ COMPARE STOCKS
              </button>
            </div>

            {/* Actions: Export Memo & Python Bridge Indicator */}
            <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
              <div
                className="mono"
                style={{
                  fontSize: '9px',
                  color: backendOnline ? '#059669' : '#6B7280',
                  border: '1px solid #E5E7EB',
                  padding: '3px 8px',
                  backgroundColor: backendOnline ? '#ECFDF5' : '#F9FAFB',
                  display: 'flex',
                  alignItems: 'center',
                  gap: '4px',
                }}
              >
                <span
                  style={{
                    width: 5,
                    height: 5,
                    borderRadius: '50%',
                    backgroundColor: backendOnline ? '#10B981' : '#9CA3AF',
                  }}
                />
                {backendOnline ? 'PYTHON API: LIVE' : 'OFFLINE SIMULATION'}
              </div>

              <button
                type="button"
                onClick={() => setPlainEnglish(!plainEnglish)}
                className="mono"
                style={{
                  backgroundColor: plainEnglish ? '#ECFDF5' : '#FFFFFF',
                  color: plainEnglish ? '#065F46' : '#374151',
                  border: `1px solid ${plainEnglish ? '#10B981' : '#D1D5DB'}`,
                  padding: '4px 9px',
                  fontSize: '11px',
                  fontWeight: 700,
                  cursor: 'pointer',
                  display: 'flex',
                  alignItems: 'center',
                  gap: '4px',
                }}
                title="Toggle beginner-friendly plain-English financial translations"
              >
                <HelpCircle size={12} color={plainEnglish ? '#10B981' : '#6B7280'} />
                {plainEnglish ? '👶 ELI5: ON' : '👶 ELI5'}
              </button>

              <button
                type="button"
                onClick={handleShareStock}
                className="mono hover-card"
                style={{
                  backgroundColor: '#FFFFFF',
                  color: '#000000',
                  border: '1px solid #000000',
                  padding: '4px 9px',
                  fontSize: '11px',
                  fontWeight: 700,
                  cursor: 'pointer',
                  display: 'flex',
                  alignItems: 'center',
                  gap: '4px',
                }}
                title="Copy formatted stock card to clipboard for WhatsApp, Discord, or Twitter"
              >
                {shareToast ? <Check size={12} color="#10B981" /> : <Share2 size={12} />}
                {shareToast ? 'COPIED!' : 'SHARE'}
              </button>

              <button
                type="button"
                onClick={() => setShowMemo(true)}
                className="mono hover-card"
                style={{
                  backgroundColor: '#FFFFFF',
                  color: '#000000',
                  border: '1px solid #000000',
                  padding: '4px 11px',
                  fontSize: '11px',
                  fontWeight: 700,
                  cursor: 'pointer',
                  display: 'flex',
                  alignItems: 'center',
                  gap: '5px',
                }}
              >
                <FileText size={12} /> EXPORT 1-PAGE MEMO
              </button>
            </div>
          </div>

          {viewMode === 'COMPARE' ? (
            <StockComparison
              onSelectStock={(ticker) => {
                onSearchChange(ticker);
                onSearchSubmit();
                setViewMode('SINGLE');
              }}
            />
          ) : (
            <>
              {/* Watchlist Bar */}
              <WatchlistBar
                activeSymbol={activeSymbol}
                onSelectSymbol={(sym) => {
                  onSearchChange(sym);
                  onSearchSubmit();
                }}
              />

              {/* Search Bar */}
              <form onSubmit={onSearchSubmit} style={{ display: 'flex', marginBottom: '14px' }}>
                <input
                  type="text"
                  value={searchSymbol}
                  onChange={(e) => onSearchChange(e.target.value)}
                  placeholder="Search symbol (AAPL, TSLA, MSFT)..."
                  style={{
                    flex: 1,
                    padding: '9px 14px',
                    border: '1px solid #000000',
                    borderRight: 'none',
                    outline: 'none',
                    fontSize: '13px',
                    fontFamily: 'Inter, sans-serif',
                  }}
                />
                <button
                  type="submit"
                  className="mono"
                  style={{
                    backgroundColor: '#000000',
                    color: '#FFFFFF',
                    border: '1px solid #000000',
                    padding: '0 18px',
                    fontSize: '12px',
                    fontWeight: 700,
                    letterSpacing: '0.05em',
                    cursor: 'pointer',
                    display: 'flex',
                    alignItems: 'center',
                    gap: '6px',
                  }}
                >
                  <Search size={14} /> LOAD
                </button>
              </form>

        {/* Metric Bar */}
        <div
          style={{
            display: 'grid',
            gridTemplateColumns: 'repeat(4, 1fr)',
            border: '1px solid #E5E7EB',
            padding: '12px 18px',
            marginBottom: '22px',
          }}
        >
          <div>
            <div className="mono" style={{ fontSize: '10px', color: '#6B7280', marginBottom: '4px' }}>
              SYMBOL
            </div>
            <div className="mono" style={{ fontSize: '18px', fontWeight: 700 }}>
              {currentStock.symbol}
            </div>
          </div>
          <div>
            <div className="mono" style={{ fontSize: '10px', color: '#6B7280', marginBottom: '4px' }}>
              LAST PRICE
            </div>
            <div className="mono" style={{ fontSize: '18px', fontWeight: 700 }}>
              ${currentStock.price.toFixed(2)}
            </div>
          </div>
          <div>
            <div className="mono" style={{ fontSize: '10px', color: '#6B7280', marginBottom: '4px' }}>
              CHANGE
            </div>
            <div
              className="mono"
              style={{
                fontSize: '15px',
                fontWeight: 600,
                color: currentStock.change >= 0 ? '#10B981' : '#EF4444',
                display: 'flex',
                alignItems: 'center',
              }}
            >
              <ArrowUpRight size={15} /> +{currentStock.change.toFixed(2)}
            </div>
          </div>
          <div>
            <div className="mono" style={{ fontSize: '10px', color: '#6B7280', marginBottom: '4px' }}>
              CHANGE %
            </div>
            <div
              className="mono"
              style={{
                fontSize: '15px',
                fontWeight: 600,
                color: currentStock.changePct >= 0 ? '#10B981' : '#EF4444',
              }}
            >
              +{currentStock.changePct.toFixed(2)}%
            </div>
          </div>
        </div>

        {/* Price Performance Header + Timeframe Buttons */}
        <div
          style={{
            display: 'flex',
            justifyContent: 'space-between',
            alignItems: 'center',
            marginBottom: '10px',
          }}
        >
          <div className="mono" style={{ fontSize: '12px', fontWeight: 700, letterSpacing: '0.04em' }}>
            PRICE PERFORMANCE HISTORICAL
          </div>
          <div style={{ display: 'flex', border: '1px solid #000000' }}>
            {(['1D', '1W', '1M', '1Y'] as const).map((tf) => (
              <button
                key={tf}
                onClick={() => onTimeframeChange(tf)}
                className="mono"
                style={{
                  backgroundColor: timeframe === tf ? '#000000' : '#FFFFFF',
                  color: timeframe === tf ? '#FFFFFF' : '#000000',
                  border: 'none',
                  padding: '3px 10px',
                  fontSize: '11px',
                  fontWeight: 700,
                  cursor: 'pointer',
                }}
              >
                {tf}
              </button>
            ))}
          </div>
        </div>

        {/* SVG Line Chart */}
        <div style={{ border: '1px solid #E5E7EB', padding: '10px', marginBottom: '24px' }}>
          <svg viewBox={`0 0 ${svgWidth} ${svgHeight}`} style={{ width: '100%', height: 'auto', display: 'block' }}>
            {[0, 0.25, 0.5, 0.75, 1].map((ratio, idx) => {
              const y = paddingY + ratio * (svgHeight - paddingY * 2);
              const val = (maxVal - ratio * range).toFixed(1);
              return (
                <g key={idx}>
                  <line x1={paddingX} y1={y} x2={svgWidth - paddingX} y2={y} stroke="#F3F4F6" strokeWidth="1" />
                  <text x="5" y={y + 4} fontSize="9" fill="#9CA3AF" fontFamily="JetBrains Mono, monospace">
                    {val}
                  </text>
                </g>
              );
            })}

            {chartData.labels.map((lbl, idx) => {
              const x = paddingX + (idx / (chartData.labels.length - 1)) * (svgWidth - paddingX * 2);
              return (
                <text
                  key={idx}
                  x={x}
                  y={svgHeight - 6}
                  textAnchor="middle"
                  fontSize="9"
                  fill="#9CA3AF"
                  fontFamily="JetBrains Mono, monospace"
                >
                  {lbl}
                </text>
              );
            })}

            <polyline fill="none" stroke="#10B981" strokeWidth="2.0" points={pointsString} />

            {chartData.values.map((val, idx) => {
              const x = paddingX + (idx / (chartData.values.length - 1)) * (svgWidth - paddingX * 2);
              const y = svgHeight - paddingY - ((val - minVal) / range) * (svgHeight - paddingY * 2);
              return <circle key={idx} cx={x} cy={y} r="3.5" fill="#10B981" />;
            })}
          </svg>
        </div>

        {/* Plain-English Translator Box when ELI5 mode is active */}
        {plainEnglish && (
          <div
            style={{
              backgroundColor: '#EFF6FF',
              border: '1px solid #BFDBFE',
              padding: '12px 16px',
              marginBottom: '20px',
              fontSize: '11px',
              color: '#1E3A8A',
              lineHeight: 1.6,
            }}
          >
            <div
              className="mono"
              style={{
                fontWeight: 800,
                marginBottom: '6px',
                fontSize: '11px',
                color: '#1E40AF',
                display: 'flex',
                alignItems: 'center',
                gap: '5px',
              }}
            >
              <HelpCircle size={13} /> 👶 PLAIN-ENGLISH TRANSLATION FOR {currentStock.symbol} ({currentStock.name}):
            </div>
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '14px' }}>
              <div>
                <strong>• What is this company's total price tag?</strong>
                <p style={{ margin: '2px 0 8px 0', color: '#374151' }}>
                  Market Cap is <strong>{currentStock.marketCap}</strong>. That is how much total money it would take if you bought every single share of the company in the world.
                </p>
                <strong>• Are you paying a premium? (P/E Ratio)</strong>
                <p style={{ margin: '2px 0 0 0', color: '#374151' }}>
                  P/E is <strong>{currentStock.peRatio}x</strong>. You are paying ${currentStock.peRatio} today for every $1 of real profit {currentStock.name} earns annually.
                </p>
              </div>
              <div>
                <strong>• What do Wall Street analysts say?</strong>
                <p style={{ margin: '2px 0 8px 0', color: '#374151' }}>
                  <strong>{currentStock.buyPct}%</strong> of major bank analysts recommend BUYING, while <strong>{currentStock.holdPct}%</strong> say keep holding what you own.
                </p>
                <strong>• Everyday Price Action:</strong>
                <p style={{ margin: '2px 0 0 0', color: '#374151' }}>
                  Currently trading at <strong>${currentStock.price.toFixed(2)}</strong> ({currentStock.changePct >= 0 ? '+' : ''}{currentStock.changePct.toFixed(2)}% recently).
                </p>
              </div>
            </div>
          </div>
        )}

        {/* Historical "What If" Investment Simulator */}
        <WhatIfCalculator stock={currentStock} />

        {/* Bottom Row: Company Key Stats & Wall Street Consensus */}
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '20px' }}>
          {/* Key Stats */}
          <div>
            <div className="mono" style={{ fontSize: '11px', fontWeight: 700, marginBottom: '8px', letterSpacing: '0.04em' }}>
              COMPANY KEY STATS
            </div>
            <div style={{ border: '1px solid #E5E7EB', padding: '14px 16px' }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', padding: '6px 0', borderBottom: '1px solid #F3F4F6', fontSize: '12px' }}>
                <span style={{ color: '#6B7280' }}>Company Name</span>
                <span className="mono" style={{ fontWeight: 600 }}>{currentStock.name}</span>
              </div>
              <div style={{ display: 'flex', justifyContent: 'space-between', padding: '6px 0', borderBottom: '1px solid #F3F4F6', fontSize: '12px' }}>
                <span style={{ color: '#6B7280' }}>Market Capitalization</span>
                <span className="mono" style={{ fontWeight: 600 }}>{currentStock.marketCap}</span>
              </div>
              <div style={{ display: 'flex', justifyContent: 'space-between', padding: '6px 0', fontSize: '12px' }}>
                <span style={{ color: '#6B7280' }}>P/E Ratio</span>
                <span className="mono" style={{ fontWeight: 600 }}>{currentStock.peRatio}</span>
              </div>
            </div>
          </div>

          {/* Wall Street Consensus */}
          <div>
            <div className="mono" style={{ fontSize: '11px', fontWeight: 700, marginBottom: '8px', letterSpacing: '0.04em' }}>
              WALL STREET CONSENSUS
            </div>
            <div style={{ border: '1px solid #E5E7EB', padding: '14px 16px' }}>
              <div style={{ marginBottom: '14px' }}>
                <div className="mono" style={{ display: 'flex', justifyContent: 'space-between', fontSize: '11px', fontWeight: 600, marginBottom: '5px' }}>
                  <span>BUY</span>
                  <span>{currentStock.buyPct}%</span>
                </div>
                <div style={{ height: '6px', backgroundColor: '#F3F4F6', width: '100%' }}>
                  <div style={{ height: '100%', width: `${currentStock.buyPct}%`, backgroundColor: '#10B981' }}></div>
                </div>
              </div>

              <div>
                <div className="mono" style={{ display: 'flex', justifyContent: 'space-between', fontSize: '11px', fontWeight: 600, marginBottom: '5px' }}>
                  <span>HOLD</span>
                  <span>{currentStock.holdPct}%</span>
                </div>
                <div style={{ height: '6px', backgroundColor: '#F3F4F6', width: '100%' }}>
                  <div style={{ height: '100%', width: `${currentStock.holdPct}%`, backgroundColor: '#64748B' }}></div>
                </div>
              </div>
            </div>
          </div>
        </div>
        </>
      )}
      </div>

      {/* Right Column (Ask FinChat) — pinned in viewport so input bar is always visible */}
      <div
        style={{
          position: 'sticky',
          top: '8px',
          display: 'flex',
          flexDirection: 'column',
          height: 'calc(100vh - 135px)',
          minHeight: '440px',
          maxHeight: '600px',
          border: '1px solid #E5E7EB',
          backgroundColor: '#FFFFFF',
          padding: '14px 16px',
          boxSizing: 'border-box',
        }}
      >
        {/* Header & Model Toggle */}
        <div
          style={{
            display: 'flex',
            justifyContent: 'space-between',
            alignItems: 'center',
            borderBottom: '1px solid #000000',
            paddingBottom: '8px',
            marginBottom: '12px',
            flexShrink: 0,
          }}
        >
          <div className="mono" style={{ fontSize: '13px', fontWeight: 700, letterSpacing: '0.04em' }}>
            ASK FINCHAT
          </div>

          <div style={{ display: 'flex', border: '1px solid #000000' }}>
            <button
              onClick={() => onModelModeChange('FINE-TUNED')}
              className="mono"
              style={{
                backgroundColor: modelMode === 'FINE-TUNED' ? '#000000' : '#FFFFFF',
                color: modelMode === 'FINE-TUNED' ? '#FFFFFF' : '#000000',
                border: 'none',
                padding: '3px 9px',
                fontSize: '10px',
                fontWeight: 700,
                cursor: 'pointer',
              }}
            >
              FINE-TUNED (CPU)
            </button>
            <button
              onClick={() => onModelModeChange('CLOUD')}
              className="mono"
              style={{
                backgroundColor: modelMode === 'CLOUD' ? '#000000' : '#FFFFFF',
                color: modelMode === 'CLOUD' ? '#FFFFFF' : '#000000',
                border: 'none',
                padding: '3px 9px',
                fontSize: '10px',
                fontWeight: 700,
                cursor: 'pointer',
              }}
            >
              CLOUD API
            </button>
          </div>
        </div>

        {/* Messages List — scrollable within bounded container */}
        <div
          style={{
            flex: 1,
            minHeight: 0,
            overflowY: 'auto',
            display: 'flex',
            flexDirection: 'column',
            gap: '10px',
            paddingRight: '4px',
          }}
        >
          {messages.length === 0 ? (
            <div style={{ margin: 'auto 0', textAlign: 'center', padding: '24px 16px', color: '#9CA3AF' }}>
              <div style={{ fontSize: '24px', marginBottom: '8px' }}>⬡</div>
              <div className="mono" style={{ fontSize: '11px', fontWeight: 700, marginBottom: '6px', color: '#111827' }}>
                FINCHAT ANALYST READY
              </div>
              <div style={{ fontSize: '11px', lineHeight: 1.5, color: '#6B7280' }}>
                Ask about valuation, margins, DCF model,<br />or 10-K risk factors for {activeSymbol}.
              </div>
            </div>
          ) : (
            messages.map((m) => (
              <div
                key={m.id}
                className="hover-card"
                style={{
                  border: '1px solid #E5E7EB',
                  padding: '10px 12px',
                  backgroundColor: m.role === 'user' ? '#FAFAFA' : '#FFFFFF',
                }}
              >
                <div className="mono" style={{ fontSize: '10px', color: '#6B7280', marginBottom: '6px', display: 'flex', justifyContent: 'space-between', alignItems: 'center', gap: '6px' }}>
                  <span>{m.role === 'user' ? 'YOU' : 'FINCHAT'}</span>
                  <div style={{ display: 'flex', gap: '6px', alignItems: 'center' }}>
                    {m.verdict && (
                      <>
                        <span
                          className={`verdict-badge ${
                            m.verdict.stance === 'BULLISH' ? 'verdict-bullish'
                            : m.verdict.stance === 'BEARISH' ? 'verdict-bearish'
                            : 'verdict-neutral'
                          }`}
                        >
                          {m.verdict.stance === 'BULLISH' ? '▲' : m.verdict.stance === 'BEARISH' ? '▼' : '◆'}{' '}
                          {m.verdict.stance}
                        </span>
                        <span className="target-range">
                          ${m.verdict.targetRange[0]} – ${m.verdict.targetRange[1]}
                        </span>
                      </>
                    )}
                  </div>
                </div>

                {m.toolCalls && m.toolCalls.length > 0 && (
                  <div className="tool-trace" style={{ marginBottom: '8px' }}>
                    <Wrench size={9} />
                    TOOLS: {m.toolCalls.join(' → ')}
                  </div>
                )}

                <div style={{ fontSize: '12px', lineHeight: 1.55, whiteSpace: 'pre-line' }}>{m.content}</div>
              </div>
            ))
          )}
          <div ref={messagesEndRef} />
        </div>

        {/* Bottom Chat Input Form — always in view immediately */}
        <form
          onSubmit={handleFormSubmit}
          style={{
            display: 'flex',
            marginTop: '10px',
            flexShrink: 0,
          }}
        >
          <input
            type="text"
            value={inputQuestion}
            onChange={(e) => setInputQuestion(e.target.value)}
            placeholder={`Ask FinChat about ${activeSymbol}...`}
            style={{
              flex: 1,
              padding: '9px 12px',
              border: '1px solid #000000',
              borderRight: 'none',
              outline: 'none',
              fontSize: '12px',
              fontFamily: 'Inter, sans-serif',
            }}
          />
          <button
            type="submit"
            className="mono"
            style={{
              backgroundColor: '#000000',
              color: '#FFFFFF',
              border: '1px solid #000000',
              padding: '0 16px',
              fontSize: '11px',
              fontWeight: 700,
              letterSpacing: '0.04em',
              cursor: 'pointer',
              display: 'flex',
              alignItems: 'center',
              gap: '5px',
            }}
          >
            <Send size={12} /> SEND
          </button>
        </form>
      </div>
    </div>
    </>
  );
};
