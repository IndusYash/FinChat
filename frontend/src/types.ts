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
  isSampleData?: boolean;
  currency?: string;
  exchange?: string;
  news?: NewsItem[];
}

export function getCurrencySymbol(stockOrSymbol?: StockData | string): string {
  if (!stockOrSymbol) return '₹';
  if (typeof stockOrSymbol === 'object') {
    if (stockOrSymbol.currency === 'INR') return '₹';
    if (stockOrSymbol.currency === 'USD') return '$';
    return getCurrencySymbol(stockOrSymbol.symbol);
  }
  const s = stockOrSymbol.toUpperCase();
  if (s.endsWith('.NS') || s.endsWith('.BO') || s.startsWith('^NSE') || s.startsWith('^BSE') || s === 'NIFTY') {
    return '₹';
  }
  return '$';
}

export function formatPrice(price: number, symbol?: string, currency?: string): string {
  const sym = getCurrencySymbol(currency === 'INR' ? 'RELIANCE.NS' : symbol || 'RELIANCE.NS');
  if (sym === '₹') {
    return `₹${price.toLocaleString('en-IN', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;
  }
  return `$${price.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;
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
  /** True while waiting for the backend response. Cleared on success or failure. */
  isLoading?: boolean;
  toolCalls?: string[];
  verdict?: {
    stance: 'BULLISH' | 'BEARISH' | 'NEUTRAL';
    targetRange: [number, number];
  };
  needsUserChoice?: boolean;
  ragQuery?: string;
  ragTicker?: string;
  isGeneralSearch?: boolean;
  citations?: Array<{ source: string; page?: number; snippet?: string }>;
  modelUsed?: string;
}

export interface RagDocument {
  id: string;
  name: string;
  size: string;
  chunks: number;
  uploadDate: string;
}
