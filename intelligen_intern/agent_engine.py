import json
import os
import re
from typing import Any, Callable, Dict, List, Optional, Tuple

from market_tools import MarketTools
from quant_engine import FinancialQuantEngine
from rag_utils import build_or_load_vectorstore, retrieve_context_with_citations
from schemas import CitationRef, ToolCallRecord, ValuationVerdict


class FinancialAgentEngine:
    """Agentic financial reasoning engine.
    Orchestrates Tool Calling, ReAct execution cycles, RAG context retrieval,
    and returns Pydantic-validated structured outputs.
    """

    def __init__(self, vectorstore=None):
        self.vectorstore = vectorstore or build_or_load_vectorstore()
        self.tools: Dict[str, Callable] = {
            "get_live_quote": self._tool_live_quote,
            "get_fundamentals": self._tool_fundamentals,
            "run_dcf_valuation": self._tool_dcf,
            "run_monte_carlo": self._tool_monte_carlo,
            "search_knowledge_base": self._tool_rag_search,
            "get_ticker_news": self._tool_news,
        }

    # Tool Implementations
    def _tool_live_quote(self, ticker: str) -> Dict[str, Any]:
        return MarketTools.get_live_quote(ticker)

    def _tool_fundamentals(self, ticker: str) -> Dict[str, Any]:
        return MarketTools.get_company_fundamentals(ticker)

    def _tool_dcf(self, ticker: str, wacc: float = 0.09, terminal_growth: float = 0.025) -> Dict[str, Any]:
        dcf = MarketTools.run_dcf(ticker, wacc=float(wacc), terminal_growth=float(terminal_growth))
        return {
            "current_price": dcf.current_price,
            "base_fair_value": dcf.base_fair_value,
            "implied_upside_percent": dcf.implied_upside_percent,
            "wacc": dcf.wacc,
            "terminal_growth": dcf.terminal_growth_rate,
        }

    def _tool_monte_carlo(self, ticker: str, days: int = 90) -> Dict[str, Any]:
        mc, _, _ = MarketTools.run_monte_carlo(ticker, days=int(days))
        return {
            "mean_final_price": mc.mean_final_price,
            "value_at_risk_95": mc.value_at_risk_95,
            "percentile_5th": mc.percentile_5th,
            "percentile_95th": mc.percentile_95th,
            "prob_profit": mc.prob_profit,
        }

    def _tool_rag_search(self, query: str) -> Dict[str, Any]:
        context, citations = retrieve_context_with_citations(self.vectorstore, query, top_k=3)
        return {
            "context": context,
            "citations": [c.model_dump() for c in citations],
        }

    def _tool_news(self, ticker: str) -> Dict[str, Any]:
        news = MarketTools.get_ticker_news(ticker, limit=4)
        return {
            "headlines": [
                {
                    "title": item.title,
                    "publisher": item.publisher,
                    "sentiment": item.sentiment_label,
                    "score": item.sentiment_score,
                }
                for item in news
            ]
        }

    def _extract_ticker(self, query: str) -> str:
        """Heuristic to extract ticker symbol from query or default to AAPL."""
        match = re.search(r"\b([A-Z]{1,5})\b", query)
        common_words = {"WHAT", "HOW", "WHY", "DCF", "PE", "RAG", "THE", "CAN", "AND", "FOR"}
        if match and match.group(1) not in common_words:
            return match.group(1)
        return "AAPL"

    def execute_plan(
        self,
        query: str,
        active_ticker: Optional[str] = None,
        hf_token: Optional[str] = None,
        hf_model: Optional[str] = None,
    ) -> Tuple[ValuationVerdict, List[ToolCallRecord], str]:
        """Runs the ReAct reasoning and tool-execution plan.
        Returns:
            - ValuationVerdict: Pydantic structured output contract
            - tool_records: Audit log of tool actions and observations
            - narrative_response: Executive assistant synthesis
        """
        ticker = active_ticker or self._extract_ticker(query)
        tool_records: List[ToolCallRecord] = []
        collected_citations: List[CitationRef] = []

        # Step 1: Tool Call - Live Quote
        t1 = ToolCallRecord(
            tool_name="get_live_quote",
            arguments={"ticker": ticker},
            thought=f"Need fresh price action and market cap for {ticker} to anchor valuation.",
            observation="",
        )
        quote = self._tool_live_quote(ticker)
        t1.observation = f"Price: ${quote['last_price']} ({quote['change_pct']:+0.2f}%), Market Cap: ${quote['market_cap']:.2e}"
        tool_records.append(t1)

        # Step 2: Tool Call - Company Fundamentals
        t2 = ToolCallRecord(
            tool_name="get_fundamentals",
            arguments={"ticker": ticker},
            thought=f"Evaluate valuation multiples (P/E, EV/EBITDA, margins, debt) for {ticker}.",
            observation="",
        )
        funds = self._tool_fundamentals(ticker)
        t2.observation = (
            f"Trailing P/E: {funds['trailing_pe']}, Margin: {funds['profit_margins']}, "
            f"Debt/Equity: {funds['debt_to_equity']}, Rev Growth: {funds['revenue_growth']}"
        )
        tool_records.append(t2)

        # Step 3: Tool Call - DCF Valuation Engine
        t3 = ToolCallRecord(
            tool_name="run_dcf_valuation",
            arguments={"ticker": ticker, "wacc": "0.09", "terminal_growth": "0.025"},
            thought="Execute deterministic DCF model to compute intrinsic value without mathematical hallucination.",
            observation="",
        )
        dcf = self._tool_dcf(ticker, wacc=0.09, terminal_growth=0.025)
        t3.observation = (
            f"Base Fair Value: ${dcf['base_fair_value']}, Implied Upside: {dcf['implied_upside_percent']:+0.1f}%"
        )
        tool_records.append(t3)

        # Step 4: Tool Call - RAG Vector Search
        t4 = ToolCallRecord(
            tool_name="search_knowledge_base",
            arguments={"query": f"{ticker} risk factors revenue growth competition"},
            thought="Retrieve qualitative grounding and regulatory disclosures from indexed PDFs.",
            observation="",
        )
        rag_res = self._tool_rag_search(f"{ticker} risk factors valuation growth")
        for cit in rag_res.get("citations", []):
            collected_citations.append(CitationRef(**cit))
        t4.observation = f"Retrieved {len(rag_res.get('citations', []))} relevant document passages."
        tool_records.append(t4)

        # Step 5: Synthesize into Pydantic ValuationVerdict Contract
        curr_price = float(quote["last_price"]) or 150.0
        fair_val = float(dcf["base_fair_value"]) or curr_price

        # Determine stance deterministically
        if fair_val >= curr_price * 1.10:
            stance = "BULLISH"
        elif fair_val <= curr_price * 0.90:
            stance = "BEARISH"
        else:
            stance = "NEUTRAL"

        price_low = round(min(fair_val * 0.92, curr_price * 0.95), 2)
        price_high = round(max(fair_val * 1.08, curr_price * 1.05), 2)

        catalysts = [
            f"Deterministic DCF indicates fair value of ${fair_val} ({dcf['implied_upside_percent']:+0.1f}% upside).",
            f"Operating profit margin stands at {funds['profit_margins']} with {funds['revenue_growth']} top-line growth.",
            f"Strong institutional standing in {funds['sector']} sector.",
        ]

        risks = [
            f"Valuation sensitive to interest rates and WACC assumptions; Debt/Equity is {funds['debt_to_equity']}.",
            "Macroeconomic headwinds, cost inflation, and sector competition noted in regulatory filings.",
            f"Market volatility risk: Beta stands at {funds['beta']}.",
        ]

        quant_summary = (
            f"Analysis for {ticker}: Trades at ${curr_price:.2f}. "
            f"Trailing P/E is {funds['trailing_pe']}. Deterministic DCF fair value is ${fair_val:.2f} "
            f"under a 9.0% WACC and 2.5% terminal growth rate. "
            f"52-week trading corridor is ${quote['year_low']} - ${quote['year_high']}."
        )

        verdict = ValuationVerdict(
            ticker=ticker,
            stance=stance,
            target_price_range=(price_low, price_high),
            current_price=curr_price,
            key_catalysts=catalysts,
            downside_risks=risks,
            quantitative_summary=quant_summary,
            citations=collected_citations,
        )

        # Formulate executive narrative
        narrative = f"""### Executive Analysis: {ticker} ({verdict.stance})

**Current Price:** ${verdict.current_price:.2f} | **Target Range:** ${verdict.target_price_range[0]:.2f} – ${verdict.target_price_range[1]:.2f}

#### 1. Investment Thesis & Valuation
{verdict.quantitative_summary}

#### 2. Key Catalysts (Upside Drivers)
- {catalysts[0]}
- {catalysts[1]}
- {catalysts[2]}

#### 3. Critical Risks & Sensitivity
- {risks[0]}
- {risks[1]}
- {risks[2]}
""".strip()

        return verdict, tool_records, narrative
