import React, { useState } from 'react';
import { Upload, FileText, CheckCircle2, Search, Database } from 'lucide-react';
import type { RagDocument } from '../types';
import { INITIAL_RAG_DOCS } from '../data/mockData';

interface RagVaultProps {
  onDocCountChange: (count: number) => void;
}

export const RagVault: React.FC<RagVaultProps> = ({ onDocCountChange }) => {
  const [docs, setDocs] = useState<RagDocument[]>(INITIAL_RAG_DOCS);
  const [isUploading, setIsUploading] = useState(false);
  const [uploadSuccess, setUploadSuccess] = useState('');
  const [searchQuery, setSearchQuery] = useState('What are the key operational and supply chain risk factors?');
  const [topK, setTopK] = useState(3);
  const [searchResults, setSearchResults] = useState<
    Array<{ source: string; page: number; score: number; snippet: string }>
  >([
    {
      source: 'AAPL_2024_Form_10K_Annual_Report.pdf',
      page: 14,
      score: 0.284,
      snippet:
        'Item 1A. Risk Factors: The Company’s operations and financial results depend significantly on global supply chain networks, semiconductor manufacturing lead times, and single-source component suppliers located in regions subject to trade friction.',
    },
    {
      source: 'TSLA_Q3_2024_Shareholder_Update.pdf',
      page: 8,
      score: 0.345,
      snippet:
        'Cost of goods sold per vehicle decreased to approximately $35,100, its lowest level ever. Continued ramp of Megafactory Lathrop reached 40 GWh annualized run rate, expanding non-automotive energy margin contribution.',
    },
    {
      source: 'CFA_Institutional_Valuation_Handbook.pdf',
      page: 42,
      score: 0.412,
      snippet:
        'Discounted Cash Flow (DCF) intrinsic value estimates are highly sensitive to Terminal Growth rates (g) and the Weighted Average Cost of Capital (WACC). A 100 bps shift in discount rate often impacts equity value by 12% to 18%.',
    },
  ]);

  const handleFileUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = e.target.files;
    if (!files || files.length === 0) return;

    const file = files[0];
    setIsUploading(true);
    setUploadSuccess('');

    setTimeout(() => {
      const estimatedChunks = Math.floor(file.size / 1024 / 4) + 120;
      const newDoc: RagDocument = {
        id: Date.now().toString(),
        name: file.name,
        size: `${(file.size / (1024 * 1024)).toFixed(1)} MB`,
        chunks: estimatedChunks,
        uploadDate: new Date().toISOString().split('T')[0],
      };

      setDocs((prev) => [newDoc, ...prev]);
      setIsUploading(false);
      setUploadSuccess(`Successfully chunked and indexed "${file.name}" into FAISS (${estimatedChunks} vector chunks)!`);
      onDocCountChange(docs.length + 1);
    }, 1200);
  };

  const handleSearch = (e: React.FormEvent) => {
    e.preventDefault();
    if (!searchQuery.trim()) return;

    // Simulate semantic retrieval
    setSearchResults([
      {
        source: docs[0]?.name || 'AAPL_2024_Form_10K_Annual_Report.pdf',
        page: 22,
        score: 0.241,
        snippet: `Retrieved passage for query "${searchQuery}": Financial liquidity remains supported by $29.9B in cash equivalents and marketable securities, offsetting short-term debt maturities and capital expenditures.`,
      },
      {
        source: docs[1]?.name || 'TSLA_Q3_2024_Shareholder_Update.pdf',
        page: 11,
        score: 0.318,
        snippet: `Item 7. Management Discussion: Research and Development expenses expanded 18% year-over-year, driven by compute cluster infrastructure and full self-driving autonomous software stack training.`,
      },
    ].slice(0, topK));
  };

  const totalChunks = docs.reduce((acc, d) => acc + d.chunks, 0);

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
            RAG DOCUMENT VAULT & FAISS VECTOR INDEXER
          </div>
          <div style={{ fontSize: '12px', color: '#6B7280' }}>
            Drag and drop regulatory filings (10-K, 10-Q), investor transcripts, or broker research to expand ground truth
          </div>
        </div>

        <div className="mono" style={{ fontSize: '12px', fontWeight: 700, border: '1px solid #000000', padding: '4px 12px', display: 'flex', alignItems: 'center', gap: '6px' }}>
          <Database size={13} color="#10B981" />
          <span>{totalChunks.toLocaleString()} ACTIVE VECTOR CHUNKS</span>
        </div>
      </div>

      <div style={{ display: 'grid', gridTemplateColumns: '1.2fr 1fr', gap: '28px' }}>
        {/* Left Column: Drag & Drop Ingestion + Document Table */}
        <div>
          {/* Uploader Box */}
          <div className="mono" style={{ fontSize: '12px', fontWeight: 700, marginBottom: '8px', letterSpacing: '0.04em' }}>
            INGEST NEW FINANCIAL PDF
          </div>

          <label
            style={{
              border: '2px dashed #000000',
              padding: '24px',
              display: 'flex',
              flexDirection: 'column',
              alignItems: 'center',
              justifyContent: 'center',
              backgroundColor: '#FAFAFA',
              cursor: isUploading ? 'not-allowed' : 'pointer',
              marginBottom: '16px',
            }}
          >
            <input
              type="file"
              accept=".pdf"
              onChange={handleFileUpload}
              disabled={isUploading}
              style={{ display: 'none' }}
            />
            <Upload size={24} color="#000000" style={{ marginBottom: '8px' }} />
            <div className="mono" style={{ fontSize: '12px', fontWeight: 700, marginBottom: '4px' }}>
              {isUploading ? 'EXTRACTING CHUNKS & COMPUTING EMBEDDINGS...' : 'CLICK OR DRAG PDF TO INGEST'}
            </div>
            <div style={{ fontSize: '11px', color: '#6B7280' }}>
              Supports SEC Form 10-K, 10-Q, Shareholder letters, and Equity Research memos
            </div>
          </label>

          {uploadSuccess && (
            <div
              className="mono"
              style={{
                fontSize: '11px',
                fontWeight: 600,
                color: '#065F46',
                backgroundColor: '#ECFDF5',
                border: '1px solid #10B981',
                padding: '8px 12px',
                marginBottom: '16px',
                display: 'flex',
                alignItems: 'center',
                gap: '6px',
              }}
            >
              <CheckCircle2 size={14} color="#10B981" />
              <span>{uploadSuccess}</span>
            </div>
          )}

          {/* Indexed Documents Table */}
          <div className="mono" style={{ fontSize: '12px', fontWeight: 700, marginBottom: '8px', letterSpacing: '0.04em' }}>
            INDEXED DOCUMENTS IN FAISS VAULT ({docs.length})
          </div>

          <div style={{ border: '1px solid #E5E7EB', backgroundColor: '#FFFFFF' }}>
            <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '12px' }}>
              <thead>
                <tr style={{ backgroundColor: '#F9FAFB', borderBottom: '1px solid #E5E7EB' }}>
                  <th className="mono" style={{ textAlign: 'left', padding: '8px 12px', fontSize: '11px', color: '#6B7280' }}>DOCUMENT NAME</th>
                  <th className="mono" style={{ textAlign: 'right', padding: '8px 12px', fontSize: '11px', color: '#6B7280' }}>CHUNKS</th>
                  <th className="mono" style={{ textAlign: 'right', padding: '8px 12px', fontSize: '11px', color: '#6B7280' }}>STATUS</th>
                </tr>
              </thead>
              <tbody>
                {docs.map((doc) => (
                  <tr key={doc.id} style={{ borderBottom: '1px solid #F3F4F6' }}>
                    <td style={{ padding: '8px 12px', display: 'flex', alignItems: 'center', gap: '6px' }}>
                      <FileText size={13} color="#6B7280" />
                      <span className="mono" style={{ fontWeight: 600, fontSize: '11px' }}>{doc.name}</span>
                    </td>
                    <td className="mono" style={{ textAlign: 'right', padding: '8px 12px', color: '#111827' }}>
                      {doc.chunks}
                    </td>
                    <td className="mono" style={{ textAlign: 'right', padding: '8px 12px', color: '#10B981', fontWeight: 700, fontSize: '10px' }}>
                      INDEXED ✓
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>

        {/* Right Column: Semantic Search Sandbox */}
        <div>
          <div className="mono" style={{ fontSize: '12px', fontWeight: 700, marginBottom: '8px', letterSpacing: '0.04em' }}>
            SEMANTIC RETRIEVAL SANDBOX
          </div>

          <form onSubmit={handleSearch} style={{ marginBottom: '14px' }}>
            <div style={{ display: 'flex', marginBottom: '8px' }}>
              <input
                type="text"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                placeholder="Search semantic passages in FAISS..."
                style={{
                  flex: 1,
                  padding: '9px 12px',
                  border: '1px solid #000000',
                  borderRight: 'none',
                  outline: 'none',
                  fontSize: '12px',
                  fontFamily: 'Inter, sans-serif',
                }}
              />
              <button
                type="submit"
                className="mono"
                style={{
                  backgroundColor: '#000000',
                  color: '#FFFFFF',
                  border: '1px solid #000000',
                  padding: '0 16px',
                  fontSize: '11px',
                  fontWeight: 700,
                  cursor: 'pointer',
                  display: 'flex',
                  alignItems: 'center',
                  gap: '5px',
                }}
              >
                <Search size={12} /> TEST
              </button>
            </div>

            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
              <span className="mono" style={{ fontSize: '10px', color: '#6B7280' }}>
                TOP K RETRIEVAL CHUNKS: {topK}
              </span>
              <input
                type="range"
                min="1"
                max="5"
                value={topK}
                onChange={(e) => setTopK(parseInt(e.target.value))}
                style={{ width: '120px', accentColor: '#000000' }}
              />
            </div>
          </form>

          {/* Results List */}
          <div style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
            {searchResults.map((res, idx) => (
              <div
                key={idx}
                style={{
                  border: '1px solid #E5E7EB',
                  padding: '12px 14px',
                  backgroundColor: '#FFFFFF',
                }}
              >
                <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '4px' }}>
                  <span className="mono" style={{ fontSize: '10px', fontWeight: 700, color: '#000000' }}>
                    #{idx + 1} — {res.source} (p. {res.page})
                  </span>
                  <span className="mono" style={{ fontSize: '9px', color: '#10B981', fontWeight: 700 }}>
                    DIST: {res.score.toFixed(3)}
                  </span>
                </div>
                <div style={{ fontSize: '12px', color: '#374151', lineHeight: 1.5 }}>
                  "{res.snippet}"
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
};
