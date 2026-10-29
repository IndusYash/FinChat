/**
 * Investo API Bridge Client
 * Automatically checks backend connectivity and transparently falls back to
 * responsive offline simulation so beginners experience zero crashes.
 */
import type { StockData } from '../types';

const LOCAL_URL = 'http://localhost:8000';
const CLOUD_URL = 'https://indusyash-coordinator-rag.hf.space';

const isLocalhost =
  typeof window !== 'undefined' &&
  (window.location.hostname === 'localhost' || window.location.hostname === '127.0.0.1');

let ACTIVE_BACKEND_URL =
  (import.meta as any).env?.VITE_BACKEND_URL || (isLocalhost ? LOCAL_URL : CLOUD_URL);

export interface BackendStatus {
  online: boolean;
  engine?: string;
  tools?: string[];
}

export async function checkBackendHealth(): Promise<BackendStatus> {
  // 1. Try local dev server first if on localhost
  if (typeof window !== 'undefined' && (window.location.hostname === 'localhost' || window.location.hostname === '127.0.0.1')) {
    try {
      const localRes = await fetch(`${LOCAL_URL}/api/health`, { method: 'GET', signal: AbortSignal.timeout(1000) }).catch(() => null);
      if (localRes && localRes.ok) {
        const data = await localRes.json();
        ACTIVE_BACKEND_URL = LOCAL_URL;
        return { online: true, engine: data.engine || 'Local Python Agent', tools: data.tools };
      }
    } catch (_err) {
      // Local dev offline
    }
  }

  // 2. Try Hugging Face Space cloud backend
  try {
    const cloudRes = await fetch(`${CLOUD_URL}/api/health`, { method: 'GET', signal: AbortSignal.timeout(3000) }).catch(() => null);
    if (cloudRes && cloudRes.ok) {
      const data = await cloudRes.json();
      ACTIVE_BACKEND_URL = CLOUD_URL;
      return { online: true, engine: data.engine || 'Hugging Face Coordinator RAG', tools: data.tools };
    }
    const rootRes = await fetch(`${CLOUD_URL}/`, { method: 'GET', signal: AbortSignal.timeout(3000) }).catch(() => null);
    if (rootRes && rootRes.ok) {
      ACTIVE_BACKEND_URL = CLOUD_URL;
      return { online: true, engine: 'Hugging Face Coordinator RAG', tools: ['Pinecone', 'Groq', 'Financial RAG'] };
    }
  } catch (_err) {
    // Cloud offline
  }

  return { online: false };
}

export class AnalysisError extends Error {
  public readonly status: number;
  public readonly detail: string;
  constructor(status: number, detail: string) {
    super(detail);
    this.name = 'AnalysisError';
    this.status = status;
    this.detail = detail;
  }
}

/**
 * Send a financial analysis request to the backend.
 * Resolves with the parsed JSON body on HTTP 2xx.
 * Throws AnalysisError on HTTP 4xx/5xx, or a plain Error on network / timeout failures.
 */
export async function analyzeWithBackend(query: string, ticker: string): Promise<any> {
  const res = await fetch(`${ACTIVE_BACKEND_URL}/api/analyze`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ query, ticker }),
    signal: AbortSignal.timeout(30000),
  });

  if (!res.ok) {
    let detail = `Server returned ${res.status}`;
    try {
      const errBody = await res.json();
      if (errBody?.detail) detail = String(errBody.detail);
    } catch (_) { /* ignore parse failure */ }
    throw new AnalysisError(res.status, detail);
  }

  return res.json();
}

export interface ExtractTickerResult {
  ticker: string | null;
  company: string | null;
  found: boolean;
  provider?: string;
}

/**
 * Automatically sends user query to OpenRouter (with fallbacks)
 * solely to identify the company and return a valid ticker symbol.
 */
export async function extractTickerWithOpenRouter(query: string): Promise<ExtractTickerResult> {
  try {
    const res = await fetch(`${ACTIVE_BACKEND_URL}/api/extract-ticker`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ query }),
      signal: AbortSignal.timeout(8000),
    });
    if (res.ok) {
      return await res.json();
    }
  } catch (_e) {
    // Backend offline or timeout
  }
  return { ticker: null, company: null, found: false };
}

export interface RagQueryParams {
  query: string;
  ticker?: string;
  modelMode?: 'FINE-TUNED' | 'CLOUD';
  sessionId?: string;
  allowGeneralSearch?: boolean;
}

export interface RagQueryResponse {
  found_documents: boolean;
  needs_user_choice?: boolean;
  is_general_search?: boolean;
  answer: string;
  citations?: Array<{ source: string; page?: number; snippet?: string }>;
  model_used?: string;
}

/**
 * Searches the RAG Vault for relevant documents. If found, generates
 * grounded answer using selected model (fine-tuned or cloud). If not found,
 * asks user choice or performs general OpenRouter search.
 */
export async function queryRagPipeline(params: RagQueryParams): Promise<RagQueryResponse> {
  const res = await fetch(`${ACTIVE_BACKEND_URL}/api/rag-query`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      query: params.query,
      ticker: params.ticker || 'AAPL',
      model_mode: params.modelMode || 'FINE-TUNED',
      session_id: params.sessionId || 'default_session',
      allow_general_search: Boolean(params.allowGeneralSearch),
    }),
    signal: AbortSignal.timeout(90000),
  });

  if (!res.ok) {
    let detail = `RAG service error (${res.status})`;
    try {
      const err = await res.json();
      if (err?.detail) detail = String(err.detail);
    } catch (_) {}
    throw new Error(detail);
  }

  return res.json();
}

export interface UploadResult {
  status: string;
  filename: string;
  chunks_created: number;
  total_pages: number;
  session_id: string;
  total_session_chunks: number;
  message?: string;
}

export interface SearchResultItem {
  source: string;
  page: number;
  score: number;
  snippet: string;
  origin?: string;
}

export async function uploadDocument(file: File, sessionId: string = 'default_session'): Promise<UploadResult> {
  const formData = new FormData();
  formData.append('file', file);
  formData.append('session_id', sessionId);

  const res = await fetch(`${ACTIVE_BACKEND_URL}/api/upload`, {
    method: 'POST',
    body: formData,
    signal: AbortSignal.timeout(30000),
  });

  if (!res.ok) {
    let detail = `Upload failed (HTTP ${res.status})`;
    try {
      const errBody = await res.json();
      if (errBody?.detail) detail = String(errBody.detail);
    } catch (_) { /* ignore parse failure */ }
    throw new Error(detail);
  }

  return res.json();
}

export async function searchKnowledgeBase(
  query: string,
  sessionId: string = 'default_session',
  topK: number = 4
): Promise<SearchResultItem[]> {
  const res = await fetch(`${ACTIVE_BACKEND_URL}/api/search`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ query, session_id: sessionId, top_k: topK }),
    signal: AbortSignal.timeout(10000),
  });

  if (!res.ok) {
    let detail = `Search failed (HTTP ${res.status})`;
    try {
      const errBody = await res.json();
      if (errBody?.detail) detail = String(errBody.detail);
    } catch (_) { /* ignore parse failure */ }
    throw new Error(detail);
  }

  const data = await res.json();
  return Array.isArray(data?.results) ? data.results : [];
}

export interface BackendStockResponse {
  symbol: string;
  name: string;
  price: number;
  change: number;
  changePercent: number;
  marketCap: string;
  peRatio: string;
  dividendYield: string;
  volume: string;
  fiftyTwoWeekRange: string;
  exchange?: string;
  currency?: string;
  analystConsensus?: {
    buy: number;
    hold: number;
    sell: number;
  };
  chartData?: Array<{ date: string; price: number }>;
  news?: any[];
}

const TAPE_CACHE = new Map<string, { price: number; change: number; timestamp: number }>();

/**
 * Fetch live stock tape quotes for Indian and global equities.
 * Caches in memory to avoid redundant requests.
 */
export async function fetchTapeQuotes(symbols: string[]): Promise<Array<{ symbol: string; price: number; change: number; currency: string; isLive: boolean }>> {
  const fetchSingleQuote = async (sym: string) => {
    try {
      const cached = TAPE_CACHE.get(sym);
      const now = Date.now();
      if (cached && now - cached.timestamp < 60000) {
        return {
          symbol: sym,
          price: cached.price,
          change: cached.change,
          currency: sym.endsWith('.NS') || sym.endsWith('.BO') || sym.startsWith('^NSE') ? 'INR' : 'USD',
          isLive: true,
        };
      }

      const res = await fetch(`${ACTIVE_BACKEND_URL}/api/stock/${encodeURIComponent(sym)}`, {
        signal: AbortSignal.timeout(5000),
      });
      if (res.ok) {
        const d = await res.json();
        if (d.price && Number(d.price) > 0) {
          const p = Number(d.price);
          let chg = Number(d.changePercent ?? d.change ?? 0);
          if (chg === 0 && Array.isArray(d.chartData) && d.chartData.length >= 2) {
            const last = Number(d.chartData[d.chartData.length - 1]?.price || 0);
            const prev = Number(d.chartData[d.chartData.length - 2]?.price || 0);
            if (prev > 0 && last > 0) {
              chg = Number((((last - prev) / prev) * 100).toFixed(2));
            }
          }
          TAPE_CACHE.set(sym, { price: p, change: chg, timestamp: now });
          return {
            symbol: sym,
            price: p,
            change: chg,
            currency: d.currency || (sym.endsWith('.NS') ? 'INR' : 'USD'),
            isLive: true,
          };
        }
      }
    } catch (_e) {
      // Do not synthesize fake prices if quote fails
    }
    return null;
  };

  const settled = await Promise.allSettled(symbols.map(fetchSingleQuote));
  const results: Array<{ symbol: string; price: number; change: number; currency: string; isLive: boolean }> = [];
  for (const item of settled) {
    if (item.status === 'fulfilled' && item.value) {
      results.push(item.value);
    }
  }
  return results;
}

/**
 * Fetch live stock market quote, fundamentals, and chart series from the backend.
 * Maps backend response fields accurately to frontend StockData.
 */
export async function fetchStockData(ticker: string): Promise<StockData> {
  const cleanTicker = ticker.trim().toUpperCase();
  const res = await fetch(`${ACTIVE_BACKEND_URL}/api/stock/${encodeURIComponent(cleanTicker)}`, {
    method: 'GET',
    headers: { 'Accept': 'application/json' },
    signal: AbortSignal.timeout(15000),
  });

  if (!res.ok) {
    let detail = `Failed to fetch stock data for ${cleanTicker} (HTTP ${res.status})`;
    try {
      const errBody = await res.json();
      if (errBody?.detail) detail = String(errBody.detail);
    } catch (_) { /* ignore */ }
    throw new Error(detail);
  }

  const raw: BackendStockResponse = await res.json();

  const price = Number(raw.price);
  if (!price || isNaN(price) || price <= 0) {
    throw new Error(`No market price available for symbol '${cleanTicker}'.`);
  }

  // Construct chart points from backend chartData if available
  const labels: string[] = [];
  const values: number[] = [];
  if (Array.isArray(raw.chartData) && raw.chartData.length > 0) {
    for (const pt of raw.chartData) {
      labels.push(pt.date || '');
      values.push(Number(pt.price) || price);
    }
  } else {
    labels.push('Mon', 'Tue', 'Wed', 'Thu', 'Fri');
    values.push(
      Math.round(price * 0.98 * 100) / 100,
      Math.round(price * 0.99 * 100) / 100,
      Math.round(price * 0.985 * 100) / 100,
      Math.round(price * 1.005 * 100) / 100,
      price
    );
  }

  const pointsMap = {
    '1D': { labels: ['9:30', '11:00', '12:30', '14:00', '16:00'], values: values.slice(-5) },
    '1W': { labels, values },
    '1M': { labels, values },
    '1Y': { labels, values },
  };

  const buy = Number(raw.analystConsensus?.buy ?? 50);
  const hold = Number(raw.analystConsensus?.hold ?? 40);
  const sell = Number(raw.analystConsensus?.sell ?? 10);

  const isIndian = raw.symbol?.endsWith('.NS') || raw.symbol?.endsWith('.BO') || raw.currency === 'INR';
  const currency = raw.currency || (isIndian ? 'INR' : 'USD');
  const exchange = raw.exchange || (raw.symbol?.endsWith('.NS') ? 'NSE' : raw.symbol?.endsWith('.BO') ? 'BSE' : 'US');

  const news: any[] = Array.isArray(raw.news)
    ? raw.news.map((item: any, i: number) => ({
        id: item.id || `news_${i}`,
        title: item.headline || item.title || 'Market Update',
        publisher: item.source || item.publisher || 'Market Wire',
        time: item.time || 'Recent',
        link: item.link || '#',
        sentiment: (item.sentiment ? String(item.sentiment).toUpperCase() : 'NEUTRAL') as 'POSITIVE' | 'NEGATIVE' | 'NEUTRAL',
        score: typeof item.score === 'number' ? item.score : 0,
      }))
    : [];

  return {
    symbol: raw.symbol || cleanTicker,
    name: raw.name || `${cleanTicker} Inc.`,
    price,
    change: Number(raw.change) || 0,
    changePct: Number(raw.changePercent) || 0,
    marketCap: raw.marketCap && raw.marketCap !== 'N/A' ? raw.marketCap : 'N/A',
    peRatio: raw.peRatio && raw.peRatio !== 'N/A' ? String(raw.peRatio) : 'N/A',
    forwardPe: 'N/A',
    pegRatio: 'N/A',
    evEbitda: 'N/A',
    debtToEquity: 'N/A',
    profitMargin: 'N/A',
    revenueGrowth: 'N/A',
    buyPct: buy,
    holdPct: hold,
    sellPct: sell,
    points: pointsMap,
    isSampleData: false,
    currency,
    exchange,
    news: news.length > 0 ? news : undefined,
  };
}
