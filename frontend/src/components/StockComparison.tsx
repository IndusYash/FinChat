import React, { useState } from 'react';
import { ArrowUpRight, ArrowDownRight, Check, Sparkles } from 'lucide-react';
import { STOCK_DATABASE } from '../data/mockData';
import type { StockData } from '../types';

interface StockComparisonProps {
  onSelectStock?: (ticker: string) => void;
}

const PRESET_BASKETS = [
  { name: 'Tech Mega-Caps', tickers: ['AAPL', 'MSFT', 'NVDA'] },
  { name: 'Big Tech Growth', tickers: ['TSLA', 'AMZN', 'GOOGL'] },
  { name: 'High Margin', tickers: ['AAPL', 'NVDA', 'META'] },
];

export const StockComparison: React.FC<StockComparisonProps> = ({ onSelectStock }) => {
  const [selectedTickers, setSelectedTickers] = useState<string[]>(['AAPL', 'MSFT', 'NVDA']);

  const stocks: StockData[] = selectedTickers.map((t) => STOCK_DATABASE[t] || {
    symbol: t,
    name: `${t} Corp.`,
    price: 150.0,
    change: 1.5,
    changePct: 1.0,
    marketCap: '$1.0T',
    peRatio: '25.0',
    forwardPe: '22.0',
    pegRatio: '1.5',
    evEbitda: '18.0',
    debtToEquity: '0.8',
    profitMargin: '20.0%',
    revenueGrowth: '10.0%',
    beta: 1.0,
    buyPct: 70,
    holdPct: 25,
    sellPct: 5,
    points: { '1D': { labels: [], values: [] }, '1W': { labels: [], values: [] }, '1M': { labels: [], values: [] }, '1Y': { labels: [], values: [] } },
  });

  const toggleTicker = (ticker: string) => {
    if (selectedTickers.includes(ticker)) {
      if (selectedTickers.length > 2) {
        setSelectedTickers(selectedTickers.filter((t) => t !== ticker));
      }
    } else {
      if (selectedTickers.length < 3) {
        setSelectedTickers([...selectedTickers, ticker]);
      } else {
        setSelectedTickers([selectedTickers[1], selectedTickers[2], ticker]);
      }
    }
  };

  // Find winners for beginner highlights
  const lowestPe = Math.min(...stocks.map((s) => parseFloat(s.peRatio) || 999));
  const highestBuy = Math.max(...stocks.map((s) => s.buyPct));

  return (
    <div style={{ backgroundColor: '#FFFFFF', border: '1px solid #000000', padding: '20px', marginBottom: '24px' }}>
      {/* Top Bar */}
      <div
        style={{
          display: 'flex',
          justifyContent: 'space-between',
          alignItems: 'center',
          flexWrap: 'wrap',
          gap: '12px',
          borderBottom: '1px solid #000000',
          paddingBottom: '12px',
          marginBottom: '16px',
        }}
      >
        <div>
          <div className="mono" style={{ fontSize: '10px', fontWeight: 700, color: '#6B7280', marginBottom: '2px' }}>
            MULTI-STOCK COMPARISON MATRIX
          </div>
          <h2 className="mono" style={{ fontSize: '16px', fontWeight: 700, margin: 0, color: '#000000' }}>
            Compare Valuation, Margins & Downside Risk
          </h2>
        </div>

        {/* Quick Basket Presets */}
        <div style={{ display: 'flex', gap: '6px' }}>
          {PRESET_BASKETS.map((basket) => (
            <button
              key={basket.name}
              onClick={() => setSelectedTickers(basket.tickers)}
              className="mono"
              style={{
                backgroundColor:
                  selectedTickers.join(',') === basket.tickers.join(',') ? '#000000' : '#F3F4F6',
                color: selectedTickers.join(',') === basket.tickers.join(',') ? '#FFFFFF' : '#374151',
                border: '1px solid #D1D5DB',
                padding: '4px 10px',
                fontSize: '10px',
                fontWeight: 600,
                cursor: 'pointer',
              }}
            >
              {basket.name}
            </button>
          ))}
        </div>
      </div>

      {/* Ticker Selector Chips */}
      <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '18px', flexWrap: 'wrap' }}>
        <span className="mono" style={{ fontSize: '10px', fontWeight: 700, color: '#6B7280' }}>
          SELECT UP TO 3:
        </span>
        {['AAPL', 'MSFT', 'NVDA', 'TSLA', 'AMZN', 'GOOGL', 'META'].map((t) => {
          const isSelected = selectedTickers.includes(t);
          return (
            <button
              key={t}
              onClick={() => toggleTicker(t)}
              className="mono"
              style={{
                backgroundColor: isSelected ? '#000000' : '#FFFFFF',
                color: isSelected ? '#FFFFFF' : '#000000',
                border: '1px solid #000000',
                padding: '3px 10px',
                fontSize: '11px',
                fontWeight: 700,
                cursor: 'pointer',
                display: 'flex',
                alignItems: 'center',
                gap: '4px',
              }}
            >
              {isSelected && <Check size={11} />}
              {t}
            </button>
          );
        })}
      </div>

      {/* Comparison Grid */}
      <div
        style={{
          display: 'grid',
          gridTemplateColumns: `repeat(${stocks.length}, 1fr)`,
          gap: '14px',
          marginBottom: '20px',
        }}
      >
        {stocks.map((stock) => {
          const fairVal = Math.round(stock.price * 1.036);
          const upside = (((fairVal - stock.price) / stock.price) * 100).toFixed(1);
          const isLowestPe = (parseFloat(stock.peRatio) || 999) === lowestPe;
          const isHighestBuy = stock.buyPct === highestBuy;

          return (
            <div
              key={stock.symbol}
              style={{
                border: '2px solid #000000',
                backgroundColor: '#FFFFFF',
                boxShadow: '3px 3px 0px #000000',
                padding: '16px',
              }}
            >
              {/* Header */}
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: '12px' }}>
                <div>
                  <div className="mono" style={{ fontSize: '18px', fontWeight: 700, color: '#000000' }}>
                    {stock.symbol}
                  </div>
                  <div style={{ fontSize: '11px', color: '#6B7280' }}>{stock.name}</div>
                </div>

                <div
                  className="mono"
                  style={{
                    backgroundColor: '#ECFDF5',
                    color: '#065F46',
                    border: '1px solid #10B981',
                    fontSize: '10px',
                    fontWeight: 700,
                    padding: '2px 8px',
                  }}
                >
                  ▲ BULLISH
                </div>
              </div>

              {/* Price & Change */}
              <div style={{ borderBottom: '1px solid #E5E7EB', paddingBottom: '10px', marginBottom: '12px' }}>
                <div className="mono" style={{ fontSize: '20px', fontWeight: 700 }}>
                  ${stock.price.toFixed(2)}
                </div>
                <div
                  className="mono"
                  style={{
                    fontSize: '11px',
                    fontWeight: 600,
                    color: stock.change >= 0 ? '#10B981' : '#EF4444',
                    display: 'flex',
                    alignItems: 'center',
                    gap: '3px',
                  }}
                >
                  {stock.change >= 0 ? <ArrowUpRight size={13} /> : <ArrowDownRight size={13} />}
                  {stock.change >= 0 ? '+' : ''}{stock.change.toFixed(2)} ({stock.changePct}%)
                </div>
              </div>

              {/* Metrics Rows */}
              <div style={{ display: 'flex', flexDirection: 'column', gap: '8px', fontSize: '12px' }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                  <span style={{ color: '#6B7280' }}>Trailing P/E:</span>
                  <span className="mono" style={{ fontWeight: 700, color: isLowestPe ? '#059669' : '#111827' }}>
                    {stock.peRatio}x {isLowestPe && <span style={{ fontSize: '9px', backgroundColor: '#ECFDF5', padding: '1px 4px', border: '1px solid #10B981' }}>BEST VALUE</span>}
                  </span>
                </div>

                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                  <span style={{ color: '#6B7280' }}>Net Margin:</span>
                  <span className="mono" style={{ fontWeight: 700 }}>{stock.profitMargin}</span>
                </div>

                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                  <span style={{ color: '#6B7280' }}>DCF Fair Value:</span>
                  <span className="mono" style={{ fontWeight: 700, color: '#10B981' }}>
                    ${fairVal} (+{upside}%)
                  </span>
                </div>

                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                  <span style={{ color: '#6B7280' }}>Market Cap:</span>
                  <span className="mono" style={{ fontWeight: 700 }}>{stock.marketCap}</span>
                </div>

                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                  <span style={{ color: '#6B7280' }}>Wall St Consensus:</span>
                  <span className="mono" style={{ fontWeight: 700, color: isHighestBuy ? '#059669' : '#111827' }}>
                    {stock.buyPct}% Buy {isHighestBuy && <span style={{ fontSize: '9px', backgroundColor: '#ECFDF5', padding: '1px 4px', border: '1px solid #10B981' }}>TOP RATED</span>}
                  </span>
                </div>

                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                  <span style={{ color: '#6B7280' }}>95% VaR (Risk):</span>
                  <span className="mono" style={{ fontWeight: 700, color: '#EF4444' }}>-12.4%</span>
                </div>
              </div>

              {/* Action Button */}
              {onSelectStock && (
                <button
                  onClick={() => onSelectStock(stock.symbol)}
                  className="mono"
                  style={{
                    width: '100%',
                    backgroundColor: '#FAFAFA',
                    border: '1px solid #000000',
                    padding: '6px',
                    fontSize: '10px',
                    fontWeight: 700,
                    marginTop: '14px',
                    cursor: 'pointer',
                  }}
                >
                  LOAD IN TERMINAL →
                </button>
              )}
            </div>
          );
        })}
      </div>

      {/* Beginner Takeaway Strip */}
      <div
        style={{
          backgroundColor: '#F9FAFB',
          border: '1px solid #E5E7EB',
          padding: '12px 16px',
          display: 'flex',
          alignItems: 'center',
          gap: '10px',
        }}
      >
        <Sparkles size={16} color="#10B981" />
        <div style={{ fontSize: '12px', color: '#374151', lineHeight: 1.45 }}>
          <strong>Beginner Summary:</strong> Comparing these stocks shows <strong>{stocks.find((s) => (parseFloat(s.peRatio) || 999) === lowestPe)?.symbol}</strong> trading at the most attractive valuation multiple ({lowestPe}x P/E), while <strong>{stocks.find((s) => s.buyPct === highestBuy)?.symbol}</strong> holds the highest Wall Street buy consensus ({highestBuy}% Buy).
        </div>
      </div>
    </div>
  );
};
