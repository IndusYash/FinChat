---
title: Coordinator_rag
emoji: 🧭
colorFrom: blue
colorTo: purple
sdk: docker
app_port: 7860
pinned: false
---

# Investo Multi-Backend Coordinator Router

This is the Coordinator Backend service for Investo, a financial assistant bot. It connects to Pinecone, runs the local SentenceTransformer embeddings model (`BAAI/bge-small-en-v1.5`), handles real-time stock prices (via Alpha Vantage, Finnhub, etc.), and routes generation requests to the Fine-Tuned GGUF Inference Space or fallback cloud endpoints.

---

## Deployment to Hugging Face Spaces

1. Create a new Space on Hugging Face:
   - **Select SDK**: Select **Docker** (Blank template).
   - **Hardware**: **CPU Basic** (Free Tier).

2. Clone your Space repo, copy the files from this directory (`Dockerfile`, `.dockerignore`, `requirements.txt`, `main.py`, and `README.md`), commit, and push.

3. Navigate to **Settings** in your new Space and configure the following variables:

### Repository Secrets:
- `PINECONE_API_KEY`: Your Pinecone DB API key.
- `ALPHA_VANTAGE_API_KEY`: Alpha Vantage stock data API key.
- `FINNHUB_API_KEY`: Finnhub real-time quotes API key.
- `GROQ_API_KEY`: Groq API key for primary cloud RAG.
- `OPENROUTER_API_KEY`: OpenRouter API key for backup cloud RAG.

### Configuration Variables:
- `HF_SPACE_URL`: The URL of your fine-tuned GGUF inference Space, e.g. `https://indusyash-rag-finetune.hf.space`
