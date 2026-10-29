import type { StockData, NewsItem, RagDocument } from '../types';

export const BRAND_MAP: Record<string, string> = {
  reliance: 'RELIANCE.NS',
  ril: 'RELIANCE.NS',
  tcs: 'TCS.NS',
  infosys: 'INFY.NS',
  infy: 'INFY.NS',
  hdfc: 'HDFCBANK.NS',
  hdfcbank: 'HDFCBANK.NS',
  icici: 'ICICIBANK.NS',
  icicibank: 'ICICIBANK.NS',
  sbi: 'SBIN.NS',
  sbin: 'SBIN.NS',
  airtel: 'BHARTIARTL.NS',
  bharti: 'BHARTIARTL.NS',
  bhartiartl: 'BHARTIARTL.NS',
  itc: 'ITC.NS',
  lt: 'LT.NS',
  larsen: 'LT.NS',
  'tata motors': 'TATAMOTORS.NS',
  tatamotors: 'TATAMOTORS.NS',
  hul: 'HINDUNILVR.NS',
  'hindustan unilever': 'HINDUNILVR.NS',
  maruti: 'MARUTI.NS',
  bajaj: 'BAJFINANCE.NS',
  'sun pharma': 'SUNPHARMA.NS',
  titan: 'TITAN.NS',
  wipro: 'WIPRO.NS',
  adani: 'ADANIENT.NS',
  zomato: 'ZOMATO.NS',
  paytm: 'PAYTM.NS',
  nifty: '^NSEI',
  nifty50: '^NSEI',
  sensex: '^BSESN',
  accenture: 'ACN',
  acn: 'ACN',
  apple: 'AAPL',
  aapl: 'AAPL',
  iphone: 'AAPL',
  tesla: 'TSLA',
  tsla: 'TSLA',
  musk: 'TSLA',
  nvidia: 'NVDA',
  nvda: 'NVDA',
  gpu: 'NVDA',
  microsoft: 'MSFT',
  msft: 'MSFT',
  windows: 'MSFT',
  amazon: 'AMZN',
  amzn: 'AMZN',
  google: 'GOOGL',
  alphabet: 'GOOGL',
  googl: 'GOOGL',
  goog: 'GOOGL',
  meta: 'META',
  facebook: 'META',
  netflix: 'NFLX',
  nflx: 'NFLX',
  intel: 'INTC',
  intc: 'INTC',
  amd: 'AMD',
  oracle: 'ORCL',
  orcl: 'ORCL',
  ibm: 'IBM',
  uber: 'UBER',
  adobe: 'ADBE',
  salesforce: 'CRM',
  qualcomm: 'QCOM',
  cisco: 'CSCO',
};

export function detectBrandOrTicker(query: string): string | null {
  const lower = query.toLowerCase();
  for (const [key, ticker] of Object.entries(BRAND_MAP)) {
    const regex = new RegExp(`\\b${key}\\b`, 'i');
    if (regex.test(lower)) {
      return ticker;
    }
  }
  // Check for phrases like "tell me about <word>", "analyze <word>", "what about <word>"
  const phraseMatch = query.match(/(?:about|for|analyze|view|evaluate|on)\s+([A-Za-z0-9\.\^]{2,12})/i);
  if (phraseMatch) {
    const candidate = phraseMatch[1].toLowerCase();
    if (BRAND_MAP[candidate]) return BRAND_MAP[candidate];
    // If it's a 1-5 letter ticker
    if (/^[A-Za-z]{1,5}$/.test(candidate) && !['what', 'how', 'why', 'dcf', 'the', 'and', 'for', 'not', 'you', 'this', 'that'].includes(candidate)) {
      return candidate.toUpperCase();
    }
  }
  // Check for uppercase 1-5 letter ticker
  const match = query.match(/\b([A-Z]{1,5})\b/);
  if (match && !['WHAT', 'HOW', 'WHY', 'DCF', 'THE', 'AND', 'FOR', 'NOT', 'YOU'].includes(match[1])) {
    return match[1];
  }
  return null;
}

export const STOCK_DATABASE: Record<string, StockData> = {
  AAPL: {
    symbol: 'AAPL',
    name: 'Apple Inc.',
    price: 187.50,
    change: 2.45,
    changePct: 1.32,
    marketCap: '2.94T',
    peRatio: '28.4',
    forwardPe: '25.8',
    pegRatio: '2.1',
    evEbitda: '21.5',
    debtToEquity: '1.45',
    profitMargin: '26.3%',
    revenueGrowth: '+4.9%',
    buyPct: 75,
    holdPct: 20,
    sellPct: 5,
    points: {
      '1D': { labels: ['9:30', '11:00', '12:30', '14:00', '16:00'], values: [185.2, 186.1, 185.8, 186.9, 187.5] },
      '1W': { labels: ['Mon', 'Tue', 'Wed', 'Thu', 'Fri'], values: [181.1, 183.8, 183.2, 185.1, 187.5] },
      '1M': { labels: ['W1', 'W2', 'W3', 'W4'], values: [178.5, 182.0, 184.2, 187.5] },
      '1Y': { labels: ['Q1', 'Q2', 'Q3', 'Q4'], values: [165.0, 175.2, 182.1, 187.5] },
    },
  },
  TSLA: {
    symbol: 'TSLA',
    name: 'Tesla, Inc.',
    price: 248.20,
    change: 6.80,
    changePct: 2.82,
    marketCap: '789.2B',
    peRatio: '68.5',
    forwardPe: '54.2',
    pegRatio: '3.4',
    evEbitda: '42.1',
    debtToEquity: '0.12',
    profitMargin: '14.2%',
    revenueGrowth: '+8.1%',
    buyPct: 55,
    holdPct: 35,
    sellPct: 10,
    points: {
      '1D': { labels: ['9:30', '11:00', '12:30', '14:00', '16:00'], values: [242.0, 245.5, 244.1, 246.8, 248.2] },
      '1W': { labels: ['Mon', 'Tue', 'Wed', 'Thu', 'Fri'], values: [235.0, 238.4, 241.0, 244.5, 248.2] },
      '1M': { labels: ['W1', 'W2', 'W3', 'W4'], values: [220.5, 229.0, 236.4, 248.2] },
      '1Y': { labels: ['Q1', 'Q2', 'Q3', 'Q4'], values: [180.0, 195.0, 220.0, 248.2] },
    },
  },
  NVDA: {
    symbol: 'NVDA',
    name: 'NVIDIA Corporation',
    price: 138.40,
    change: 4.10,
    changePct: 3.05,
    marketCap: '3.39T',
    peRatio: '54.2',
    forwardPe: '36.4',
    pegRatio: '1.2',
    evEbitda: '38.0',
    debtToEquity: '0.18',
    profitMargin: '55.1%',
    revenueGrowth: '+122.4%',
    buyPct: 88,
    holdPct: 10,
    sellPct: 2,
    points: {
      '1D': { labels: ['9:30', '11:00', '12:30', '14:00', '16:00'], values: [134.5, 136.0, 135.2, 137.1, 138.4] },
      '1W': { labels: ['Mon', 'Tue', 'Wed', 'Thu', 'Fri'], values: [129.0, 131.5, 133.0, 136.2, 138.4] },
      '1M': { labels: ['W1', 'W2', 'W3', 'W4'], values: [122.0, 127.5, 132.0, 138.4] },
      '1Y': { labels: ['Q1', 'Q2', 'Q3', 'Q4'], values: [85.0, 105.0, 120.0, 138.4] },
    },
  },
  MSFT: {
    symbol: 'MSFT',
    name: 'Microsoft Corporation',
    price: 428.15,
    change: 3.50,
    changePct: 0.82,
    marketCap: '3.18T',
    peRatio: '35.6',
    forwardPe: '30.1',
    pegRatio: '2.3',
    evEbitda: '24.2',
    debtToEquity: '0.42',
    profitMargin: '36.2%',
    revenueGrowth: '+15.2%',
    buyPct: 82,
    holdPct: 15,
    sellPct: 3,
    points: {
      '1D': { labels: ['9:30', '11:00', '12:30', '14:00', '16:00'], values: [425.0, 426.5, 426.0, 427.5, 428.15] },
      '1W': { labels: ['Mon', 'Tue', 'Wed', 'Thu', 'Fri'], values: [420.0, 422.5, 424.0, 426.0, 428.15] },
      '1M': { labels: ['W1', 'W2', 'W3', 'W4'], values: [412.0, 416.5, 422.0, 428.15] },
      '1Y': { labels: ['Q1', 'Q2', 'Q3', 'Q4'], values: [370.0, 395.0, 410.0, 428.15] },
    },
  },
};

export const MOCK_NEWS: Record<string, NewsItem[]> = {
  AAPL: [
    {
      id: '1',
      title: 'Apple Services Revenue Beats Estimates as Installed Base Crosses 2.2 Billion Active Devices',
      publisher: 'Bloomberg Markets',
      time: '2 hours ago',
      link: '#',
      sentiment: 'POSITIVE',
      score: 0.82,
    },
    {
      id: '2',
      title: 'Supply Chain Audits Show iPhone Pro Production Stabilizing Ahead of Holiday Quarter',
      publisher: 'Reuters',
      time: '5 hours ago',
      link: '#',
      sentiment: 'POSITIVE',
      score: 0.65,
    },
    {
      id: '3',
      title: 'European Regulatory Scrutiny Over App Store In-App Payment Monopolies Continues',
      publisher: 'Financial Times',
      time: '12 hours ago',
      link: '#',
      sentiment: 'NEGATIVE',
      score: -0.54,
    },
    {
      id: '4',
      title: 'Morgan Stanley Reaffirms Overweight Rating with $215 Price Target on AI Pipeline',
      publisher: 'Wall Street Journal',
      time: '1 day ago',
      link: '#',
      sentiment: 'POSITIVE',
      score: 0.78,
    },
  ],
  TSLA: [
    {
      id: '1',
      title: 'Tesla Robotaxi Cybercab Architecture Details Unveiled With Low Operating Cost Estimates',
      publisher: 'Electrek',
      time: '3 hours ago',
      link: '#',
      sentiment: 'POSITIVE',
      score: 0.71,
    },
    {
      id: '2',
      title: 'Automotive Gross Margins Under Pressure Amid International EV Price Wars',
      publisher: 'Bloomberg',
      time: '7 hours ago',
      link: '#',
      sentiment: 'NEGATIVE',
      score: -0.62,
    },
    {
      id: '3',
      title: 'Energy Storage Megapack Deployments Surge 125% Year-Over-Year in Q3 Report',
      publisher: 'CNBC',
      time: '1 day ago',
      link: '#',
      sentiment: 'POSITIVE',
      score: 0.88,
    },
  ],
  NVDA: [
    {
      id: '1',
      title: 'Blackwell Ultra Production Ramping Faster Than Expected Across Cloud Hyperscalers',
      publisher: 'Semiconductor Digest',
      time: '1 hour ago',
      link: '#',
      sentiment: 'POSITIVE',
      score: 0.94,
    },
    {
      id: '2',
      title: 'Data Center Capex Projections Raised by Microsoft, Meta, and Google for AI Infrastructure',
      publisher: 'Reuters',
      time: '4 hours ago',
      link: '#',
      sentiment: 'POSITIVE',
      score: 0.89,
    },
    {
      id: '3',
      title: 'Geopolitical Export Controls on Advanced Accelerators Monitored by Commerce Department',
      publisher: 'Barron’s',
      time: '18 hours ago',
      link: '#',
      sentiment: 'NEUTRAL',
      score: -0.12,
    },
  ],
};

export const INITIAL_RAG_DOCS: RagDocument[] = [
  { id: '1', name: 'AAPL_2024_Form_10K_Annual_Report.pdf', size: '4.8 MB', chunks: 842, uploadDate: '2024-11-02' },
  { id: '2', name: 'TSLA_Q3_2024_Shareholder_Update.pdf', size: '2.1 MB', chunks: 320, uploadDate: '2024-10-24' },
  { id: '3', name: 'NVDA_Blackwell_Architecture_Whitepaper.pdf', size: '3.4 MB', chunks: 512, uploadDate: '2024-09-18' },
  { id: '4', name: 'CFA_Institutional_Valuation_Handbook.pdf', size: '5.2 MB', chunks: 666, uploadDate: '2024-08-11' },
];
