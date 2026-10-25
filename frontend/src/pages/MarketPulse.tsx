import React from 'react';
import type { StockData, NewsItem } from '../types';
import { MOCK_NEWS } from '../data/mockData';
import { ExternalLink, TrendingUp, TrendingDown, Minus } from 'lucide-react';

interface MarketPulseProps {
  currentStock: StockData;
}

export const MarketPulse: React.FC<MarketPulseProps> = ({ currentStock }) => {
  const newsList: NewsItem[] = MOCK_NEWS[currentStock.symbol] || [
    {
      id: 'default1',
      title: `${currentStock.name} Reaffirms Full Year Operational Guidance and Margin Expansion Targets`,
      publisher: 'Market Wire',
      time: '3 hours ago',
      link: '#',
      sentiment: 'POSITIVE',
      score: 0.72,
    },
    {
      id: 'default2',
      title: `Institutional Analysts Update Consensus Target Price Range for ${currentStock.symbol}`,
      publisher: 'Wall Street Journal',
      time: '6 hours ago',
      link: '#',
      sentiment: 'NEUTRAL',
      score: 0.05,
    },
  ];

  const avgSentiment = newsList.reduce((acc, curr) => acc + curr.score, 0) / (newsList.length || 1);

  return (
    <div style={{ paddingBottom: '30px' }}>
      {/* Title Header */}
      <div
        style={{
          display: 'flex',
          justifyContent: 'space-between',
          alignItems: 'center',
          borderBottom: '1px solid #000000',
          paddingBottom: '10px',
          marginBottom: '20px',
        }}
      >
        <div>
          <div className="mono" style={{ fontSize: '15px', fontWeight: 700, letterSpacing: '0.04em' }}>
            MARKET PULSE & CORPORATE NEWS SENTIMENT
          </div>
          <div style={{ fontSize: '12px', color: '#6B7280' }}>
            NLP rule-based financial sentiment analysis paired with fundamental valuation multiples
          </div>
        </div>

        <div className="mono" style={{ fontSize: '13px', fontWeight: 700, border: '1px solid #000000', padding: '4px 12px' }}>
          {currentStock.symbol} — {currentStock.name}
        </div>
      </div>

      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1.4fr', gap: '28px' }}>
        {/* Left Column: Fundamental Multiples & Solvency */}
        <div>
          <div className="mono" style={{ fontSize: '12px', fontWeight: 700, marginBottom: '8px', letterSpacing: '0.04em' }}>
            EXTENDED VALUATION & OPERATING MULTIPLES
          </div>
          <div style={{ border: '1px solid #E5E7EB', padding: '16px 18px', backgroundColor: '#FFFFFF', marginBottom: '20px' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', padding: '7px 0', borderBottom: '1px solid #F3F4F6', fontSize: '12px' }}>
              <span style={{ color: '#6B7280' }}>Trailing P/E</span>
              <span className="mono" style={{ fontWeight: 600 }}>{currentStock.peRatio}</span>
            </div>
            <div style={{ display: 'flex', justifyContent: 'space-between', padding: '7px 0', borderBottom: '1px solid #F3F4F6', fontSize: '12px' }}>
              <span style={{ color: '#6B7280' }}>Forward P/E</span>
              <span className="mono" style={{ fontWeight: 600 }}>{currentStock.forwardPe}</span>
            </div>
            <div style={{ display: 'flex', justifyContent: 'space-between', padding: '7px 0', borderBottom: '1px solid #F3F4F6', fontSize: '12px' }}>
              <span style={{ color: '#6B7280' }}>PEG Ratio</span>
              <span className="mono" style={{ fontWeight: 600 }}>{currentStock.pegRatio}</span>
            </div>
            <div style={{ display: 'flex', justifyContent: 'space-between', padding: '7px 0', borderBottom: '1px solid #F3F4F6', fontSize: '12px' }}>
              <span style={{ color: '#6B7280' }}>EV / EBITDA</span>
              <span className="mono" style={{ fontWeight: 600 }}>{currentStock.evEbitda}</span>
            </div>
            <div style={{ display: 'flex', justifyContent: 'space-between', padding: '7px 0', borderBottom: '1px solid #F3F4F6', fontSize: '12px' }}>
              <span style={{ color: '#6B7280' }}>Net Profit Margin</span>
              <span className="mono" style={{ fontWeight: 600, color: '#10B981' }}>{currentStock.profitMargin}</span>
            </div>
            <div style={{ display: 'flex', justifyContent: 'space-between', padding: '7px 0', borderBottom: '1px solid #F3F4F6', fontSize: '12px' }}>
              <span style={{ color: '#6B7280' }}>Annual Revenue Growth</span>
              <span className="mono" style={{ fontWeight: 600 }}>{currentStock.revenueGrowth}</span>
            </div>
            <div style={{ display: 'flex', justifyContent: 'space-between', padding: '7px 0', fontSize: '12px' }}>
              <span style={{ color: '#6B7280' }}>Debt to Equity</span>
              <span className="mono" style={{ fontWeight: 600 }}>{currentStock.debtToEquity}</span>
            </div>
          </div>

          {/* Sentiment Summary Card */}
          <div className="mono" style={{ fontSize: '12px', fontWeight: 700, marginBottom: '8px', letterSpacing: '0.04em' }}>
            AGGREGATE NEWS SENTIMENT RATING
          </div>
          <div style={{ border: '1px solid #E5E7EB', padding: '16px 18px', backgroundColor: '#FAFAFA' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '8px' }}>
              <span className="mono" style={{ fontSize: '12px', fontWeight: 700 }}>
                {avgSentiment >= 0.15 ? '🟢 POSITIVE / BULLISH' : (avgSentiment <= -0.15 ? '🔴 NEGATIVE / BEARISH' : '⚪ NEUTRAL')}
              </span>
              <span className="mono" style={{ fontSize: '12px', fontWeight: 700 }}>
                Score: {avgSentiment >= 0 ? '+' : ''}{avgSentiment.toFixed(2)}
              </span>
            </div>
            <div style={{ height: '8px', backgroundColor: '#E5E7EB', width: '100%' }}>
              <div
                style={{
                  height: '100%',
                  width: `${Math.max(10, Math.min(90, (avgSentiment + 1) * 50))}%`,
                  backgroundColor: avgSentiment >= 0 ? '#10B981' : '#EF4444',
                }}
              ></div>
            </div>
            <div style={{ fontSize: '11px', color: '#6B7280', marginTop: '8px' }}>
              Evaluated using domain-specific financial sentiment scoring on recent press disclosures.
            </div>
          </div>
        </div>

        {/* Right Column: Live Headlines Stream */}
        <div>
          <div className="mono" style={{ fontSize: '12px', fontWeight: 700, marginBottom: '8px', letterSpacing: '0.04em' }}>
            REAL-TIME PRESS WIRE HEADLINES
          </div>

          <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
            {newsList.map((item) => (
              <div
                key={item.id}
                style={{
                  border: '1px solid #E5E7EB',
                  padding: '14px 16px',
                  backgroundColor: '#FFFFFF',
                  display: 'flex',
                  flexDirection: 'column',
                  gap: '6px',
                }}
              >
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
                  <a
                    href={item.link}
                    target="_blank"
                    rel="noreferrer"
                    style={{
                      fontSize: '13px',
                      fontWeight: 600,
                      color: '#111827',
                      textDecoration: 'none',
                      lineHeight: 1.4,
                      display: 'flex',
                      alignItems: 'center',
                      gap: '4px',
                    }}
                    onMouseEnter={(e) => (e.currentTarget.style.textDecoration = 'underline')}
                    onMouseLeave={(e) => (e.currentTarget.style.textDecoration = 'none')}
                  >
                    {item.title} <ExternalLink size={12} color="#6B7280" />
                  </a>

                  {/* Sentiment Badge */}
                  <span
                    className="mono"
                    style={{
                      fontSize: '9px',
                      fontWeight: 700,
                      padding: '2px 6px',
                      border: '1px solid',
                      borderColor: item.sentiment === 'POSITIVE' ? '#10B981' : (item.sentiment === 'NEGATIVE' ? '#EF4444' : '#9CA3AF'),
                      color: item.sentiment === 'POSITIVE' ? '#065F46' : (item.sentiment === 'NEGATIVE' ? '#991B1B' : '#374151'),
                      backgroundColor: item.sentiment === 'POSITIVE' ? '#ECFDF5' : (item.sentiment === 'NEGATIVE' ? '#FEF2F2' : '#F9FAFB'),
                      display: 'inline-flex',
                      alignItems: 'center',
                      gap: '3px',
                      whiteSpace: 'nowrap',
                      marginLeft: '12px',
                    }}
                  >
                    {item.sentiment === 'POSITIVE' && <TrendingUp size={10} />}
                    {item.sentiment === 'NEGATIVE' && <TrendingDown size={10} />}
                    {item.sentiment === 'NEUTRAL' && <Minus size={10} />}
                    {item.sentiment} ({item.score >= 0 ? '+' : ''}{item.score.toFixed(2)})
                  </span>
                </div>

                <div className="mono" style={{ fontSize: '10px', color: '#6B7280' }}>
                  {item.publisher} • {item.time}
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
};
