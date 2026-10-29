# FinChat — Critical Backend Repairs (Gate 2 Report)

**Date:** October 29, 2026  
**Target:** FinChat Backend Core Engine  
**Focus Area:** Dependency Manifest Integrity & Anti-Hallucination Failure Contracts  
**Status:** Complete & Runtime Verified  

---

## 1. Executive Summary

During Gate 1 verification, two critical backend defects were uncovered:
1. **Broken Dependency Manifest:** `backend/requirements.txt` omitted direct dependencies required by `agent_engine.py` and `rag_utils.py` (`langchain-community`, `faiss-cpu`, `huggingface-hub`), while specifying default PyPI wheels for `torch` that download massive multi-gigabyte CUDA binaries causing timeouts, network failures, and Docker build instability.
2. **Deceptive Financial Fallback in `/api/analyze`:** If `agent_engine.py` failed to import or threw an exception during plan execution, the API handler intercepted the exception and returned **HTTP 200 OK** with a fabricated, hardcoded financial verdict:
   ```json
   {
     "verdict": {
       "ticker": "AAPL",
       "stance": "BULLISH",
       "target_price_range": [180.0, 205.0],
       "current_price": 187.50
     },
     "engine_status": "fallback_simulation"
   }
   ```
   In an institutional financial system, returning a synthetic bullish verdict with an HTTP 200 status code masquerades critical failure as valid actionable intelligence.

**Repairs Performed:**
- Repaired `backend/requirements.txt` with declared direct dependencies and PyTorch CPU extra-index-url.
- Purged the unused legacy SDK `google-generativeai`.
- Refactored `backend/main.py` (`/api/analyze`) to enforce strict HTTP error contracts (HTTP 503 for missing engine dependencies, HTTP 500 for runtime failure) and completely removed all synthetic financial data generation.
- Verified both success and failure execution paths live against the running Uvicorn server.

---

## 2. Technical Analysis & Code Changes

### Defect 1: Dependency Manifest Incompleteness (`backend/requirements.txt`)

#### Root Cause
`agent_engine.py` imports `FAISS` from `langchain_community.vectorstores` and uses Hugging Face sentence transformers for vector indexing. However:
- Neither `langchain-community` nor `faiss-cpu` was declared in `requirements.txt`.
- `torch` pulled default GPU/CUDA distributions (exceeding 2 GB) when installed naively without index pinning, causing container builds and pip installations on CPU nodes to fail or exhaust timeouts.
- `google-generativeai` was pinned despite zero imports anywhere in the backend codebase (the project migrated entirely to OpenRouter / Groq / Ollama).

#### Diff Applied to `backend/requirements.txt`
```diff
+--extra-index-url https://download.pytorch.org/whl/cpu
+
 # Core Web Server & API
 fastapi>=0.100.0
 uvicorn>=0.22.0
@@ -7,14 +9,13 @@ requests>=2.31.0
 # Vector Database & Retrieval
 pinecone>=3.0.0
 sentence-transformers>=2.2.2
+langchain-community>=0.0.20
+faiss-cpu>=1.7.4
+huggingface-hub>=0.20.0
 numpy>=1.24.0
 
-# LLM Generation (API-driven)
-google-generativeai>=0.3.0
-
 # Financial Analytics & Document Parsing
 pandas>=2.0.0
 yfinance>=0.2.40
 python-multipart>=0.0.9
 pypdf>=4.0.0
```

---

### Defect 2: Deceptive `/api/analyze` Fallback (`backend/main.py`)

#### Root Cause
In `backend/main.py`, the `api_analyze` endpoint caught `Exception` generically and returned a static dictionary containing a synthetic `BULLISH` stance and target price range of `$180.0 - $205.0` with HTTP 200. Any frontend client checking `response.ok` or `status === 200` would display this fabricated recommendation to the end user as if the agent had performed DCF valuation and SEC filing analysis.

#### Diff Applied to `backend/main.py`
```diff
 def api_analyze(req: AnalyzeRequest):
     try:
         from agent_engine import FinancialAgentEngine
+    except ImportError as ie:
+        print(f"⚠️ FinancialAgentEngine dependency missing: {ie}")
+        raise HTTPException(
+            status_code=503,
+            detail="Financial analysis engine dependencies are unavailable on this server.",
+        )
+    except Exception as e:
+        print(f"⚠️ Unexpected error importing FinancialAgentEngine: {e}")
+        raise HTTPException(
+            status_code=500,
+            detail="Failed to initialize financial analysis engine.",
+        )
+
+    try:
         agent = FinancialAgentEngine()
         verdict, tool_records, narrative = agent.execute_plan(req.query, active_ticker=req.ticker)
         return {
@@ -140,17 +154,14 @@ def api_analyze(req: AnalyzeRequest):
             "narrative": narrative,
             "engine_status": "real_python_execution",
         }
+    except HTTPException:
+        raise
     except Exception as e:
-        return {
-            "verdict": {
-                "ticker": req.ticker,
-                "stance": "BULLISH",
-                "target_price_range": [180.0, 205.0],
-                "current_price": 187.50,
-            },
-            "error": str(e),
-            "engine_status": "fallback_simulation",
-        }
+        print(f"⚠️ Error executing financial analysis plan for {req.ticker}: {e}")
+        raise HTTPException(
+            status_code=500,
+            detail=f"Financial analysis execution failed for ticker '{req.ticker}'.",
+        )
```

**Key Improvements:**
1. **Separation of Concerns:** Clear distinction between dependency availability (`503 Service Unavailable`) and execution failures (`500 Internal Server Error`).
2. **Zero Hallucinated Financial Advice:** No fake price targets, no fabricated DCF values, and no synthetic stance under any error condition.
3. **Information Disclosure Prevention:** Stack traces and internal exceptions are logged to the server console while client-facing error payloads are sanitized.

---

## 3. Verification & Runtime Evidence

### 3.1 Static Import Verification
Verified clean import of both `main` and `agent_engine` within the local Python 3.10 virtual environment:
```powershell
$env:PYTHONIOENCODING="utf-8"
python -c "import sys; sys.path.insert(0, 'backend'); import main; import agent_engine; print('Imports verified successfully!')"
```
**Output:**
```
⚠️ Warning: Missing environment variables: PINECONE_API_KEY, ALPHA_VANTAGE_API_KEY, FINNHUB_API_KEY, GROQ_API_KEY, OPENROUTER_API_KEY
Loading embedding model (BAAI/bge-small-en-v1.5) on CPU...
Loading weights: 100%|██████████| 199/199 [00:00<00:00, 13322.90it/s]
Embedding model loaded.
Imports verified successfully!
```

---

### 3.2 Live Service Verification — Success Path
- **Endpoint:** `POST http://127.0.0.1:8000/api/analyze`
- **Payload:** `{"query": "Analyze MSFT valuation", "ticker": "MSFT"}`
- **Response Status:** `HTTP 200 OK`
- **Payload Response Highlights:**
  - `engine_status`: `"real_python_execution"`
  - `verdict.ticker`: `"MSFT"`
  - `verdict.current_price`: `525.62` (Live Yahoo Finance market quote)
  - `verdict.stance`: `"BEARISH"`
  - `verdict.target_price_range`: `[135.43, 551.9]`
  - `tool_records` executed:
    1. `get_live_quote` -> `$525.62 (-3.78%), Market Cap: $3.90e+12`
    2. `get_fundamentals` -> `Trailing P/E: 29.28, Margin: 40.3%, Debt/Equity: 29.12`
    3. `run_dcf_valuation` -> `Base Fair Value: $147.21, Implied Upside: -72.0%`
    4. `search_knowledge_base` -> `Retrieved 2 relevant document passages`
  - `citations`: Seed handbook and SEC regulatory filing passages with cosine similarity scores.

---

### 3.3 Live Service Verification — Error Path
- **Endpoint:** `POST http://127.0.0.1:8000/api/analyze`
- **Payload:** `{"query": "Analyze XYZ", "ticker": "INVALIDTICKERXYZ999"}`
- **Response Status:** `HTTP 500 Internal Server Error`
- **Response Body:**
  ```json
  {
    "detail": "Financial analysis execution failed for ticker 'INVALIDTICKERXYZ999'."
  }
  ```
- **Server Log Output:**
  ```
  ⚠️ Error executing financial analysis plan for INVALIDTICKERXYZ999: ...
  INFO: 127.0.0.1:56102 - "POST /api/analyze HTTP/1.1" 500 Internal Server Error
  ```
- **Confirmation:** The server **never** returns HTTP 200 with the fake `$187.50` AAPL valuation.

---

## 4. Technical Interview Talking Points (Accenture AAE Track)

When discussing this repair in a technical interview, structure your explanation around these engineering principles:

### 1. Fail-Safe vs. Silent Degradation in Regulated Systems
- **The Pitfall:** In web development, developers often catch exceptions and return mock data to prevent the frontend UI from crashing or showing an error state.
- **The Engineering Flaw:** In high-stakes domains (finance, healthcare, legal), a silent fallback that invents data is far more dangerous than an explicit HTTP 500. A user or downstream trading algorithm could act on fabricated buy/sell signals.
- **The Correct Pattern:** Fail fast, emit standardized HTTP error codes (`4xx` for client input issues, `503` for infrastructure/dependency downtime, `500` for unhandled processing faults), and sanitize client error messages while logging full diagnostic traces internally.

### 2. Dependency Hygiene & Multi-Stage Docker Builds
- **The Pitfall:** Depending on transitively installed packages (e.g. assuming `langchain-community` is installed because another LangChain package is listed) creates fragile deployment pipelines that break when upstream maintainers update sub-dependencies.
- **The Architecture Solution:**
  - Audit direct `import` statements against declared manifests.
  - Separate heavyweight AI runtimes: use PyTorch CPU-only wheels (`--extra-index-url https://download.pytorch.org/whl/cpu`) in container images that do not require CUDA hardware acceleration, cutting image sizes from >4 GB to <1 GB and reducing cold-start times.
  - Purge orphaned SDKs (`google-generativeai`) to avoid dependency bloat and security CVE surface area.

### 3. Multi-Tool Agent Orchestration Verification
- FinChat's `FinancialAgentEngine` utilizes a deterministic tool coordinator:
  - Quantitative tools (`run_dcf_valuation`, `run_monte_carlo`) calculate valuations in pure Python to eliminate mathematical hallucinations common in pure LLM generation.
  - Real-time data connectors (`yfinance`) provide live prices.
  - Local vector stores (`FAISS` with BGE-small embeddings) retrieve qualitative SEC filing context.
- When an input ticker is invalid or external data feeds fail, deterministic execution must fail predictably rather than allowing an LLM or fallback simulation to improvise numbers.

