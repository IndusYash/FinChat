# FinChat — Accenture AAE Interview Preparation

This folder contains all study materials generated for the Accenture **Advanced Application Engineer (AAE)** campus recruitment technical interview, grounded in the actual current state of the FinChat/Investo project.

## Structure

| File | Phase | Contents |
|---|---|---|
| `README.md` | — | This index |
| *(future)* `01-rag-deep-dive.md` | Phase 1 | RAG pipeline, embeddings, chunking, Pinecone |
| *(future)* `02-fastapi-backend.md` | Phase 2 | FastAPI routes, Pydantic, async, CORS |
| *(future)* `03-dcf-and-quant.md` | Phase 3 | DCF model, Monte Carlo GBM, WACC |
| *(future)* `04-llm-providers.md` | Phase 4 | Groq, GGUF, OpenRouter, provider cascade |
| *(future)* `05-react-frontend.md` | Phase 5 | React 19, TypeScript, state management |
| *(future)* `06-deployment.md` | Phase 6 | Docker, HF Spaces, Vercel |
| *(future)* `07-interview-qa.md` | Phase 7 | Compiled Q&A for mock interviews |

## Source of Truth

All materials in this folder are grounded in:

> [`docs/interview-prep/00-current-state-audit.md`](../docs/interview-prep/00-current-state-audit.md)

Do not study features that are documented here but not verified in code. The audit document is the authoritative reference for what actually exists.

## Key Findings (Quick Reference)

- **Frontend:** React 19 + TypeScript + Vite (7 tabs)
- **Backend:** FastAPI Python 3.11 on Hugging Face Spaces (Docker, port 7860)
- **Vector DBs:** Pinecone (cloud, institutional corpus) + FAISS (local, agent engine)
- **LLM Cascade:** GGUF (HF Space) → Groq llama-3.1-8b-instant → OpenRouter llama-3-8b-instruct:free
- **Financial APIs:** Finnhub + Alpha Vantage + Market Stack + yfinance
- **⚠️ Critical Gap:** Dashboard chat is simulated (`setTimeout`). Backend `/chat` is real but not wired to the UI.
