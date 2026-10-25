import os
from typing import Any, Dict, List
from dotenv import load_dotenv
import pandas as pd
import plotly.graph_objects as go
import streamlit as st
import yfinance as yf

from agent_engine import FinancialAgentEngine
from rag_utils import build_or_load_vectorstore

load_dotenv()

st.set_page_config(
    page_title="Stock Terminal | FinChat",
    page_icon="📊",
    layout="wide",
    initial_sidebar_state="collapsed",
)

# ── CSS ─────────────────────────────────────────────────────────────────────────
st.markdown("""
<style>
@import url('https://fonts.googleapis.com/css2?family=Inter:wght@300;400;500;600;700&family=JetBrains+Mono:wght@400;600&display=swap');

html, body, [class*="css"] {
    font-family: 'Inter', sans-serif;
    background-color: #0A0A0F !important;
    color: #E4E4EF;
}

.block-container {
    padding-top: 1rem !important;
    padding-bottom: 2rem !important;
    max-width: 98% !important;
}

#MainMenu, footer, header { visibility: hidden; }

/* Terminal header */
.term-header {
    display: flex;
    justify-content: space-between;
    align-items: center;
    padding: 0.65rem 0;
    border-bottom: 1px solid #1E1E3A;
    margin-bottom: 1.2rem;
}

.brand-mark {
    font-family: 'JetBrains Mono', monospace;
    font-size: 1rem;
    font-weight: 700;
    color: #FFFFFF;
    letter-spacing: 0.04em;
    display: flex;
    align-items: center;
    gap: 0.5rem;
}

.pill-row { display: flex; gap: 0.4rem; }

.pill {
    font-family: 'JetBrains Mono', monospace;
    font-size: 0.65rem;
    font-weight: 600;
    padding: 0.25rem 0.6rem;
    border-radius: 999px;
    background: #111128;
    border: 1px solid #2D2D50;
    color: #9CA3AF;
    display: flex;
    align-items: center;
    gap: 0.3rem;
}

.dot-g { display:inline-block; width:6px; height:6px; border-radius:50%; background:#10B981; }

/* Metric strip */
.metric-strip {
    display: grid;
    grid-template-columns: repeat(5, 1fr);
    gap: 0.75rem;
    background: #111128;
    border: 1px solid #1E1E3A;
    border-radius: 10px;
    padding: 0.85rem 1.2rem;
    margin-bottom: 1.2rem;
}

.metric-cell { display: flex; flex-direction: column; }

.m-label {
    font-family: 'JetBrains Mono', monospace;
    font-size: 0.62rem;
    color: #4B5563;
    text-transform: uppercase;
    letter-spacing: 0.05em;
    margin-bottom: 0.2rem;
}

.m-val {
    font-family: 'JetBrains Mono', monospace;
    font-size: 1.1rem;
    font-weight: 700;
    color: #FFFFFF;
}

.m-val-green { color: #10B981; }
.m-val-red   { color: #EF4444; }

/* Section label */
.sec-label {
    font-family: 'JetBrains Mono', monospace;
    font-size: 0.68rem;
    font-weight: 700;
    text-transform: uppercase;
    letter-spacing: 0.06em;
    color: #6366F1;
    margin-bottom: 0.5rem;
}

/* Card */
.card {
    background: #111128;
    border: 1px solid #1E1E3A;
    border-radius: 10px;
    padding: 1rem 1.2rem;
    height: 100%;
}

.stat-row {
    display: flex;
    justify-content: space-between;
    align-items: center;
    padding: 0.45rem 0;
    border-bottom: 1px solid #1A1A2E;
    font-size: 0.8rem;
}

.stat-row:last-child { border-bottom: none; }

.stat-k { color: #6B7280; }
.stat-v { font-family: 'JetBrains Mono', monospace; font-weight: 600; color: #E4E4EF; }

/* Chat panel */
.chat-title {
    font-family: 'JetBrains Mono', monospace;
    font-size: 0.72rem;
    font-weight: 700;
    letter-spacing: 0.06em;
    text-transform: uppercase;
    color: #6366F1;
    margin-bottom: 0.75rem;
}

/* stButton */
.stButton > button {
    background: #1E1E3A !important;
    color: #E4E4EF !important;
    border: 1px solid #2D2D50 !important;
    border-radius: 6px !important;
    font-family: 'JetBrains Mono', monospace !important;
    font-size: 0.72rem !important;
    font-weight: 600 !important;
    letter-spacing: 0.04em !important;
    transition: all 0.15s !important;
}

.stButton > button:hover {
    background: #2D2D50 !important;
    border-color: #6366F1 !important;
    color: #FFFFFF !important;
}

/* stTextInput */
.stTextInput > div > div > input {
    background: #111128 !important;
    border: 1px solid #2D2D50 !important;
    border-radius: 6px !important;
    color: #E4E4EF !important;
    font-size: 0.85rem !important;
}

/* Chat input */
[data-testid="stChatInput"] textarea {
    background: #111128 !important;
    border: 1px solid #2D2D50 !important;
    border-radius: 10px !important;
    color: #E4E4EF !important;
    font-size: 0.85rem !important;
}
</style>
""", unsafe_allow_html=True)


# ── State ───────────────────────────────────────────────────────────────────────
def ensure_state():
    if "ticker" not in st.session_state:
        st.session_state.ticker = "AAPL"
    if "timeframe" not in st.session_state:
        st.session_state.timeframe = "1W"
    if "terminal_messages" not in st.session_state:
        st.session_state.terminal_messages: List[Dict[str, str]] = []

ensure_state()


# ── Data helpers ─────────────────────────────────────────────────────────────────
@st.cache_data(ttl=60)
def fetch_stock_data(ticker: str) -> Dict[str, Any]:
    stock = yf.Ticker(ticker)
    info = stock.info or {}
    fast = stock.fast_info

    last_price = float(fast.get("lastPrice", 0.0) or info.get("currentPrice", 0.0) or 0.0)
    prev_close = float(fast.get("previousClose", 0.0) or info.get("previousClose", last_price) or last_price)
    change = round(last_price - prev_close, 2)
    change_pct = round((change / prev_close) * 100, 2) if prev_close > 0 else 0.0

    market_cap = float(fast.get("marketCap", 0.0) or info.get("marketCap", 0.0) or 0.0)
    if market_cap >= 1e12:
        mcap_str = f"{market_cap / 1e12:.2f}T"
    elif market_cap >= 1e9:
        mcap_str = f"{market_cap / 1e9:.2f}B"
    else:
        mcap_str = f"{market_cap / 1e6:.2f}M"

    pe = info.get("trailingPE")
    pe_str = f"{float(pe):.1f}" if pe is not None else "N/A"

    volume = fast.get("threeMonthAverageVolume") or info.get("averageVolume", 0)
    vol_str = f"{int(volume)/1e6:.1f}M" if volume else "N/A"

    year_high = info.get("fiftyTwoWeekHigh") or fast.get("yearHigh") or 0.0
    year_low  = info.get("fiftyTwoWeekLow")  or fast.get("yearLow")  or 0.0

    return {
        "symbol":       ticker.upper(),
        "company_name": info.get("shortName", ticker.upper()),
        "last_price":   last_price or 150.0,
        "change":       change,
        "change_pct":   change_pct,
        "market_cap":   mcap_str,
        "pe_ratio":     pe_str,
        "volume":       vol_str,
        "year_high":    f"${year_high:.2f}" if year_high else "N/A",
        "year_low":     f"${year_low:.2f}"  if year_low  else "N/A",
        "sector":       info.get("sector", "N/A"),
        "industry":     info.get("industry", "N/A"),
        "description":  info.get("longBusinessSummary", "")[:400] + "…" if info.get("longBusinessSummary") else "",
    }


def fetch_chart(ticker: str, timeframe: str) -> pd.DataFrame:
    tf_map = {"1D": ("1d", "5m"), "1W": ("5d", "1h"), "1M": ("1mo", "1d"), "1Y": ("1y", "1d")}
    period, interval = tf_map.get(timeframe, ("5d", "1h"))
    try:
        data = yf.download(ticker, period=period, interval=interval, progress=False)
        if not data.empty and "Close" in data.columns:
            df = data.reset_index()
            if isinstance(df.columns, pd.MultiIndex):
                df.columns = [c[0] for c in df.columns]
            return df
    except Exception:
        pass
    return pd.DataFrame({"Date": ["Mon", "Tue", "Wed", "Thu", "Fri"], "Close": [181.1, 183.8, 183.2, 185.1, 187.5]})


# ── Terminal Header ─────────────────────────────────────────────────────────────
st.markdown(f"""
<div class="term-header">
    <div class="brand-mark">⬡ FINCHAT / STOCK TERMINAL</div>
    <div class="pill-row">
        <div class="pill">FOCUS: {st.session_state.ticker}</div>
        <div class="pill"><span class="dot-g"></span> LIVE DATA</div>
        <div class="pill"><span class="dot-g"></span> RAG ACTIVE</div>
    </div>
</div>
""", unsafe_allow_html=True)


# ── Search bar ─────────────────────────────────────────────────────────────────
sc1, sc2 = st.columns([5, 1])
with sc1:
    search_input = st.text_input("ticker", value=st.session_state.ticker,
                                  placeholder="Enter symbol: AAPL, TSLA, NVDA, MSFT…",
                                  label_visibility="collapsed")
with sc2:
    if st.button("LOAD", use_container_width=True):
        if search_input.strip():
            st.session_state.ticker = search_input.strip().upper()
            st.cache_data.clear()
            st.rerun()

stock_data = fetch_stock_data(st.session_state.ticker)
chg_pos = stock_data["change"] >= 0
chg_sign = "+" if chg_pos else ""
val_cls = "m-val-green" if chg_pos else "m-val-red"
arrow = "▲" if chg_pos else "▼"

# ── Metric Strip ──────────────────────────────────────────────────────────────
st.markdown(f"""
<div class="metric-strip">
    <div class="metric-cell">
        <div class="m-label">SYMBOL</div>
        <div class="m-val">{stock_data['symbol']}</div>
    </div>
    <div class="metric-cell">
        <div class="m-label">LAST PRICE</div>
        <div class="m-val">${stock_data['last_price']:.2f}</div>
    </div>
    <div class="metric-cell">
        <div class="m-label">CHANGE</div>
        <div class="m-val {val_cls}">{arrow} {chg_sign}{stock_data['change']:.2f}</div>
    </div>
    <div class="metric-cell">
        <div class="m-label">CHANGE %</div>
        <div class="m-val {val_cls}">{chg_sign}{stock_data['change_pct']:.2f}%</div>
    </div>
    <div class="metric-cell">
        <div class="m-label">MARKET CAP</div>
        <div class="m-val">{stock_data['market_cap']}</div>
    </div>
</div>
""", unsafe_allow_html=True)


# ── Main 2-col layout ─────────────────────────────────────────────────────────
col_left, col_right = st.columns([1.6, 1.0], gap="large")

with col_left:
    # Timeframe selector
    st.markdown('<div class="sec-label">PRICE PERFORMANCE</div>', unsafe_allow_html=True)
    b1, b2, b3, b4, _ = st.columns([1, 1, 1, 1, 4])
    if b1.button("1D", key="tf1d"): st.session_state.timeframe = "1D"; st.rerun()
    if b2.button("1W", key="tf1w"): st.session_state.timeframe = "1W"; st.rerun()
    if b3.button("1M", key="tf1m"): st.session_state.timeframe = "1M"; st.rerun()
    if b4.button("1Y", key="tf1y"): st.session_state.timeframe = "1Y"; st.rerun()

    hist_df = fetch_chart(st.session_state.ticker, st.session_state.timeframe)
    date_col = "Date" if "Date" in hist_df.columns else hist_df.columns[0]
    last_close = hist_df["Close"].iloc[-1] if not hist_df.empty else 150
    first_close = hist_df["Close"].iloc[0] if not hist_df.empty else 150
    is_up = last_close >= first_close
    line_color = "#10B981" if is_up else "#EF4444"

    fig = go.Figure()
    fig.add_trace(go.Scatter(
        x=hist_df[date_col], y=hist_df["Close"],
        mode="lines",
        line=dict(color=line_color, width=2.0),
        fill="tozeroy",
        fillcolor=f"rgba({'16,185,129' if is_up else '239,68,68'},0.08)",
        hoverinfo="x+y",
    ))
    fig.update_layout(
        plot_bgcolor="#111128", paper_bgcolor="#111128",
        margin=dict(l=35, r=20, t=10, b=30), height=270,
        xaxis=dict(showgrid=True, gridcolor="#1E1E3A", linecolor="#2D2D50",
                   tickfont=dict(family="JetBrains Mono", size=10, color="#4B5563")),
        yaxis=dict(showgrid=True, gridcolor="#1E1E3A", linecolor="#2D2D50",
                   tickfont=dict(family="JetBrains Mono", size=10, color="#4B5563")),
        showlegend=False,
    )
    st.plotly_chart(fig, use_container_width=True, config={"displayModeBar": False})

    # Stats cards
    bc1, bc2 = st.columns(2)
    with bc1:
        st.markdown('<div class="sec-label">COMPANY STATS</div>', unsafe_allow_html=True)
        st.markdown(f"""
        <div class="card">
            <div class="stat-row"><span class="stat-k">Company</span><span class="stat-v">{stock_data['company_name']}</span></div>
            <div class="stat-row"><span class="stat-k">Sector</span><span class="stat-v">{stock_data['sector']}</span></div>
            <div class="stat-row"><span class="stat-k">Market Cap</span><span class="stat-v">{stock_data['market_cap']}</span></div>
            <div class="stat-row"><span class="stat-k">P/E Ratio</span><span class="stat-v">{stock_data['pe_ratio']}</span></div>
            <div class="stat-row"><span class="stat-k">Avg Volume</span><span class="stat-v">{stock_data['volume']}</span></div>
        </div>
        """, unsafe_allow_html=True)
    with bc2:
        st.markdown('<div class="sec-label">52-WEEK RANGE</div>', unsafe_allow_html=True)
        st.markdown(f"""
        <div class="card">
            <div class="stat-row"><span class="stat-k">52W High</span><span class="stat-v">{stock_data['year_high']}</span></div>
            <div class="stat-row"><span class="stat-k">52W Low</span><span class="stat-v">{stock_data['year_low']}</span></div>
            <div class="stat-row"><span class="stat-k">Industry</span><span class="stat-v">{stock_data['industry']}</span></div>
        </div>
        """, unsafe_allow_html=True)
        if stock_data["description"]:
            st.caption(stock_data["description"])


with col_right:
    st.markdown('<div class="chat-title">⬡ FINCHAT ANALYST</div>', unsafe_allow_html=True)

    chat_container = st.container(height=380)
    with chat_container:
        if not st.session_state.terminal_messages:
            with st.chat_message("assistant"):
                st.markdown(
                    f"Hello. I'm FinChat. I'm currently loaded with **{stock_data['company_name']} ({stock_data['symbol']})** "
                    f"at **${stock_data['last_price']:.2f}**. Ask me anything — valuation, risks, news context, or sector analysis."
                )
        for msg in st.session_state.terminal_messages:
            with st.chat_message(msg["role"]):
                st.markdown(msg["content"])

    user_query = st.chat_input(f"Ask about {stock_data['symbol']}…")

    if user_query:
        st.session_state.terminal_messages.append({"role": "user", "content": user_query})
        with chat_container:
            with st.chat_message("user"):
                st.markdown(user_query)

        # Agent execution
        with st.spinner("FinChat analyzing…"):
            try:
                agent = FinancialAgentEngine()
                verdict, tool_records, narrative = agent.execute_plan(
                    query=user_query,
                    active_ticker=st.session_state.ticker,
                )
                answer = narrative
            except Exception as e:
                from rag_utils import format_context, generate_with_hf, retrieve_context
                vectorstore = build_or_load_vectorstore()
                docs = retrieve_context(vectorstore, user_query, top_k=3)
                context = format_context(docs)
                prompt = f"""You are FinChat, an institutional financial assistant.
Active Symbol: {st.session_state.ticker} (${stock_data['last_price']:.2f})
Context: {context}
Question: {user_query}
Provide a concise, professional answer."""
                answer = generate_with_hf(prompt)

        with chat_container:
            with st.chat_message("assistant"):
                st.markdown(answer)

        st.session_state.terminal_messages.append({"role": "assistant", "content": answer})
        st.rerun()
