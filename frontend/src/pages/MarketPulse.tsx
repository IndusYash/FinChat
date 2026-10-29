import React from 'react';
import type { StockData, NewsItem } from '../types';
import { ExternalLink, TrendingUp, TrendingDown, Minus, AlertCircle, Newspaper } from 'lucide-react';

interface MarketPulseProps {
  currentStock: StockData;
}

export const MarketPulse: React.FC<MarketPulseProps> = ({ currentStock }) => {
  const liveNews: NewsItem[] = currentStock.news || [];
  const hasNews = liveNews.length > 0;

  const avgSentiment = hasNews
    ? liveNews.reduce((acc, curr) => acc + curr.score, 0) / liveNews.length
    : 0;

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
            Live provider press releases paired with fundamental valuation multiples
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
            {hasNews ? (
              <>
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
                  Derived from {liveNews.length} live headline{liveNews.length === 1 ? '' : 's'} via market data feed.
                </div>
              </>
            ) : (
              <div style={{ fontSize: '11px', color: '#6B7280', display: 'flex', alignItems: 'center', gap: '6px' }}>
                <AlertCircle size={14} color="#9CA3AF" />
                <span>No live news sentiment available for {currentStock.symbol}.</span>
              </div>
            )}
          </div>
        </div>

        {/* Right Column: Live Headlines Stream */}
        <div>
          <div
            style={{
              display: 'flex',
              justifyContent: 'space-between',
              alignItems: 'center',
              marginBottom: '8px',
            }}
          >
            <div className="mono" style={{ fontSize: '12px', fontWeight: 700, letterSpacing: '0.04em' }}>
              REAL-TIME PRESS WIRE HEADLINES
            </div>
            {hasNews && (
              <span
                className="mono"
                style={{
                  fontSize: '9px',
                  fontWeight: 700,
                  backgroundColor: '#ECFDF5',
                  color: '#065F46',
                  border: '1px solid #10B981',
                  padding: '1px 6px',
                }}
              >
                LIVE PROVIDER NEWS
              </span>
            )}
          </div>

          {!hasNews ? (
            <div
              style={{
                border: '1px dashed #D1D5DB',
                padding: '36px 20px',
                backgroundColor: '#F9FAFB',
                textAlign: 'center',
                color: '#6B7280',
              }}
            >
              <Newspaper size={28} color="#9CA3AF" style={{ margin: '0 auto 10px', display: 'block' }} />
              <div className="mono" style={{ fontSize: '12px', fontWeight: 700, color: '#111827', marginBottom: '4px' }}>
                NO LIVE HEADLINES RETURNED
              </div>
              <div style={{ fontSize: '11px', maxWidth: '340px', margin: '0 auto' }}>
                The live market data provider did not return recent news articles for {currentStock.symbol}. Mock headlines are suppressed to prevent misinformation.
              </div>
            </div>
          ) : (
            <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
              {liveNews.map((item) => (
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
                      href={item.link && item.link !== '#' ? item.link : undefined}
                      target={item.link && item.link !== '#' ? '_blank' : undefined}
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
                        cursor: item.link && item.link !== '#' ? 'pointer' : 'default',
                      }}
                      onMouseEnter={(e) => {
                        if (item.link && item.link !== '#') e.currentTarget.style.textDecoration = 'underline';
                      }}
                      onMouseLeave={(e) => (e.currentTarget.style.textDecoration = 'none')}
                    >
                      {item.title} {item.link && item.link !== '#' && <ExternalLink size={12} color="#6B7280" />}
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
                    {item.publisher} {item.time ? `• ${item.time}` : ''}
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  );
};
