import React, { useState, useEffect } from 'react';
import { fetchTapeQuotes } from '../services/api';

interface TapeItem {
  symbol: string;
  displaySymbol: string;
  price: number;
  change: number;
  currency: string;
}

const INITIAL_TAPE_ITEMS: TapeItem[] = [
  { symbol: '^NSEI', displaySymbol: 'NIFTY 50', price: 24180.80, change: 0.65, currency: '₹' },
  { symbol: '^BSESN', displaySymbol: 'SENSEX', price: 79942.20, change: 0.60, currency: '₹' },
  { symbol: 'RELIANCE.NS', displaySymbol: 'RELIANCE', price: 1167.40, change: 0.81, currency: '₹' },
  { symbol: 'TCS.NS', displaySymbol: 'TCS', price: 2478.00, change: 0.45, currency: '₹' },
  { symbol: 'HDFCBANK.NS', displaySymbol: 'HDFC BANK', price: 1742.50, change: 0.32, currency: '₹' },
  { symbol: 'INFY.NS', displaySymbol: 'INFOSYS', price: 1146.50, change: -0.28, currency: '₹' },
  { symbol: 'ICICIBANK.NS', displaySymbol: 'ICICI BANK', price: 1265.80, change: 1.15, currency: '₹' },
  { symbol: 'BHARTIARTL.NS', displaySymbol: 'AIRTEL', price: 1680.20, change: 0.92, currency: '₹' },
  { symbol: 'SBIN.NS', displaySymbol: 'SBI', price: 815.40, change: 0.55, currency: '₹' },
  { symbol: 'ITC.NS', displaySymbol: 'ITC', price: 472.30, change: 0.18, currency: '₹' },
  { symbol: 'LT.NS', displaySymbol: 'L&T', price: 3540.00, change: 1.40, currency: '₹' },
  { symbol: 'TATAMOTORS.NS', displaySymbol: 'TATA MOTORS', price: 880.60, change: -0.65, currency: '₹' },
  { symbol: 'HINDUNILVR.NS', displaySymbol: 'HUL', price: 2390.10, change: 0.22, currency: '₹' },
  { symbol: 'BAJFINANCE.NS', displaySymbol: 'BAJAJ FIN', price: 6850.00, change: 0.78, currency: '₹' },
  { symbol: 'MARUTI.NS', displaySymbol: 'MARUTI', price: 11240.00, change: 0.85, currency: '₹' },
  { symbol: 'SUNPHARMA.NS', displaySymbol: 'SUN PHARMA', price: 1820.00, change: 0.42, currency: '₹' },
  { symbol: 'TITAN.NS', displaySymbol: 'TITAN', price: 3280.50, change: -0.30, currency: '₹' },
  { symbol: 'AAPL', displaySymbol: 'APPLE', price: 228.40, change: 0.85, currency: '$' },
  { symbol: 'NVDA', displaySymbol: 'NVIDIA', price: 138.40, change: 2.15, currency: '$' },
  { symbol: 'MSFT', displaySymbol: 'MICROSOFT', price: 428.15, change: 0.62, currency: '$' },
];

const TAPE_SYMBOLS_TO_FETCH = [
  '^NSEI',
  'RELIANCE.NS',
  'TCS.NS',
  'HDFCBANK.NS',
  'INFY.NS',
  'ICICIBANK.NS',
  'BHARTIARTL.NS',
  'SBIN.NS',
  'ITC.NS',
  'LT.NS',
  'TATAMOTORS.NS',
  'AAPL',
  'NVDA',
  'MSFT',
];

export const TickerTape: React.FC = () => {
  const [tapeItems, setTapeItems] = useState<TapeItem[]>(INITIAL_TAPE_ITEMS);

  useEffect(() => {
    let isMounted = true;
    fetchTapeQuotes(TAPE_SYMBOLS_TO_FETCH)
      .then((quotes) => {
        if (!isMounted || quotes.length === 0) return;
        setTapeItems((prev) => {
          const quoteMap = new Map(quotes.map((q) => [q.symbol, q]));
          return prev.map((item) => {
            const live = quoteMap.get(item.symbol);
            if (!live) return item;
            return {
              ...item,
              price: live.price,
              change: live.change !== 0 ? live.change : item.change,
              currency: live.currency === 'USD' ? '$' : '₹',
            };
          });
        });
      })
      .catch(() => {});

    return () => {
      isMounted = false;
    };
  }, []);

  // Seamless infinite loop (duplicated items across 100% translateX)
  const loopItems = [...tapeItems, ...tapeItems];

  return (
    <div className="ticker-wrap" title="Live Market Telemetry (Hover to pause)">
      <div className="ticker-inner">
        {loopItems.map((t, i) => {
          const isUp = t.change >= 0;
          const sign = isUp ? '+' : '';
          return (
            <div key={`${t.symbol}-${i}`} className="ticker-item">
              <span className="ticker-symbol">{t.displaySymbol}</span>
              <span className="ticker-price">
                {t.currency}
                {t.currency === '₹' && t.price > 1000
                  ? t.price.toLocaleString('en-IN', { minimumFractionDigits: 1, maximumFractionDigits: 2 })
                  : t.price.toFixed(2)}
              </span>
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
