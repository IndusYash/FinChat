import streamlit as st
import plotly.graph_objects as go
import plotly.express as px
import pandas as pd

from capital_engine import CapitalEngine

st.set_page_config(
    page_title="Capital Lab | FinChat",
    page_icon="💰",
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
    padding-top: 1.2rem !important;
    padding-bottom: 3rem !important;
    max-width: 1080px !important;
}

#MainMenu, footer, header { visibility: hidden; }

/* Page title */
.page-header {
    margin-bottom: 1.8rem;
    padding-bottom: 1rem;
    border-bottom: 1px solid #1E1E3A;
}

.page-title {
    font-size: 1.6rem;
    font-weight: 700;
    color: #FFFFFF;
    letter-spacing: -0.02em;
    margin-bottom: 0.3rem;
}

.page-sub {
    font-size: 0.82rem;
    color: #6B7280;
}

/* Calculator nav pills */
.calc-nav {
    display: flex;
    gap: 0.5rem;
    margin-bottom: 1.5rem;
    flex-wrap: wrap;
}

/* Result cards */
.result-card {
    background: #111128;
    border: 1px solid #1E1E3A;
    border-radius: 12px;
    padding: 1.2rem 1.4rem;
    margin-bottom: 1rem;
}

.result-title {
    font-family: 'JetBrains Mono', monospace;
    font-size: 0.68rem;
    font-weight: 700;
    text-transform: uppercase;
    letter-spacing: 0.06em;
    color: #6366F1;
    margin-bottom: 0.8rem;
}

.verdict-box {
    background: linear-gradient(135deg, #0F172A, #1E1E3A);
    border: 1px solid #6366F1;
    border-radius: 8px;
    padding: 0.9rem 1.1rem;
    font-size: 0.82rem;
    color: #C7D2FE;
    line-height: 1.5;
    margin-top: 0.8rem;
}

.kv-row {
    display: flex;
    justify-content: space-between;
    align-items: center;
    padding: 0.45rem 0;
    border-bottom: 1px solid #1A1A2E;
    font-size: 0.82rem;
}

.kv-row:last-child { border-bottom: none; }
.kv-k { color: #6B7280; }
.kv-v { font-family: 'JetBrains Mono', monospace; font-weight: 600; color: #E4E4EF; }
.kv-v-green { color: #10B981; }
.kv-v-red   { color: #EF4444; }
.kv-v-blue  { color: #6366F1; }

/* stSlider */
[data-baseweb="slider"] { padding-top: 0.3rem !important; }

/* stNumberInput */
[data-testid="stNumberInput"] input {
    background: #111128 !important;
    border: 1px solid #2D2D50 !important;
    border-radius: 6px !important;
    color: #E4E4EF !important;
}

/* stButton */
.stButton > button {
    background: #6366F1 !important;
    color: #FFFFFF !important;
    border: none !important;
    border-radius: 8px !important;
    font-family: 'JetBrains Mono', monospace !important;
    font-size: 0.78rem !important;
    font-weight: 700 !important;
    letter-spacing: 0.04em !important;
    padding: 0.5rem 1.4rem !important;
    transition: opacity 0.15s !important;
}

.stButton > button:hover { opacity: 0.85 !important; }

/* Plotly chart backgrounds */
.stPlotlyChart { border-radius: 8px; overflow: hidden; }
</style>
""", unsafe_allow_html=True)

# ── Page Header ─────────────────────────────────────────────────────────────────
st.markdown("""
<div class="page-header">
    <div class="page-title">💰 Capital Lab</div>
    <div class="page-sub">
        Personal finance simulators — the calculations that matter: SIP growth, loan prepayment, FIRE planning & insurance vs. investment
    </div>
</div>
""", unsafe_allow_html=True)

# ── Calculator Tabs ─────────────────────────────────────────────────────────────
tab1, tab2, tab3, tab4 = st.tabs([
    "📈 SIP & Wealth Builder",
    "🏠 Loan Prepayment Hack",
    "🔥 FIRE Retirement Planner",
    "🛡️ Insurance vs. Investment",
])


# ═══════════════════════════════════════════════════════════════════
# TAB 1 — SIP & WEALTH BUILDER
# ═══════════════════════════════════════════════════════════════════
with tab1:
    st.subheader("SIP Wealth Builder with Inflation Reality Check")
    st.caption("See how monthly investments compound over time — and what inflation does to your real purchasing power.")

    c1, c2 = st.columns([1.2, 1.8], gap="large")

    with c1:
        monthly_inv = st.number_input("Monthly Investment (₹ or $)", min_value=500, max_value=500000,
                                       value=15000, step=500)
        ann_return = st.slider("Expected Annual Return (%)", min_value=6.0, max_value=22.0,
                                value=12.0, step=0.5) / 100
        tenure_yr = st.slider("Investment Tenure (Years)", min_value=1, max_value=40, value=20)
        inflation_r = st.slider("Annual Inflation Rate (%)", min_value=2.0, max_value=12.0,
                                 value=6.0, step=0.5) / 100
        step_up_pct = st.slider("Annual Step-Up (%)", min_value=0, max_value=20, value=0)

        if st.button("Calculate SIP Returns", key="sip_calc"):
            st.session_state.sip_result = CapitalEngine.calculate_sip_with_inflation(
                monthly_investment=monthly_inv,
                expected_annual_return=ann_return,
                tenure_years=tenure_yr,
                annual_inflation_rate=inflation_r,
                annual_step_up_percent=step_up_pct,
            )

    with c2:
        res = st.session_state.get("sip_result")
        if res:
            # Metrics
            m1, m2, m3 = st.columns(3)
            m1.metric("Nominal Future Value", f"₹{res['nominal_future_value']:,.0f}")
            m2.metric("Real Purchasing Power", f"₹{res['real_purchasing_power']:,.0f}")
            m3.metric("Inflation Erodes", f"{res['inflation_loss_percent']}%", delta=f"-{res['inflation_loss_percent']}%",
                       delta_color="inverse")

            st.markdown('<div class="result-card">', unsafe_allow_html=True)
            st.markdown('<div class="result-title">WEALTH BREAKDOWN</div>', unsafe_allow_html=True)
            st.markdown(f"""
            <div class="kv-row"><span class="kv-k">Total Amount Invested</span><span class="kv-v">₹{res['total_invested']:,.0f}</span></div>
            <div class="kv-row"><span class="kv-k">Nominal Wealth Gained</span><span class="kv-v kv-v-green">₹{res['wealth_gain_nominal']:,.0f}</span></div>
            <div class="kv-row"><span class="kv-k">Real Wealth Gained (Inflation-adj)</span><span class="kv-v kv-v-blue">₹{res['wealth_gain_real']:,.0f}</span></div>
            <div class="kv-row"><span class="kv-k">Nominal Future Value</span><span class="kv-v">₹{res['nominal_future_value']:,.0f}</span></div>
            <div class="kv-row"><span class="kv-k">Real Purchasing Power Today</span><span class="kv-v">₹{res['real_purchasing_power']:,.0f}</span></div>
            """, unsafe_allow_html=True)
            st.markdown('</div>', unsafe_allow_html=True)

            # Bar chart
            fig_bar = go.Figure(data=[
                go.Bar(name="Invested", x=["Wealth Breakdown"], y=[res['total_invested']],
                       marker_color="#4B5563"),
                go.Bar(name="Nominal Gain", x=["Wealth Breakdown"], y=[res['wealth_gain_nominal']],
                       marker_color="#6366F1"),
                go.Bar(name="Inflation Loss", x=["Wealth Breakdown"],
                       y=[res['nominal_future_value'] - res['real_purchasing_power']],
                       marker_color="#EF4444"),
            ])
            fig_bar.update_layout(
                barmode="stack", plot_bgcolor="#111128", paper_bgcolor="#111128",
                height=220, margin=dict(l=20, r=20, t=20, b=20),
                legend=dict(font=dict(size=10, color="#9CA3AF"), bgcolor="rgba(0,0,0,0)"),
                xaxis=dict(showgrid=False, tickfont=dict(color="#6B7280")),
                yaxis=dict(showgrid=True, gridcolor="#1E1E3A", tickfont=dict(color="#6B7280")),
                font=dict(family="Inter"),
            )
            st.plotly_chart(fig_bar, use_container_width=True, config={"displayModeBar": False})
        else:
            st.info("Set your parameters and click **Calculate SIP Returns** to see results.")


# ═══════════════════════════════════════════════════════════════════
# TAB 2 — LOAN PREPAYMENT HACK
# ═══════════════════════════════════════════════════════════════════
with tab2:
    st.subheader("Loan Prepayment Hack Simulator")
    st.caption("What happens when you pay just 1 extra EMI per year? The results will surprise you.")

    c1, c2 = st.columns([1.2, 1.8], gap="large")

    with c1:
        loan_amt = st.number_input("Loan Amount (₹ or $)", min_value=100000, max_value=100000000,
                                    value=5000000, step=100000)
        ann_int = st.slider("Annual Interest Rate (%)", min_value=6.0, max_value=18.0,
                             value=8.5, step=0.25) / 100
        tenure_yr2 = st.slider("Loan Tenure (Years)", min_value=5, max_value=30, value=20)
        extra_emi = st.slider("Extra EMIs Per Year", min_value=0, max_value=6, value=1)

        if st.button("Simulate Prepayment", key="loan_calc"):
            st.session_state.loan_result = CapitalEngine.calculate_loan_prepayment_hack(
                loan_amount=loan_amt,
                annual_interest_rate=ann_int,
                tenure_years=tenure_yr2,
                extra_emi_per_year=extra_emi,
            )

    with c2:
        res = st.session_state.get("loan_result")
        if res:
            m1, m2, m3 = st.columns(3)
            m1.metric("Monthly EMI", f"₹{res['monthly_emi']:,.0f}")
            m2.metric("Years Saved", f"{res['years_saved']} yrs",
                       delta=f"-{res['years_saved']} years", delta_color="off")
            m3.metric("Interest Saved", f"₹{res['interest_saved']:,.0f}",
                       delta=f"-{res['interest_saved_percent']}%", delta_color="off")

            # Comparison bars
            fig_loan = go.Figure(data=[
                go.Bar(name="Standard (No Prepayment)",
                       x=["Total Interest", "Total Repaid", "Tenure (Months)"],
                       y=[res['standard_total_interest'], res['standard_total_payment'],
                          res['original_tenure_years'] * 12],
                       marker_color="#EF4444"),
                go.Bar(name=f"With {extra_emi} Extra EMI/yr",
                       x=["Total Interest", "Total Repaid", "Tenure (Months)"],
                       y=[res['standard_total_interest'] - res['interest_saved'],
                          res['hack_total_payment'],
                          res['hack_new_tenure_years'] * 12],
                       marker_color="#10B981"),
            ])
            fig_loan.update_layout(
                barmode="group", plot_bgcolor="#111128", paper_bgcolor="#111128",
                height=270, margin=dict(l=20, r=20, t=20, b=20),
                legend=dict(font=dict(size=10, color="#9CA3AF"), bgcolor="rgba(0,0,0,0)"),
                xaxis=dict(showgrid=False, tickfont=dict(color="#6B7280")),
                yaxis=dict(showgrid=True, gridcolor="#1E1E3A", tickfont=dict(color="#6B7280")),
                font=dict(family="Inter"),
            )
            st.plotly_chart(fig_loan, use_container_width=True, config={"displayModeBar": False})

            st.markdown(f'<div class="verdict-box">💡 {res["verdict"]}</div>', unsafe_allow_html=True)
        else:
            st.info("Configure your loan details and click **Simulate Prepayment** to see results.")


# ═══════════════════════════════════════════════════════════════════
# TAB 3 — FIRE RETIREMENT PLANNER
# ═══════════════════════════════════════════════════════════════════
with tab3:
    st.subheader("FIRE Retirement Planner")
    st.caption("Financial Independence, Retire Early — based on the 25x Rule and your projected wealth accumulation.")

    c1, c2 = st.columns([1.2, 1.8], gap="large")

    with c1:
        cur_age = st.number_input("Current Age", min_value=18, max_value=60, value=28)
        ret_age = st.number_input("Target Retirement Age", min_value=int(cur_age)+1, max_value=70, value=45)
        cur_exp = st.number_input("Current Monthly Expenses (₹/$)", min_value=5000, max_value=1000000,
                                   value=50000, step=1000)
        cur_sav = st.number_input("Current Savings / Portfolio (₹/$)", min_value=0, max_value=100000000,
                                   value=1000000, step=50000)
        mon_inv = st.number_input("Monthly Investment (₹/$)", min_value=0, max_value=500000,
                                   value=40000, step=1000)
        inv_return = st.slider("Expected Investment Return (%)", 6.0, 20.0, 12.0, 0.5) / 100
        inf_rate = st.slider("Inflation Rate (%)", 3.0, 10.0, 6.0, 0.5) / 100
        swr = st.slider("Safe Withdrawal Rate (%)", 3.0, 6.0, 4.0, 0.5,
                         help="4% rule → 25x annual expenses needed") / 100

        if st.button("Calculate FIRE Number", key="fire_calc"):
            st.session_state.fire_result = CapitalEngine.calculate_fire_retirement(
                current_age=int(cur_age),
                retirement_age=int(ret_age),
                current_monthly_expenses=cur_exp,
                inflation_rate=inf_rate,
                current_savings=cur_sav,
                monthly_investment=mon_inv,
                expected_investment_return=inv_return,
                safe_withdrawal_rate=swr,
            )

    with c2:
        res = st.session_state.get("fire_result")
        if res:
            achievable = res["is_fire_achievable"]
            color = "#10B981" if achievable else "#EF4444"
            label = "✅ ON TRACK FOR FIRE" if achievable else "⚠️ SHORTFALL — ADJUST PLAN"

            m1, m2 = st.columns(2)
            m1.metric("FIRE Target Corpus", f"₹{res['fire_target_corpus']:,.0f}")
            m2.metric("Projected Corpus", f"₹{res['projected_retirement_corpus']:,.0f}",
                       delta=f"{'+'if achievable else ''}{res['surplus_or_shortfall']:,.0f}",
                       delta_color="normal" if achievable else "inverse")

            # Progress toward FIRE
            progress = min(1.0, res['projected_retirement_corpus'] / res['fire_target_corpus'])
            st.markdown(f"""
            <div style="margin: 1rem 0;">
                <div style="display:flex; justify-content:space-between; font-size:0.72rem; font-family:'JetBrains Mono',monospace; color:#6B7280; margin-bottom:0.4rem;">
                    <span>FIRE PROGRESS</span><span>{progress*100:.1f}%</span>
                </div>
                <div style="background:#1E1E3A; border-radius:6px; height:10px; overflow:hidden;">
                    <div style="background:{color}; width:{progress*100:.1f}%; height:100%; border-radius:6px; transition: width 0.5s;"></div>
                </div>
            </div>
            """, unsafe_allow_html=True)

            st.markdown('<div class="result-card">', unsafe_allow_html=True)
            st.markdown(f'<div class="result-title">{label}</div>', unsafe_allow_html=True)
            st.markdown(f"""
            <div class="kv-row"><span class="kv-k">Years to Retirement</span><span class="kv-v">{res['years_to_retirement']} years</span></div>
            <div class="kv-row"><span class="kv-k">Future Annual Expenses</span><span class="kv-v">₹{res['future_annual_expenses']:,.0f}</span></div>
            <div class="kv-row"><span class="kv-k">FIRE Corpus Required (25x)</span><span class="kv-v kv-v-blue">₹{res['fire_target_corpus']:,.0f}</span></div>
            <div class="kv-row"><span class="kv-k">Projected Corpus</span><span class="kv-v {'kv-v-green' if achievable else 'kv-v-red'}">₹{res['projected_retirement_corpus']:,.0f}</span></div>
            <div class="kv-row"><span class="kv-k">Surplus / Shortfall</span><span class="kv-v {'kv-v-green' if achievable else 'kv-v-red'}">₹{res['surplus_or_shortfall']:,.0f}</span></div>
            """, unsafe_allow_html=True)
            st.markdown('</div>', unsafe_allow_html=True)
            st.markdown(f'<div class="verdict-box">🔥 {res["verdict"]}</div>', unsafe_allow_html=True)
        else:
            st.info("Enter your details and click **Calculate FIRE Number** to see your retirement projection.")


# ═══════════════════════════════════════════════════════════════════
# TAB 4 — INSURANCE VS. INVESTMENT
# ═══════════════════════════════════════════════════════════════════
with tab4:
    st.subheader("Insurance Policy vs. Buy Term + Invest the Rest (BTIR)")
    st.caption("Is your traditional endowment / money-back policy actually a good investment? Let the math decide.")

    c1, c2 = st.columns([1.2, 1.8], gap="large")

    with c1:
        ann_prem = st.number_input("Annual Policy Premium (₹/$)", min_value=5000, max_value=1000000,
                                    value=60000, step=5000)
        tenure_ins = st.slider("Policy Tenure (Years)", min_value=5, max_value=40, value=20)
        maturity = st.number_input("Promised Maturity Payout (₹/$)", min_value=100000, max_value=100000000,
                                    value=2000000, step=100000)
        term_cost = st.number_input("Annual Term Insurance Cost (₹/$)", min_value=2000, max_value=100000,
                                     value=12000, step=1000,
                                     help="A pure term insurance for the same cover costs much less.")
        eq_return = st.slider("Expected Equity Return (%)", 8.0, 18.0, 12.0, 0.5) / 100

        if st.button("Run Comparison", key="ins_calc"):
            st.session_state.ins_result = CapitalEngine.calculate_policy_vs_term_sip(
                annual_premium=ann_prem,
                tenure_years=tenure_ins,
                maturity_payout=maturity,
                term_insurance_cost=term_cost,
                equity_return_rate=eq_return,
            )

    with c2:
        res = st.session_state.get("ins_result")
        if res:
            wm = res["wealth_multiplier"]
            extra = res["extra_wealth_generated"]
            color_wm = "#10B981" if wm >= 1.5 else "#F59E0B"

            m1, m2, m3 = st.columns(3)
            m1.metric("Policy Real IRR", f"{res['policy_real_irr_percent']}%",
                       help="The actual compounded return your policy delivers")
            m2.metric("BTIR Final Corpus", f"₹{res['btir_final_corpus']:,.0f}")
            m3.metric("Wealth Multiplier", f"{wm}x",
                       delta=f"+{extra:,.0f} extra", delta_color="off")

            # Donut comparison
            labels_pie = ["Policy Payout", "BTIR Corpus Difference"]
            values_pie = [res["policy_maturity_payout"], max(0, res["btir_final_corpus"] - res["policy_maturity_payout"])]
            colors_pie = ["#4B5563", "#6366F1"]

            fig_pie = go.Figure(data=[go.Pie(
                labels=["Traditional Policy Payout", "Extra Wealth from BTIR"],
                values=values_pie,
                hole=0.55,
                marker=dict(colors=colors_pie),
                textfont=dict(size=11),
            )])
            fig_pie.update_layout(
                plot_bgcolor="#111128", paper_bgcolor="#111128",
                height=240, margin=dict(l=20, r=20, t=20, b=20),
                legend=dict(font=dict(size=10, color="#9CA3AF"), bgcolor="rgba(0,0,0,0)"),
                annotations=[dict(text=f"{wm}x", x=0.5, y=0.5, font_size=22,
                                   font_color=color_wm, showarrow=False)],
            )
            st.plotly_chart(fig_pie, use_container_width=True, config={"displayModeBar": False})

            st.markdown('<div class="result-card">', unsafe_allow_html=True)
            st.markdown('<div class="result-title">COMPARISON BREAKDOWN</div>', unsafe_allow_html=True)
            st.markdown(f"""
            <div class="kv-row"><span class="kv-k">Annual Premium Paid</span><span class="kv-v">₹{res['policy_annual_premium']:,.0f}</span></div>
            <div class="kv-row"><span class="kv-k">Total Invested (Policy)</span><span class="kv-v">₹{res['total_invested']:,.0f}</span></div>
            <div class="kv-row"><span class="kv-k">Policy Real IRR</span><span class="kv-v kv-v-red">{res['policy_real_irr_percent']}% p.a.</span></div>
            <div class="kv-row"><span class="kv-k">Term Insurance Cost (Year)</span><span class="kv-v">₹{res['term_insurance_cost']:,.0f}</span></div>
            <div class="kv-row"><span class="kv-k">Annual Invested in Equity (BTIR)</span><span class="kv-v">₹{res['annual_invested_in_equity']:,.0f}</span></div>
            <div class="kv-row"><span class="kv-k">BTIR Final Corpus</span><span class="kv-v kv-v-green">₹{res['btir_final_corpus']:,.0f}</span></div>
            """, unsafe_allow_html=True)
            st.markdown('</div>', unsafe_allow_html=True)
            st.markdown(f'<div class="verdict-box">💡 {res["verdict"]}</div>', unsafe_allow_html=True)
        else:
            st.info("Fill in your policy details and click **Run Comparison** to see the analysis.")
