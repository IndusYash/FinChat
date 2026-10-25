import numpy as np
import pandas as pd
import plotly.express as px
import plotly.graph_objects as go
import streamlit as st
import yfinance as yf

from market_tools import MarketTools
from quant_engine import FinancialQuantEngine

st.set_page_config(
    page_title="Quant Lab | FinChat",
    page_icon="🔬",
    layout="wide",
    initial_sidebar_state="collapsed",
)

st.markdown("""
<style>
@import url('https://fonts.googleapis.com/css2?family=Inter:wght@300;400;500;600;700&family=JetBrains+Mono:wght@400;600&display=swap');
html, body, [class*="css"] { font-family: 'Inter', sans-serif; background-color: #0A0A0F !important; color: #E4E4EF; }
.block-container { padding-top: 1.2rem !important; padding-bottom: 3rem !important; max-width: 1100px !important; }
#MainMenu, footer, header { visibility: hidden; }
.stSlider > div > div > div { background: #6366F1 !important; }
[data-testid="stSelectbox"] > div > div { background: #111128 !important; border: 1px solid #2D2D50 !important; color: #E4E4EF !important; border-radius: 8px !important; }
.stTextInput > div > div > input { background: #111128 !important; border: 1px solid #2D2D50 !important; border-radius: 6px !important; color: #E4E4EF !important; }
</style>
""", unsafe_allow_html=True)

st.markdown('<h2 style="font-size:1.5rem;font-weight:700;color:#FFFFFF;margin-bottom:0.2rem;">🔬 Quantitative Valuation & Risk Lab</h2>', unsafe_allow_html=True)
st.caption("Deterministic DCF valuation with sensitivity heatmap & Monte Carlo Geometric Brownian Motion (GBM) simulation")

# Sidebar controls
with st.sidebar:
    st.subheader("Asset & Modeling Parameters")
    ticker = st.text_input("Ticker Symbol", value="AAPL").upper().strip() or "AAPL"
    st.divider()
    st.subheader("DCF Assumptions")
    wacc = st.slider("WACC (Discount Rate)", min_value=0.05, max_value=0.16, value=0.09, step=0.005, format="%.3f")
    terminal_growth = st.slider("Terminal Growth Rate (g)", min_value=0.01, max_value=0.05, value=0.025, step=0.005, format="%.3f")
    st.divider()
    st.subheader("Monte Carlo Assumptions")
    mc_days = st.select_slider("Simulation Horizon (Trading Days)", options=[30, 60, 90, 180, 252], value=90)
    mc_sims = st.slider("Number of Simulation Paths", min_value=200, max_value=2000, value=800, step=100)

# Fetch current quote
quote = MarketTools.get_live_quote(ticker)
st.metric(
    label=f"{ticker} Current Price",
    value=f"${quote['last_price']:.2f}",
    delta=f"{quote['change_pct']:+0.2f}%",
)

tab1, tab2 = st.tabs(["📊 DCF Valuation & Sensitivity Matrix", "🎲 Monte Carlo Price Simulation & VaR"])

# TAB 1: DCF
with tab1:
    st.subheader(f"Discounted Cash Flow (DCF) Analysis: {ticker}")
    dcf = FinancialQuantEngine.calculate_dcf(ticker, wacc=wacc, terminal_growth=terminal_growth)

    c1, c2, c3, c4 = st.columns(4)
    c1.metric("Base Fair Value", f"${dcf.base_fair_value:.2f}")
    c2.metric("Market Price", f"${dcf.current_price:.2f}")
    c3.metric("Implied Upside / Downside", f"{dcf.implied_upside_percent:+0.1f}%")
    c4.metric("Assumed WACC / Terminal g", f"{wacc*100:.1f}% / {terminal_growth*100:.1f}%")

    st.markdown("#### Projected 5-Year Free Cash Flows (USD)")
    df_fcf = pd.DataFrame({
        "Year": [f"Year {i}" for i in range(1, len(dcf.projected_fcf) + 1)],
        "Projected FCF ($)": [f"${x:,.0f}" for x in dcf.projected_fcf],
    })
    st.table(df_fcf.T)

    st.markdown("#### 5x5 Valuation Sensitivity Heatmap (WACC vs. Terminal Growth)")
    st.caption("Shows implied share price across varying discount rates and perpetual growth assumptions.")

    matrix_df = pd.DataFrame(dcf.sensitivity_matrix)
    # Style heatmap
    fig_heat = px.imshow(
        matrix_df,
        labels=dict(x="Terminal Growth Rate", y="WACC", color="Fair Value ($)"),
        x=matrix_df.columns,
        y=matrix_df.index,
        color_continuous_scale="RdYlGn",
        text_auto=True,
        aspect="auto",
    )
    fig_heat.update_layout(height=400, margin=dict(l=20, r=20, t=30, b=20))
    st.plotly_chart(fig_heat, use_container_width=True)

# TAB 2: Monte Carlo
with tab2:
    st.subheader(f"Monte Carlo Geometric Brownian Motion (GBM): {ticker}")
    st.caption(f"Simulating {mc_sims:,} random price trajectories over the next {mc_days} trading days.")

    with st.spinner("Running stochastic simulation..."):
        mc_output, paths, future_dates = FinancialQuantEngine.run_monte_carlo(
            ticker, days=mc_days, num_simulations=mc_sims
        )

    m1, m2, m3, m4, m5 = st.columns(5)
    m1.metric("Expected Mean Price", f"${mc_output.mean_final_price:.2f}")
    m2.metric("Median (50th %ile)", f"${mc_output.median_final_price:.2f}")
    m3.metric("5th Percentile (Bear)", f"${mc_output.percentile_5th:.2f}")
    m4.metric("95th Percentile (Bull)", f"${mc_output.percentile_95th:.2f}")
    m5.metric("95% Value at Risk (VaR)", f"${mc_output.value_at_risk_95:.2f}", help="Maximum expected loss at 95% confidence level.")

    # Fan chart
    st.markdown("#### Simulated Price Trajectories (Fan Chart)")
    fig_mc = go.Figure()

    # Sample 80 paths to keep rendering crisp and fast
    sample_indices = np.random.choice(mc_sims, size=min(70, mc_sims), replace=False)
    for idx in sample_indices:
        fig_mc.add_trace(
            go.Scatter(
                x=future_dates,
                y=paths[:, idx],
                mode="lines",
                line=dict(width=0.8, color="rgba(100, 149, 237, 0.2)"),
                showlegend=False,
                hoverinfo="skip",
            )
        )

    # Add Median, 5th, and 95th percentile trajectory bands
    p5_path = np.percentile(paths, 5, axis=1)
    p50_path = np.percentile(paths, 50, axis=1)
    p95_path = np.percentile(paths, 95, axis=1)

    fig_mc.add_trace(go.Scatter(x=future_dates, y=p95_path, mode="lines", name="95th %ile (Bull)", line=dict(color="#00CC96", width=2.5)))
    fig_mc.add_trace(go.Scatter(x=future_dates, y=p50_path, mode="lines", name="50th %ile (Median)", line=dict(color="#FFA15A", width=2.5)))
    fig_mc.add_trace(go.Scatter(x=future_dates, y=p5_path, mode="lines", name="5th %ile (Bear)", line=dict(color="#EF553B", width=2.5)))

    fig_mc.update_layout(
        title=f"{ticker} — Monte Carlo Simulation ({mc_days} Days Horizon)",
        xaxis_title="Date",
        yaxis_title="Price ($)",
        height=480,
        margin=dict(l=20, r=20, t=40, b=20),
    )
    st.plotly_chart(fig_mc, use_container_width=True)

    # Histogram of final price outcomes
    st.markdown("#### Distribution of Horizon Price Outcomes")
    final_prices = paths[-1, :]
    fig_hist = px.histogram(
        final_prices,
        nbins=40,
        labels={"value": "Final Price ($)"},
        title=f"Terminal Price Distribution (Probability of Profit: {mc_output.prob_profit:.1f}%)",
        color_discrete_sequence=["#636EFA"],
    )
    fig_hist.add_vline(x=quote["last_price"], line_dash="dash", line_color="yellow", annotation_text="Current Price")
    fig_hist.add_vline(x=mc_output.percentile_5th, line_dash="dot", line_color="red", annotation_text="95% VaR Cutoff")
    fig_hist.update_layout(height=350, margin=dict(l=20, r=20, t=40, b=20))
    st.plotly_chart(fig_hist, use_container_width=True)
