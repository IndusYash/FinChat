import React, { useState } from 'react';
import { Printer, Copy, Check, X, FileText } from 'lucide-react';
import type { StockData } from '../types';
import { getCurrencySymbol } from '../types';

interface ResearchMemoModalProps {
  stock: StockData;
  onClose: () => void;
}

export const ResearchMemoModal: React.FC<ResearchMemoModalProps> = ({ stock, onClose }) => {
  const [copied, setCopied] = useState(false);
  const currSym = getCurrencySymbol(stock);

  const fairValue = Math.round(stock.price * 1.036);
  const upside = (((fairValue - stock.price) / stock.price) * 100).toFixed(1);
  const targetLow = Math.round(stock.price * 0.96);
  const targetHigh = Math.round(fairValue * 1.07);

  const handlePrint = () => {
    window.print();
  };

  const handleCopy = () => {
    const text = `
INVESTO FINANCIAL RESEARCH // EQUITY INTRINSIC MEMO (ILLUSTRATIVE TEMPLATE)
Ticker: ${stock.symbol} (${stock.name})
Date: ${new Date().toLocaleDateString('en-US', { year: 'numeric', month: 'long', day: 'numeric' })}
Rating: BULLISH (ILLUSTRATIVE) | Current Price: ${currSym}${stock.price.toFixed(2)} | Fair Value: ${currSym}${fairValue} (${upside}% upside, sample estimate)
Target Corridor: ${currSym}${targetLow} – ${currSym}${targetHigh}

Key Metrics:
• Market Cap: ${stock.marketCap}
• Trailing P/E: ${stock.peRatio}x
• Net Margin: ${stock.profitMargin}
• Wall Street Consensus: ${stock.buyPct}% Buy / ${stock.holdPct}% Hold

Quantitative Valuation (DCF Model - Illustrative):
• 5-Year Cash Flow Projections discounted at 9.0% WACC with 2.5% Gordon Terminal Growth (sample model).
• Implied Intrinsic Value: ${currSym}${fairValue}.00 per share.

Stochastic Risk Corridor (Monte Carlo 95% VaR - Sample Parameter):
• 1,000 Geometric Brownian Motion trajectories indicate a sample 95% Value-at-Risk of -12.4%.

Regulatory Disclosures:
• Sample extract referenced from SEC Form 10-K / Annual Filings.

DISCLOSURE: For educational and illustrative purposes only. Figures above are model-generated sample estimates and do not constitute certified financial advice.
    `.trim();

    navigator.clipboard.writeText(text);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  return (
    <div
      style={{
        position: 'fixed',
        top: 0,
        left: 0,
        right: 0,
        bottom: 0,
        backgroundColor: 'rgba(0, 0, 0, 0.65)',
        zIndex: 9999,
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        padding: '20px',
      }}
      onClick={onClose}
    >
      <div
        style={{
          backgroundColor: '#FFFFFF',
          maxWidth: '820px',
          width: '100%',
          maxHeight: '90vh',
          overflowY: 'auto',
          border: '2px solid #000000',
          boxShadow: '8px 8px 0px #000000',
          padding: '28px 32px',
          position: 'relative',
        }}
        onClick={(e) => e.stopPropagation()}
      >
        {/* Top Action Bar (Print / Copy / Close) */}
        <div
          style={{
            display: 'flex',
            justifyContent: 'space-between',
            alignItems: 'center',
            borderBottom: '2px solid #000000',
            paddingBottom: '14px',
            marginBottom: '20px',
          }}
        >
          <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
            <FileText size={18} color="#000000" />
            <span className="mono" style={{ fontSize: '12px', fontWeight: 700, letterSpacing: '0.04em' }}>
              INSTITUTIONAL RESEARCH MEMORANDUM (ILLUSTRATIVE TEMPLATE)
            </span>
          </div>

          <div style={{ display: 'flex', gap: '8px', alignItems: 'center' }}>
            <button
              onClick={handlePrint}
              className="mono"
              style={{
                backgroundColor: '#000000',
                color: '#FFFFFF',
                border: '1px solid #000000',
                padding: '5px 12px',
                fontSize: '11px',
                fontWeight: 700,
                cursor: 'pointer',
                display: 'flex',
                alignItems: 'center',
                gap: '5px',
              }}
            >
              <Printer size={12} /> PRINT / SAVE PDF
            </button>
            <button
              onClick={handleCopy}
              className="mono"
              style={{
                backgroundColor: '#FFFFFF',
                color: '#000000',
                border: '1px solid #000000',
                padding: '5px 12px',
                fontSize: '11px',
                fontWeight: 700,
                cursor: 'pointer',
                display: 'flex',
                alignItems: 'center',
                gap: '5px',
              }}
            >
              {copied ? <Check size={12} color="#10B981" /> : <Copy size={12} />}
              {copied ? 'COPIED' : 'COPY'}
            </button>
            <button
              onClick={onClose}
              style={{
                backgroundColor: 'transparent',
                border: 'none',
                cursor: 'pointer',
                padding: '4px',
                display: 'flex',
                alignItems: 'center',
              }}
            >
              <X size={18} />
            </button>
          </div>
        </div>

        {/* ── Document Letterhead ─────────────────────────────── */}
        <div style={{ borderBottom: '1px solid #E5E7EB', paddingBottom: '16px', marginBottom: '20px' }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', flexWrap: 'wrap', gap: '10px' }}>
            <div>
              <div className="mono" style={{ fontSize: '9px', fontWeight: 700, color: '#6B7280', letterSpacing: '0.08em' }}>
                SAMPLE TEMPLATE // EDUCATIONAL EQUITY RESEARCH
              </div>
              <h1 className="mono" style={{ fontSize: '24px', fontWeight: 700, margin: '4px 0 2px 0' }}>
                {stock.name} ({stock.symbol})
              </h1>
              <div style={{ fontSize: '12px', color: '#6B7280' }}>
                Published: {new Date().toLocaleDateString('en-US', { year: 'numeric', month: 'long', day: 'numeric' })}
              </div>
            </div>

            <div style={{ textAlign: 'right' }}>
              <div
                className="mono"
                style={{
                  display: 'inline-block',
                  backgroundColor: '#ECFDF5',
                  color: '#065F46',
                  border: '1px solid #10B981',
                  padding: '4px 12px',
                  fontSize: '11px',
                  fontWeight: 700,
                  marginBottom: '4px',
                }}
              >
                ▲ BULLISH INTRINSIC RATING (ILLUSTRATIVE)
              </div>
              <div className="mono" style={{ fontSize: '11px', color: '#374151' }}>
                Target Corridor: <strong>{currSym}{targetLow} – {currSym}{targetHigh}</strong>
              </div>
            </div>
          </div>
        </div>

        {/* ── Executive Summary Metrics Grid ──────────────────── */}
        <div
          style={{
            display: 'grid',
            gridTemplateColumns: 'repeat(4, 1fr)',
            gap: '10px',
            backgroundColor: '#F9FAFB',
            border: '1px solid #E5E7EB',
            padding: '12px',
            marginBottom: '20px',
          }}
        >
          <div>
            <div className="mono" style={{ fontSize: '9px', color: '#6B7280' }}>LAST TRADE</div>
            <div className="mono" style={{ fontSize: '16px', fontWeight: 700, color: '#000000' }}>
              {currSym}{stock.price.toFixed(2)}
            </div>
          </div>
          <div>
            <div className="mono" style={{ fontSize: '9px', color: '#6B7280' }}>DCF FAIR VALUE (SAMPLE)</div>
            <div className="mono" style={{ fontSize: '16px', fontWeight: 700, color: '#10B981' }}>
              {currSym}{fairValue}.00 ({upside}% est.)
            </div>
          </div>
          <div>
            <div className="mono" style={{ fontSize: '9px', color: '#6B7280' }}>TRAILING P/E</div>
            <div className="mono" style={{ fontSize: '16px', fontWeight: 700, color: '#000000' }}>
              {stock.peRatio}x
            </div>
          </div>
          <div>
            <div className="mono" style={{ fontSize: '9px', color: '#6B7280' }}>MARKET CAP</div>
            <div className="mono" style={{ fontSize: '16px', fontWeight: 700, color: '#000000' }}>
              {stock.marketCap}
            </div>
          </div>
        </div>

        {/* ── Section 1: Valuation Analysis & DCF ──────────────── */}
        <div style={{ marginBottom: '20px' }}>
          <div className="mono" style={{ fontSize: '11px', fontWeight: 700, color: '#000000', marginBottom: '6px', letterSpacing: '0.04em' }}>
            1. DETERMINISTIC VALUATION SYNTHESIS (SAMPLE MODEL)
          </div>
          <p style={{ fontSize: '12px', color: '#374151', lineHeight: 1.6, margin: 0 }}>
            Under a 5-year Free Cash Flow projection discounting model utilizing a <strong>9.0% Weighted Average Cost of Capital (WACC)</strong> and a <strong>2.5% Gordon Growth Terminal Rate</strong>, {stock.name}'s intrinsic enterprise value yields an illustrative per-share valuation of <strong>{currSym}{fairValue}.00</strong> (sample model calculation). At current trading levels of {currSym}{stock.price.toFixed(2)}, the security presents a constructive <strong>+{upside}% illustrative margin of safety</strong>.
          </p>
        </div>

        {/* ── Section 2: Stochastic Volatility & Risk Corridor ── */}
        <div style={{ marginBottom: '20px' }}>
          <div className="mono" style={{ fontSize: '11px', fontWeight: 700, color: '#000000', marginBottom: '6px', letterSpacing: '0.04em' }}>
            2. STOCHASTIC VOLATILITY & 95% VALUE-AT-RISK (SAMPLE BENCHMARK)
          </div>
          <p style={{ fontSize: '12px', color: '#374151', lineHeight: 1.6, margin: 0 }}>
            An illustrative 1,000-path Monte Carlo Geometric Brownian Motion (GBM) simulation over a 90 trading-day horizon indicates a benchmark 5th percentile downside floor of <strong>{currSym}{targetLow}</strong>, reflecting a sample 95% Value-at-Risk (VaR) of <strong>-12.4%</strong>. The median simulated drift points toward <strong>{currSym}{targetHigh}</strong>, representing model-derived risk-to-reward dynamics.
          </p>
        </div>

        {/* ── Section 3: Regulatory SEC 10-K Grounding ─────────── */}
        <div style={{ marginBottom: '24px' }}>
          <div className="mono" style={{ fontSize: '11px', fontWeight: 700, color: '#000000', marginBottom: '6px', letterSpacing: '0.04em' }}>
            3. REGULATORY 10-K AUDIT & RISK CITATIONS (SAMPLE EXTRACT)
          </div>
          <div style={{ border: '1px solid #E5E7EB', backgroundColor: '#FAFAFA', padding: '10px 14px' }}>
            <div className="mono" style={{ fontSize: '9px', color: '#10B981', fontWeight: 700, marginBottom: '3px' }}>
              SAMPLE EXTRACT: SEC FORM 10-K (ANNUAL REPORT) // ITEM 1A (ILLUSTRATIVE)
            </div>
            <div style={{ fontSize: '11px', color: '#4B5563', fontStyle: 'italic', lineHeight: 1.5 }}>
              "The Company's business and operational results depend heavily on concentrated manufacturing facilities and single-source component providers. Unforeseen geopolitical disruptions or supply chain constraints could materially impact hardware production timelines and operating margins."
            </div>
          </div>
        </div>

        {/* ── Sign-Off / Institutional Compliance Footer ──────── */}
        <div
          style={{
            borderTop: '1px solid #E5E7EB',
            paddingTop: '12px',
            display: 'flex',
            justifyContent: 'space-between',
            alignItems: 'center',
            fontSize: '10px',
            color: '#9CA3AF',
          }}
        >
          <div className="mono">INVESTO RESEARCH TEMPLATE // DEMO MODE</div>
          <div className="mono">ILLUSTRATIVE MODEL ESTIMATES • NOT CERTIFIED FINANCIAL ADVICE</div>
        </div>
      </div>
    </div>
  );
};
