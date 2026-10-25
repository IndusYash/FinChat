from typing import Dict, List, Literal, Optional, Tuple
from pydantic import BaseModel, Field


class CitationRef(BaseModel):
    source: str = Field(description="Name or path of the source document")
    page: Optional[int] = Field(default=None, description="Page number if available")
    snippet: str = Field(description="Excellence quote or snippet from document")
    relevance_score: Optional[float] = Field(default=None, description="Cosine or similarity score")


class ValuationVerdict(BaseModel):
    ticker: str = Field(description="Stock ticker symbol")
    stance: Literal["BULLISH", "BEARISH", "NEUTRAL"] = Field(description="Overall investment thesis")
    target_price_range: Tuple[float, float] = Field(description="Estimated fair value range (low, high)")
    current_price: float = Field(description="Current market price at time of analysis")
    key_catalysts: List[str] = Field(description="Top 2-3 positive growth drivers or catalysts")
    downside_risks: List[str] = Field(description="Top 2-3 risks from filings or market data")
    quantitative_summary: str = Field(description="Brief narrative explaining DCF and multiple context")
    citations: List[CitationRef] = Field(default_factory=list, description="Citations grounding this verdict")


class DCFOutput(BaseModel):
    ticker: str
    current_price: float
    base_fair_value: float
    implied_upside_percent: float
    wacc: float
    terminal_growth_rate: float
    shares_outstanding: float
    projected_fcf: List[float]
    sensitivity_matrix: Dict[str, Dict[str, float]] = Field(
        description="Nested dict of WACC vs Terminal Growth rates mapped to implied share price"
    )


class MonteCarloOutput(BaseModel):
    ticker: str
    current_price: float
    days: int
    num_simulations: int
    mean_final_price: float
    median_final_price: float
    percentile_5th: float
    percentile_95th: float
    value_at_risk_95: float
    prob_profit: float


class NewsItem(BaseModel):
    title: str
    publisher: str
    link: str
    published_time: Optional[str] = None
    sentiment_score: float = Field(default=0.0, description="Compound sentiment score [-1.0, 1.0]")
    sentiment_label: Literal["POSITIVE", "NEGATIVE", "NEUTRAL"] = Field(default="NEUTRAL")


class ToolCallRecord(BaseModel):
    tool_name: str
    arguments: Dict[str, str]
    thought: str
    observation: str
