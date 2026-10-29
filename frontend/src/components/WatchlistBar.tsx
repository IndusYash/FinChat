import React, { useState, useEffect } from 'react';
import { Star, ArrowUpRight, ArrowDownRight, X } from 'lucide-react';
import type { StockData } from '../types';
import { getCurrencySymbol } from '../types';

interface WatchlistBarProps {
  activeSymbol: string;
  currentStock?: StockData;
  onSelectSymbol: (symbol: string) => void;
}

const DEFAULT_WATCHLIST = ['RELIANCE.NS', 'TCS.NS', 'INFY.NS', 'HDFCBANK.NS'];
const STORAGE_KEY = 'finchat_user_watchlist_v2';

export const WatchlistBar: React.FC<WatchlistBarProps> = ({ activeSymbol, currentStock, onSelectSymbol }) => {
  const [watchlist, setWatchlist] = useState<string[]>(() => {
    try {
      const saved = localStorage.getItem(STORAGE_KEY);
      if (saved) {
        const parsed = JSON.parse(saved);
        if (Array.isArray(parsed) && parsed.length > 0) return parsed;
      }
    } catch (_e) {
      // fallback
    }
    return DEFAULT_WATCHLIST;
  });

  useEffect(() => {
    try {
      localStorage.setItem(STORAGE_KEY, JSON.stringify(watchlist));
    } catch (_e) {
      // ignore
    }
  }, [watchlist]);

  const isCurrentBookmarked = watchlist.includes(activeSymbol);

  const toggleCurrentStock = () => {
    if (isCurrentBookmarked) {
      if (watchlist.length > 1) {
        setWatchlist((prev) => prev.filter((s) => s !== activeSymbol));
      }
    } else {
      setWatchlist((prev) => [...prev, activeSymbol]);
    }
  };

  const removeStock = (sym: string, e: React.MouseEvent) => {
    e.stopPropagation();
    if (watchlist.length > 1) {
      setWatchlist((prev) => prev.filter((s) => s !== sym));
    }
  };

  return (
    <div
      style={{
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'space-between',
        flexWrap: 'wrap',
        gap: '8px',
        padding: '6px 10px',
        backgroundColor: '#F9FAFB',
        border: '1px solid #E5E7EB',
        marginBottom: '14px',
      }}
    >
      <div style={{ display: 'flex', alignItems: 'center', gap: '8px', flexWrap: 'wrap' }}>
        <span
          className="mono"
          style={{
            fontSize: '10px',
            fontWeight: 700,
            letterSpacing: '0.04em',
            color: '#4B5563',
            display: 'flex',
            alignItems: 'center',
            gap: '4px',
          }}
        >
          <Star size={11} fill="#F59E0B" color="#F59E0B" /> WATCHLIST:
        </span>

        {watchlist.map((sym) => {
          const isSelected = sym === activeSymbol;
          const liveData = isSelected ? currentStock : undefined;
          const isUp = liveData ? liveData.change >= 0 : true;
          const currSym = liveData ? getCurrencySymbol(liveData) : getCurrencySymbol(sym);

          return (
            <div
              key={sym}
              onClick={() => onSelectSymbol(sym)}
              className="mono"
              style={{
                display: 'flex',
                alignItems: 'center',
                gap: '6px',
                padding: '3px 8px',
                fontSize: '11px',
                fontWeight: 700,
                backgroundColor: isSelected ? '#000000' : '#FFFFFF',
                color: isSelected ? '#FFFFFF' : '#000000',
                border: isSelected ? '1px solid #000000' : '1px solid #D1D5DB',
                cursor: 'pointer',
                transition: 'all 0.15s ease',
              }}
            >
              <span>{sym}</span>
              {liveData && typeof liveData.price === 'number' && (
                <span
                  style={{
                    fontSize: '10px',
                    fontWeight: 600,
                    color: isSelected ? '#93C5FD' : isUp ? '#10B981' : '#EF4444',
                    display: 'flex',
                    alignItems: 'center',
                  }}
                >
                  {currSym}{liveData.price.toFixed(1)}
                  {isUp ? <ArrowUpRight size={10} /> : <ArrowDownRight size={10} />}
                </span>
              )}
              {!isSelected && (
                <span style={{ fontSize: '9px', color: '#9CA3AF', fontWeight: 500 }}>
                  {sym.endsWith('.NS') ? 'NSE' : sym.endsWith('.BO') ? 'BSE' : ''}
                </span>
              )}
              {watchlist.length > 1 && (
                <button
                  type="button"
                  onClick={(e) => removeStock(sym, e)}
                  title={`Remove ${sym} from watchlist`}
                  style={{
                    background: 'none',
                    border: 'none',
                    padding: 0,
                    color: isSelected ? '#9CA3AF' : '#9CA3AF',
                    cursor: 'pointer',
                    display: 'flex',
                    alignItems: 'center',
                  }}
                >
                  <X size={10} />
                </button>
              )}
            </div>
          );
        })}
      </div>

      {/* Bookmark Toggle Button */}
      <button
        type="button"
        onClick={toggleCurrentStock}
        className="mono"
        style={{
          display: 'flex',
          alignItems: 'center',
          gap: '5px',
          padding: '3px 9px',
          fontSize: '10px',
          fontWeight: 700,
          backgroundColor: isCurrentBookmarked ? '#FEF3C7' : '#FFFFFF',
          color: isCurrentBookmarked ? '#92400E' : '#374151',
          border: isCurrentBookmarked ? '1px solid #FCD34D' : '1px solid #D1D5DB',
          cursor: 'pointer',
        }}
      >
        <Star size={11} fill={isCurrentBookmarked ? '#F59E0B' : 'none'} color={isCurrentBookmarked ? '#F59E0B' : '#6B7280'} />
        {isCurrentBookmarked ? '★ BOOKMARKED' : '+ ADD TO WATCHLIST'}
      </button>
    </div>
  );
};
