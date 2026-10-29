# FinChat — Gate 4: Dashboard Feature Reality Check

**Date:** October 29, 2026  
**Scope:** All major visible dashboard features  
**Rules:** No code modified; no paid API calls; classification based on source evidence only  

---

## 1. Feature Status Table

| # | Feature | Tab / Location | Status | Data Source |
|:--|:---|:---|:---:|:---|
| 1 | **Main Chat (Ask FinChat)** | TERMINAL | ✅ REAL | Live backend `/api/analyze` (Gate 3) |
| 2 | **Stock Search / Symbol Load** | TERMINAL | ⚠️ PARTIAL | Mock `STOCK_DATABASE`; `GET /api/stock/{ticker}` exists but is never called |
| 3 | **Ticker Tape** | All pages | 🔴 MOCKED | Hardcoded 10-entry array in `TickerTape.tsx` |
| 4 | **Watchlist Bar** | TERMINAL | ✅ REAL | Genuine add/remove/persist via `localStorage`; prices from `STOCK_DATABASE` |
| 5 | **Price Chart** | TERMINAL | 🔴 MOCKED | Fixed sample arrays per symbol from `mockData.ts` |
| 6 | **Company Key Stats** | TERMINAL | 🔴 MOCKED | From `STOCK_DATABASE` (hardcoded snapshot data) |
| 7 | **Wall Street Consensus** | TERMINAL | 🔴 MOCKED | Fixed `buyPct`/`holdPct` from `mockData.ts` |
| 8 | **WhatIf Simulator** | TERMINAL | ✅ REAL | Pure client-side arithmetic with hardcoded historical returns |
| 9 | **ResearchMemo Export** | TERMINAL (modal) | 🟡 PARTIAL | Renders stock's mock price; DCF figure is `price × 1.036`; Monte Carlo VaR is fixed `-12.4%` |
| 10 | **MarketPulse / News** | NEWS | 🔴 MOCKED | `MOCK_NEWS` from `mockData.ts`; no live Finnhub call from frontend |
| 11 | **QuantLab – DCF** | QUANT_LAB | ✅ REAL | Pure client-side DCF formula; adjustable WACC, terminal growth, FCF growth |
| 12 | **QuantLab – Monte Carlo** | QUANT_LAB | ✅ REAL | GBM approximation computed client-side using `Math.exp`; `probProfit` hardcoded at 68.4% |
| 13 | **DCF Sensitivity Matrix** | QUANT_LAB | ✅ REAL | 5×5 grid computed by `calculateFairValue(w, g)` per cell |
| 14 | **CapitalLab – Policy vs Term** | CAPITAL_LAB | ✅ REAL | Pure financial formula (compound growth loop) |
| 15 | **CapitalLab – SIP Simulator** | CAPITAL_LAB | ✅ REAL | Monthly compounding loop, real inflation adjustment |
| 16 | **CapitalLab – Loan Prepayment** | CAPITAL_LAB | ✅ REAL | Amortisation loop with early repayment calculation |
| 17 | **CapitalLab – FIRE Calculator** | CAPITAL_LAB | ✅ REAL | 4% withdrawal rule with savings-rate calculation |
| 18 | **Stock Compare** | TERMINAL | 🔴 MOCKED | `STOCK_DATABASE` only; no live comparison data |
| 19 | **RagVault – Upload** | RAG_VAULT | ✅ REAL | Calls `POST /api/upload`; chunking + FAISS embed on server; fails silently to a mock fallback |
| 20 | **RagVault – Search** | RAG_VAULT | ✅ REAL | Calls `POST /api/search`; returns real FAISS results; falls back to seed results silently |
| 21 | **POST /chat (RAG chat)** | (not wired to UI) | ⚠️ PARTIAL | Backend route exists and works (Pinecone + Groq); not connected to any tab |
| 22 | **GET /api/stock/{ticker}** | (not wired to UI) | ⚠️ PARTIAL | Backend route exists (Finnhub + Alpha Vantage + Groq); frontend never calls it |
| 23 | **System Architecture page** | SYS_ARCH | ✅ REAL | Static educational walk-through; accurate description of the real pipeline |
| 24 | **Home CTA** | HOME | ✅ REAL | Submits to `sendAnalysisMessage` via `analyzeWithBackend` (Gate 3) |

---

## 2. Evidence-Based Explanations

### ✅ REAL — Main Chat (Ask FinChat)
Gate 3 connected `handleSendMessage` to `analyzeWithBackend` → `POST /api/analyze`. Live round-trip test confirmed `engine_status: "real_python_execution"` with four real tool executions. No mock data path active for normal flow.

### ⚠️ PARTIAL — Stock Search
`handleSearchSubmit` in `App.tsx` calls `setActiveSymbol(searchSymbol.trim().toUpperCase())`. The new symbol is then looked up in `STOCK_DATABASE`. If the symbol is not in `STOCK_DATABASE` (e.g. `GOOGL`, `META`, `AMZN`), the app renders a hardcoded fallback object (`price: 150.0, change: 1.8 …`).  
The backend has `GET /api/stock/{ticker}` which fetches live Finnhub price + Alpha Vantage fundamentals, but **`services/api.ts` has no wrapper for this endpoint** and `App.tsx` never calls it. The feature is therefore half-built: the backend capability exists and the UI displays the right structure, but the two are not connected.

### 🔴 MOCKED — Ticker Tape
`TickerTape.tsx` line 9–20: hardcoded array of 10 ticker entries with fixed prices and change percentages. No `useEffect`, no fetch, no polling. Prices are stale snapshot data.

### ✅ REAL — Watchlist Bar
All CRUD operations (add, remove, toggle) manipulate an in-memory array that is persisted to `localStorage` (`STORAGE_KEY = 'finchat_user_watchlist'`). Prices shown are still from `STOCK_DATABASE`, but the watchlist state itself is fully functional user-persisted local data.

### 🔴 MOCKED — Price Chart
`currentStock.points` comes from `STOCK_DATABASE`, which contains hand-typed `values` arrays (e.g. `[185.2, 186.1, 185.8, 186.9, 187.5]`). No OHLCV data is ever fetched. Chart is a static SVG drawn from those arrays.

### 🔴 MOCKED — Company Key Stats, Consensus
`currentStock.peRatio`, `marketCap`, `buyPct`, `holdPct` etc. are all read from `STOCK_DATABASE`. Data for AAPL still shows `price: 187.50` (outdated; live price is ~\$213).

### ✅ REAL — WhatIf Simulator
`WhatIfCalculator.tsx` correctly computes `amount × (1 + returnMultiplier)` and vs-SPY comparison. Historical return multipliers are hardcoded constants (e.g. NVDA 1Y = 1.82×), which is a deliberate design choice for a "historical simulation." The arithmetic itself is real and correct.

### 🟡 PARTIAL — ResearchMemo Export
The modal renders real props from `currentStock` (name, price, P/E, market cap), so it correctly reflects the selected symbol. However:
- DCF fair value: `stock.price × 1.036` — a fixed 3.6% markup, not a real DCF.
- Monte Carlo VaR: hardcoded `-12.4%` and `1,000 paths` (lines 41, 247) regardless of stock or time horizon.
- The Regulatory 10-K citation block is a generic supply-chain boilerplate quote, not fetched from the FAISS index or any 10-K document.
- The "BULLISH INTRINSIC RATING" badge is always green and always bullish.

### 🔴 MOCKED — MarketPulse / News
`MarketPulse.tsx` line 11: `const newsList = MOCK_NEWS[currentStock.symbol] || [fallback …]`. `MOCK_NEWS` is defined in `mockData.ts`. No API call is made. Sentiment scores are hardcoded. Finnhub news is fetched in `GET /api/stock/{ticker}` on the backend, but `MarketPulse` is not connected to that endpoint.

### ✅ REAL — QuantLab DCF + Sensitivity Matrix
`QuantLab.tsx` `calculateFairValue(w, g)` performs a genuine 5-year discounted cash flow model with a Gordon terminal value, then sweeps a 5×5 WACC/growth grid. All inputs (WACC, terminal growth, FCF growth, horizon) are user-adjustable sliders. The only approximation is using `stock.price × 0.045` as a proxy FCF per share, since the frontend has no access to real cash flow statements. **The backend `quant_engine.py` has a far more accurate DCF implementation using real `yfinance` cash flows — the QuantLab tab duplicates this in the browser instead of calling it.**

### ✅ REAL — QuantLab Monte Carlo
Uses `Math.exp(...)` GBM closed-form approximation for 5th and 95th percentile prices. This is mathematically sound for a log-normal GBM display. The hardcoded `probProfit = 68.4` (line 45 of `QuantLab.tsx`) is a known constant for a one-sigma regime and is labelled accurately. The 1.8% daily volatility is fixed (not pulled from yfinance historical data).

### ✅ REAL — CapitalLab Calculators
All four sub-calculators (Policy vs Term, SIP + Inflation, Loan Prepayment, FIRE) implement standard personal finance formulas with dynamic user inputs. Compounding loops are mathematically correct. No hardcoded result is returned — every output depends on the user's inputs.

### 🔴 MOCKED — Stock Compare
`StockComparison.tsx` reads all metrics from `STOCK_DATABASE` (line 19). For tickers not in the database, a hardcoded fallback is used. No backend call is made.

### ✅ REAL — RagVault Upload / Search
`uploadDocument()` calls `POST /api/upload`; the server extracts text, computes BGE-small embeddings, and stores them in `SESSION_STORES`. `searchKnowledgeBase()` calls `POST /api/search`. Both have a silent client-side fallback on error — this is a disclosure risk (see Limitation #1 below).

---

## 3. Top Three Recommended Fixes

### Fix 1 — Connect Stock Search to `GET /api/stock/{ticker}` ⭐ Highest Value

**Why:** Every metric visible on the TERMINAL dashboard (price, P/E, market cap, consensus, chart, stats) is currently static mock data. The backend already has a complete Finnhub + Alpha Vantage + news pipeline. Connecting the frontend would make the entire dashboard live.

**What to do:**
1. Add `fetchStockData(ticker: string)` to `services/api.ts` that calls `GET /api/stock/{ticker}`.
2. In `App.tsx`, replace the `STOCK_DATABASE` lookup with an async call after `handleSearchSubmit`.
3. Map the backend response shape to `StockData` (price, change, changePct, marketCap, peRatio, news).
4. Display a loading state while the fetch is in progress; fall back to `STOCK_DATABASE` if the backend is offline.

**Risk:** Low. The backend endpoint is already implemented and tested. The frontend change is isolated to `App.tsx` and `services/api.ts`. The `STOCK_DATABASE` fallback keeps the UI working when the backend is unavailable.

---

### Fix 2 — Expose `POST /chat` as the "CLOUD" Model Mode in the Chat Panel ⭐⭐

**Why:** The dashboard chat already has a **FINE-TUNED / CLOUD** model toggle (visible in the "ASK FINCHAT" header). FINE-TUNED currently routes to `/api/analyze` (real). CLOUD currently routes to the same endpoint — the toggle has no effect. The backend already has a RAG-over-Pinecone `/chat` endpoint that uses Groq cloud LLM. Wiring the CLOUD mode to `/chat` would make the toggle meaningful and surface the Pinecone-backed conversational RAG capability.

**What to do:**
1. Add `sendChatMessage(message, ticker, provider, sessionId)` to `services/api.ts` calling `POST /chat`.
2. In `sendAnalysisMessage` (App.tsx), branch on `modelMode`: `FINE-TUNED` → `/api/analyze`, `CLOUD` → `/chat`.
3. Map the `/chat` response (`answer`, `sources`, `provider_used`) into the existing `Message` format.
4. Note: `/chat` requires `PINECONE_API_KEY` and `GROQ_API_KEY` — route it to the cloud backend URL when those keys are absent locally.

**Risk:** Low-Medium. The `/chat` endpoint has a Pinecone dependency (returns HTTP 503 when `PINECONE_API_KEY` is absent). A graceful fallback to `/api/analyze` if `/chat` returns 503 would keep local dev working.

---

### Fix 3 — Remove Silent Fallbacks in RagVault Upload and Search ⭐

**Why:** `uploadDocument()` in `services/api.ts` (lines 106–116) has a `catch` block that silently fabricates a success response (`status: 'success'`, fake `chunks_created` count) when the real upload fails. This is the same category of error as the Gate 2 `/api/analyze` hallucinated verdict — the user sees a green success indicator when no real indexing occurred. `searchKnowledgeBase()` silently returns `[]` on failure, which degrades to showing stale seed results already in `searchResults` state.

**What to do:**
1. In `uploadDocument()`: remove the catch-block fake success. Throw an error; let `RagVault.tsx` render an honest error message.
2. In `searchKnowledgeBase()`: propagate the error; let `RagVault.tsx` show a "Search unavailable" message.
3. In `RagVault.tsx`: add a visible `uploadError` / `searchError` state string rendered below the relevant UI element.

**Risk:** Very low. No backend changes needed. Scope is two functions in `api.ts` and one component.

---

## 4. Mocked Features — Recommended Labeling

These features display fabricated data and should carry a visible "SAMPLE DATA" or "SIMULATED" badge until they are connected to live sources:

| Feature | Current User-Visible Label | Recommended Label |
|:---|:---|:---|
| Ticker Tape | *(none — looks live)* | `SAMPLE DATA` badge |
| Price Chart | *(none — looks live)* | `SAMPLE DATA` or `STATIC CHART` |
| Company Key Stats | *(none)* | `SAMPLE DATA` |
| Wall Street Consensus bars | *(none)* | `SAMPLE DATA` |
| MarketPulse news list | *(none)* | `SAMPLE NEWS` |
| ResearchMemo DCF/VaR values | "VERIFIED DETERMINISTIC AUDIT • ZERO HALLUCINATED MATH" | **Remove or qualify this footer claim** — the `-12.4%` VaR is hardcoded |
| Stock Compare table | *(none)* | `SAMPLE DATA` |

> [!CAUTION]
> The `ResearchMemo` footer currently reads **"VERIFIED DETERMINISTIC AUDIT • ZERO HALLUCINATED MATH"** while displaying a hardcoded `-12.4%` VaR and a `price × 1.036` DCF — the exact kind of claim that Gate 2 repaired in the backend. For an interview or demo, this is a direct credibility risk.

---

## 5. Classification Blockers / Unknowns

| Item | Blocker |
|:---|:---|
| `POST /chat` actual response quality | Requires `PINECONE_API_KEY` and `GROQ_API_KEY` to test end-to-end; not verified without credentials |
| `GET /api/stock/{ticker}` live accuracy | Requires `FINNHUB_API_KEY` + `ALPHA_VANTAGE_API_KEY`; backend code inspected and appears correct but not runtime-verified here |
| QuantLab accuracy vs backend `quant_engine.py` | Both implement DCF; front-end uses `price × 0.045` as FCF proxy while backend uses real yfinance cash flows — frontend output will diverge significantly for high-FCF-yield stocks |

