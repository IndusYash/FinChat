import React from 'react';
import { Layers } from 'lucide-react';

export type TabType = 'HOME' | 'TERMINAL' | 'QUANT_LAB' | 'CAPITAL_LAB' | 'NEWS' | 'RAG_VAULT' | 'SYS_ARCH';

interface HeaderProps {
  activeTab: TabType;
  onTabChange: (tab: TabType) => void;
  activeSymbol: string;
  docCount: number;
}

export const Header: React.FC<HeaderProps> = ({ activeTab, onTabChange, activeSymbol }) => {
  const tabs: { key: TabType; label: string }[] = [
    { key: 'HOME',        label: '💬 Home'       },
    { key: 'TERMINAL',    label: '📊 Terminal'   },
    { key: 'QUANT_LAB',   label: '🔬 Quant Lab'  },
    { key: 'CAPITAL_LAB', label: '💰 Capital Lab' },
    { key: 'NEWS',        label: '📰 News'        },
    { key: 'RAG_VAULT',   label: '📚 RAG Vault'  },
    { key: 'SYS_ARCH',    label: '⚙️ Architecture' },
  ];

  return (
    <header
      style={{
        display: 'flex',
        justifyContent: 'space-between',
        alignItems: 'center',
        borderBottom: '2px solid #000000',
        paddingBottom: '10px',
        marginBottom: '20px',
      }}
    >
      {/* Brand */}
      <div
        onClick={() => onTabChange('HOME')}
        style={{ display: 'flex', alignItems: 'center', gap: '7px', cursor: 'pointer', flexShrink: 0 }}
      >
        <Layers size={17} strokeWidth={2.5} />
        <span className="mono" style={{ fontSize: '16px', fontWeight: 700, letterSpacing: '0.04em' }}>
          FINCHAT
        </span>
      </div>

      {/* Center nav */}
      <nav style={{ display: 'flex', border: '1px solid #000000' }}>
        {tabs.map((tab, idx) => (
          <button
            key={tab.key}
            onClick={() => onTabChange(tab.key)}
            className="mono"
            style={{
              backgroundColor: activeTab === tab.key ? '#000000' : '#FFFFFF',
              color:           activeTab === tab.key ? '#FFFFFF' : '#000000',
              border: 'none',
              borderRight: idx === tabs.length - 1 ? 'none' : '1px solid #000000',
              padding: '5px 12px',
              fontSize: '11px',
              fontWeight: 700,
              cursor: 'pointer',
              letterSpacing: '0.03em',
              whiteSpace: 'nowrap',
            }}
          >
            {tab.label}
          </button>
        ))}
      </nav>

      {/* Single compact status — only shows when a stock is active */}
      {activeTab !== 'HOME' && (
        <div
          className="mono"
          style={{
            fontSize: '10px',
            fontWeight: 600,
            border: '1px solid #D1D5DB',
            padding: '4px 9px',
            letterSpacing: '0.04em',
            color: '#6B7280',
            flexShrink: 0,
            display: 'flex',
            alignItems: 'center',
            gap: '5px',
          }}
        >
          <span style={{ width: '6px', height: '6px', backgroundColor: '#10B981', display: 'inline-block' }} />
          {activeSymbol}
        </div>
      )}
    </header>
  );
};
