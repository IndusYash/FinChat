import React, { useState } from 'react';
import { Send } from 'lucide-react';
import { detectBrandOrTicker } from '../data/mockData';
import type { TabType } from '../components/Header';

interface HomeProps {
  onStartAnalysis: (query: string, detectedTicker: string) => void;
  onNavigate?: (tab: TabType) => void;
}

const CHIPS = [
  { ticker: 'AAPL', label: 'Apple valuation & P/E' },
  { ticker: 'TSLA', label: 'Tesla margin risks'    },
  { ticker: 'NVDA', label: 'Nvidia Monte Carlo VaR' },
  { ticker: 'MSFT', label: 'Microsoft 10-K risks'  },
];

// Sparkline for the hero background
const SPARK = [42, 45, 43, 48, 50, 47, 53, 51, 57, 54, 58, 56, 63, 66, 63, 69, 72, 70, 76, 79, 76, 83, 87, 84, 90, 94];

function HeroSparkline() {
  const W = 900;
  const H = 140;
  const pad = 0;
  const min = Math.min(...SPARK);
  const max = Math.max(...SPARK);
  const range = max - min || 1;

  const pts = SPARK.map((v, i) => {
    const x = pad + (i / (SPARK.length - 1)) * (W - pad * 2);
    const y = H - ((v - min) / range) * H * 0.75 - H * 0.12;
    return `${x},${y}`;
  }).join(' ');

  const fillPts = `0,${H} ${pts} ${W},${H}`;

  return (
    <svg
      viewBox={`0 0 ${W} ${H}`}
      preserveAspectRatio="none"
      style={{
        position: 'absolute',
        bottom: 0,
        left: 0,
        right: 0,
        width: '100%',
        height: '100%',
        opacity: 1,
        pointerEvents: 'none',
      }}
    >
      <defs>
        <linearGradient id="sparkFill" x1="0" y1="0" x2="0" y2="1">
          <stop offset="0%" stopColor="#E5E7EB" stopOpacity="0.6" />
          <stop offset="100%" stopColor="#E5E7EB" stopOpacity="0" />
        </linearGradient>
      </defs>
      <polygon points={fillPts} fill="url(#sparkFill)" />
      <polyline
        points={pts}
        fill="none"
        stroke="#D1D5DB"
        strokeWidth="1.5"
        className="chart-line-animate"
      />
    </svg>
  );
}

export const Home: React.FC<HomeProps> = ({ onStartAnalysis }) => {
  const [prompt, setPrompt] = useState('');

  const handleSubmit = (e?: React.FormEvent) => {
    if (e) e.preventDefault();
    if (!prompt.trim()) return;
    const detected = detectBrandOrTicker(prompt) || 'AAPL';
    onStartAnalysis(prompt.trim(), detected);
  };

  const handleChip = (label: string, ticker: string) => {
    const detected = detectBrandOrTicker(label) || ticker;
    onStartAnalysis(label, detected);
  };

  return (
    <div
      style={{
        display: 'flex',
        flexDirection: 'column',
        flex: 1,
        minHeight: 'calc(100vh - 110px)',
      }}
    >
      {/* ── Hero ──────────────────────────────────────────────── */}
      <div
        style={{
          position: 'relative',
          overflow: 'hidden',
          padding: '48px 24px 20px',
          textAlign: 'center',
          backgroundColor: '#FFFFFF',
          flex: 1,
          display: 'flex',
          flexDirection: 'column',
          justifyContent: 'center',
          alignItems: 'center',
        }}
      >
        <HeroSparkline />

        {/* Content sits above the sparkline */}
        <div style={{ position: 'relative', maxWidth: '640px', width: '100%', margin: '0 auto' }}>
          {/* Eyebrow tag */}
          <div
            className="mono"
            style={{
              display: 'inline-flex',
              alignItems: 'center',
              gap: '6px',
              fontSize: '10px',
              fontWeight: 700,
              letterSpacing: '0.08em',
              color: '#6B7280',
              marginBottom: '16px',
              textTransform: 'uppercase',
            }}
          >
            <span style={{ width: 7, height: 7, background: '#10B981', display: 'inline-block' }} />
            AI-Powered Financial Copilot
          </div>

          <h1
            className="mono"
            style={{
              fontSize: '34px',
              fontWeight: 700,
              letterSpacing: '-0.01em',
              marginBottom: '12px',
              color: '#000000',
              lineHeight: 1.15,
            }}
          >
            Ask FinChat anything.
          </h1>

          <p
            style={{
              fontSize: '13px',
              color: '#6B7280',
              lineHeight: 1.6,
              marginBottom: '28px',
              maxWidth: '440px',
              margin: '0 auto 26px',
            }}
          >
            Mention any company or ticker — FinChat detects it, pulls live market data,
            runs quant models, and grounds answers in SEC 10-K filings.
          </p>

          {/* Search bar */}
          <form
            onSubmit={handleSubmit}
            style={{
              display: 'flex',
              border: '2px solid #000000',
              backgroundColor: '#FFFFFF',
              marginBottom: '16px',
              boxShadow: '4px 4px 0px #000000',
            }}
          >
            <input
              type="text"
              value={prompt}
              onChange={(e) => setPrompt(e.target.value)}
              placeholder="e.g. Apple valuation, Tesla margins, Nvidia Monte Carlo risk…"
              style={{
                flex: 1,
                padding: '13px 16px',
                border: 'none',
                outline: 'none',
                fontSize: '14px',
                fontFamily: 'Inter, sans-serif',
                backgroundColor: 'transparent',
              }}
              autoFocus
            />
            <button
              type="submit"
              className="mono"
              style={{
                backgroundColor: '#000000',
                color: '#FFFFFF',
                border: 'none',
                padding: '0 22px',
                fontSize: '11px',
                fontWeight: 700,
                letterSpacing: '0.05em',
                cursor: 'pointer',
                display: 'flex',
                alignItems: 'center',
                gap: '7px',
              }}
            >
              <Send size={12} /> ANALYZE
            </button>
          </form>

          {/* Suggestion chips */}
          <div
            style={{
              display: 'flex',
              gap: '7px',
              flexWrap: 'wrap',
              justifyContent: 'center',
              paddingBottom: '36px',
            }}
          >
            {CHIPS.map((chip) => (
              <button
                key={chip.ticker}
                onClick={() => handleChip(chip.label, chip.ticker)}
                className="mono"
                style={{
                  fontSize: '10px',
                  fontWeight: 600,
                  padding: '4px 11px',
                  border: '1px solid #D1D5DB',
                  backgroundColor: '#FFFFFF',
                  cursor: 'pointer',
                  color: '#4B5563',
                  letterSpacing: '0.02em',
                  transition: 'all 0.15s',
                }}
                onMouseEnter={(e) => {
                  e.currentTarget.style.borderColor = '#000000';
                  e.currentTarget.style.boxShadow = '1px 1px 0 #000000';
                }}
                onMouseLeave={(e) => {
                  e.currentTarget.style.borderColor = '#D1D5DB';
                  e.currentTarget.style.boxShadow = 'none';
                }}
              >
                {chip.ticker} — {chip.label}
              </button>
            ))}
          </div>
        </div>
      </div>

      {/* ── Telemetry / Stat Strip (docked at the end of the screen) ── */}
      <div
        style={{
          backgroundColor: '#F9FAFB',
          borderTop: '1px solid #E5E7EB',
          borderBottom: '1px solid #E5E7EB',
          padding: '16px 24px',
          display: 'flex',
          justifyContent: 'center',
          gap: '48px',
          flexWrap: 'wrap',
          marginTop: 'auto',
          flexShrink: 0,
        }}
      >
        {[
          { label: 'RAG DOCUMENTS', value: '2,340' },
          { label: 'VECTOR CHUNKS', value: '18,400+' },
          { label: 'TICKERS COVERED', value: 'Global' },
          { label: 'MODELS', value: 'Fine-tuned + Cloud' },
          { label: 'QUANT ENGINE', value: 'DCF + Monte Carlo' },
        ].map((stat) => (
          <div key={stat.label} style={{ textAlign: 'center' }}>
            <div
              className="mono"
              style={{ fontSize: '13px', fontWeight: 700, color: '#000000', marginBottom: '3px' }}
            >
              {stat.value}
            </div>
            <div
              className="mono"
              style={{ fontSize: '9px', color: '#9CA3AF', letterSpacing: '0.06em', textTransform: 'uppercase' }}
            >
              {stat.label}
            </div>
          </div>
        ))}
      </div>
    </div>
  );
};
