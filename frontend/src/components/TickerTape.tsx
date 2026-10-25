import React from 'react';

interface TickerEntry {
  symbol: string;
  price: number;
  change: number;
}

const TICKERS: TickerEntry[] = [
  { symbol: 'AAPL',  price: 213.49, change:  1.12 },
  { symbol: 'MSFT',  price: 448.71, change:  2.34 },
  { symbol: 'NVDA',  price: 134.25, change:  3.21 },
  { symbol: 'TSLA',  price: 248.50, change: -1.80 },
  { symbol: 'AMZN',  price: 228.14, change:  0.87 },
  { symbol: 'GOOGL', price: 188.93, change:  1.05 },
  { symbol: 'META',  price: 611.42, change:  2.14 },
  { symbol: 'JPM',   price: 258.63, change:  0.43 },
  { symbol: 'SPY',   price: 585.20, change:  0.62 },
  { symbol: 'QQQ',   price: 503.38, change:  0.91 },
];

// Duplicate for seamless loop
const ITEMS = [...TICKERS, ...TICKERS];

export const TickerTape: React.FC = () => {
  return (
    <div className="ticker-wrap">
      <div className="ticker-inner">
        {ITEMS.map((t, i) => {
          const isUp = t.change >= 0;
          const sign = isUp ? '+' : '';
          return (
            <div key={i} className="ticker-item">
              <span className="ticker-symbol">{t.symbol}</span>
              <span className="ticker-price">${t.price.toFixed(2)}</span>
              <span className={isUp ? 'ticker-up' : 'ticker-down'}>
                {sign}{t.change.toFixed(2)}%
              </span>
            </div>
          );
        })}
      </div>
    </div>
  );
};
