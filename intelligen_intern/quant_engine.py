import math
from typing import Dict, List, Optional, Tuple
import numpy as np
import pandas as pd
import yfinance as yf

from schemas import DCFOutput, MonteCarloOutput


class FinancialQuantEngine:
    """Pure-Python quantitative finance engine.
    Calculates deterministic valuation models (DCF with sensitivity grids)
    and risk simulations (Monte Carlo Geometric Brownian Motion + Value-at-Risk).
    """

    @staticmethod
    def calculate_dcf(
        ticker: str,
        wacc: float = 0.09,
        terminal_growth: float = 0.025,
        projection_years: int = 5,
        growth_rate_override: Optional[float] = None,
    ) -> DCFOutput:
        """Computes Discounted Cash Flow (DCF) intrinsic valuation and a 5x5 sensitivity matrix.
        Falls back gracefully if some balance sheet items are unavailable.
        """
        stock = yf.Ticker(ticker)
        fast_info = stock.fast_info

        current_price = float(fast_info.get("lastPrice", 0.0) or 0.0)
        shares = float(fast_info.get("shares", 0.0) or 0.0)

        # Retrieve cash flow statement
        fcf_history = []
        try:
            cf = stock.cashflow
            if cf is not None and not cf.empty:
                for col in ["Free Cash Flow", "Operating Cash Flow"]:
                    if col in cf.index:
                        fcf_history = [float(x) for x in cf.loc[col].dropna().values[:4]]
                        break
        except Exception:
            fcf_history = []

        # Fallback to market cap proxy if FCF data is missing
        if not fcf_history or fcf_history[0] <= 0:
            market_cap = float(fast_info.get("marketCap", 0.0) or (current_price * shares if shares else 1e9))
            base_fcf = max(market_cap * 0.04, 1e8)  # 4% FCF yield assumption
        else:
            base_fcf = fcf_history[0]

        # Growth rate estimation
        if growth_rate_override is not None:
            growth_rate = growth_rate_override
        else:
            if len(fcf_history) >= 2 and fcf_history[-1] > 0 and fcf_history[0] > 0:
                years_diff = len(fcf_history) - 1
                cagr = (fcf_history[0] / fcf_history[-1]) ** (1.0 / years_diff) - 1.0
                growth_rate = min(max(cagr, 0.03), 0.25)  # clamp between 3% and 25%
            else:
                growth_rate = 0.08  # conservative default 8%

        # Cash & Debt from balance sheet
        total_cash = 0.0
        total_debt = 0.0
        try:
            bs = stock.balance_sheet
            if bs is not None and not bs.empty:
                for cash_key in ["Cash And Cash Equivalents", "Cash Cash Equivalents And Short Term Investments"]:
                    if cash_key in bs.index:
                        total_cash = float(bs.loc[cash_key].dropna().values[0])
                        break
                for debt_key in ["Total Debt", "Long Term Debt And Capital Lease Obligation"]:
                    if debt_key in bs.index:
                        total_debt = float(bs.loc[debt_key].dropna().values[0])
                        break
        except Exception:
            pass

        if shares <= 0:
            shares = 1e8  # safe fallback

        # Project 5-year FCF
        projected_fcf: List[float] = []
        cur_fcf = base_fcf
        for y in range(1, projection_years + 1):
            cur_fcf *= (1.0 + growth_rate)
            projected_fcf.append(cur_fcf)

        def _valuation_for_params(w: float, g: float) -> float:
            if w <= g:
                w = g + 0.01  # prevent division by zero or negative denominator
            pv_fcf = sum(fcf / ((1.0 + w) ** t) for t, fcf in enumerate(projected_fcf, start=1))
            terminal_val = (projected_fcf[-1] * (1.0 + g)) / (w - g)
            pv_terminal = terminal_val / ((1.0 + w) ** projection_years)
            enterprise_value = pv_fcf + pv_terminal
            equity_value = enterprise_value + total_cash - total_debt
            return max(equity_value / shares, 0.5)

        base_fair_value = round(_valuation_for_params(wacc, terminal_growth), 2)
        implied_upside = round(((base_fair_value - current_price) / current_price) * 100, 2) if current_price > 0 else 0.0

        # Construct 5x5 Sensitivity Matrix
        wacc_range = [round(wacc + delta, 3) for delta in [-0.02, -0.01, 0.0, 0.01, 0.02]]
        growth_range = [round(terminal_growth + delta, 3) for delta in [-0.01, -0.005, 0.0, 0.005, 0.01]]

        matrix: Dict[str, Dict[str, float]] = {}
        for w in wacc_range:
            row_key = f"{w*100:.1f}%"
            matrix[row_key] = {}
            for g in growth_range:
                col_key = f"{g*100:.1f}%"
                matrix[row_key][col_key] = round(_valuation_for_params(w, g), 2)

        return DCFOutput(
            ticker=ticker.upper(),
            current_price=round(current_price, 2),
            base_fair_value=base_fair_value,
            implied_upside_percent=implied_upside,
            wacc=round(wacc, 4),
            terminal_growth_rate=round(terminal_growth, 4),
            shares_outstanding=round(shares, 0),
            projected_fcf=[round(x, 0) for x in projected_fcf],
            sensitivity_matrix=matrix,
        )

    @staticmethod
    def run_monte_carlo(
        ticker: str,
        days: int = 90,
        num_simulations: int = 1000,
    ) -> Tuple[MonteCarloOutput, np.ndarray, pd.DatetimeIndex]:
        """Runs a Geometric Brownian Motion (GBM) Monte Carlo simulation on historical price series.
        Returns statistical summary, raw simulated paths array (shape: [days+1, simulations]),
        and future date timeline.
        """
        stock = yf.Ticker(ticker)
        history = stock.history(period="1y")

        if history.empty or "Close" not in history.columns:
            # Fallback with standard volatility
            current_price = 100.0
            daily_returns = pd.Series(np.random.normal(0.0004, 0.018, 252))
        else:
            current_price = float(history["Close"].iloc[-1])
            daily_returns = np.log(history["Close"] / history["Close"].shift(1)).dropna()

        mu = float(daily_returns.mean())
        sigma = float(daily_returns.std())

        dt = 1.0
        # Shape: (days, num_simulations)
        random_shocks = np.random.normal(0, 1, size=(days, num_simulations))
        drift = (mu - 0.5 * (sigma ** 2)) * dt
        daily_multipliers = np.exp(drift + sigma * np.sqrt(dt) * random_shocks)

        # Prepend initial price
        price_paths = np.zeros((days + 1, num_simulations))
        price_paths[0, :] = current_price

        for t in range(1, days + 1):
            price_paths[t, :] = price_paths[t - 1, :] * daily_multipliers[t - 1, :]

        final_prices = price_paths[-1, :]
        mean_final = float(np.mean(final_prices))
        median_final = float(np.median(final_prices))
        p5 = float(np.percentile(final_prices, 5))
        p95 = float(np.percentile(final_prices, 95))

        # 95% Value at Risk (maximum expected loss at 95% confidence)
        var_95 = max(round(current_price - p5, 2), 0.0)
        prob_profit = float(np.mean(final_prices > current_price) * 100)

        # Generate future dates
        last_date = history.index[-1] if not history.empty else pd.Timestamp.now()
        future_dates = pd.bdate_range(start=last_date, periods=days + 1)

        output = MonteCarloOutput(
            ticker=ticker.upper(),
            current_price=round(current_price, 2),
            days=days,
            num_simulations=num_simulations,
            mean_final_price=round(mean_final, 2),
            median_final_price=round(median_final, 2),
            percentile_5th=round(p5, 2),
            percentile_95th=round(p95, 2),
            value_at_risk_95=var_95,
            prob_profit=round(prob_profit, 1),
        )

        return output, price_paths, future_dates
