import React, { useState, useEffect } from 'react';
import { fetchTapeQuotes } from '../services/api';

interface TapeItem {
  symbol: string;
  displaySymbol: string;
  price: number;
  change: number;
  currency: string;
}

const INDIAN_TAPE_SYMBOLS = [
  '^NSEI',
  'RELIANCE.NS',
  'TCS.NS',
  'HDFCBANK.NS',
  'INFY.NS',
  'ICICIBANK.NS',
  'BHARTIARTL.NS',
  'SBIN.NS',
];

const DISPLAY_MAP: Record<string, string> = {
  '^NSEI': 'NIFTY 50',
  'RELIANCE.NS': 'RELIANCE',
  'TCS.NS': 'TCS',
  'HDFCBANK.NS': 'HDFC BANK',
  'INFY.NS': 'INFOSYS',
  'ICICIBANK.NS': 'ICICI BANK',
  'BHARTIARTL.NS': 'AIRTEL',
  'SBIN.NS': 'SBI',
};

export const TickerTape: React.FC = () => {
  const [tapeItems, setTapeItems] = useState<TapeItem[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    let isMounted = true;
    fetchTapeQuotes(INDIAN_TAPE_SYMBOLS)
      .then((quotes) => {
        if (!isMounted) return;
        if (quotes.length > 0) {
          const items: TapeItem[] = quotes.map((q) => ({
            symbol: q.symbol,
            displaySymbol: DISPLAY_MAP[q.symbol] || q.symbol.replace('.NS', ''),
            price: q.price,
            change: q.change,
            currency: q.currency === 'USD' ? '$' : '₹',
          }));
          setTapeItems(items);
        }
      })
      .catch(() => {})
      .finally(() => {
        if (isMounted) setIsLoading(false);
      });

    return () => {
      isMounted = false;
    };
  }, []);

  if (tapeItems.length === 0) {
    return (
      <div className="ticker-wrap" style={{ backgroundColor: '#F9FAFB', borderBottom: '1px solid #E5E7EB' }}>
        <div style={{ padding: '6px 24px', fontSize: '11px', color: '#6B7280', fontFamily: 'JetBrains Mono, monospace' }}>
          {isLoading ? '⟳ INITIALIZING LIVE NSE/BSE MARKET TELEMETRY…' : 'LIVE MARKET TELEMETRY OFFLINE (Awaiting connection)'}
        </div>
      </div>
    );
  }

  // Duplicate for seamless loop
  const loopItems = [...tapeItems, ...tapeItems];

  return (
    <div className="ticker-wrap">
      <div className="ticker-inner">
        {loopItems.map((t, i) => {
          const isUp = t.change >= 0;
          const sign = isUp ? '+' : '';
          return (
            <div key={i} className="ticker-item">
              <span className="ticker-symbol">{t.displaySymbol}</span>
              <span className="ticker-price">
                {t.currency}{t.price.toLocaleString('en-IN', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
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
