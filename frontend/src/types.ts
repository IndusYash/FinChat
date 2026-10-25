export interface StockData {
  symbol: string;
  name: string;
  price: number;
  change: number;
  changePct: number;
  marketCap: string;
  peRatio: string;
  forwardPe: string;
  pegRatio: string;
  evEbitda: string;
  debtToEquity: string;
  profitMargin: string;
  revenueGrowth: string;
  buyPct: number;
  holdPct: number;
  sellPct: number;
  points: { [key: string]: { labels: string[]; values: number[] } };
}

export interface NewsItem {
  id: string;
  title: string;
  publisher: string;
  time: string;
  link: string;
  sentiment: 'POSITIVE' | 'NEGATIVE' | 'NEUTRAL';
  score: number;
}

export interface Message {
  id: string;
  role: 'user' | 'assistant';
  content: string;
  toolCalls?: string[];
  verdict?: {
    stance: 'BULLISH' | 'BEARISH' | 'NEUTRAL';
    targetRange: [number, number];
  };
}

export interface RagDocument {
  id: string;
  name: string;
  size: string;
  chunks: number;
  uploadDate: string;
}
