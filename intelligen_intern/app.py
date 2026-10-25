import os
from typing import Any, Dict, List
from dotenv import load_dotenv
import streamlit as st

from rag_utils import build_or_load_vectorstore, format_context, generate_with_hf, retrieve_context

load_dotenv()

st.set_page_config(
    page_title="FinChat — AI Financial Assistant",
    page_icon="⬡",
    layout="centered",
    initial_sidebar_state="collapsed",
)

# ── Global CSS ─────────────────────────────────────────────────────────────────
st.markdown("""
<style>
@import url('https://fonts.googleapis.com/css2?family=Inter:wght@300;400;500;600;700&family=JetBrains+Mono:wght@400;600&display=swap');

html, body, [class*="css"] {
    font-family: 'Inter', sans-serif;
    background-color: #0A0A0F !important;
    color: #E4E4EF;
}

.block-container {
    padding-top: 0 !important;
    padding-bottom: 2rem !important;
    max-width: 760px !important;
}

/* Hide Streamlit chrome */
#MainMenu, footer, header { visibility: hidden; }
[data-testid="stSidebar"] { display: none; }

/* Hero section */
.hero-wrap {
    display: flex;
    flex-direction: column;
    align-items: center;
    justify-content: center;
    padding: 3.5rem 0 2rem;
    text-align: center;
}

.hero-logo {
    font-size: 2.8rem;
    line-height: 1;
    margin-bottom: 0.75rem;
}

.hero-title {
    font-size: 2rem;
    font-weight: 700;
    letter-spacing: -0.03em;
    color: #FFFFFF;
    margin: 0 0 0.4rem;
}

.hero-sub {
    font-size: 0.92rem;
    color: #6B7280;
    margin-bottom: 1.8rem;
    max-width: 480px;
    line-height: 1.55;
}

/* Status pill row */
.status-row {
    display: flex;
    gap: 0.5rem;
    justify-content: center;
    margin-bottom: 2rem;
    flex-wrap: wrap;
}

.status-pill {
    font-family: 'JetBrains Mono', monospace;
    font-size: 0.68rem;
    font-weight: 600;
    letter-spacing: 0.04em;
    padding: 0.3rem 0.7rem;
    border-radius: 999px;
    background: #1A1A2E;
    border: 1px solid #2D2D50;
    color: #A0A0C0;
    display: flex;
    align-items: center;
    gap: 0.35rem;
}

.dot-green { display:inline-block; width:6px; height:6px; border-radius:50%; background:#10B981; }
.dot-blue  { display:inline-block; width:6px; height:6px; border-radius:50%; background:#6366F1; }
.dot-amber { display:inline-block; width:6px; height:6px; border-radius:50%; background:#F59E0B; }

/* Capability cards */
.caps-row {
    display: grid;
    grid-template-columns: repeat(3, 1fr);
    gap: 0.75rem;
    margin-bottom: 2rem;
}

.cap-card {
    background: #111128;
    border: 1px solid #1E1E3A;
    border-radius: 10px;
    padding: 1rem;
    text-align: center;
    transition: border-color 0.2s;
}

.cap-card:hover { border-color: #4B4BBF; }

.cap-icon { font-size: 1.4rem; margin-bottom: 0.4rem; }

.cap-title {
    font-size: 0.78rem;
    font-weight: 600;
    color: #FFFFFF;
    margin-bottom: 0.25rem;
}

.cap-desc {
    font-size: 0.70rem;
    color: #6B7280;
    line-height: 1.4;
}

/* Chat messages area */
.stChatMessage { background: transparent !important; }
[data-testid="stChatMessage"] [data-testid="stMarkdownContainer"] { font-size: 0.88rem; }
[data-testid="stChatMessageContent"] { border-radius: 10px !important; }

/* Chat input */
[data-testid="stChatInput"] textarea {
    background: #111128 !important;
    border: 1px solid #2D2D50 !important;
    border-radius: 12px !important;
    color: #E4E4EF !important;
    font-size: 0.88rem !important;
}

[data-testid="stChatInput"] textarea:focus {
    border-color: #6366F1 !important;
    box-shadow: 0 0 0 2px rgba(99,102,241,0.2) !important;
}

/* Prompt suggestion chips */
.chips-row {
    display: flex;
    flex-wrap: wrap;
    gap: 0.5rem;
    justify-content: center;
    margin-bottom: 1.5rem;
}

.chip {
    font-size: 0.75rem;
    padding: 0.35rem 0.8rem;
    background: #111128;
    border: 1px solid #2D2D50;
    border-radius: 999px;
    color: #9CA3AF;
    cursor: pointer;
    transition: all 0.15s;
    white-space: nowrap;
}

.chip:hover {
    border-color: #6366F1;
    color: #FFFFFF;
    background: #1E1E3A;
}

/* Section divider */
.divider-line {
    border: none;
    border-top: 1px solid #1E1E3A;
    margin: 1.2rem 0;
}

/* Model badge */
.model-badge {
    display: inline-flex;
    align-items: center;
    gap: 0.35rem;
    font-family: 'JetBrains Mono', monospace;
    font-size: 0.65rem;
    font-weight: 600;
    padding: 0.2rem 0.55rem;
    border-radius: 4px;
    background: #1E1E3A;
    color: #6366F1;
    border: 1px solid #2D2D50;
    letter-spacing: 0.04em;
    margin-right: 0.4rem;
}

/* Selectbox / radio */
[data-testid="stSelectbox"] > div > div {
    background: #111128 !important;
    border: 1px solid #2D2D50 !important;
    color: #E4E4EF !important;
    border-radius: 8px !important;
}

/* Nav hint */
.nav-hint {
    text-align: center;
    font-size: 0.72rem;
    color: #4B5563;
    margin-top: 1.5rem;
}

.nav-hint a { color: #6366F1; text-decoration: none; }
</style>
""", unsafe_allow_html=True)


# ── Session state ───────────────────────────────────────────────────────────────
def ensure_state():
    if "messages" not in st.session_state:
        st.session_state.messages: List[Dict[str, str]] = []
    if "model_mode" not in st.session_state:
        st.session_state.model_mode = "FINE-TUNED"
    if "ticker" not in st.session_state:
        st.session_state.ticker = "AAPL"


ensure_state()


# ── Hero ────────────────────────────────────────────────────────────────────────
st.markdown("""
<div class="hero-wrap">
    <div class="hero-logo">⬡</div>
    <div class="hero-title">FinChat</div>
    <div class="hero-sub">
        Your AI-powered financial assistant. Ask about any stock, valuation, or market insight.
    </div>
</div>
""", unsafe_allow_html=True)

# Status pills
st.markdown("""
<div class="status-row">
    <div class="status-pill"><span class="dot-green"></span> RAG KNOWLEDGE BASE ACTIVE</div>
    <div class="status-pill"><span class="dot-blue"></span> FINE-TUNED MODEL ONLINE</div>
    <div class="status-pill"><span class="dot-amber"></span> LIVE MARKET DATA</div>
</div>
""", unsafe_allow_html=True)

# Capability cards
st.markdown("""
<div class="caps-row">
    <div class="cap-card">
        <div class="cap-icon">📈</div>
        <div class="cap-title">Stock Analysis</div>
        <div class="cap-desc">Live quotes, charts & fundamentals for any ticker</div>
    </div>
    <div class="cap-card">
        <div class="cap-icon">🔬</div>
        <div class="cap-title">Quant Lab</div>
        <div class="cap-desc">DCF valuation & Monte Carlo risk simulation</div>
    </div>
    <div class="cap-card">
        <div class="cap-icon">💰</div>
        <div class="cap-title">Capital Lab</div>
        <div class="cap-desc">SIP, loan, FIRE & insurance planning calculators</div>
    </div>
</div>
""", unsafe_allow_html=True)

# ── Suggested prompts ───────────────────────────────────────────────────────────
SUGGEST_PROMPTS = [
    "Analyze Apple (AAPL) for me",
    "What is NVDA's valuation?",
    "Explain P/E ratio vs EV/EBITDA",
    "Key risks in the semiconductor sector",
    "What is a DCF model?",
]

st.markdown('<div class="chips-row">' +
    "".join(f'<span class="chip">{p}</span>' for p in SUGGEST_PROMPTS) +
'</div>', unsafe_allow_html=True)

st.markdown('<hr class="divider-line">', unsafe_allow_html=True)

# ── Model selector (compact) ────────────────────────────────────────────────────
sel_col1, sel_col2 = st.columns([3, 1])
with sel_col2:
    mode = st.selectbox(
        "Model",
        options=["FINE-TUNED", "CLOUD API"],
        index=0,
        label_visibility="collapsed",
    )
    st.session_state.model_mode = mode

with sel_col1:
    st.markdown(
        f'<div style="padding-top:0.45rem;">'
        f'<span class="model-badge">⚙ {mode}</span>'
        f'<span style="font-size:0.75rem; color:#4B5563;">Active reasoning model</span>'
        f'</div>',
        unsafe_allow_html=True,
    )

# ── Chat history ─────────────────────────────────────────────────────────────────
for msg in st.session_state.messages:
    with st.chat_message(msg["role"]):
        st.markdown(msg["content"])

# ── Chat input ───────────────────────────────────────────────────────────────────
user_query = st.chat_input("Ask FinChat anything about stocks, markets, or finance…")

if user_query:
    st.session_state.messages.append({"role": "user", "content": user_query})
    with st.chat_message("user"):
        st.markdown(user_query)

    # RAG retrieval
    vectorstore = build_or_load_vectorstore()
    docs = retrieve_context(vectorstore, user_query, top_k=3)
    context = format_context(docs)

    prompt = f"""You are FinChat, a concise and precise AI financial assistant.

Knowledge Base Context:
{context}

User Question:
{user_query}

Provide a clear, structured, and professional answer. Use bullet points where appropriate. Keep it concise.""".strip()

    with st.chat_message("assistant"):
        with st.spinner("Analyzing…"):
            answer = generate_with_hf(prompt)
        st.markdown(answer)

    st.session_state.messages.append({"role": "assistant", "content": answer})
    st.rerun()

# ── Nav hint ─────────────────────────────────────────────────────────────────────
if not st.session_state.messages:
    st.markdown("""
    <div class="nav-hint">
        Explore more → 
        <strong>📊 Stock Terminal</strong> &nbsp;|&nbsp;
        <strong>🔬 Quant Lab</strong> &nbsp;|&nbsp;
        <strong>📰 Market Pulse</strong> &nbsp;|&nbsp;
        <strong>💰 Capital Lab</strong> &nbsp;|&nbsp;
        <strong>📚 Knowledge Base</strong>
        <br>Use the sidebar arrow (top-left) to navigate between pages.
    </div>
    """, unsafe_allow_html=True)
