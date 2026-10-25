import React, { useState, useEffect } from 'react';
import {
  MessageSquare,
  Compass,
  Calculator,
  Sparkles,
  ShieldCheck,
  Play,
  RotateCcw,
  ArrowDown,
  CheckCircle,
  Cpu,
  Cloud,
  Database,
  Layers,
  Zap,
} from 'lucide-react';

interface VerticalStep {
  step: number;
  id: string;
  badge: string;
  title: string;
  shortDesc: string;
  icon: React.ReactNode;
  color: string;
  bgColor: string;
  borderColor: string;
  whatHappens: string;
  realExample: {
    inputLabel: string;
    inputValue: string;
    outputLabel: string;
    outputValue: string;
  };
  whyItMatters: string;
}

const VERTICAL_STEPS: VerticalStep[] = [
  {
    step: 1,
    id: 'step-inquiry',
    badge: 'STAGE 01',
    title: 'Your Financial Question',
    shortDesc: 'Ask naturally about any global stock',
    icon: <MessageSquare size={18} color="#2563EB" />,
    color: '#2563EB',
    bgColor: '#EFF6FF',
    borderColor: '#BFDBFE',
    whatHappens:
      'You type a real-world question in plain English. There is no need to write code, select complicated tickers, or memorize formulas.',
    realExample: {
      inputLabel: 'User asks',
      inputValue: '"Is Apple undervalued right now? Check their 10-K filings for China supply chain risks and give me a DCF fair value."',
      outputLabel: 'System detects',
      outputValue: 'Ticker: AAPL • Required analysis: [Intrinsic DCF Model, SEC 10-K Filing Audit, Live Price Snapshot]',
    },
    whyItMatters: 'Zero learning curve — speak to FinChat like an institutional research analyst.',
  },
  {
    step: 2,
    id: 'step-dispatch',
    badge: 'STAGE 02',
    title: 'Autonomous Agent Dispatcher',
    shortDesc: 'Breaks prompt into a clear execution plan',
    icon: <Compass size={18} color="#7C3AED" />,
    color: '#7C3AED',
    bgColor: '#F5F3FF',
    borderColor: '#DDD6FE',
    whatHappens:
      'The agent reads your request and decides which specialist financial tools to trigger. It creates an orderly checklist instead of guessing.',
    realExample: {
      inputLabel: 'Agent reasoning',
      inputValue: '"To evaluate Apple, I need live market data, deterministic DCF valuation calculations, and primary SEC regulatory filings."',
      outputLabel: 'Selected tools',
      outputValue: '1. get_live_quote(AAPL)  2. run_dcf_valuation(AAPL)  3. search_sec_filings("supply chain China")',
    },
    whyItMatters: 'Prevents shallow one-line answers by systematically gathering evidence first.',
  },
  {
    step: 3,
    id: 'step-specialists',
    badge: 'STAGE 03',
    title: 'Three Dedicated Financial Engines',
    shortDesc: 'Runs math and document search in parallel',
    icon: <Calculator size={18} color="#059669" />,
    color: '#059669',
    bgColor: '#ECFDF5',
    borderColor: '#A7F3D0',
    whatHappens:
      'Three dedicated engines run side-by-side:\n• Quantitative Engine: Calculates DCF cash flows & 1,000 Monte Carlo price simulations using verified math formulas.\n• RAG Vault: Scans official SEC 10-K filings for exact sentences.\n• Market Feed: Retrieves real-time stock prices and news sentiment.',
    realExample: {
      inputLabel: 'Engines compute',
      inputValue: '• DCF Model: 5-yr cash flows discounted @ 9% WACC = $194.20 fair value\n• 10-K Search: Retrieved Item 1A (Risk Factors), Page 38\n• Live Telemetry: Last trade $187.50 (+1.32%)',
      outputLabel: 'Resulting data packet',
      outputValue: 'Verified numerical math + primary regulatory source quotes combined.',
    },
    whyItMatters: '100% mathematical integrity because financial formulas are isolated from text generation.',
  },
  {
    step: 4,
    id: 'step-reasoning',
    badge: 'STAGE 04',
    title: 'Financial Reasoning Core',
    shortDesc: 'Connects the math, documents, and live market',
    icon: <Sparkles size={18} color="#D97706" />,
    color: '#D97706',
    bgColor: '#FFFBEB',
    borderColor: '#FDE68A',
    whatHappens:
      'The reasoning engine synthesizes the raw outputs: it weighs the DCF valuation against the live trading price and verifies management statements from SEC filings.',
    realExample: {
      inputLabel: 'Synthesis process',
      inputValue: 'Comparing DCF fair value ($194.20) against current price ($187.50) indicates a +3.6% margin of safety, while 10-K notes concentration risks.',
      outputLabel: 'Synthesized thesis',
      outputValue: 'Constructive fundamental upside tempered by documented regulatory and manufacturing dependencies.',
    },
    whyItMatters: 'Translates numbers and filing pages into actionable executive insights.',
  },
  {
    step: 5,
    id: 'step-verdict',
    badge: 'STAGE 05',
    title: 'Institutional Verdict & Results',
    shortDesc: 'Clean stance, target price range & audit citations',
    icon: <ShieldCheck size={18} color="#DC2626" />,
    color: '#DC2626',
    bgColor: '#FEF2F2',
    borderColor: '#FECACA',
    whatHappens:
      'The final answer is formatted cleanly with an investment stance (Bullish/Bearish/Neutral), an estimated price corridor, and clickable citations to official documents.',
    realExample: {
      inputLabel: 'Final answer cards',
      inputValue: '▲ BULLISH Stance • Target Corridor: $180 – $207 • Margin of Safety: +3.6%',
      outputLabel: 'Audit traceability',
      outputValue: 'Source verified: SEC 10-K FY2024, Page 38 (Item 1A Risk Factors)',
    },
    whyItMatters: 'Every conclusion is verifiable and grounded in primary financial records.',
  },
];

export const SystemArchitecture: React.FC = () => {
  const [activeStep, setActiveStep] = useState<number>(1);
  const [isPlaying, setIsPlaying] = useState<boolean>(false);
  const [highlightPillar, setHighlightPillar] = useState<string | null>(null);

  useEffect(() => {
    let timer: ReturnType<typeof setInterval>;
    if (isPlaying) {
      timer = setInterval(() => {
        setActiveStep((prev) => {
          if (prev >= 5) {
            setIsPlaying(false);
            return 5;
          }
          return prev + 1;
        });
      }, 1600);
    }
    return () => clearInterval(timer);
  }, [isPlaying]);

  const handleStartFlow = () => {
    setActiveStep(1);
    setIsPlaying(true);
  };

  const handleReset = () => {
    setIsPlaying(false);
    setActiveStep(1);
  };

  const current = VERTICAL_STEPS.find((s) => s.step === activeStep) || VERTICAL_STEPS[0];

  return (
    <div style={{ maxWidth: '1100px', margin: '0 auto', paddingBottom: '48px' }}>

      {/* ══════════════════════════════════════════════════════════ */}
      {/* ── PART 1: HIGH-LEVEL ARCHITECTURE FLOWCHART ──────────── */}
      {/* ══════════════════════════════════════════════════════════ */}
      <div
        style={{
          backgroundColor: '#FFFFFF',
          border: '2px solid #000000',
          padding: '24px 28px',
          marginBottom: '32px',
          boxShadow: '4px 4px 0px #000000',
        }}
      >
        {/* Section Tag & Heading */}
        <div style={{ textAlign: 'center', marginBottom: '24px' }}>
          <div
            className="mono"
            style={{
              display: 'inline-flex',
              alignItems: 'center',
              gap: '6px',
              fontSize: '10px',
              fontWeight: 700,
              letterSpacing: '0.08em',
              color: '#6B7280',
              marginBottom: '6px',
              textTransform: 'uppercase',
            }}
          >
            <Layers size={13} color="#10B981" /> Architecture Blueprint
          </div>
          <h1 className="mono" style={{ fontSize: '22px', fontWeight: 700, margin: '0 0 6px 0', color: '#000000' }}>
            Fine-Tuned LLaMA + External LLM + Regulatory RAG
          </h1>
          <p style={{ fontSize: '13px', color: '#6B7280', margin: 0, maxWidth: '620px', marginInline: 'auto', lineHeight: 1.5 }}>
            How FinChat blends local fine-tuned weights, external macro reasoning models, and dense vector regulatory search into a unified copilot.
          </p>
        </div>

        {/* ── Visual Flowchart Diagram ─────────────────────────── */}
        <div
          style={{
            backgroundColor: '#FAFAFA',
            border: '1px solid #E5E7EB',
            padding: '24px',
            position: 'relative',
          }}
        >
          {/* Top Level: User Prompt Intake */}
          <div style={{ display: 'flex', justifyContent: 'center', marginBottom: '12px' }}>
            <div
              style={{
                backgroundColor: '#FFFFFF',
                border: '2px solid #000000',
                padding: '10px 24px',
                textAlign: 'center',
                boxShadow: '2px 2px 0px #000000',
                maxWidth: '460px',
                width: '100%',
              }}
            >
              <div className="mono" style={{ fontSize: '9px', fontWeight: 700, color: '#6B7280', marginBottom: '2px' }}>
                INTAKE INTERFACE
              </div>
              <div className="mono" style={{ fontSize: '13px', fontWeight: 700, color: '#000000' }}>
                Natural Language Financial Query
              </div>
            </div>
          </div>

          {/* Connector Down */}
          <div style={{ display: 'flex', justifyContent: 'center', marginBottom: '12px' }}>
            <ArrowDown size={18} color="#000000" strokeWidth={2.5} />
          </div>

          {/* Middle Level: The 3 Core Pillars (LLaMA + RAG + External LLM) */}
          <div
            style={{
              display: 'grid',
              gridTemplateColumns: 'repeat(3, 1fr)',
              gap: '16px',
              marginBottom: '16px',
            }}
          >
            {/* Pillar 1: Fine-Tuned LLaMA */}
            <div
              onMouseEnter={() => setHighlightPillar('llama')}
              onMouseLeave={() => setHighlightPillar(null)}
              style={{
                backgroundColor: highlightPillar === 'llama' ? '#EFF6FF' : '#FFFFFF',
                border: highlightPillar === 'llama' ? '2px solid #2563EB' : '1px solid #D1D5DB',
                padding: '16px',
                transition: 'all 0.15s ease',
                position: 'relative',
              }}
            >
              <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '8px' }}>
                <div style={{ padding: '6px', backgroundColor: '#EFF6FF', border: '1px solid #BFDBFE' }}>
                  <Cpu size={16} color="#2563EB" />
                </div>
                <div>
                  <div className="mono" style={{ fontSize: '9px', fontWeight: 700, color: '#2563EB' }}>
                    LOCAL INFERENCE (CPU)
                  </div>
                  <div className="mono" style={{ fontSize: '12px', fontWeight: 700, color: '#000000' }}>
                    Fine-Tuned LLaMA
                  </div>
                </div>
              </div>
              <div style={{ fontSize: '11px', color: '#4B5563', lineHeight: 1.5, marginBottom: '8px' }}>
                Specialized 4-bit quantized model for sub-40ms entity extraction, ticker parsing & intent routing without cloud lag.
              </div>
              <div className="mono" style={{ fontSize: '9px', color: '#6B7280', fontWeight: 600 }}>
                • 0ms Cloud API Latency<br />• Autonomous Tool Dispatching
              </div>
            </div>

            {/* Pillar 2: Regulatory RAG (FAISS) */}
            <div
              onMouseEnter={() => setHighlightPillar('rag')}
              onMouseLeave={() => setHighlightPillar(null)}
              style={{
                backgroundColor: highlightPillar === 'rag' ? '#ECFDF5' : '#FFFFFF',
                border: highlightPillar === 'rag' ? '2px solid #059669' : '1px solid #D1D5DB',
                padding: '16px',
                transition: 'all 0.15s ease',
                position: 'relative',
              }}
            >
              <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '8px' }}>
                <div style={{ padding: '6px', backgroundColor: '#ECFDF5', border: '1px solid #A7F3D0' }}>
                  <Database size={16} color="#059669" />
                </div>
                <div>
                  <div className="mono" style={{ fontSize: '9px', fontWeight: 700, color: '#059669' }}>
                    VECTOR KNOWLEDGE BASE
                  </div>
                  <div className="mono" style={{ fontSize: '12px', fontWeight: 700, color: '#000000' }}>
                    Regulatory RAG Vault
                  </div>
                </div>
              </div>
              <div style={{ fontSize: '11px', color: '#4B5563', lineHeight: 1.5, marginBottom: '8px' }}>
                FAISS FlatL2 vector search indexing SEC 10-K filings with sentence-level boundaries and exact page citations.
              </div>
              <div className="mono" style={{ fontSize: '9px', color: '#6B7280', fontWeight: 600 }}>
                • Verbatim Source Auditing<br />• 18,400+ Vector Chunks
              </div>
            </div>

            {/* Pillar 3: External LLM */}
            <div
              onMouseEnter={() => setHighlightPillar('cloud')}
              onMouseLeave={() => setHighlightPillar(null)}
              style={{
                backgroundColor: highlightPillar === 'cloud' ? '#FFFBEB' : '#FFFFFF',
                border: highlightPillar === 'cloud' ? '2px solid #D97706' : '1px solid #D1D5DB',
                padding: '16px',
                transition: 'all 0.15s ease',
                position: 'relative',
              }}
            >
              <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '8px' }}>
                <div style={{ padding: '6px', backgroundColor: '#FFFBEB', border: '1px solid #FDE68A' }}>
                  <Cloud size={16} color="#D97706" />
                </div>
                <div>
                  <div className="mono" style={{ fontSize: '9px', fontWeight: 700, color: '#D97706' }}>
                    CLOUD REASONING API
                  </div>
                  <div className="mono" style={{ fontSize: '12px', fontWeight: 700, color: '#000000' }}>
                    External Macro LLM
                  </div>
                </div>
              </div>
              <div style={{ fontSize: '11px', color: '#4B5563', lineHeight: 1.5, marginBottom: '8px' }}>
                High-parameter reasoning model invoked on demand for complex multi-variable macroeconomic synthesis.
              </div>
              <div className="mono" style={{ fontSize: '9px', color: '#6B7280', fontWeight: 600 }}>
                • High-Parameter Reasoning<br />• Cross-Sector Context
              </div>
            </div>
          </div>

          {/* Tool Calling Bus Layer */}
          <div
            style={{
              backgroundColor: '#FFFFFF',
              border: '2px solid #7C3AED',
              padding: '12px 18px',
              marginBottom: '14px',
              boxShadow: '3px 3px 0px #7C3AED',
            }}
          >
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '8px' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                <Zap size={16} color="#7C3AED" />
                <span className="mono" style={{ fontSize: '12px', fontWeight: 700, color: '#7C3AED' }}>
                  AUTONOMOUS TOOL CALLING BUS (agent_engine.py)
                </span>
              </div>
              <span className="mono" style={{ fontSize: '9px', fontWeight: 600, color: '#6B7280' }}>
                ReAct Execution Cycle
              </span>
            </div>
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: '8px' }}>
              <div style={{ backgroundColor: '#F5F3FF', border: '1px solid #DDD6FE', padding: '6px 8px' }}>
                <div className="mono" style={{ fontSize: '9px', fontWeight: 700, color: '#7C3AED' }}>TOOL 01</div>
                <div className="mono" style={{ fontSize: '10px', fontWeight: 700, color: '#000000' }}>run_dcf_valuation</div>
                <div style={{ fontSize: '9px', color: '#6B7280' }}>NumPy 5-Yr Cash Discounting</div>
              </div>
              <div style={{ backgroundColor: '#F5F3FF', border: '1px solid #DDD6FE', padding: '6px 8px' }}>
                <div className="mono" style={{ fontSize: '9px', fontWeight: 700, color: '#7C3AED' }}>TOOL 02</div>
                <div className="mono" style={{ fontSize: '10px', fontWeight: 700, color: '#000000' }}>run_monte_carlo</div>
                <div style={{ fontSize: '9px', color: '#6B7280' }}>1,000 Stochastic Price Paths</div>
              </div>
              <div style={{ backgroundColor: '#F5F3FF', border: '1px solid #DDD6FE', padding: '6px 8px' }}>
                <div className="mono" style={{ fontSize: '9px', fontWeight: 700, color: '#7C3AED' }}>TOOL 03</div>
                <div className="mono" style={{ fontSize: '10px', fontWeight: 700, color: '#000000' }}>search_knowledge_base</div>
                <div style={{ fontSize: '9px', color: '#6B7280' }}>FAISS Dense SEC 10-K Retrieval</div>
              </div>
              <div style={{ backgroundColor: '#F5F3FF', border: '1px solid #DDD6FE', padding: '6px 8px' }}>
                <div className="mono" style={{ fontSize: '9px', fontWeight: 700, color: '#7C3AED' }}>TOOL 04</div>
                <div className="mono" style={{ fontSize: '10px', fontWeight: 700, color: '#000000' }}>get_live_quote & news</div>
                <div style={{ fontSize: '9px', color: '#6B7280' }}>Real-time Quotes & Sentiment</div>
              </div>
            </div>
          </div>

          {/* Connector Down */}
          <div style={{ display: 'flex', justifyContent: 'center', marginBottom: '12px' }}>
            <ArrowDown size={18} color="#000000" strokeWidth={2.5} />
          </div>

          {/* Bottom Level: Synthesized Output */}
          <div style={{ display: 'flex', justifyContent: 'center' }}>
            <div
              style={{
                backgroundColor: '#FFFFFF',
                border: '2px solid #000000',
                padding: '12px 28px',
                textAlign: 'center',
                boxShadow: '3px 3px 0px #000000',
                maxWidth: '520px',
                width: '100%',
              }}
            >
              <div className="mono" style={{ fontSize: '9px', fontWeight: 700, color: '#10B981', marginBottom: '2px' }}>
                OUTPUT LAYER (PYDANTIC TYPE-SAFE)
              </div>
              <div className="mono" style={{ fontSize: '14px', fontWeight: 700, color: '#000000' }}>
                Institutional Valuation Copilot
              </div>
              <div style={{ fontSize: '11px', color: '#6B7280', marginTop: '3px' }}>
                Stance Badge (▲ Bullish) • Target Corridor ($180–$207) • SEC 10-K Citations
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* ══════════════════════════════════════════════════════════ */}
      {/* ── PART 2: VERTICAL EXECUTION PIPELINE (SEE IT IN ACTION) ── */}
      {/* ══════════════════════════════════════════════════════════ */}
      <div
        style={{
          backgroundColor: '#FFFFFF',
          border: '2px solid #000000',
          padding: '20px 24px',
          boxShadow: '4px 4px 0px #000000',
        }}
      >
        {/* Step Runner Controls */}
        <div
          style={{
            display: 'flex',
            justifyContent: 'space-between',
            alignItems: 'center',
            marginBottom: '20px',
            borderBottom: '1px solid #000000',
            paddingBottom: '14px',
            flexWrap: 'wrap',
            gap: '12px',
          }}
        >
          <div>
            <div
              className="mono"
              style={{
                fontSize: '10px',
                fontWeight: 700,
                letterSpacing: '0.08em',
                color: '#6B7280',
                marginBottom: '2px',
              }}
            >
              INTERACTIVE REQUEST SIMULATION
            </div>
            <h2 className="mono" style={{ fontSize: '16px', fontWeight: 700, margin: 0, color: '#000000' }}>
              Step-by-Step Vertical Execution Pipeline
            </h2>
          </div>

          <div style={{ display: 'flex', gap: '8px' }}>
            <button
              onClick={handleStartFlow}
              disabled={isPlaying}
              className="mono"
              style={{
                backgroundColor: '#000000',
                color: '#FFFFFF',
                border: '2px solid #000000',
                padding: '6px 14px',
                fontSize: '11px',
                fontWeight: 700,
                cursor: isPlaying ? 'not-allowed' : 'pointer',
                display: 'flex',
                alignItems: 'center',
                gap: '6px',
              }}
            >
              <Play size={12} /> {isPlaying ? `RUNNING STAGE ${activeStep} / 5...` : '▶ ANIMATE FLOW'}
            </button>
            <button
              onClick={handleReset}
              className="mono"
              style={{
                backgroundColor: '#FFFFFF',
                color: '#000000',
                border: '1px solid #000000',
                padding: '6px 10px',
                fontSize: '11px',
                fontWeight: 700,
                cursor: 'pointer',
                display: 'flex',
                alignItems: 'center',
                gap: '4px',
              }}
            >
              <RotateCcw size={11} /> RESET
            </button>
          </div>
        </div>

        {/* ── Two-Column Vertical Flow ──────────────────────────── */}
        <div style={{ display: 'grid', gridTemplateColumns: '1.05fr 1.15fr', gap: '24px', alignItems: 'start' }}>

          {/* Left Column: Vertical Step Sequence */}
          <div style={{ display: 'flex', flexDirection: 'column' }}>
            {VERTICAL_STEPS.map((s, idx) => {
              const isSelected = activeStep === s.step;
              const isCompleted = activeStep > s.step;

              return (
                <React.Fragment key={s.id}>
                  {/* Step Card */}
                  <div
                    onClick={() => {
                      setIsPlaying(false);
                      setActiveStep(s.step);
                    }}
                    className="hover-card"
                    style={{
                      backgroundColor: isSelected ? s.bgColor : '#FFFFFF',
                      border: isSelected ? `2px solid ${s.color}` : '1px solid #E5E7EB',
                      boxShadow: isSelected ? `3px 3px 0px ${s.color}` : 'none',
                      padding: '11px 13px',
                      cursor: 'pointer',
                      transition: 'all 0.15s ease',
                    }}
                  >
                    <div style={{ display: 'flex', alignItems: 'center', gap: '11px' }}>
                      <div
                        style={{
                          width: '34px',
                          height: '34px',
                          backgroundColor: isSelected ? '#FFFFFF' : s.bgColor,
                          border: `1px solid ${s.borderColor}`,
                          display: 'flex',
                          alignItems: 'center',
                          justifyContent: 'center',
                          flexShrink: 0,
                        }}
                      >
                        {s.icon}
                      </div>

                      <div style={{ flex: 1, minWidth: 0 }}>
                        <div
                          className="mono"
                          style={{
                            fontSize: '9px',
                            fontWeight: 700,
                            color: isSelected ? s.color : '#9CA3AF',
                            marginBottom: '2px',
                            display: 'flex',
                            justifyContent: 'space-between',
                            alignItems: 'center',
                          }}
                        >
                          <span>{s.badge}</span>
                          {isCompleted && (
                            <span style={{ display: 'flex', alignItems: 'center', gap: '3px', color: '#10B981', fontSize: '9px' }}>
                              <CheckCircle size={10} /> DONE
                            </span>
                          )}
                          {isSelected && !isCompleted && (
                            <span style={{ color: s.color, fontSize: '9px' }}>● ACTIVE</span>
                          )}
                        </div>

                        <div
                          className="mono"
                          style={{
                            fontSize: '12px',
                            fontWeight: 700,
                            color: '#000000',
                            marginBottom: '2px',
                          }}
                        >
                          {s.title}
                        </div>

                        <div style={{ fontSize: '11px', color: '#6B7280' }}>
                          {s.shortDesc}
                        </div>
                      </div>
                    </div>
                  </div>

                  {/* Down Arrow */}
                  {idx < VERTICAL_STEPS.length - 1 && (
                    <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', padding: '4px 0' }}>
                      <ArrowDown size={14} color={activeStep > s.step ? '#10B981' : '#D1D5DB'} strokeWidth={2.5} />
                    </div>
                  )}
                </React.Fragment>
              );
            })}
          </div>

          {/* Right Column: Active Stage Inspector */}
          <div
            style={{
              position: 'sticky',
              top: '16px',
              border: `2px solid ${current.color}`,
              backgroundColor: '#FFFFFF',
              padding: '18px 20px',
              boxShadow: `4px 4px 0px ${current.color}`,
            }}
          >
            {/* Stage Title */}
            <div style={{ display: 'flex', alignItems: 'center', gap: '10px', marginBottom: '12px', borderBottom: '1px solid #E5E7EB', paddingBottom: '10px' }}>
              <div
                style={{
                  width: '36px',
                  height: '36px',
                  backgroundColor: current.bgColor,
                  border: `1px solid ${current.borderColor}`,
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                }}
              >
                {current.icon}
              </div>
              <div>
                <div className="mono" style={{ fontSize: '10px', fontWeight: 700, color: current.color, marginBottom: '2px' }}>
                  {current.badge} // ACTIVE STAGE
                </div>
                <h3 className="mono" style={{ fontSize: '14px', fontWeight: 700, margin: 0, color: '#000000' }}>
                  {current.title}
                </h3>
              </div>
            </div>

            {/* How It Works */}
            <div style={{ marginBottom: '14px' }}>
              <div className="mono" style={{ fontSize: '10px', fontWeight: 700, color: '#6B7280', marginBottom: '4px' }}>
                HOW THIS STAGE WORKS
              </div>
              <div style={{ fontSize: '12px', color: '#374151', lineHeight: 1.55, whiteSpace: 'pre-line' }}>
                {current.whatHappens}
              </div>
            </div>

            {/* Real World Workflow Example */}
            <div
              style={{
                backgroundColor: '#FAFAFA',
                border: '1px solid #E5E7EB',
                padding: '11px 13px',
                marginBottom: '14px',
              }}
            >
              <div className="mono" style={{ fontSize: '10px', fontWeight: 700, color: '#000000', marginBottom: '6px' }}>
                WORKFLOW DEMONSTRATION
              </div>

              <div style={{ marginBottom: '6px' }}>
                <div className="mono" style={{ fontSize: '9px', fontWeight: 700, color: '#6B7280', textTransform: 'uppercase' }}>
                  {current.realExample.inputLabel}:
                </div>
                <div style={{ fontSize: '11px', color: '#1F2937', marginTop: '2px', lineHeight: 1.45, fontStyle: 'italic' }}>
                  {current.realExample.inputValue}
                </div>
              </div>

              <div>
                <div className="mono" style={{ fontSize: '9px', fontWeight: 700, color: '#059669', textTransform: 'uppercase' }}>
                  {current.realExample.outputLabel}:
                </div>
                <div className="mono" style={{ fontSize: '10px', color: '#111827', marginTop: '2px', lineHeight: 1.45 }}>
                  {current.realExample.outputValue}
                </div>
              </div>
            </div>

            {/* Core Benefit */}
            <div
              style={{
                backgroundColor: current.bgColor,
                borderLeft: `4px solid ${current.color}`,
                padding: '9px 12px',
              }}
            >
              <div className="mono" style={{ fontSize: '9px', fontWeight: 700, color: current.color, marginBottom: '2px' }}>
                CORE BENEFIT
              </div>
              <div style={{ fontSize: '11px', fontWeight: 600, color: '#111827' }}>
                {current.whyItMatters}
              </div>
            </div>
          </div>

        </div>
      </div>

    </div>
  );
};
