# Investo — Institutional AI Financial Copilot & Quant Assistant

Investo is an enterprise-grade financial AI copilot that bridges **Autonomous ReAct Agent Tool Calling**, **Deterministic Quantitative Modeling (DCF & Monte Carlo)**, **Pydantic Structured Output Contracts**, and **Regulatory PDF RAG** into an interactive multi-page assistant.

---

## 🌟 Key Features & Technical Architecture

### 1. 🤖 Agentic ReAct Tool-Calling Engine (`agent_engine.py`)
- Moves beyond brittle one-shot RAG by implementing an autonomous ReAct reasoning loop.
- Dynamically orchestrates tools:
  - `get_live_quote`: Real-time price snapshots, volume, and 52-week trading bands.
  - `get_fundamentals`: Valuation multiples (P/E, EV/EBITDA, Debt/Equity, Margins).
  - `run_dcf_valuation`: Deterministic intrinsic fair value calculation.
  - `run_monte_carlo`: 1,000-path stochastic price simulation and 95% Value-at-Risk (VaR).
  - `search_knowledge_base`: Dense semantic vector search across regulatory 10-K filings.
  - `get_ticker_news`: Corporate news headlines with financial sentiment scoring.
- Displays a step-by-step **audit trail** in the UI showing the agent's thoughts, tool arguments, and observations.

### 2. 🔬 Deterministic Quantitative Modeling Engine (`quant_engine.py`)
- **Discounted Cash Flow (DCF)**: Calculates intrinsic enterprise and equity value using 5-year projected Free Cash Flows, WACC discounting, and Gordon Growth Terminal Value.
- **5x5 Sensitivity Matrix**: Interactive heatmap varying WACC (7%–11%) against Terminal Growth (1.5%–3.5%) to determine margin of safety.
- **Monte Carlo Price Simulation**: Geometric Brownian Motion (GBM) running 1,000 stochastic price trajectories over 30 to 252 trading days, computing median target, 5th/95th percentile corridors, and 95% Value-at-Risk (VaR).
- *Separates deterministic math from LLM narrative synthesis so the model never hallucinates numbers.*

### 3. 📋 Pydantic Structured Output Contracts (`schemas.py`)
- Replaces unconstrained free-text LLM output with type-safe Pydantic contracts (`ValuationVerdict`, `DCFOutput`, `MonteCarloOutput`, `NewsItem`, `CitationRef`).
- Powers dedicated visual UI components: Stance badges (`BULLISH`, `BEARISH`, `NEUTRAL`), target price corridors, and structured risk lists.

### 4. 📚 Real-Time In-UI Document Ingestion & RAG Vault (`pages/3_📚_Knowledge_Base.py`)
- Drag-and-drop PDF uploader allowing users to ingest SEC filings (10-K, 10-Q), equity research, or transcripts directly into the live FAISS index.
- Sentence-level citation tracking displaying source document, page number, relevance score, and exact excerpt.
- Built-in semantic search sandbox to inspect raw chunk retrieval.

### 5. 📰 Market Pulse & Sentiment Classifier (`pages/2_📰_Market_Pulse.py`)
- Real-time financial news stream per ticker with rule-based polarity sentiment scoring (`POSITIVE`, `NEGATIVE`, `NEUTRAL`).
- Interactive candlestick charts with 20-day Simple Moving Average (SMA) and volume.
- Fundamental metrics dashboard.

---

## 🧭 Multi-Page Application Layout

```
intelligen_intern/
├── app.py                      # Flagship AI Financial Copilot (Chat + ReAct Audit + Verdict Card)
├── quant_engine.py             # Pure Python/NumPy DCF & Monte Carlo GBM Engine
├── market_tools.py             # Real-time quotes, fundamentals, and news sentiment feeds
├── agent_engine.py             # Agentic Tool-Calling & ReAct loop with Pydantic contracts
├── schemas.py                  # Pydantic data schemas & contracts
├── rag_utils.py                # FAISS vector store, in-UI PDF ingestion, and citation retrieval
├── pages/
│   ├── 1_🔬_Quant_Lab.py       # Interactive DCF sensitivity heatmap & Monte Carlo fan charts
│   ├── 2_📰_Market_Pulse.py    # Candlestick charts, fundamental multiples & sentiment feed
│   └── 3_📚_Knowledge_Base.py  # Drag-and-drop PDF uploader, FAISS manager & search sandbox
├── data/
│   ├── docs/                   # PDF storage directory
│   └── faiss_index/            # Persisted vector database
└── requirements.txt
```

---

## 🚀 Getting Started

### 1. Install Dependencies
```bash
pip install -r requirements.txt
```

### 2. Configure Environment (Optional)
Copy `.env.example` to `.env`:
```bash
HUGGINGFACEHUB_API_TOKEN=your_token_here
HF_MODEL_ID=HuggingFaceH4/zephyr-7b-beta
```
*(The system runs out of the box with intelligent offline fallback even without an API token).*

### 3. Launch the Application
```bash
streamlit run app.py
```

---

## 🎯 Interview Talking Points
1. **Agentic Architecture vs. Naive RAG**: *"Instead of brittle one-shot prompt stuffing, I engineered an autonomous financial agent that plans tool invocations across live APIs, regulatory vector stores, and quantitative engines with a transparent execution audit trail."*
2. **Deterministic Math Separation**: *"LLMs are notoriously unreliable at arithmetic. I built a standalone NumPy quant engine for DCF sensitivity and Monte Carlo VaR simulations, having the LLM act strictly as an executive interpreter rather than a calculator."*
3. **Pydantic Type Safety**: *"I enforced strict schema contracts using Pydantic, ensuring all model outputs are validated JSON structures that cleanly bind to UI widgets rather than unpredictable free text."*
4. **End-to-End RAG Lifecycle**: *"I built a live ingestion pipeline allowing analysts to upload SEC filings directly through the UI, dynamically chunking, embedding, and indexing into FAISS with verbatim citation traceability."*
