import os
import re
import time
import requests
import numpy as np
from fastapi import FastAPI, HTTPException
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
                
                low_52 = ov_res.get("52WeekLow", "")
                high_52 = ov_res.get("52WeekHigh", "")
                if low_52 and high_52:
                    range_52 = f"${low_52} - ${high_52}"
        except Exception as e:
            print(f"Error fetching Alpha Vantage overview: {e}")

    # ── Fallback: Market Stack for company name & fundamentals ────────────
    # Triggered only when Alpha Vantage returned nothing useful
    if name == f"{ticker} Inc." and MARKET_STACK_API_KEY:
        try:
            print(f"Alpha Vantage returned no overview for {ticker}. Trying Market Stack...")
            ms_ticker_url = f"http://api.marketstack.com/v1/tickers/{ticker.lower()}?access_key={MARKET_STACK_API_KEY}"
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
        try:
            print(f"Alpha Vantage returned no chart data for {ticker}. Trying Market Stack EOD...")
            ms_eod_url = (
                f"http://api.marketstack.com/v1/eod"
                f"?access_key={MARKET_STACK_API_KEY}"
                f"&symbols={ticker}"
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
                print(f"✓ Market Stack provided {len(chart_data)} EOD data points for {ticker}.")
        except Exception as e:
            print(f"Error fetching Market Stack EOD data: {e}")

    if not chart_data:
        chart_data = [
            { "date": "Mon", "price": price * 0.97 },
            { "date": "Tue", "price": price * 0.99 },
            { "date": "Wed", "price": price * 0.98 },
            { "date": "Thu", "price": price * 1.01 },
            { "date": "Fri", "price": price }
        ]

    return {
        "symbol": ticker,
        "name": name,
        "price": price if price > 0 else 100.0,
        "change": change,
        "changePercent": change_percent,
        "marketCap": market_cap,
        "peRatio": pe_ratio,
        "dividendYield": div_yield,
        "volume": volume,
        "fiftyTwoWeekRange": range_52,
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

class ChatPayload(BaseModel):
    message: str
    ticker: str = "AAPL"
    provider: str = "fine-tuned"  # "fine-tuned" or "cloud"

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
