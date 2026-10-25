import plotly.graph_objects as go
import streamlit as st
import yfinance as yf

from market_tools import MarketTools

st.set_page_config(
    page_title="Market Pulse | FinChat",
    page_icon="📰",
    layout="wide",
    initial_sidebar_state="collapsed",
)

st.markdown("""
<style>
@import url('https://fonts.googleapis.com/css2?family=Inter:wght@300;400;500;600;700&family=JetBrains+Mono:wght@400;600&display=swap');
html, body, [class*="css"] { font-family: 'Inter', sans-serif; background-color: #0A0A0F !important; color: #E4E4EF; }
.block-container { padding-top: 1.2rem !important; padding-bottom: 3rem !important; max-width: 1100px !important; }
#MainMenu, footer, header { visibility: hidden; }
.stTextInput > div > div > input { background: #111128 !important; border: 1px solid #2D2D50 !important; border-radius: 6px !important; color: #E4E4EF !important; }
[data-testid="stSelectbox"] > div > div { background: #111128 !important; border: 1px solid #2D2D50 !important; color: #E4E4EF !important; border-radius: 8px !important; }
</style>
""", unsafe_allow_html=True)

st.markdown('<h2 style="font-size:1.5rem;font-weight:700;color:#FFFFFF;margin-bottom:0.2rem;">📰 Market Pulse & Fundamentals</h2>', unsafe_allow_html=True)
st.caption("Live financial news with sentiment scoring, candlestick price action, and fundamental valuation multiples")

with st.sidebar:
    st.subheader("Ticker Selection")
    ticker = st.text_input("Ticker", value="NVDA").upper().strip() or "NVDA"
    period = st.selectbox("Chart Period", options=["1mo", "3mo", "6mo", "1y", "2y"], index=2)

quote = MarketTools.get_live_quote(ticker)
funds = MarketTools.get_company_fundamentals(ticker)

# Header Metric Cards
col1, col2, col3, col4, col5 = st.columns(5)
col1.metric("Current Price", f"${quote['last_price']:.2f}", f"{quote['change_pct']:+0.2f}%")
col2.metric("Company", funds.get("company_name", ticker))
col3.metric("Sector", funds.get("sector", "N/A"))
col4.metric("Market Cap", f"${quote['market_cap']:.2e}" if quote['market_cap'] else "N/A")
col5.metric("52-Week Range", f"${quote['year_low']} – ${quote['year_high']}")

st.divider()

# Left column: Price Chart & Fundamentals | Right column: News & Sentiment
left_col, right_col = st.columns([3, 2])

with left_col:
    st.subheader(f"{ticker} Technical Price Action")
    stock = yf.Ticker(ticker)
    hist = stock.history(period=period)

    if not hist.empty:
        fig_candle = go.Figure()
        fig_candle.add_trace(
            go.Candlestick(
                x=hist.index,
                open=hist["Open"],
                high=hist["High"],
                low=hist["Low"],
                close=hist["Close"],
                name="OHLC",
            )
        )
        # Add 20-day Moving Average
        if len(hist) >= 20:
            hist["MA20"] = hist["Close"].rolling(window=20).mean()
            fig_candle.add_trace(go.Scatter(x=hist.index, y=hist["MA20"], mode="lines", name="20-Day SMA", line=dict(color="orange", width=1.5)))

        fig_candle.update_layout(
            xaxis_rangeslider_visible=False,
            height=380,
            margin=dict(l=20, r=20, t=20, b=20),
        )
        st.plotly_chart(fig_candle, use_container_width=True)
    else:
        st.warning("Historical price data unavailable.")

    st.subheader("Key Fundamental Valuation Multiples")
    f_c1, f_c2 = st.columns(2)
    with f_c1:
        st.markdown(f"**Trailing P/E:** `{funds.get('trailing_pe')}`")
        st.markdown(f"**Forward P/E:** `{funds.get('forward_pe')}`")
        st.markdown(f"**PEG Ratio:** `{funds.get('peg_ratio')}`")
        st.markdown(f"**Price to Book:** `{funds.get('price_to_book')}`")
        st.markdown(f"**EV / EBITDA:** `{funds.get('enterprise_to_ebitda')}`")
    with f_c2:
        st.markdown(f"**Profit Margin:** `{funds.get('profit_margins')}`")
        st.markdown(f"**Operating Margin:** `{funds.get('operating_margins')}`")
        st.markdown(f"**Return on Equity (ROE):** `{funds.get('return_on_equity')}`")
        st.markdown(f"**Debt to Equity:** `{funds.get('debt_to_equity')}`")
        st.markdown(f"**Revenue Growth:** `{funds.get('revenue_growth')}`")

with right_col:
    st.subheader("Corporate News & Sentiment")
    news_items = MarketTools.get_ticker_news(ticker, limit=7)

    if not news_items:
        st.info("No recent news headlines found for this ticker.")
    else:
        # Average sentiment summary
        avg_score = sum(item.sentiment_score for item in news_items) / len(news_items)
        if avg_score >= 0.15:
            st.success(f"Aggregate News Sentiment: **Bullish / Positive** (Score: {avg_score:+.2f})")
        elif avg_score <= -0.15:
            st.error(f"Aggregate News Sentiment: **Bearish / Negative** (Score: {avg_score:+.2f})")
        else:
            st.info(f"Aggregate News Sentiment: **Neutral** (Score: {avg_score:+.2f})")

        for item in news_items:
            # Color-coded badge
            if item.sentiment_label == "POSITIVE":
                badge = "🟢 **POSITIVE**"
            elif item.sentiment_label == "NEGATIVE":
                badge = "🔴 **NEGATIVE**"
            else:
                badge = "⚪ **NEUTRAL**"

            with st.container(border=True):
                st.markdown(f"[{item.title}]({item.link})")
                st.caption(f"{item.publisher} • {item.published_time or 'Recent'} • {badge} (`{item.sentiment_score:+.2f}`)")
