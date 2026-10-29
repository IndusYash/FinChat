import os
import re
import time
import io
import json
from typing import List, Dict, Any, Optional, Tuple
import requests
import numpy as np
from fastapi import FastAPI, HTTPException, UploadFile, File, Form
from fastapi.middleware.cors import CORSMiddleware
from pydantic import BaseModel
from pinecone import Pinecone

# ── CONFIG AND ENV LOADING ──────────────────────────────────────
BACKEND_DIR = os.path.dirname(os.path.abspath(__file__))
WORKSPACE_DIR = os.path.dirname(BACKEND_DIR)
LOCAL_ENV_PATH = os.path.join(WORKSPACE_DIR, ".env")
GLOBAL_ENV_PATH = r"C:\Users\yashv\Desktop\personalize\.env"
INDEX_NAME = "investo-rag"
EMBEDDING_MODEL_NAME = "BAAI/bge-small-en-v1.5"

# Load keys
keys = {}

def load_env(path):
    if not os.path.exists(path):
        return
    with open(path, "r", encoding="utf-8") as f:
        for line in f:
            line = line.strip()
            if not line or line.startswith("#"):
                continue
            if "=" in line:
                k, v = line.split("=", 1)
                keys[k.strip()] = v.strip()

# Load from global environment and overwrite with local .env (more specific keys)
load_env(GLOBAL_ENV_PATH)
load_env(LOCAL_ENV_PATH)

# Extract key mappings
PINECONE_API_KEY      = keys.get("PINECONE_API_KEY", os.environ.get("PINECONE_API_KEY"))
ALPHA_VANTAGE_API_KEY = keys.get("ALPHA_VANTAGE_API_KEY", os.environ.get("ALPHA_VANTAGE_API_KEY"))
FINNHUB_API_KEY       = keys.get("FINNHUB_API_KEY", os.environ.get("FINNHUB_API_KEY"))
MARKET_STACK_API_KEY  = keys.get("MARKET_STACK_API_KEY", os.environ.get("MARKET_STACK_API_KEY"))
GROQ_API_KEY          = keys.get("GROQ_API_KEY", os.environ.get("GROQ_API_KEY"))
OPENROUTER_API_KEY    = keys.get("OPENROUTER_API_KEY", os.environ.get("OPENROUTER_API_KEY"))
HF_SPACE_URL          = keys.get("HF_SPACE_URL", os.environ.get("HF_SPACE_URL", "https://indusyash-rag-finetune.hf.space"))

# Check and fix potential typo in OpenRouter key (stripping accidental leading 'Y')
if OPENROUTER_API_KEY and OPENROUTER_API_KEY.startswith("Ysk-or-v1-"):
    print("🧹 Note: Detected and stripped leading 'Y' typo from OpenRouter API Key.")
    OPENROUTER_API_KEY = OPENROUTER_API_KEY[1:]

# Validation
missing = []
if not PINECONE_API_KEY: missing.append("PINECONE_API_KEY")
if not ALPHA_VANTAGE_API_KEY: missing.append("ALPHA_VANTAGE_API_KEY")
if not FINNHUB_API_KEY: missing.append("FINNHUB_API_KEY")
if not GROQ_API_KEY: missing.append("GROQ_API_KEY")
if not OPENROUTER_API_KEY: missing.append("OPENROUTER_API_KEY")

if missing:
    print(f"⚠️ Warning: Missing environment variables: {', '.join(missing)}")

# ── INITIALISE FASTAPI & MODELS ─────────────────────────────────
app = FastAPI(title="Investo Bot RAG & Stock API Server")

# Enable CORS for React local dev server (port 5173)
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# 1. Load Embedding Model locally (CPU)
try:
    from sentence_transformers import SentenceTransformer
    print("Loading embedding model (BAAI/bge-small-en-v1.5) on CPU...")
    retriever = SentenceTransformer(EMBEDDING_MODEL_NAME, device="cpu")
    print("Embedding model loaded.")
except Exception as e:
    print(f"⚠️ Error loading sentence-transformers: {e}")
    retriever = None

# 2. Connect to Pinecone
if PINECONE_API_KEY:
    try:
        pc = Pinecone(api_key=PINECONE_API_KEY)
        index = pc.Index(INDEX_NAME)
        print("Connected to Pinecone index.")
    except Exception as e:
        print(f"⚠️ Error connecting to Pinecone: {e}")
        index = None
else:
    index = None

# ── API ENDPOINTS ────────────────────────────────────────────────

@app.get("/")
def read_root():
    return {
        "status": "ONLINE",
        "pinecone": index is not None,
        "groq_configured": GROQ_API_KEY is not None,
        "openrouter_fallback": OPENROUTER_API_KEY is not None,
        "retriever": retriever is not None
    }

@app.get("/api/health")
def api_health():
    return {
        "status": "online",
        "engine": "FinancialAgentEngine & Coordinator",
        "tools": [
            "get_live_quote",
            "get_fundamentals",
            "run_dcf_valuation",
            "run_monte_carlo",
            "search_knowledge_base",
            "pinecone_rag",
            "groq_cloud",
        ],
    }

class AnalyzeRequest(BaseModel):
    query: str = "Evaluate valuation and 10-K risk factors"
    ticker: str = "AAPL"

@app.post("/api/analyze")
def api_analyze(req: AnalyzeRequest):
    try:
        from agent_engine import FinancialAgentEngine
    except ImportError as ie:
        print(f"⚠️ FinancialAgentEngine dependency missing: {ie}")
        raise HTTPException(
            status_code=503,
            detail="Financial analysis engine dependencies are unavailable on this server.",
        )
    except Exception as e:
        print(f"⚠️ Unexpected error importing FinancialAgentEngine: {e}")
        raise HTTPException(
            status_code=500,
            detail="Failed to initialize financial analysis engine.",
        )

    try:
        agent = FinancialAgentEngine()
        verdict, tool_records, narrative = agent.execute_plan(req.query, active_ticker=req.ticker)
        return {
            "verdict": verdict.model_dump(),
            "tool_records": [t.model_dump() for t in tool_records],
            "narrative": narrative,
            "engine_status": "real_python_execution",
        }
    except HTTPException:
        raise
    except Exception as e:
        print(f"⚠️ Error executing financial analysis plan for {req.ticker}: {e}")
        raise HTTPException(
            status_code=500,
            detail=f"Financial analysis execution failed for ticker '{req.ticker}'.",
        )

# ── DYNAMIC USER RAG SESSION STORAGE ────────────────────────────
SESSION_STORES: Dict[str, List[Dict[str, Any]]] = {}

def extract_text_from_file(file_bytes: bytes, filename: str) -> List[Tuple[int, str]]:
    """Extracts (page_number, text) tuples from PDF or text file bytes."""
    pages = []
    if filename.lower().endswith(".pdf"):
        try:
            from pypdf import PdfReader
            reader = PdfReader(io.BytesIO(file_bytes))
            for i, page in enumerate(reader.pages):
                txt = page.extract_text() or ""
                if txt.strip():
                    pages.append((i + 1, txt.strip()))
        except Exception as e:
            print(f"pypdf extraction error on {filename}: {e}")
            try:
                text = file_bytes.decode("utf-8", errors="ignore")
                if text.strip():
                    pages.append((1, text.strip()))
            except Exception:
                pass
    else:
        try:
            text = file_bytes.decode("utf-8", errors="ignore")
            if text.strip():
                pages.append((1, text.strip()))
        except Exception:
            pass
    return pages

def chunk_text(pages: List[Tuple[int, str]], chunk_size: int = 700, chunk_overlap: int = 120) -> List[Dict[str, Any]]:
    chunks = []
    for page_num, text in pages:
        clean = re.sub(r'\s+', ' ', text).strip()
        if not clean:
            continue
        start = 0
        while start < len(clean):
            end = min(start + chunk_size, len(clean))
            chunk_str = clean[start:end]
            chunks.append({
                "page": page_num,
                "text": chunk_str
            })
            if end >= len(clean):
                break
            start += (chunk_size - chunk_overlap)
    return chunks

@app.post("/api/upload")
async def upload_document(
    file: UploadFile = File(...),
    session_id: str = Form(default="default_session")
):
    try:
        content = await file.read()
        pages = extract_text_from_file(content, file.filename)
        if not pages:
            raise HTTPException(status_code=400, detail="Could not extract readable text from document.")
        
        raw_chunks = chunk_text(pages)
        if not raw_chunks:
            raise HTTPException(status_code=400, detail="Document contains no text content.")
            
        texts = [c["text"] for c in raw_chunks]
        if retriever is not None:
            embeddings = retriever.encode(texts, normalize_embeddings=True)
        else:
            embeddings = np.zeros((len(texts), 384))
            
        if session_id not in SESSION_STORES:
            SESSION_STORES[session_id] = []
            
        new_chunks_count = 0
        for i, c in enumerate(raw_chunks):
            SESSION_STORES[session_id].append({
                "id": f"{file.filename}_{i}",
                "source": file.filename,
                "page": c["page"],
                "text": c["text"],
                "embedding": embeddings[i]
            })
            new_chunks_count += 1
            
        return {
            "status": "success",
            "filename": file.filename,
            "chunks_created": new_chunks_count,
            "total_pages": len(pages),
            "session_id": session_id,
            "total_session_chunks": len(SESSION_STORES[session_id]),
            "message": f"Successfully indexed {new_chunks_count} vector chunks from '{file.filename}' into active neural RAG vault."
        }
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))

class SearchRequest(BaseModel):
    query: str
    session_id: Optional[str] = "default_session"
    top_k: int = 4

@app.post("/api/search")
def search_documents(req: SearchRequest):
    results = []
    
    # 1. Search user's uploaded session documents
    if req.session_id and req.session_id in SESSION_STORES and len(SESSION_STORES[req.session_id]) > 0:
        session_chunks = SESSION_STORES[req.session_id]
        if retriever is not None:
            query_emb = retriever.encode([req.query], normalize_embeddings=True)[0]
            scores = []
            for item in session_chunks:
                sim = float(np.dot(query_emb, item["embedding"]))
                scores.append((sim, item))
            scores.sort(key=lambda x: x[0], reverse=True)
            for sim, item in scores[:req.top_k]:
                results.append({
                    "source": item["source"],
                    "page": item["page"],
                    "score": round(sim, 4),
                    "snippet": item["text"],
                    "origin": "User Upload"
                })
                
    # 2. Search 2,400-page institutional Pinecone index
    if index is not None and retriever is not None and len(results) < req.top_k:
        try:
            needed = req.top_k - len(results)
            q_emb = retriever.encode([req.query], normalize_embeddings=True)[0].tolist()
            res = index.query(vector=q_emb, top_k=needed, include_metadata=True)
            for match in res.get("matches", []):
                meta = match.get("metadata", {})
                results.append({
                    "source": meta.get("source", "2400-Page SEC 10-K Corpus"),
                    "page": meta.get("page", 1),
                    "score": round(match.get("score", 0.0), 4),
                    "snippet": meta.get("text", meta.get("content", "")),
                    "origin": "Institutional Base Corpus"
                })
        except Exception as e:
            print(f"Pinecone search error: {e}")
            
    return {
        "query": req.query,
        "results": results,
        "count": len(results)
    }

@app.get("/api/session-docs")
def get_session_docs(session_id: str = "default_session"):
    if session_id not in SESSION_STORES:
        return {"documents": [], "total_chunks": 0}
        
    docs_map = {}
    for item in SESSION_STORES[session_id]:
        src = item["source"]
        if src not in docs_map:
            docs_map[src] = {"name": src, "chunks": 0, "pages": set()}
        docs_map[src]["chunks"] += 1
        docs_map[src]["pages"].add(item["page"])
        
    docs_list = [
        {
            "name": name,
            "chunks": data["chunks"],
            "pageCount": len(data["pages"])
        }
        for name, data in docs_map.items()
    ]
    return {
        "documents": docs_list,
        "total_chunks": len(SESSION_STORES[session_id])
    }

@app.get("/api/stock/{ticker}")
def get_stock_data(ticker: str):
    ticker = ticker.strip()
    
    # Smart Ticker Resolver using Groq: resolves full names (e.g. "samsung", "google") to ticker symbols
    KNOWN_TICKERS = {"AAPL", "MSFT", "GOOG", "GOOGL", "TSLA", "NVDA", "AMZN", "META", "NFLX", "AMD", "INTC"}
    is_standard_ticker = (ticker.upper() in KNOWN_TICKERS) or (ticker.isupper() and ticker.isalpha() and 2 <= len(ticker) <= 4)
    
    resolved_ticker = ticker
    
    if (not is_standard_ticker or ticker.lower() == "samsung") and GROQ_API_KEY:
        try:
            print(f"Resolving ticker symbol for '{ticker}' using Groq...")
            res_comp = requests.post(
                "https://api.groq.com/openai/v1/chat/completions",
                headers={
                    "Authorization": f"Bearer {GROQ_API_KEY}",
                    "Content-Type": "application/json"
                },
                json={
                    "model": "llama-3.1-8b-instant",
                    "messages": [
                        {
                            "role": "system", 
                            "content": "You are a financial stock ticker symbol resolver. Given a company name, description, or search term, respond with ONLY the primary stock ticker symbol (e.g., AAPL, GOOG, TSLA, MSFT, SSNLF, TATAMOTORS.NS, ADANIENT.NS). Do not write anything else. No explanation, no punctuation, no bolding. Just the uppercase ticker code. If you cannot determine it, output UNKNOWN."
                        },
                        {
                            "role": "user",
                            "content": f"Company: {ticker}"
                        }
                    ],
                    "temperature": 0.0,
                    "max_tokens": 10
                },
                timeout=4
            )
            if res_comp.ok:
                resolved_val = res_comp.json()["choices"][0]["message"]["content"].strip().upper()
                resolved_val = re.sub(r'[^A-Z0-9\.\-]', '', resolved_val)
                if resolved_val and "UNKNOWN" not in resolved_val and len(resolved_val) <= 12:
                    print(f"✓ Groq resolved '{ticker}' to ticker symbol '{resolved_val}'")
                    resolved_ticker = resolved_val
        except Exception as e:
            print(f"Error resolving ticker via Groq: {e}")

    ticker = resolved_ticker.upper()
    
    # 1. Fetch Real-time price and News from Finnhub
    price = 0.0
    change = 0.0
    change_percent = 0.0
    volume = "N/A"
    
    def fetch_finnhub_quote(sym):
        nonlocal price, change, change_percent
        if FINNHUB_API_KEY:
            try:
                q_res = requests.get(f"https://finnhub.io/api/v1/quote?symbol={sym}&token={FINNHUB_API_KEY}").json()
                if q_res:
                    raw_price = q_res.get("c")
                    price = float(raw_price) if raw_price is not None else 0.0
                    
                    raw_change = q_res.get("d")
                    change = float(raw_change) if raw_change is not None else 0.0
                    
                    raw_change_percent = q_res.get("dp")
                    change_percent = float(raw_change_percent) if raw_change_percent is not None else 0.0
            except Exception as e:
                print(f"Error fetching Finnhub quote: {e}")

    fetch_finnhub_quote(ticker)
    
    # Fallback: if quote returned 0.0 and we didn't run the resolver yet, resolve it now
    if price == 0.0 and is_standard_ticker and GROQ_API_KEY:
        try:
            print(f"Ticker '{ticker}' returned 0.0 price. Trying to resolve using Groq fallback...")
            res_comp = requests.post(
                "https://api.groq.com/openai/v1/chat/completions",
                headers={
                    "Authorization": f"Bearer {GROQ_API_KEY}",
                    "Content-Type": "application/json"
                },
                json={
                    "model": "llama-3.1-8b-instant",
                    "messages": [
                        {
                            "role": "system", 
                            "content": "You are a financial stock ticker symbol resolver. Given a company name, description, or search term, respond with ONLY the primary stock ticker symbol (e.g., AAPL, GOOG, TSLA, MSFT, SSNLF, TATAMOTORS.NS, ADANIENT.NS). Do not write anything else. No explanation, no punctuation, no bolding. Just the uppercase ticker code. If you cannot determine it, output UNKNOWN."
                        },
                        {
                            "role": "user",
                            "content": f"Company: {ticker}"
                        }
                    ],
                    "temperature": 0.0,
                    "max_tokens": 10
                },
                timeout=4
            )
            if res_comp.ok:
                resolved_val = res_comp.json()["choices"][0]["message"]["content"].strip().upper()
                resolved_val = re.sub(r'[^A-Z0-9\.\-]', '', resolved_val)
                if resolved_val and "UNKNOWN" not in resolved_val and resolved_val != ticker:
                    print(f"✓ Groq resolved fallback '{ticker}' to '{resolved_val}'")
                    ticker = resolved_val
                    # Re-fetch quote with the corrected symbol
                    fetch_finnhub_quote(ticker)
        except Exception as e:
            print(f"Error in fallback ticker resolution: {e}")
            
    # 2. Fetch fundamentals and overview from Alpha Vantage
    name = f"{ticker} Inc."
    market_cap = "N/A"
    pe_ratio = "N/A"
    div_yield = "N/A"
    range_52 = "N/A"
    
    if ALPHA_VANTAGE_API_KEY:
        try:
            overview_url = f"https://www.alphavantage.co/query?function=OVERVIEW&symbol={ticker}&apikey={ALPHA_VANTAGE_API_KEY}"
            ov_res = requests.get(overview_url).json()
            if ov_res and "Name" in ov_res:
                name = ov_res.get("Name", name)
                market_cap = ov_res.get("MarketCapitalization", "N/A")
                if market_cap != "N/A" and market_cap.isdigit():
                    mc_num = int(market_cap)
                    if mc_num >= 1e12:
                        market_cap = f"{mc_num / 1e12:.2f}T"
                    elif mc_num >= 1e9:
                        market_cap = f"{mc_num / 1e9:.2f}B"
                    else:
                        market_cap = f"{mc_num / 1e6:.2f}M"
                        
                pe_ratio = ov_res.get("PERatio", "N/A")
                div_yield = ov_res.get("DividendYield", "N/A")
                if div_yield != "N/A":
                    try:
                        div_yield = f"{float(div_yield) * 100:.2f}%"
                    except:
                        pass
                
                is_indian = ticker.endswith(".NS") or ticker.endswith(".BO") or ticker.endswith(".XNSE") or ticker.endswith(".XBOM")
                curr = "₹" if is_indian else "$"
                low_52 = ov_res.get("52WeekLow", "")
                high_52 = ov_res.get("52WeekHigh", "")
                if low_52 and high_52:
                    range_52 = f"{curr}{low_52} - {curr}{high_52}"
        except Exception as e:
            print(f"Error fetching Alpha Vantage overview: {e}")

    # ── Fallback: Market Stack for company name & fundamentals ────────────
    # Triggered only when Alpha Vantage returned nothing useful
    if name == f"{ticker} Inc." and MARKET_STACK_API_KEY:
        # Translate yahoo suffix format (.NS / .BO) to Market Stack format (.XNSE / .XBOM)
        ms_symbol = ticker
        if ms_symbol.endswith(".NS"):
            ms_symbol = ms_symbol[:-3] + ".XNSE"
        elif ms_symbol.endswith(".BO"):
            ms_symbol = ms_symbol[:-3] + ".XBOM"
            
        try:
            print(f"Alpha Vantage returned no overview for {ticker}. Trying Market Stack with {ms_symbol}...")
            ms_ticker_url = f"http://api.marketstack.com/v1/tickers/{ms_symbol.lower()}?access_key={MARKET_STACK_API_KEY}"
            ms_res = requests.get(ms_ticker_url, timeout=5).json()
            ms_name = ms_res.get("name", "")
            if ms_name:
                name = ms_name
                print(f"✓ Market Stack resolved name: {name}")
                # Market Stack also exposes stock_exchange info
                exch = ms_res.get("stock_exchange", {})
                if exch:
                    exch_name = exch.get("name", "")
                    if exch_name:
                        market_cap = f"Listed on {exch_name}"
        except Exception as e:
            print(f"Error fetching Market Stack ticker info: {e}")

    # 3. Fetch News from Finnhub (Company News)
    news_list = []
    if FINNHUB_API_KEY:
        try:
            today = time.strftime("%Y-%m-%d")
            past_date = time.strftime("%Y-%m-%d", time.localtime(time.time() - 3*86400))
            
            news_url = f"https://finnhub.io/api/v1/company-news?symbol={ticker}&from={past_date}&to={today}&token={FINNHUB_API_KEY}"
            n_res = requests.get(news_url).json()
            if isinstance(n_res, list):
                for item in n_res[:4]:
                    headline = item.get("headline", "")
                    summary = item.get("summary", "")
                    text_blob = (headline + " " + summary).lower()
                    
                    sentiment = "neutral"
                    positive_words = ["growth", "beat", "dividend", "profits", "upgraded", "success", "innovative", "expansion"]
                    negative_words = ["scrutiny", "fall", "missed", "lawsuit", "decline", "regulatory", "headwind", "risk"]
                    
                    if any(w in text_blob for w in positive_words):
                        sentiment = "positive"
                    elif any(w in text_blob for w in negative_words):
                        sentiment = "negative"
                        
                    news_list.append({
                        "id": str(item.get("id")),
                        "headline": headline,
                        "summary": summary[:300] + "..." if len(summary) > 300 else summary,
                        "source": item.get("source", "Market News"),
                        "sentiment": sentiment,
                        "time": "Recent"
                    })
        except Exception as e:
            print(f"Error fetching company news: {e}")

    if not news_list:
        news_list = [
            {
                "id": "1",
                "headline": f"Global markets monitor trading volumes for {ticker}",
                "summary": "Analysts are tracking trade volumes and flow indicators across global exchanges.",
                "source": "Market Watch",
                "sentiment": "neutral",
                "time": "Recent"
            }
        ]

    # 4. Recommendation trends
    buy = 50
    hold = 40
    sell = 10
    if FINNHUB_API_KEY:
        try:
            rec_url = f"https://finnhub.io/api/v1/stock/recommendation?symbol={ticker}&token={FINNHUB_API_KEY}"
            rec_res = requests.get(rec_url).json()
            if isinstance(rec_res, list) and len(rec_res) > 0:
                latest = rec_res[0]
                s_buy = latest.get("strongBuy", 0)
                buy_val = latest.get("buy", 0)
                hold_val = latest.get("hold", 0)
                sell_val = latest.get("sell", 0)
                s_sell = latest.get("strongSell", 0)
                
                total = s_buy + buy_val + hold_val + sell_val + s_sell
                if total > 0:
                    buy = int((s_buy + buy_val) / total * 100)
                    hold = int(hold_val / total * 100)
                    sell = int((sell_val + s_sell) / total * 100)
        except Exception as e:
            print(f"Error fetching Finnhub recommendations: {e}")

    # 5. Chart data
    chart_data = []
    if ALPHA_VANTAGE_API_KEY:
        try:
            chart_url = f"https://www.alphavantage.co/query?function=TIME_SERIES_DAILY&symbol={ticker}&apikey={ALPHA_VANTAGE_API_KEY}"
            c_res = requests.get(chart_url).json()
            time_series = c_res.get("Time Series (Daily)", {})
            if time_series:
                sorted_dates = sorted(time_series.keys())[-5:]
                day_names = ["Mon", "Tue", "Wed", "Thu", "Fri"]
                for i, date_str in enumerate(sorted_dates):
                    close_price = float(time_series[date_str]["4. close"])
                    day_name = day_names[i] if i < len(day_names) else date_str
                    chart_data.append({
                        "date": day_name,
                        "price": close_price
                    })
        except Exception as e:
            print(f"Error fetching Alpha Vantage daily series: {e}")

    # ── Fallback: Market Stack for EOD chart data ─────────────────────────
    # Triggered only when Alpha Vantage time series returned nothing
    if not chart_data and MARKET_STACK_API_KEY:
        # Translate yahoo suffix format (.NS / .BO) to Market Stack format (.XNSE / .XBOM)
        ms_symbol = ticker
        if ms_symbol.endswith(".NS"):
            ms_symbol = ms_symbol[:-3] + ".XNSE"
        elif ms_symbol.endswith(".BO"):
            ms_symbol = ms_symbol[:-3] + ".XBOM"

        try:
            print(f"Alpha Vantage returned no chart data for {ticker}. Trying Market Stack EOD with {ms_symbol}...")
            ms_eod_url = (
                f"http://api.marketstack.com/v1/eod"
                f"?access_key={MARKET_STACK_API_KEY}"
                f"&symbols={ms_symbol}"
                f"&limit=5"
                f"&sort=ASC"
            )
            ms_eod_res = requests.get(ms_eod_url, timeout=5).json()
            eod_data = ms_eod_res.get("data", [])
            day_names = ["Mon", "Tue", "Wed", "Thu", "Fri"]
            for i, entry in enumerate(eod_data[:5]):
                close_price = entry.get("close", 0.0)
                if close_price:
                    chart_data.append({
                        "date": day_names[i] if i < len(day_names) else entry.get("date", "")[:10],
                        "price": float(close_price)
                    })
                    # Also grab price & volume from most recent EOD if Finnhub missed it
                    if price == 0.0 and i == len(eod_data) - 1:
                        price = float(close_price)
                        vol = entry.get("volume", 0)
                        volume = f"{vol:,}" if vol else "N/A"
            if chart_data:
                print(f"✓ Market Stack provided {len(chart_data)} EOD data points for {ms_symbol}.")
        except Exception as e:
            print(f"Error fetching Market Stack EOD data: {e}")

    # ── Fallback: Market Tools (yfinance) for live quote & fundamentals ──
    if price == 0.0:
        try:
            from market_tools import MarketTools
            quote = MarketTools.get_live_quote(ticker)
            if (quote.get("last_price", 0.0) <= 0) and ("." not in ticker) and ("^" not in ticker):
                # Try NSE symbol (.NS) for Indian equities
                nse_quote = MarketTools.get_live_quote(f"{ticker}.NS")
                if nse_quote.get("last_price", 0.0) > 0:
                    ticker = f"{ticker}.NS"
                    quote = nse_quote

            if quote.get("last_price", 0.0) > 0:
                price = float(quote["last_price"])
                change = float(quote.get("change", 0.0))
                change_percent = float(quote.get("change_pct", 0.0))
                is_indian = ticker.endswith(".NS") or ticker.endswith(".BO") or quote.get("currency") == "INR"
                curr = "₹" if is_indian else "$"
                if quote.get("year_low") and quote.get("year_high"):
                    range_52 = f"{curr}{quote['year_low']} - {curr}{quote['year_high']}"
                if quote.get("market_cap"):
                    mc = quote["market_cap"]
                    if is_indian:
                        mc_cr = mc / 1e7
                        if mc_cr >= 100000:
                            market_cap = f"₹{mc_cr / 100000:.2f} L Cr"
                        else:
                            market_cap = f"₹{mc_cr:,.0f} Cr"
                    else:
                        if mc >= 1e12:
                            market_cap = f"${mc / 1e12:.2f}T"
                        elif mc >= 1e9:
                            market_cap = f"${mc / 1e9:.2f}B"
                        else:
                            market_cap = f"${mc / 1e6:.2f}M"
        except Exception as e:
            print(f"Error fetching MarketTools live quote for {ticker}: {e}")

    if name == f"{ticker} Inc." or pe_ratio == "N/A":
        try:
            from market_tools import MarketTools
            fund = MarketTools.get_company_fundamentals(ticker)
            if fund.get("company_name") and fund["company_name"] != ticker:
                name = fund["company_name"]
            if pe_ratio == "N/A" and fund.get("trailing_pe") != "N/A":
                pe_ratio = fund["trailing_pe"]
            if div_yield == "N/A" and fund.get("dividend_yield") != "N/A":
                div_yield = fund["dividend_yield"]
        except Exception as e:
            pass

    # Attempt to fetch real corporate news via MarketTools
    try:
        from market_tools import MarketTools
        real_news = MarketTools.get_ticker_news(ticker, limit=4)
        if real_news:
            news_list = [
                {
                    "id": f"live_news_{i}",
                    "headline": item.title,
                    "summary": item.title,
                    "source": item.publisher,
                    "sentiment": item.sentiment.lower(),
                    "time": item.time or "Recent",
                    "origin": "Live Provider News"
                }
                for i, item in enumerate(real_news)
            ]
    except Exception as e:
        pass

    if price <= 0.0:
        raise HTTPException(
            status_code=404,
            detail=f"Stock data not found for ticker '{ticker}'."
        )

    if not chart_data:
        chart_data = [
            { "date": "Mon", "price": round(price * 0.97, 2) },
            { "date": "Tue", "price": round(price * 0.99, 2) },
            { "date": "Wed", "price": round(price * 0.98, 2) },
            { "date": "Thu", "price": round(price * 1.01, 2) },
            { "date": "Fri", "price": round(price, 2) }
        ]

    if (change == 0.0 or change_percent == 0.0) and len(chart_data) >= 2:
        prev_p = chart_data[-2]["price"]
        curr_p = chart_data[-1]["price"]
        if prev_p > 0:
            change = round(curr_p - prev_p, 2)
            change_percent = round((change / prev_p) * 100, 2)

    is_indian = ticker.endswith(".NS") or ticker.endswith(".BO") or ticker.startswith("^NSE") or ticker.startswith("^BSE")
    exchange = "NSE" if ticker.endswith(".NS") or ticker.startswith("^NSE") else ("BSE" if ticker.endswith(".BO") or ticker.startswith("^BSE") else "US")
    currency = "INR" if is_indian else "USD"

    return {
        "symbol": ticker,
        "name": name,
        "price": price,
        "change": change,
        "changePercent": change_percent,
        "marketCap": market_cap,
        "peRatio": pe_ratio,
        "dividendYield": div_yield,
        "volume": volume,
        "fiftyTwoWeekRange": range_52,
        "exchange": exchange,
        "currency": currency,
        "analystConsensus": { "buy": buy, "hold": hold, "sell": sell },
        "chartData": chart_data,
        "news": news_list
    }

def extract_mentioned_ticker(message: str):
    if not GROQ_API_KEY:
        return None
    try:
        res = requests.post(
            "https://api.groq.com/openai/v1/chat/completions",
            headers={
                "Authorization": f"Bearer {GROQ_API_KEY}",
                "Content-Type": "application/json"
            },
            json={
                "model": "llama-3.1-8b-instant",
                "messages": [
                    {
                        "role": "system",
                        "content": "You are a financial entity extractor. Read the user message and identify if it mentions or asks about any specific stock, brand, company, or ticker. If it does, return ONLY the primary uppercase stock ticker symbol that represents it (e.g. AAPL, TSLA, MSFT, NVDA, GOOG, AMZN, SSNLF). Do not write any other text or punctuation. If no brand/company is mentioned, or if it is a general question without any specific entity, return UNKNOWN."
                    },
                    {
                        "role": "user",
                        "content": f"Message: {message}"
                    }
                ],
                "temperature": 0.0,
                "max_tokens": 10
            },
            timeout=3
        )
        if res.ok:
            ticker = res.json()["choices"][0]["message"]["content"].strip().upper()
            ticker = re.sub(r'[^A-Z0-9\.\-]', '', ticker)
            if ticker and "UNKNOWN" not in ticker and len(ticker) <= 10:
                print(f"✓ Detected company/ticker reference '{ticker}' in user message.")
                return ticker
    except Exception as e:
        print(f"Error in extract_mentioned_ticker: {e}")
    return None

GROQ_MODEL = "qwen/qwen3.8-27b"
OPENROUTER_FREE_MODEL = "google/gemma-4-31b-it:free"

class ExtractTickerRequest(BaseModel):
    query: str

def extract_ticker_with_openrouter(query: str) -> Dict[str, Any]:
    """
    Identifies the relevant company and returns a valid ticker symbol.
    Primary: Groq (qwen/qwen3.8-27b) with at least 3 retry attempts.
    Fallback: Free OpenRouter model (google/gemma-4-31b-it:free).
    Final Safety Net: Local rule-based dictionary.
    """
    # 1. PRIMARY: Try Groq with at least 3 attempts
    if GROQ_API_KEY:
        for attempt in range(1, 4):
            try:
                print(f"Identifying ticker via Groq ({GROQ_MODEL}) (Attempt {attempt}/3) for '{query}'...")
                res = requests.post(
                    "https://api.groq.com/openai/v1/chat/completions",
                    headers={
                        "Authorization": f"Bearer {GROQ_API_KEY}",
                        "Content-Type": "application/json"
                    },
                    json={
                        "model": GROQ_MODEL,
                        "messages": [
                            {
                                "role": "system",
                                "content": (
                                    "You are a financial stock ticker extraction tool. Identify if the user query mentions a company, stock, or brand.\n"
                                    "Return ONLY a raw JSON object with keys 'ticker' and 'company'.\n"
                                    "For Indian stocks append .NS (e.g. TCS.NS, RELIANCE.NS, INFY.NS, HDFCBANK.NS, TATAMOTORS.NS).\n"
                                    "For US/global use the uppercase ticker (e.g. AAPL, ACN, MSFT, NVDA, TSLA).\n"
                                    "If none, return {\"ticker\": null, \"company\": null}. No markdown code fences, no extra text."
                                )
                            },
                            {
                                "role": "user",
                                "content": query
                            }
                        ],
                        "temperature": 0.0,
                        "max_tokens": 50
                    },
                    timeout=5
                )
                if res.ok:
                    raw_text = res.json()["choices"][0]["message"]["content"].strip()
                    raw_text = re.sub(r'^```json\s*', '', raw_text)
                    raw_text = re.sub(r'^```\s*', '', raw_text)
                    raw_text = re.sub(r'```$', '', raw_text).strip()
                    parsed = json.loads(raw_text)
                    t = parsed.get("ticker")
                    if t and isinstance(t, str) and t.upper() not in ("NULL", "NONE", "UNKNOWN"):
                        cleaned_t = re.sub(r'[^A-Z0-9\.\^]', '', t.upper())
                        print(f"✓ Groq successfully extracted ticker '{cleaned_t}' on attempt {attempt}")
                        return {"ticker": cleaned_t, "company": parsed.get("company"), "found": True, "provider": "groq"}
                    elif parsed.get("ticker") is None:
                        # Explicit negative detection
                        return {"ticker": None, "company": None, "found": False, "provider": "groq"}
            except Exception as e:
                print(f"Groq ticker attempt {attempt} error: {e}")
                time.sleep(0.3 * attempt)

    # 2. FALLBACK: Free OpenRouter model
    if OPENROUTER_API_KEY:
        try:
            print(f"Fallback: Identifying ticker for '{query}' using Free OpenRouter model ({OPENROUTER_FREE_MODEL})...")
            res = requests.post(
                "https://openrouter.ai/api/v1/chat/completions",
                headers={
                    "Authorization": f"Bearer {OPENROUTER_API_KEY}",
                    "Content-Type": "application/json",
                    "HTTP-Referer": "http://localhost:8000",
                    "X-Title": "Investo Bot Ticker Extractor"
                },
                json={
                    "model": OPENROUTER_FREE_MODEL,
                    "messages": [
                        {
                            "role": "system",
                            "content": (
                                "You are a financial stock ticker extraction tool. Analyze the user query and identify if it mentions a company, stock, or brand.\n"
                                "Return ONLY a raw JSON object with keys 'ticker' and 'company'.\n"
                                "If it is an Indian company, append .NS (e.g., RELIANCE.NS, TCS.NS, INFY.NS).\n"
                                "If US/Global, return the standard ticker (e.g., AAPL, MSFT, GOOGL, NVDA, ACN).\n"
                                "If no company is mentioned, return {\"ticker\": null, \"company\": null}.\n"
                                "Output ONLY valid JSON without markdown code fences."
                            )
                        },
                        {
                            "role": "user",
                            "content": query
                        }
                    ],
                    "temperature": 0.0,
                    "max_tokens": 50
                },
                timeout=6
            )
            if res.ok:
                raw_text = res.json()["choices"][0]["message"]["content"].strip()
                raw_text = re.sub(r'^```json\s*', '', raw_text)
                raw_text = re.sub(r'^```\s*', '', raw_text)
                raw_text = re.sub(r'```$', '', raw_text).strip()
                parsed = json.loads(raw_text)
                t = parsed.get("ticker")
                if t and isinstance(t, str) and t.upper() not in ("NULL", "NONE", "UNKNOWN"):
                    cleaned_t = re.sub(r'[^A-Z0-9\.\^]', '', t.upper())
                    return {"ticker": cleaned_t, "company": parsed.get("company"), "found": True, "provider": "openrouter"}
        except Exception as e:
            print(f"OpenRouter fallback ticker extraction error: {e}")

    # 3. FINAL SAFETY NET: Local rule-based keyword mapping
    lower_q = query.lower()
    LOCAL_BRAND_MAP = {
        "reliance": "RELIANCE.NS", "ril": "RELIANCE.NS", "jio": "RELIANCE.NS",
        "tcs": "TCS.NS", "tata consultancy": "TCS.NS",
        "infosys": "INFY.NS", "infy": "INFY.NS",
        "hdfc": "HDFCBANK.NS", "hdfc bank": "HDFCBANK.NS",
        "icici": "ICICIBANK.NS", "icicibank": "ICICIBANK.NS",
        "sbi": "SBIN.NS", "state bank": "SBIN.NS",
        "airtel": "BHARTIARTL.NS", "bharti": "BHARTIARTL.NS",
        "itc": "ITC.NS",
        "larsen": "LT.NS", "l&t": "LT.NS", "lt": "LT.NS",
        "tata motors": "TATAMOTORS.NS", "tatamotors": "TATAMOTORS.NS",
        "wipro": "WIPRO.NS", "adani": "ADANIENT.NS",
        "maruti": "MARUTI.NS", "bajaj": "BAJFINANCE.NS",
        "titan": "TITAN.NS", "sun pharma": "SUNPHARMA.NS",
        "accenture": "ACN", "acn": "ACN",
        "apple": "AAPL", "aapl": "AAPL", "iphone": "AAPL",
        "microsoft": "MSFT", "msft": "MSFT",
        "nvidia": "NVDA", "nvda": "NVDA",
        "tesla": "TSLA", "tsla": "TSLA",
        "amazon": "AMZN", "amzn": "AMZN",
        "google": "GOOGL", "alphabet": "GOOGL", "googl": "GOOGL", "goog": "GOOGL",
        "meta": "META", "facebook": "META",
        "netflix": "NFLX", "intel": "INTC", "amd": "AMD",
        "oracle": "ORCL", "ibm": "IBM", "uber": "UBER"
    }
    for brand, tick in LOCAL_BRAND_MAP.items():
        if re.search(r'\b' + re.escape(brand) + r'\b', lower_q):
            return {"ticker": tick, "company": brand.title(), "found": True, "provider": "local_rules"}

    return {"ticker": None, "company": None, "found": False, "provider": "none"}

@app.post("/api/extract-ticker")
def api_extract_ticker(req: ExtractTickerRequest):
    result = extract_ticker_with_openrouter(req.query)
    return result

class RagQueryPayload(BaseModel):
    query: str
    ticker: Optional[str] = "AAPL"
    model_mode: str = "FINE-TUNED"  # "FINE-TUNED" or "CLOUD"
    session_id: Optional[str] = "default_session"
    allow_general_search: bool = False

@app.post("/api/rag-query")
def api_rag_query(payload: RagQueryPayload):
    """
    RAG Query Workflow:
    1. Search active RAG Vault (user uploads + Pinecone SEC filings).
    2. If matching documents are found, pass query + context into selected model.
    3. If no matching documents found:
       - If allow_general_search is False: disclose and request user choice.
       - If allow_general_search is True: perform general OpenRouter financial search.
    """
    matched_chunks: List[Dict[str, Any]] = []
    citations: List[Dict[str, Any]] = []

    # 1. Search user session documents
    if payload.session_id and payload.session_id in SESSION_STORES and len(SESSION_STORES[payload.session_id]) > 0:
        session_chunks = SESSION_STORES[payload.session_id]
        if retriever is not None:
            try:
                q_emb = retriever.encode([payload.query], normalize_embeddings=True)[0]
                scored = []
                for item in session_chunks:
                    sim = float(np.dot(q_emb, item["embedding"]))
                    scored.append((sim, item))
                scored.sort(key=lambda x: x[0], reverse=True)
                # Keep matches that meet true semantic similarity threshold (0.55 for BAAI/bge-small-en-v1.5)
                for sim, item in scored[:4]:
                    if sim >= 0.55:
                        matched_chunks.append({
                            "source": f"User Upload: {item['source']}",
                            "page": item["page"],
                            "text": item["text"],
                            "score": sim,
                            "origin": "User Vault"
                        })
                        citations.append({
                            "source": item["source"],
                            "page": item["page"],
                            "snippet": item["text"][:200]
                        })
            except Exception as e:
                print(f"Error searching session store: {e}")

    # 2. Search Pinecone Institutional SEC 10-K Vault
    if index is not None and retriever is not None and len(matched_chunks) < 4:
        try:
            q_emb = retriever.encode(payload.query, normalize_embeddings=True).tolist()
            needed = 4 - len(matched_chunks)
            res = index.query(vector=q_emb, top_k=needed, include_metadata=True)
            for match in res.get("matches", []):
                score = match.get("score", 0.0)
                # Pinecone cosine score threshold for relevance (0.55)
                if score >= 0.55:
                    meta = match.get("metadata", {})
                    src = meta.get("source", "Institutional SEC Corpus")
                    pg = meta.get("page", 1)
                    txt = meta.get("text", meta.get("content", ""))
                    if txt:
                        matched_chunks.append({
                            "source": src,
                            "page": pg,
                            "text": txt,
                            "score": score,
                            "origin": "Institutional Vault"
                        })
                        citations.append({
                            "source": src,
                            "page": pg,
                            "snippet": txt[:200]
                        })
        except Exception as e:
            print(f"Pinecone RAG search error: {e}")

    # Case A: No matching documents found in RAG Vault
    if not matched_chunks:
        if not payload.allow_general_search:
            return {
                "found_documents": False,
                "needs_user_choice": True,
                "is_general_search": False,
                "answer": (
                    f"No matching documents were found in the RAG Vault for this query."
                ),
                "citations": [],
                "query": payload.query,
                "ticker": payload.ticker
            }

        # User elected to proceed with General Search
        print(f"Executing General Search for: '{payload.query}'...")
        general_prompt = (
            f"You are FinChat, an expert institutional financial analyst. "
            f"The user has asked: '{payload.query}' (focused on stock: {payload.ticker or 'Market'}).\n\n"
            f"Provide a clear, detailed, and structured financial analysis answering their question directly. "
            f"Cover relevant financial metrics, competitive positioning, and key market risk factors."
        )

        answer = ""
        model_used = ""

        # 1. PRIMARY: Try Groq at least 3 times
        if GROQ_API_KEY:
            for attempt in range(1, 4):
                try:
                    print(f"General Search via Groq ({GROQ_MODEL}) (Attempt {attempt}/3)...")
                    r = requests.post(
                        "https://api.groq.com/openai/v1/chat/completions",
                        headers={
                            "Authorization": f"Bearer {GROQ_API_KEY}",
                            "Content-Type": "application/json"
                        },
                        json={
                            "model": GROQ_MODEL,
                            "messages": [
                                {"role": "system", "content": "You are FinChat, an expert AI financial analyst. Answer clearly and comprehensively."},
                                {"role": "user", "content": general_prompt}
                            ],
                            "temperature": 0.6,
                            "max_tokens": 400
                        },
                        timeout=10
                    )
                    if r.ok:
                        answer = r.json()["choices"][0]["message"]["content"].strip()
                        model_used = f"Groq ({GROQ_MODEL})"
                        print(f"✓ Groq General Search succeeded on attempt {attempt}")
                        break
                except Exception as e:
                    print(f"Groq General Search attempt {attempt} error: {e}")
                    time.sleep(0.3 * attempt)

        # 2. FALLBACK: Free OpenRouter model only if Groq failed or key absent
        if not answer and OPENROUTER_API_KEY:
            try:
                print(f"Fallback: General Search via Free OpenRouter model ({OPENROUTER_FREE_MODEL})...")
                r = requests.post(
                    "https://openrouter.ai/api/v1/chat/completions",
                    headers={
                        "Authorization": f"Bearer {OPENROUTER_API_KEY}",
                        "Content-Type": "application/json",
                        "HTTP-Referer": "http://localhost:8000",
                        "X-Title": "Investo Bot General Search"
                    },
                    json={
                        "model": OPENROUTER_FREE_MODEL,
                        "messages": [
                            {"role": "system", "content": "You are FinChat, an expert AI financial analyst. Answer clearly and comprehensively."},
                            {"role": "user", "content": general_prompt}
                        ],
                        "temperature": 0.6,
                        "max_tokens": 400
                    },
                    timeout=15
                )
                if r.ok:
                    answer = r.json()["choices"][0]["message"]["content"].strip()
                    model_used = f"OpenRouter Fallback ({OPENROUTER_FREE_MODEL})"
            except Exception as e:
                print(f"OpenRouter general search error: {e}")

        if not answer:
            answer = f"Completed general market review for {payload.query}. Please check connectivity to AI providers."

        return {
            "found_documents": False,
            "needs_user_choice": False,
            "is_general_search": True,
            "answer": answer,
            "citations": [],
            "model_used": model_used
        }

    # Case B: Matching documents ARE found in the RAG Vault
    context_blocks = []
    for c in matched_chunks:
        context_blocks.append(f"Source ({c['source']}, Page {c['page']}):\n{c['text']}")
    context_text = "\n\n".join(context_blocks)

    system_instruction = (
        "You are FinChat, an expert AI financial assistant.\n"
        "Answer the user's question accurately and objectively using ONLY the retrieved document sources below.\n"
        "Cite the specific document sources and page numbers in your response.\n\n"
        f"--- RETRIEVED RAG VAULT SOURCES ---\n{context_text}\n--- END SOURCES ---"
    )

    answer = ""
    model_used = ""

    # Mode 1: Fine-Tuned Model (Hugging Face GGUF Space)
    if payload.model_mode == "FINE-TUNED":
        try:
            print(f"Querying Fine-tuned GGUF Space at {HF_SPACE_URL}/generate...")
            gguf_prompt = (
                f"<|start_header_id|>system<|end_header_id|>\n\n{system_instruction}<|eot_id|>"
                f"<|start_header_id|>user<|end_header_id|>\n\n{payload.query}<|eot_id|>"
                f"<|start_header_id|>assistant<|end_header_id|>\n\n"
            )
            r = requests.post(
                f"{HF_SPACE_URL.rstrip('/')}/generate",
                headers={"Content-Type": "application/json"},
                json={"prompt": gguf_prompt, "max_tokens": 120},
                timeout=60
            )
            if r.ok:
                res_data = r.json()
                answer = res_data.get("response", "").strip()
                model_used = "Fine-Tuned GGUF Space (CPU)"
        except Exception as e:
            print(f"Fine-tuned GGUF generation failed, falling back: {e}")

    # Mode 2: Cloud Model (Groq Primary with 3x retry -> OpenRouter Free Fallback)
    if not answer:
        # Primary: Groq with 3 attempts
        if GROQ_API_KEY:
            for attempt in range(1, 4):
                try:
                    print(f"Querying Groq Cloud Model ({GROQ_MODEL}) with RAG context (Attempt {attempt}/3)...")
                    r = requests.post(
                        "https://api.groq.com/openai/v1/chat/completions",
                        headers={
                            "Authorization": f"Bearer {GROQ_API_KEY}",
                            "Content-Type": "application/json"
                        },
                        json={
                            "model": GROQ_MODEL,
                            "messages": [
                                {"role": "system", "content": system_instruction},
                                {"role": "user", "content": payload.query}
                            ],
                            "temperature": 0.4,
                            "max_tokens": 400
                        },
                        timeout=10
                    )
                    if r.ok:
                        answer = r.json()["choices"][0]["message"]["content"].strip()
                        model_used = f"Groq Cloud ({GROQ_MODEL})"
                        print(f"✓ Groq Grounded RAG succeeded on attempt {attempt}")
                        break
                except Exception as e:
                    print(f"Groq RAG attempt {attempt} error: {e}")
                    time.sleep(0.3 * attempt)

        # Fallback: Free OpenRouter model
        if not answer and OPENROUTER_API_KEY:
            try:
                print(f"Fallback: Querying Free OpenRouter Model ({OPENROUTER_FREE_MODEL}) with RAG context...")
                r = requests.post(
                    "https://openrouter.ai/api/v1/chat/completions",
                    headers={
                        "Authorization": f"Bearer {OPENROUTER_API_KEY}",
                        "Content-Type": "application/json",
                        "HTTP-Referer": "http://localhost:8000",
                        "X-Title": "Investo Bot Grounded RAG"
                    },
                    json={
                        "model": OPENROUTER_FREE_MODEL,
                        "messages": [
                            {"role": "system", "content": system_instruction},
                            {"role": "user", "content": payload.query}
                        ],
                        "temperature": 0.4,
                        "max_tokens": 400
                    },
                    timeout=15
                )
                if r.ok:
                    answer = r.json()["choices"][0]["message"]["content"].strip()
                    model_used = f"OpenRouter Cloud Fallback ({OPENROUTER_FREE_MODEL})"
            except Exception as e:
                print(f"OpenRouter RAG generation error: {e}")

    if not answer:
        answer = f"Retrieved {len(matched_chunks)} relevant sources from RAG vault, but generation models were temporarily unavailable."

    return {
        "found_documents": True,
        "needs_user_choice": False,
        "is_general_search": False,
        "answer": answer,
        "citations": citations,
        "model_used": model_used
    }

class ChatPayload(BaseModel):
    message: str
    ticker: str = "AAPL"
    provider: str = "fine-tuned"  # "fine-tuned" or "cloud"
    session_id: Optional[str] = "default_session"

@app.post("/chat")
def run_chat_rag(payload: ChatPayload):
    if not index or not retriever:
        raise HTTPException(
            status_code=503, 
            detail="Server Pinecone index or Retriever model is not initialized."
        )
        
    try:
        # 1. Embed query
        query_vector = retriever.encode(payload.message, normalize_embeddings=True).tolist()
        
        # 2. Query Pinecone (Adaptive: retrieve 2 chunks for CPU GGUF to reduce prefill latency, 4 for Cloud)
        top_k_size = 2 if payload.provider == "fine-tuned" else 4
        res = index.query(
            vector=query_vector,
            top_k=top_k_size,
            include_metadata=True
        )
        
        # 3. Format Context
        context_blocks = []
        sources = []

        # Check if user has uploaded custom documents in their active session
        if payload.session_id and payload.session_id in SESSION_STORES and len(SESSION_STORES[payload.session_id]) > 0:
            query_emb = np.array(query_vector)
            session_matches = []
            for item in SESSION_STORES[payload.session_id]:
                sim = float(np.dot(query_emb, item["embedding"]))
                session_matches.append((sim, item))
            session_matches.sort(key=lambda x: x[0], reverse=True)
            for sim, item in session_matches[:3]:
                src = item["source"]
                pg = item["page"]
                txt = item["text"]
                context_blocks.append(f"Source (USER UPLOAD: {src}, Page {pg}):\n{txt}")
                sources.append(f"User Upload: {src} (Page {pg})")

        for match in res.get("matches", []):
            txt = match["metadata"].get("text", "")
            src = match["metadata"].get("source", "Unknown")
            page = match["metadata"].get("page", "N/A")
            context_blocks.append(f"Source ({src}, Page {page}):\n{txt}")
            sources.append(f"{src} (Page {page})")
            
        context = "\n\n".join(context_blocks)
        
        # 4. Construct system instruction and plain text prompt
        system_instruction = f"""You are FinChat, an expert AI financial assistant. 
Your job is to answer the user's question in a detailed, comprehensive, and well-structured manner using the provided document sources.

Structure your response:
1. Start with a clear definition or summary.
2. Elaborate on the core concepts, components, or financial methods mentioned in the sources.
3. Organize your thoughts using clean paragraphs or bullet points for readability.
4. Cite which source(s) you are using. Always highlight investment risks when relevant.

If the answer cannot be found in the sources, say: "I'm sorry, but I cannot find the answer to that in the provided documents."

---
RELEVANT DOCUMENT SOURCES:
{context}
---"""

        prompt = f"""{system_instruction}

USER QUESTION:
{payload.message}

ASSISTANT RESPONSE:"""

        answer = ""
        success = False
        provider_used = ""
        fallback_active = False
        fallback_reason = ""

        # Try Fine-tuned Model (Hugging Face GGUF Space)
        if payload.provider == "fine-tuned":
            try:
                print(f"Sending RAG request to GGUF Space at {HF_SPACE_URL}/generate...")
                # Format using Llama 3 Chat Template for the fine-tuned model
                gguf_prompt = f"<|start_header_id|>system<|end_header_id|>\n\n{system_instruction}<|eot_id|><|start_header_id|>user<|end_header_id|>\n\n{payload.message}<|eot_id|><|start_header_id|>assistant<|end_header_id|>\n\n"
                
                # Limit to 70 tokens to keep execution time under the 60-second Hugging Face gateway timeout
                response = requests.post(
                    f"{HF_SPACE_URL.rstrip('/')}/generate",
                    headers={"Content-Type": "application/json"},
                    json={"prompt": gguf_prompt, "max_tokens": 70},
                    timeout=120
                )
                if response.ok:
                    res_json = response.json()
                    answer = res_json.get("response", "").strip()
                    provider_used = "fine-tuned"
                    success = True
                    print("✓ Received answer from Hugging Face Space.")
                else:
                    fallback_reason = f"Hugging Face Space returned status {response.status_code}: {response.text}"
                    print(f"⚠️ {fallback_reason}")
            except Exception as e:
                fallback_reason = f"Failed to connect to Hugging Face Space: {str(e)}"
                print(f"⚠️ {fallback_reason}")
            
            if not success:
                fallback_active = True
                print(f"Auto-falling back to Cloud API due to error: {fallback_reason}")

        # Method A: Try Groq API (Primary Cloud)
        if not success:
            if GROQ_API_KEY:
                try:
                    print("Sending RAG request to Groq API (llama-3.1-8b-instant)...")
                    response = requests.post(
                        "https://api.groq.com/openai/v1/chat/completions",
                        headers={
                            "Authorization": f"Bearer {GROQ_API_KEY}",
                            "Content-Type": "application/json"
                          },
                        json={
                            "model": "llama-3.1-8b-instant",
                            "messages": [
                                {"role": "user", "content": prompt}
                            ],
                            "temperature": 0.7,
                            "max_tokens": 300
                        },
                        timeout=10
                    )
                    if response.ok:
                        res_json = response.json()
                        answer = res_json["choices"][0]["message"]["content"].strip()
                        provider_used = "groq"
                        success = True
                        print("✓ Received answer from Groq.")
                    else:
                        print(f"⚠️ Groq API failed with status {response.status_code}: {response.text}")
                except Exception as e:
                    print(f"⚠️ Error querying Groq: {e}")

        # Method B: Fallback to OpenRouter (Free Llama 3 8B)
        if not success and OPENROUTER_API_KEY:
            try:
                print("Falling back to OpenRouter API (meta-llama/llama-3-8b-instruct:free)...")
                response = requests.post(
                    "https://openrouter.ai/api/v1/chat/completions",
                    headers={
                        "Authorization": f"Bearer {OPENROUTER_API_KEY}",
                        "Content-Type": "application/json",
                        "HTTP-Referer": "http://localhost:8000", # Required by OpenRouter
                        "X-Title": "Investo Bot Local RAG"
                    },
                    json={
                        "model": "meta-llama/llama-3-8b-instruct:free",
                        "messages": [
                            {"role": "user", "content": prompt}
                        ],
                        "temperature": 0.7,
                        "max_tokens": 300
                    },
                    timeout=10
                )
                if response.ok:
                    res_json = response.json()
                    answer = res_json["choices"][0]["message"]["content"].strip()
                    provider_used = "openrouter"
                    success = True
                    print("✓ Received answer from OpenRouter.")
                else:
                    print(f"⚠️ OpenRouter API failed with status {response.status_code}: {response.text}")
            except Exception as e:
                print(f"⚠️ Error querying OpenRouter: {e}")

        if not success:
            raise HTTPException(
                status_code=502,
                detail="Failed to generate response. Both GGUF Space and Cloud APIs were unreachable or returned errors."
            )
        
        resolved_ticker = extract_mentioned_ticker(payload.message)

        return {
            "answer": answer,
            "sources": list(set(sources)),
            "provider_used": provider_used,
            "fallback_active": fallback_active,
            "fallback_reason": fallback_reason,
            "resolved_ticker": resolved_ticker
        }
        
    except HTTPException as he:
        raise he
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))

if __name__ == "__main__":
    import uvicorn
    uvicorn.run(app, host="127.0.0.1", port=8000)
