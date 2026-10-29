# FinChat — Verification Gate 1: Backend Verification Report

> **Document:** `docs/interview-prep/01-backend-verification.md`  
> **Phase:** Verification Gate 1  
> **Target System:** `backend/` (FastAPI coordinator, agent engine, quant engine, vector retrieval)  
> **Audit Method:** Static code inspection, dependency graph cross-referencing, contract mapping, execution environment evaluation  
> **Date:** 2026-10-29

---

## 1. Executive Summary

This verification gate evaluates whether the FinChat backend can be cleanly installed, started, and operated as authored.

### Key Gate Findings
1. **Critical Dependency Deficiency:** `backend/requirements.txt` is missing 4 direct runtime packages required by `rag_utils.py` (`langchain-community`, `faiss-cpu`, `langchain-core`, and `huggingface-hub`).
2. **Hidden Failure in `/api/analyze`:** The route wraps `from agent_engine import FinancialAgentEngine` in a blanket `except Exception as e:` block. When `rag_utils.py` fails to import because of missing dependencies, the route silently swallows the `ModuleNotFoundError` and returns a **synthetic, hardcoded `BULLISH` AAPL verdict** with `engine_status: "fallback_simulation"`.
3. **Execution Sandbox Status:** Host sandbox process invocation via `run_command` failed at the OS container abstraction level (`exebox: creating sandbox: CreateProcessSecurityEnvironment: The system cannot find the path specified`). Consequently, direct command execution inside the agent turn is unavailable; this report provides the exact, non-destructive commands for verification in a host terminal and records static proofs and root causes without claiming artificial execution success.
4. **Endpoint Operational Tiers:**
   - **Zero-Credential Routes:** `GET /`, `GET /api/health`, `POST /api/upload`, `GET /api/session-docs`.
   - **Mixed/Hybrid Routes:** `POST /api/search` (session store works without keys; Pinecone portion requires `PINECONE_API_KEY`).
   - **Credential-Mandated Routes:** `POST /chat` (fails with HTTP 503 if Pinecone or SentenceTransformer is uninitialized; fails with HTTP 502 if all LLM backends fail), `GET /api/stock/{ticker}` (degrades through 3 external providers).

---

## 2. Dependency Audit & Import Satisfaction Matrix

Each file in `backend/` was audited line-by-line for module imports against declared packages in `backend/requirements.txt`.

### Declared Dependencies in `backend/requirements.txt`
```text
fastapi>=0.100.0
uvicorn>=0.22.0
pydantic>=2.0
requests>=2.31.0
pinecone>=3.0.0
sentence-transformers>=2.2.2
numpy>=1.24.0
google-generativeai>=0.3.0
pandas>=2.0.0
yfinance>=0.2.40
python-multipart>=0.0.9
pypdf>=4.0.0
```

### Complete Import Map and Satisfaction Table

| File | Imported Symbol / Module | Import Mechanism | Declared in `requirements.txt`? | Status / Classification |
|---|---|---|---|---|
| `main.py` | `os, re, time, io, typing` | Top-level | Standard Library | Satisfied |
| `main.py` | `requests` | Top-level | Yes (`requests>=2.31.0`) | Satisfied |
| `main.py` | `numpy` | Top-level | Yes (`numpy>=1.24.0`) | Satisfied |
| `main.py` | `fastapi` (`FastAPI, HTTPException, UploadFile, File, Form`) | Top-level | Yes (`fastapi>=0.100.0`) | Satisfied |
| `main.py` | `fastapi.middleware.cors` (`CORSMiddleware`) | Top-level | Yes (`fastapi>=0.100.0`) | Satisfied |
| `main.py` | `pydantic` (`BaseModel`) | Top-level | Yes (`pydantic>=2.0`) | Satisfied |
| `main.py` | `pinecone` (`Pinecone`) | Top-level | Yes (`pinecone>=3.0.0`) | Satisfied |
| `main.py` | `sentence_transformers` (`SentenceTransformer`) | Dynamic in `try/except` (L79) | Yes (`sentence-transformers>=2.2.2`) | Satisfied (requires PyTorch) |
| `main.py` | `agent_engine` (`FinancialAgentEngine`) | Dynamic in `try/except` (L134) | Local module | **Fails at runtime** via `rag_utils.py` |
| `main.py` | `pypdf` (`PdfReader`) | Dynamic in `try/except` (L163) | Yes (`pypdf>=4.0.0`) | Satisfied |
| `main.py` | `uvicorn` | Guarded (`__name__ == '__main__'`) | Yes (`uvicorn>=0.22.0`) | Satisfied |
| `agent_engine.py` | `json, os, re, typing` | Top-level | Standard Library | Satisfied |
| `agent_engine.py` | `market_tools.MarketTools` | Top-level | Local module | Satisfied |
| `agent_engine.py` | `quant_engine.FinancialQuantEngine` | Top-level | Local module | Satisfied |
| `agent_engine.py` | `rag_utils` (`build_or_load_vectorstore`, `retrieve_context_with_citations`) | Top-level (L8) | Local module | **Fails at runtime** |
| `agent_engine.py` | `schemas` (`CitationRef, ToolCallRecord, ValuationVerdict`) | Top-level | Local module | Satisfied |
| `market_tools.py` | `datetime, typing` | Top-level | Standard Library | Satisfied |
| `market_tools.py` | `yfinance` | Top-level | Yes (`yfinance>=0.2.40`) | Satisfied |
| `market_tools.py` | `quant_engine.FinancialQuantEngine` | Top-level | Local module | Satisfied |
| `market_tools.py` | `schemas` (`DCFOutput, MonteCarloOutput, NewsItem`) | Top-level | Local module | Satisfied |
| `quant_engine.py` | `math, typing` | Top-level | Standard Library | Satisfied |
| `quant_engine.py` | `numpy` | Top-level | Yes (`numpy>=1.24.0`) | Satisfied |
| `quant_engine.py` | `pandas` | Top-level | Yes (`pandas>=2.0.0`) | Satisfied |
| `quant_engine.py` | `yfinance` | Top-level | Yes (`yfinance>=0.2.40`) | Satisfied |
| `quant_engine.py` | `schemas` (`DCFOutput, MonteCarloOutput`) | Top-level | Local module | Satisfied |
| `schemas.py` | `typing` | Top-level | Standard Library | Satisfied |
| `schemas.py` | `pydantic` (`BaseModel, Field`) | Top-level | Yes (`pydantic>=2.0`) | Satisfied |
| `rag_utils.py` | `os, pathlib, typing` | Top-level | Standard Library | Satisfied |
| `rag_utils.py` | `huggingface_hub.InferenceClient` | Top-level (L5) | **NO** | **Missing direct dependency** (transitive under `sentence-transformers`, but not pinned) |
| `rag_utils.py` | `langchain_text_splitters.RecursiveCharacterTextSplitter` | Dynamic in `try/except` (L8–30) | **NO** | Safe: has pure-Python fallback class |
| `rag_utils.py` | `langchain_core.documents.Document` | Dynamic in `try/except` (L32–41) | **NO** | Safe: has pure-Python fallback class |
| `rag_utils.py` | `langchain_community.document_loaders.PyPDFLoader` | Top-level (L43) | **NO** | **MISSING DIRECT DEPENDENCY** |
| `rag_utils.py` | `langchain_community.embeddings.HuggingFaceEmbeddings` | Top-level (L44) | **NO** | **MISSING DIRECT DEPENDENCY** |
| `rag_utils.py` | `langchain_community.vectorstores.FAISS` | Top-level (L45) | **NO** | **MISSING DIRECT DEPENDENCY** |
| `rag_utils.py` | `faiss` (underlying binary library for FAISS vectorstore) | Transitive via LangChain | **NO** | **MISSING DIRECT/TRANSITIVE DEPENDENCY** (`faiss-cpu`) |
| `requirements.txt` | `google-generativeai>=0.3.0` | Manifest (L13) | Yes | **Unused dependency** (zero occurrences across all `.py` files) |

### Dependency Deficiency Categorisation
1. **Direct Missing Dependencies (Breaks imports immediately):**
   - `langchain-community`
   - `faiss-cpu`
2. **Fragile Transitive Dependencies (Currently unpinned):**
   - `huggingface-hub` (brought in transitively by `sentence-transformers`, but imported directly at top-level of `rag_utils.py` L5)
   - `torch` (required by `sentence-transformers`; installed explicitly in `Dockerfile` L22 via `--index-url https://download.pytorch.org/whl/cpu`, but absent from `requirements.txt`, breaking bare `pip install -r requirements.txt` on developer machines without wheels)
3. **Dead Weight:**
   - `google-generativeai>=0.3.0` is declared but never referenced.

---

## 3. Clean Environment Setup & Startup Procedure

To install and run the backend locally without exposing credentials or hardcoded developer paths:

### Step 1: Create an Isolated Python 3.11 Virtual Environment
```bash
# From workspace root: c:\Users\yashv\Desktop\REPOS\investo
cd backend
python -m venv .venv

# Activate environment:
# Windows PowerShell:
.\.venv\Scripts\Activate.ps1
# Linux / macOS:
# source .venv/bin/activate
```

### Step 2: Install PyTorch CPU first (mirrors Dockerfile to limit download footprint)
```bash
pip install --upgrade pip
pip install torch --index-url https://download.pytorch.org/whl/cpu
```

### Step 3: Install Core Dependencies
```bash
pip install -r requirements.txt
```

### Step 4: Install the Missing Vectorstore Dependencies
```bash
pip install langchain-community faiss-cpu huggingface-hub
```

### Step 5: Configure Environment Variables Without Exposing Secrets
Create a local `.env` file in the workspace root or inside `backend/.env` (both are checked by `main.py` lines 16–17 and lines 37–38):
```ini
# Minimal configuration for local zero-credential health & document processing:
PINECONE_API_KEY=
ALPHA_VANTAGE_API_KEY=
FINNHUB_API_KEY=
MARKET_STACK_API_KEY=
GROQ_API_KEY=
OPENROUTER_API_KEY=
HF_SPACE_URL=https://indusyash-rag-finetune.hf.space
```

> [!WARNING]
> Line 17 of `main.py` contains a hardcoded developer path:  
> `GLOBAL_ENV_PATH = r"C:\Users\yashv\Desktop\personalize\.env"`  
> If this file exists on the host machine, `main.py` will automatically read credentials from it. In production containers or non-Windows hosts, this line silently returns because of `if not os.path.exists(path): return`.

### Step 6: Start Server
```bash
uvicorn main:app --host 127.0.0.1 --port 8000 --reload
```

---

## 4. Health Endpoint Specification & Verification

### Endpoint Definition
- **Route:** `GET /api/health`
- **Location:** `backend/main.py`, lines 111–125
- **Authentication:** None
- **Upstream Dependencies:** None (pure memory response)

### Contract
- **HTTP Method:** `GET`
- **Expected Status Code:** `200 OK`
- **Response Schema:**
```json
{
  "status": "online",
  "engine": "FinancialAgentEngine & Coordinator",
  "tools": [
    "get_live_quote",
    "get_fundamentals",
    "run_dcf_valuation",
    "run_monte_carlo",
    "search_knowledge_base",
    "pinecone_rag",
    "groq_cloud"
  ]
}
```

### Diagnostic Root Endpoint
- **Route:** `GET /`
- **Location:** `backend/main.py`, lines 101–109
- **Response Schema:**
```json
{
  "status": "ONLINE",
  "pinecone": false,
  "groq_configured": false,
  "openrouter_fallback": false,
  "retriever": true
}
```
This route verifies which subsystems successfully initialized on startup without triggering external network calls.

---

## 5. Route Contracts & Configuration Matrix

### 1. `POST /chat`
- **Handler:** `run_chat_rag(payload: ChatPayload)` (`main.py` L705–900)
- **Input Contract:**
```json
{
  "message": "What are the major risk factors for Apple?",
  "ticker": "AAPL",
  "provider": "fine-tuned",
  "session_id": "default_session"
}
```
- **Fields:**
  - `message` (string, required)
  - `ticker` (string, default `"AAPL"`)
  - `provider` (string, default `"fine-tuned"`, options: `"fine-tuned"`, `"cloud"`)
  - `session_id` (string, optional, default `"default_session"`)
- **Required Configuration:**
  - `PINECONE_API_KEY`: Required. If `index` is `None`, route aborts with **HTTP 503 Service Unavailable**.
  - Embedding retriever: Requires `sentence-transformers` loaded on CPU.
  - If `provider == "fine-tuned"`: Requires `HF_SPACE_URL` (default: `https://indusyash-rag-finetune.hf.space`).
  - Fallback 1: Requires `GROQ_API_KEY`.
  - Fallback 2: Requires `OPENROUTER_API_KEY`.
- **Output Contract (Success):**
```json
{
  "answer": "string",
  "sources": ["string"],
  "provider_used": "fine-tuned | groq | openrouter",
  "fallback_active": true,
  "fallback_reason": "string",
  "resolved_ticker": "AAPL"
}
```
- **Failure Contract:**
  - `503`: Vectorstore/retriever uninitialized.
  - `502`: All providers (GGUF, Groq, OpenRouter) unreachable or failed.

---

### 2. `POST /api/upload`
- **Handler:** `upload_document(file: UploadFile, session_id: str = Form(...))` (`main.py` L205–251)
- **Input Contract:**
  - Content-Type: `multipart/form-data`
  - Body:
    - `file`: Binary file (PDF or text)
    - `session_id`: Form string (default: `"default_session"`)
- **Required Configuration:**
  - None! No external API keys required.
  - Requires `retriever` (`SentenceTransformer`) initialized locally on CPU. If `retriever` is `None`, it fills zero-vectors `np.zeros((len(texts), 384))` without crashing.
- **Output Contract (Success):**
```json
{
  "status": "success",
  "filename": "annual_report.pdf",
  "chunks_created": 42,
  "total_pages": 10,
  "session_id": "default_session",
  "total_session_chunks": 42,
  "message": "Successfully indexed 42 vector chunks from 'annual_report.pdf' into active neural RAG vault."
}
```
- **Failure Contract:**
  - `400`: File contains no extractable text.
  - `500`: Text extraction or chunking unhandled failure.

---

### 3. `POST /api/search`
- **Handler:** `search_documents(req: SearchRequest)` (`main.py` L257–302)
- **Input Contract:**
```json
{
  "query": "operating cash flow and capex",
  "session_id": "default_session",
  "top_k": 4
}
```
- **Required Configuration:**
  - Session Store Search: Zero credentials. Uses local dot-product similarity against in-memory session embeddings.
  - Pinecone Search: Requires `PINECONE_API_KEY` and initialized `index`.
- **Output Contract (Success):**
```json
{
  "query": "operating cash flow and capex",
  "results": [
    {
      "source": "annual_report.pdf",
      "page": 3,
      "score": 0.8421,
      "snippet": "...",
      "origin": "User Upload | Institutional Base Corpus"
    }
  ],
  "count": 1
}
```

---

### 4. `POST /api/analyze`
- **Handler:** `api_analyze(req: AnalyzeRequest)` (`main.py` L131–154)
- **Input Contract:**
```json
{
  "query": "Evaluate valuation and 10-K risk factors",
  "ticker": "AAPL"
}
```
- **Required Configuration:**
  - Network connection for `yfinance` market quotes and balance sheet data.
  - Working local FAISS vector store in `backend/data/faiss_index/` (or seed generation).
  - External API keys: None required (uses `yfinance` scraping and local quant math).
- **Output Contract (Real Execution):**
```json
{
  "verdict": {
    "ticker": "AAPL",
    "stance": "BULLISH | BEARISH | NEUTRAL",
    "target_price_range": [175.50, 210.00],
    "current_price": 187.50,
    "key_catalysts": ["..."],
    "downside_risks": ["..."],
    "quantitative_summary": "...",
    "citations": []
  },
  "tool_records": [
    {
      "tool_name": "get_live_quote",
      "arguments": {"ticker": "AAPL"},
      "thought": "...",
      "observation": "..."
    }
  ],
  "narrative": "### Executive Analysis: AAPL...",
  "engine_status": "real_python_execution"
}
```
- **Output Contract (Silent Fallback on Failure):**
```json
{
  "verdict": {
    "ticker": "AAPL",
    "stance": "BULLISH",
    "target_price_range": [180.0, 205.0],
    "current_price": 187.50
  },
  "error": "No module named 'langchain_community'",
  "engine_status": "fallback_simulation"
}
```

---

### 5. `GET /api/stock/{ticker}`
- **Handler:** `get_stock_data(ticker: str)` (`main.py` L330–660)
- **Input Contract:**
  - URL Parameter: `ticker` (e.g. `AAPL`, `TSLA`, `samsung`, `TATAMOTORS.NS`)
- **Required Configuration & Call Hierarchy:**
  1. *Groq Ticker Resolver:* Triggered if ticker is non-standard or `"samsung"`. Requires `GROQ_API_KEY`.
  2. *Finnhub Quote:* Requires `FINNHUB_API_KEY`. Fetches current price, change, change percentage.
  3. *Alpha Vantage Fundamentals:* Requires `ALPHA_VANTAGE_API_KEY`. Fetches name, market cap, P/E ratio, dividend yield, 52-week range.
  4. *Market Stack Fundamentals Fallback:* Requires `MARKET_STACK_API_KEY`. Invoked only if Alpha Vantage returned generic name.
  5. *Finnhub News:* Requires `FINNHUB_API_KEY`.
  6. *Finnhub Recommendations:* Requires `FINNHUB_API_KEY`.
  7. *Alpha Vantage Time Series:* Requires `ALPHA_VANTAGE_API_KEY`. Fetches daily closing prices.
  8. *Market Stack EOD Chart Fallback:* Requires `MARKET_STACK_API_KEY`. Invoked if Alpha Vantage returns empty time series.
- **Output Contract:**
```json
{
  "symbol": "AAPL",
  "name": "Apple Inc.",
  "price": 187.50,
  "change": 2.45,
  "changePercent": 1.32,
  "marketCap": "2.94T",
  "peRatio": "28.4",
  "dividendYield": "0.52%",
  "volume": "48,219,300",
  "fiftyTwoWeekRange": "$165.67 - $199.62",
  "analystConsensus": { "buy": 75, "hold": 20, "sell": 5 },
  "chartData": [
    { "date": "Mon", "price": 185.20 }
  ],
  "news": [
    {
      "id": "1",
      "headline": "...",
      "summary": "...",
      "source": "...",
      "sentiment": "positive",
      "time": "Recent"
    }
  ]
}
```

---

## 6. Safe Test Design & Classification

Each route is categorized by risk, credentials needed, and network boundaries:

```
┌────────────────────────────────────────────────────────────────────────┐
│ TEST CLASSIFICATION                                                    │
├──────────────────┬───────────────────┬─────────────────────────────────┤
│ Tier 1: Offline  │ Zero credentials  │ GET /, GET /api/health          │
│                  │ No external APIs  │ POST /api/upload (sample text)  │
│                  │ Local CPU only    │ GET /api/session-docs           │
├──────────────────┼───────────────────┼─────────────────────────────────┤
│ Tier 2: Hybrid   │ yfinance network  │ POST /api/analyze               │
│                  │ No API keys       │ POST /api/search (session only) │
├──────────────────┼───────────────────┼─────────────────────────────────┤
│ Tier 3: External │ Paid/Keyed APIs   │ GET /api/stock/{ticker}         │
│                  │ Outbound HTTP     │ POST /chat (Pinecone + LLMs)    │
│                  │ Quota consumption │ POST /api/search (Pinecone)     │
└──────────────────┴───────────────────┴─────────────────────────────────┘
```

### Exact Terminal Test Commands (Run from Host)

#### Tier 1 Tests (Zero Credentials, Pure Local)

```bash
# Test 1.1: Health Check
curl -X GET "http://127.0.0.1:8000/api/health" -H "Accept: application/json"

# Test 1.2: Root Diagnostic Check
curl -X GET "http://127.0.0.1:8000/" -H "Accept: application/json"

# Test 1.3: Document Upload Test (Text sample)
# Create sample file:
echo "Financial Risk: Supply chain disruption in semiconductors." > test_filing.txt

curl -X POST "http://127.0.0.1:8000/api/upload" \
  -F "file=@test_filing.txt" \
  -F "session_id=verify_gate_1"

# Test 1.4: Session Document Query
curl -X GET "http://127.0.0.1:8000/api/session-docs?session_id=verify_gate_1"
```

#### Tier 2 Tests (Internal Quant & Hybrid Retrieval)

```bash
# Test 2.1: Semantic Search Against Uploaded Session Chunks
curl -X POST "http://127.0.0.1:8000/api/search" \
  -H "Content-Type: application/json" \
  -d '{"query": "semiconductors supply chain", "session_id": "verify_gate_1", "top_k": 2}'

# Test 2.2: Agent Engine Execution Probe
curl -X POST "http://127.0.0.1:8000/api/analyze" \
  -H "Content-Type: application/json" \
  -d '{"query": "Valuation and risks", "ticker": "MSFT"}'
```

#### Tier 3 Tests (External Financial & LLM APIs)

```bash
# Test 3.1: Live Stock Data Fetch (Consumes Finnhub + Alpha Vantage quotas)
curl -X GET "http://127.0.0.1:8000/api/stock/AAPL"

# Test 3.2: RAG Chat via Groq/OpenRouter/GGUF
curl -X POST "http://127.0.0.1:8000/chat" \
  -H "Content-Type: application/json" \
  -d '{"message": "What are Apple supply risks?", "ticker": "AAPL", "provider": "cloud", "session_id": "verify_gate_1"}'
```

---

## 7. Deep Dive: `/api/analyze` Fallback Mechanism

### Code Trace in `backend/main.py`:
```python
@app.post("/api/analyze")
def api_analyze(req: AnalyzeRequest):
    try:
        from agent_engine import FinancialAgentEngine
        agent = FinancialAgentEngine()
        verdict, tool_records, narrative = agent.execute_plan(req.query, active_ticker=req.ticker)
        return {
            "verdict": verdict.model_dump(),
            "tool_records": [t.model_dump() for t in tool_records],
            "narrative": narrative,
            "engine_status": "real_python_execution",
        }
    except Exception as e:
        return {
            "verdict": {
                "ticker": req.ticker,
                "stance": "BULLISH",
                "target_price_range": [180.0, 205.0],
                "current_price": 187.50,
            },
            "error": str(e),
            "engine_status": "fallback_simulation",
        }
```

### Static Execution Proof of Failure
1. `api_analyze` is called.
2. Line 134 attempts `from agent_engine import FinancialAgentEngine`.
3. `agent_engine.py` line 8 executes `from rag_utils import build_or_load_vectorstore, retrieve_context_with_citations`.
4. `rag_utils.py` line 43 executes `from langchain_community.document_loaders import PyPDFLoader`.
5. Under a fresh install of `requirements.txt`, Python raises:
   `ModuleNotFoundError: No module named 'langchain_community'`
6. Line 143 catches `ModuleNotFoundError`.
7. Line 144 returns HTTP 200 with:
   - `engine_status: "fallback_simulation"`
   - `error: "No module named 'langchain_community'"`
   - `verdict.stance: "BULLISH"`
   - `verdict.current_price: 187.50` (even if caller asked for `MSFT` at $428 or `NVDA` at $138)

### How Callers Distinguish Real vs. Fake Output
Any client inspecting this response can verify authenticity using these three deterministic tests:
1. **Status Flag:** Real output contains `"engine_status": "real_python_execution"`. Mock output returns `"engine_status": "fallback_simulation"`.
2. **Error Presence:** Real output has no top-level `"error"` key. Fallback output contains `"error"`.
3. **Payload Shape:** Real output contains `"tool_records"` (array of 4 tool logs) and `"narrative"` (markdown summary). Fallback output contains neither.

---

## 8. Root Cause Hypotheses & Diagnostic Analysis

### Failure Mode 1: Host Command Sandbox Fault
- **Observed Error:** `exebox: creating sandbox: CreateProcessSecurityEnvironment: The system cannot find the path specified.`
- **Root Cause:** Antigravity's Windows execution sandbox attempts to construct a restricted process token and security environment using a system directory path or sid that is not present or inaccessible in the current Windows configuration.
- **Remedy:** Direct testing must be executed in the developer's native PowerShell or CMD terminal outside the agent subprocess harness.

### Failure Mode 2: Missing LangChain & FAISS Modules
- **Observed Defect:** `rag_utils.py` relies on `langchain_community.vectorstores.FAISS` and `PyPDFLoader`.
- **Root Cause:** The project was likely developed in a global Python environment where LangChain and FAISS had been installed during earlier iterations, but were never captured when `requirements.txt` was frozen.
- **Impact:** Any fresh clone, Docker rebuild, or CI run fails silently on `/api/analyze`.

### Failure Mode 3: Incompatible Embedding Models
- **Observed Defect:** `main.py` uses `BAAI/bge-small-en-v1.5` (normalized embeddings) for Pinecone, while `rag_utils.py` uses `sentence-transformers/all-MiniLM-L6-v2` for FAISS.
- **Root Cause:** Two different embedding spaces with different dimensions/weights are in use simultaneously. Chunks indexed in one model cannot be queried by the other without completely destroying semantic retrieval relevance.

---

## 9. Prioritised Repair Plan (For Phase 2)

```
Priority 1 (Critical) ──► Add missing dependencies to requirements.txt
Priority 2 (Critical) ──► Standardize embedding model across main.py and rag_utils.py
Priority 3 (Major)    ──► Replace silent fallback simulation with proper HTTP error codes
Priority 4 (Major)    ──► Wire frontend chat to POST /chat or POST /api/analyze
Priority 5 (Minor)    ──► Remove unused google-generativeai package
Priority 6 (Hygiene)  ──► Remove hardcoded Windows paths (GLOBAL_ENV_PATH)
```

1. **Step 1: Manifest Alignment (`backend/requirements.txt`)**
   Add:
   ```text
   langchain-community>=0.0.20
   faiss-cpu>=1.7.4
   huggingface-hub>=0.20.0
   ```
   Remove:
   ```text
   google-generativeai>=0.3.0
   ```
2. **Step 2: Unify Embeddings**
   Change `rag_utils.py` line 55 to use `BAAI/bge-small-en-v1.5` so local FAISS and Pinecone operate on identical vector spaces.
3. **Step 3: Honest Error Handling in `/api/analyze`**
   Do not return HTTP 200 with a fake bullish AAPL verdict on unexpected errors. Return `HTTPException(status_code=500, detail=str(e))` so monitoring tools and frontend state machines accurately detect engine failure.
4. **Step 4: Connect Frontend UI**
   Update `frontend/src/App.tsx` `handleSendMessage` to dispatch an async fetch to `ACTIVE_BACKEND_URL/chat`.

---

## 10. Verification Gate Status Summary

| Item | Status | Notes |
|---|---|---|
| **Static Code Inspection** | **VERIFIED** | All 8 backend files inspected line-by-line. |
| **Dependency Manifest** | **FAILED AUDIT** | 4 packages missing from `requirements.txt`. |
| **Endpoint Contracts** | **VERIFIED** | Schemas and inputs documented from Pydantic models. |
| **Local Sandbox Execution** | **BLOCKED** | Host container sandbox issue (`CreateProcessSecurityEnvironment`). Terminal commands provided for developer verification. |
| **Production `/api/analyze` Status** | **PROVABLY BROKEN** | Guaranteed to return synthetic fallback because dependencies are absent in Docker image. |
| **Production `/chat` Status** | **UNKNOWN** | Requires manual verification of Hugging Face Space token and Pinecone key validity. |
| **Production `/api/stock` Status** | **UNKNOWN** | Requires manual verification of Finnhub and Alpha Vantage quotas. |

**Next Action:** Await user confirmation before proceeding to repair or dependency fixes.


