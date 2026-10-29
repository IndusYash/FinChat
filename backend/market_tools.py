import datetime
from typing import Any, Dict, List, Optional
import yfinance as yf

from quant_engine import FinancialQuantEngine
from schemas import DCFOutput, MonteCarloOutput, NewsItem


# Domain-specific financial sentiment lexicon
POSITIVE_FINANCIAL_WORDS = {
    "surge", "surges", "surged", "jump", "jumps", "jumped", "rally", "rallies", "growth",
    "profit", "profits", "profitable", "beat", "beats", "beaten", "bull", "bullish", "record",
    "high", "higher", "outperform", "outperformed", "dividend", "upside", "gain", "gains",
    "upgrade", "upgrades", "revenue", "expansion", "momentum", "buy", "exceed", "exceeds"
}

NEGATIVE_FINANCIAL_WORDS = {
    "fall", "falls", "fell", "drop", "drops", "dropped", "slump", "slumps", "plunge", "plunges",
    "loss", "losses", "miss", "misses", "missed", "bear", "bearish", "decline", "declines",
    "down", "lower", "underperform", "debt", "lawsuit", "investigation", "risk", "risks",
    "warning", "warns", "downgrade", "downgrades", "recession", "inflation", "sell", "cut", "cuts"
}


def _analyze_headline_sentiment(text: str) -> tuple[float, str]:
    """Calculates rule-based polarity score in [-1.0, 1.0] and classifies sentiment."""
    words = text.lower().replace(",", " ").replace(".", " ").replace("!", " ").split()
    pos_count = sum(1 for w in words if w in POSITIVE_FINANCIAL_WORDS)
    neg_count = sum(1 for w in words if w in NEGATIVE_FINANCIAL_WORDS)
    total = pos_count + neg_count

    if total == 0:
        return 0.0, "NEUTRAL"

    score = (pos_count - neg_count) / total
    score = round(max(min(score, 1.0), -1.0), 2)

    if score >= 0.2:
        label = "POSITIVE"
    elif score <= -0.2:
        label = "NEGATIVE"
    else:
        label = "NEUTRAL"

    return score, label


class MarketTools:
    """Core financial market data and quantitative analysis tools."""

    @staticmethod
    def get_live_quote(ticker: str) -> Dict[str, Any]:
        """Fetches real-time price snapshot, day range, volume, and 52-week statistics."""
        try:
            stock = yf.Ticker(ticker)
            fast_info = stock.fast_info

            try:
                last_price = float(fast_info.get("lastPrice", 0.0) or 0.0)
            except Exception:
                last_price = 0.0

            try:
                prev_close = float(fast_info.get("previousClose", 0.0) or last_price)
            except Exception:
                prev_close = last_price

            change = round(last_price - prev_close, 2)
            change_pct = round((change / prev_close) * 100, 2) if prev_close > 0 else 0.0

            def _safe_float(key):
                try:
                    return float(fast_info.get(key, 0.0) or 0.0)
                except Exception:
                    return 0.0

            def _safe_str(key, default):
                try:
                    return fast_info.get(key, default) or default
                except Exception:
                    return default

            return {
                "ticker": ticker.upper(),
                "last_price": round(last_price, 2),
                "previous_close": round(prev_close, 2),
                "change": change,
                "change_pct": change_pct,
                "day_high": round(_safe_float("dayHigh"), 2),
                "day_low": round(_safe_float("dayLow"), 2),
                "year_high": round(_safe_float("yearHigh"), 2),
                "year_low": round(_safe_float("yearLow"), 2),
                "market_cap": _safe_float("marketCap"),
                "currency": _safe_str("currency", "USD"),
            }
        except Exception:
            return {
                "ticker": ticker.upper(),
                "last_price": 0.0,
                "previous_close": 0.0,
                "change": 0.0,
                "change_pct": 0.0,
                "day_high": 0.0,
                "day_low": 0.0,
                "year_high": 0.0,
                "year_low": 0.0,
                "market_cap": 0.0,
                "currency": "USD",
            }

    @staticmethod
    def get_company_fundamentals(ticker: str) -> Dict[str, Any]:
        """Extracts fundamental valuation multiples and operational ratios."""
        stock = yf.Ticker(ticker)
        info = stock.info or {}

        def _fmt(val, is_pct=False):
            if val is None or val == "N/A":
                return "N/A"
            try:
                fval = float(val)
                return f"{fval * 100:.1f}%" if is_pct else f"{fval:.2f}"
            except Exception:
                return str(val)

        return {
            "ticker": ticker.upper(),
            "company_name": info.get("shortName", ticker.upper()),
            "sector": info.get("sector", "N/A"),
            "industry": info.get("industry", "N/A"),
            "trailing_pe": _fmt(info.get("trailingPE")),
            "forward_pe": _fmt(info.get("forwardPE")),
            "peg_ratio": _fmt(info.get("pegRatio")),
            "price_to_book": _fmt(info.get("priceToBook")),
            "enterprise_to_ebitda": _fmt(info.get("enterpriseToEbitda")),
            "profit_margins": _fmt(info.get("profitMargins"), is_pct=True),
            "operating_margins": _fmt(info.get("operatingMargins"), is_pct=True),
            "return_on_equity": _fmt(info.get("returnOnEquity"), is_pct=True),
            "debt_to_equity": _fmt(info.get("debtToEquity")),
            "revenue_growth": _fmt(info.get("revenueGrowth"), is_pct=True),
            "beta": _fmt(info.get("beta")),
            "dividend_yield": _fmt(info.get("dividendYield"), is_pct=True),
        }

    @staticmethod
    def get_ticker_news(ticker: str, limit: int = 8) -> List[NewsItem]:
        """Fetches latest corporate news and applies financial sentiment classification."""
        stock = yf.Ticker(ticker)
        news_data = stock.news or []
        items: List[NewsItem] = []

        for item in news_data[:limit]:
            # In modern yfinance news can have a 'content' dict or top-level keys
            content = item.get("content", item)
            title = content.get("title") or item.get("title") or "Financial Update"
            publisher = (
                content.get("provider", {}).get("displayName")
                or content.get("publisher")
                or item.get("publisher")
                or "Market Wire"
            )
            canonical_url = content.get("canonicalUrl", {}).get("url") or item.get("link") or "#"
            pub_date = content.get("pubDate") or item.get("providerPublishTime")

            time_str = None
            if isinstance(pub_date, int):
                time_str = datetime.datetime.fromtimestamp(pub_date).strftime("%Y-%m-%d %H:%M")
            elif isinstance(pub_date, str):
                time_str = pub_date[:16]

            score, label = _analyze_headline_sentiment(title)

            items.append(
                NewsItem(
                    title=title,
                    publisher=publisher,
                    link=canonical_url,
                    published_time=time_str,
                    sentiment_score=score,
                    sentiment_label=label,
                )
            )

        return items

    @staticmethod
    def run_dcf(ticker: str, wacc: float = 0.09, terminal_growth: float = 0.025) -> DCFOutput:
        """Runs the deterministic DCF valuation tool."""
        return FinancialQuantEngine.calculate_dcf(
            ticker=ticker,
            wacc=wacc,
            terminal_growth=terminal_growth,
        )

    @staticmethod
    def run_monte_carlo(ticker: str, days: int = 90, simulations: int = 1000):
        """Runs the Monte Carlo simulation tool."""
        return FinancialQuantEngine.run_monte_carlo(
            ticker=ticker,
            days=days,
            num_simulations=simulations,
        )
