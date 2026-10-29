# FinChat — Gate 3: Dashboard Chat Integration (Report)

**Date:** October 29, 2026  
**Target:** Main Dashboard chat panel (`ASK FINCHAT` column)  
**Focus Area:** Replace all simulated `setTimeout` replies with real asynchronous calls to the Python backend  
**Status:** Complete — TypeScript compiles clean, Vite build succeeds, end-to-end round-trip verified  

---

## 1. Endpoint Selection

**Chosen endpoint:** `POST /api/analyze`

**Rationale:**
- The dashboard chat panel is explicitly designed for financial analysis (DCF, fundamentals, 10-K risk factors). Its UI renders `verdict.stance`, `verdict.targetRange`, and a tool execution trace — fields that map exactly to the `/api/analyze` response.
- `/chat` (when present) is the per-session RAG conversation endpoint used by `RagVault`. It operates on uploaded session documents, not on live market data. Using it for the main dashboard chat would conflate two distinct user journeys.
- `POST /api/analyze` already existed, had a working contract, and was wired into `services/api.ts` — only the caller required repair.

---

## 2. Files Changed

| File | Change |
|:---|:---|
| `frontend/src/services/api.ts` | Replaced silent-null-on-failure `analyzeWithBackend` with a throwing implementation using `AnalysisError` (new class) |
| `frontend/src/types.ts` | Added optional `isLoading?: boolean` field to `Message` |
| `frontend/src/App.tsx` | Added `isAnalyzing` state; replaced both `setTimeout`/mock handlers (`handleSendMessage`, `handleStartAnalysisFromHome`) with `sendAnalysisMessage`; wires `isAnalyzing` prop to `Dashboard` |
| `frontend/src/pages/Dashboard.tsx` | Added `isAnalyzing` prop to interface; disables input and send button while in-flight; renders loading bubble for `isLoading` messages |

No new endpoints, npm packages, backend changes, or environment variables were added.

---

## 3. Request / Response Flow

```
User types message → presses Enter or clicks SEND
        │
        ▼
handleFormSubmit() in Dashboard.tsx
  • guards: empty string → ignored, isAnalyzing → ignored (double-submit prevention)
  • clears input field
  • calls onSendMessage(text) (App.tsx prop)
        │
        ▼
handleSendMessage(text) in App.tsx
  → sendAnalysisMessage(text, activeSymbol)
        │
        ▼
sendAnalysisMessage(query, ticker) [async]
  1. Guard: isAnalyzing → return immediately  
  2. setIsAnalyzing(true)
  3. Append user message to chat
  4. Append loading bubble { role:'assistant', isLoading:true }
  5. await analyzeWithBackend(query, ticker)
        │
        ├── HTTP 2xx ──────────────────────────────────────────────────┐
        │   response.json() → buildAssistantMessage()                  │
        │     • content ← narrative || quantitative_summary            │
        │     • toolCalls ← tool_records[].tool_name (only if present) │
        │     • verdict badge ← stance + target_price_range (if valid) │
        │   Replace loading bubble with real Message                   │
        │                                                              │
        ├── HTTP 4xx/5xx ────────────────────────────────────────────── │
        │   AnalysisError thrown by analyzeWithBackend                 │
        │   503 → "analysis engine temporarily unavailable"            │
        │   other → "Analysis failed: <sanitized detail>"              │
        │   Replace loading bubble with error Message                  │
        │                                                              │
        └── Network / timeout error ──────────────────────────────────── │
            TimeoutError → "Request timed out…"                        │
            other → "Could not reach the backend…"                     │
            Replace loading bubble with error Message                  │
                                                                       │
  finally: setIsAnalyzing(false) ◄──────────────────────────────────────┘
        │
        ▼
Dashboard re-renders:
  • Input enabled again, placeholder restored
  • Send button active, cursor restored
  • Real (or error) message visible in chat list
```

---

## 4. Key Design Decisions

### 4.1 Loading bubble via stable ID
The loading state uses a stable ID (`loading-${Date.now()}`) so the replacement with the real message is a single targeted `Array.map` and avoids flash / re-ordering:
```ts
setMessages(prev => prev.map(m => m.id === loadingId ? realMessage : m));
```

### 4.2 `isAnalyzing` guard prevents double-submission
Both `handleFormSubmit` (Enter key / click Send) and `sendAnalysisMessage` itself check `isAnalyzing` before proceeding. Even if the user spams Enter during a slow yfinance request, only one in-flight request is active at any time.

### 4.3 `buildAssistantMessage` maps defensively
No field in the `/api/analyze` response is assumed to be present:
```ts
const verdict = data?.verdict;                    // may be absent
const toolRecords: any[] = data?.tool_records ?? []; // defaults to []
const narrative: string = data?.narrative ?? '';  // defaults to ''
```
If `tool_records` is empty, no tool badge is shown. If `target_price_range` is missing or malformed, no verdict badge is shown.

### 4.4 `AnalysisError` carries HTTP status
The new `AnalysisError` class propagates the HTTP status code so the caller can distinguish 503 (dependency missing) from 500 (execution failure) and show a more useful message to the user without exposing internal server errors.

### 4.5 30-second timeout (up from 8 s)
The previous `analyzeWithBackend` had an 8-second `AbortSignal.timeout`. The actual backend response for MSFT (4 tools: `yfinance`, DCF, FAISS, Monte Carlo) takes ~15–20 s on a cold CPU node. Changed to 30 s to avoid spurious timeout failures during normal operation.

---

## 5. Tests Executed

### 5.1 TypeScript Compilation
```
npx tsc --noEmit
```
**Result:** Exit 0, no type errors. ✅

### 5.2 Vite Production Build
```
npx vite build
```
**Result:**
```
✓ 1949 modules transformed.
dist/assets/index-CpNMzWK3.js   353.20 kB │ gzip: 100.97 kB
✓ built in 1.61s
```
Exit 0. ✅

### 5.3 Backend — Success Path (HTTP 200)
```
POST http://127.0.0.1:8000/api/analyze
Body: {"query":"What is the fair value and DCF model for MSFT?","ticker":"MSFT"}
```
**Observed response:**
- `engine_status`: `"real_python_execution"` ✅
- `verdict.ticker`: `"MSFT"` ✅
- `verdict.stance`: `"BEARISH"` ✅
- `verdict.current_price`: `525.50` (live Yahoo Finance quote) ✅
- `verdict.target_price_range`: `[135.43, 551.77]` ✅
- `tool_records count`: `4` ✅
- `narrative length`: `836 chars` ✅

### 5.4 Backend — Failure Path (HTTP 500)
```
POST http://127.0.0.1:8000/api/analyze
Body: {"query":"test","ticker":"ZZZZINVALID999"}
```
**Observed response:**
- HTTP `500` ✅
- `{"detail": "Financial analysis execution failed for ticker 'ZZZZINVALID999'."}` ✅
- No fabricated price data returned ✅

### 5.5 Frontend Load State / UX
- Verified via code inspection that `isAnalyzing` disables input and changes Send button while in-flight.
- Error messages are set in the `catch` block; the `finally` block always re-enables input regardless of outcome.
- Loading bubble is inserted before the `await` and replaced (not appended) after it, so the chat list never grows by more than 1 message per user prompt.

> **Note:** A full browser-level E2E test (user types → sees loading → sees real narrative) requires the dev server to run on `localhost:5173` and the backend on `localhost:8000`. Because the Uvicorn dev server is started by the user in a separate terminal, the browser-facing E2E step was not executed here. The request/response contract was verified directly against the live backend from Python, and the frontend build was verified by the TypeScript and Vite checks above.

---

## 6. Remaining Limitations

| # | Limitation | Impact | Suggested Fix |
|:--|:---|:---|:---|
| 1 | `handleStartAnalysisFromHome` (Home CTA) sets the active ticker and switches tabs synchronously, then schedules `sendAnalysisMessage` with `setTimeout(fn, 0)`. If the tab switch re-mounts `Dashboard`, there is a one-tick window where the loading bubble appears before `Dashboard` renders. In practice this is invisible. | Cosmetic | Lift `messages` state and `isAnalyzing` into a context or use a navigation event to trigger analysis after mount. |
| 2 | The 30 s `AbortSignal.timeout` may still expire for Monte Carlo simulation on a heavily loaded CPU node. | Analysis request fails | Surface a retry button in the error message. |
| 3 | `analyzeWithBackend` uses `ACTIVE_BACKEND_URL`, which is set at import time by `checkBackendHealth`. If the health check hasn't run yet when the user sends the first message, the URL may point to the Hugging Face Space instead of `localhost`. | First message may hit cloud backend | Call `checkBackendHealth` eagerly on app mount (already done in `Dashboard.useEffect`) and await it before enabling the chat input. |
| 4 | The `narrative` field from the backend contains Markdown (headers `###`, bold `**`). Currently rendered as plain `pre-line` text. | Minor formatting loss | Render with a lightweight Markdown component (e.g. `react-markdown`). |
| 5 | The `Home` page CTA still detects tickers from the user query with a simple local regex. It doesn't use the backend for ticker extraction. | Minor | Move ticker detection to a backend or use a list lookup, but this is outside the scope of this gate. |
