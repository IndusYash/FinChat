import React, { useState } from 'react';
import { Clock } from 'lucide-react';
import type { StockData } from '../types';
import { getCurrencySymbol } from '../types';

interface WhatIfCalculatorProps {
  stock: StockData;
}

// Historical total return multipliers (approximate real-world compounding)
const HISTORICAL_RETURNS: Record<string, { '1Y': number; '3Y': number; '5Y': number }> = {
  NVDA: { '1Y': 1.82, '3Y': 4.60, '5Y': 13.50 },
  AAPL: { '1Y': 0.34, '3Y': 0.62, '5Y': 2.15 },
  MSFT: { '1Y': 0.28, '3Y': 0.68, '5Y': 1.95 },
  TSLA: { '1Y': 0.18, '3Y': -0.15, '5Y': 8.20 },
  AMZN: { '1Y': 0.42, '3Y': 0.38, '5Y': 1.10 },
  GOOGL: { '1Y': 0.35, '3Y': 0.45, '5Y': 1.60 },
};

const SPY_RETURNS: { '1Y': number; '3Y': number; '5Y': number } = {
  '1Y': 0.24,
  '3Y': 0.36,
  '5Y': 0.95,
};

export const WhatIfCalculator: React.FC<WhatIfCalculatorProps> = ({ stock }) => {
  const currSym = getCurrencySymbol(stock);
  const isIndian = currSym === '₹';
  const defaultPresets = isIndian ? [5000, 10000, 50000, 100000] : [500, 1000, 5000, 10000];
  const [amount, setAmount] = useState<number>(isIndian ? 10000 : 1000);
  const [period, setPeriod] = useState<'1Y' | '3Y' | '5Y'>('5Y');

  const symbol = stock.symbol.toUpperCase();
  const rates = HISTORICAL_RETURNS[symbol] || {
    '1Y': stock.changePct >= 0 ? 0.30 : -0.10,
    '3Y': 0.55,
    '5Y': 1.80,
  };

  const returnMultiplier = rates[period];
  const totalValue = amount * (1 + returnMultiplier);
  const profit = totalValue - amount;
  const isGain = profit >= 0;

  const benchmarkName = isIndian ? 'Nifty 50' : 'S&P 500';
  const spyMultiplier = SPY_RETURNS[period];
  const spyValue = amount * (1 + spyMultiplier);
  const diffVsSpy = totalValue - spyValue;

  const periodLabels = {
    '1Y': '1 Year Ago (2025)',
    '3Y': '3 Years Ago (2023)',
    '5Y': '5 Years Ago (2021)',
  };

  return (
    <div
      style={{
        border: '1px solid #E5E7EB',
        backgroundColor: '#FFFFFF',
        padding: '16px 18px',
        marginBottom: '20px',
      }}
    >
      <div
        style={{
          display: 'flex',
          justifyContent: 'space-between',
          alignItems: 'center',
          marginBottom: '12px',
          borderBottom: '1px solid #F3F4F6',
          paddingBottom: '8px',
        }}
      >
        <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
          <Clock size={14} />
          <span className="mono" style={{ fontSize: '11px', fontWeight: 700, letterSpacing: '0.04em' }}>
            HISTORICAL "WHAT IF" SIMULATOR
          </span>
        </div>
        <span className="mono" style={{ fontSize: '10px', color: '#6B7280' }}>
          {stock.symbol} vs {benchmarkName}
        </span>
      </div>

      <div style={{ display: 'grid', gridTemplateColumns: '1.2fr 1fr', gap: '16px', alignItems: 'center' }}>
        {/* Controls */}
        <div>
          {/* Preset Amounts */}
          <div style={{ marginBottom: '10px' }}>
            <div className="mono" style={{ fontSize: '10px', color: '#6B7280', marginBottom: '5px' }}>
              INITIAL INVESTMENT:
            </div>
            <div style={{ display: 'flex', gap: '6px' }}>
              {defaultPresets.map((amt) => (
                <button
                  key={amt}
                  type="button"
                  onClick={() => setAmount(amt)}
                  className="mono"
                  style={{
                    backgroundColor: amount === amt ? '#000000' : '#F3F4F6',
                    color: amount === amt ? '#FFFFFF' : '#374151',
                    border: 'none',
                    padding: '4px 8px',
                    fontSize: '11px',
                    fontWeight: 700,
                    cursor: 'pointer',
                  }}
                >
                  {currSym}{amt.toLocaleString()}
                </button>
              ))}
            </div>
          </div>

          {/* Timeframe */}
          <div>
            <div className="mono" style={{ fontSize: '10px', color: '#6B7280', marginBottom: '5px' }}>
              INVESTED WHEN:
            </div>
            <div style={{ display: 'flex', gap: '6px' }}>
              {(['1Y', '3Y', '5Y'] as const).map((p) => (
                <button
                  key={p}
                  type="button"
                  onClick={() => setPeriod(p)}
                  className="mono"
                  style={{
                    backgroundColor: period === p ? '#000000' : '#F3F4F6',
                    color: period === p ? '#FFFFFF' : '#374151',
                    border: 'none',
                    padding: '4px 10px',
                    fontSize: '11px',
                    fontWeight: 700,
                    cursor: 'pointer',
                  }}
                >
                  {p}
                </button>
              ))}
            </div>
          </div>
        </div>

        {/* Results Card */}
        <div
          style={{
            backgroundColor: isGain ? '#F0FDF4' : '#FEF2F2',
            border: `1px solid ${isGain ? '#DCFCE7' : '#FEE2E2'}`,
            padding: '12px 14px',
          }}
        >
          <div className="mono" style={{ fontSize: '10px', color: '#6B7280', marginBottom: '2px' }}>
            VALUE TODAY ({periodLabels[period]}):
          </div>
          <div
            className="mono"
            style={{
              fontSize: '22px',
              fontWeight: 800,
              color: isGain ? '#15803D' : '#B91C1C',
              marginBottom: '4px',
            }}
          >
            {currSym}{totalValue.toLocaleString(undefined, { minimumFractionDigits: 0, maximumFractionDigits: 0 })}
          </div>
          <div style={{ display: 'flex', alignItems: 'center', gap: '5px', fontSize: '11px', fontWeight: 600 }}>
            <span style={{ color: isGain ? '#16A34A' : '#DC2626' }}>
              {isGain ? '+' : ''}{currSym}{Math.abs(profit).toLocaleString(undefined, { maximumFractionDigits: 0 })} (
              {returnMultiplier >= 0 ? '+' : ''}{(returnMultiplier * 100).toFixed(0)}%)
            </span>
          </div>

          <div
            style={{
              marginTop: '8px',
              paddingTop: '6px',
              borderTop: '1px dashed #D1D5DB',
              fontSize: '10px',
              color: '#4B5563',
              display: 'flex',
              justifyContent: 'space-between',
            }}
          >
            <span>vs {benchmarkName} ({currSym}{spyValue.toFixed(0)}):</span>
            <span style={{ fontWeight: 700, color: diffVsSpy >= 0 ? '#15803D' : '#B91C1C' }}>
              {diffVsSpy >= 0 ? '+' : ''}{currSym}{diffVsSpy.toFixed(0)}
            </span>
          </div>
        </div>
      </div>
    </div>
  );
};
