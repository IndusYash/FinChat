/**
 * Investo API Bridge Client
 * Automatically checks backend connectivity and transparently falls back to
 * responsive offline simulation so beginners experience zero crashes.
 */

const BACKEND_URL = (import.meta as any).env?.VITE_BACKEND_URL || (
  typeof window !== 'undefined' && (window.location.hostname === 'localhost' || window.location.hostname === '127.0.0.1')
    ? 'http://localhost:8000'
    : 'https://indusyash-coordinator-rag.hf.space'
);

export interface BackendStatus {
  online: boolean;
  engine?: string;
  tools?: string[];
}

export async function checkBackendHealth(): Promise<BackendStatus> {
  try {
    // Check local API server first
    const res = await fetch(`${BACKEND_URL}/api/health`, { method: 'GET', signal: AbortSignal.timeout(1500) }).catch(() => null);
    if (res && res.ok) {
      const data = await res.json();
      return { online: true, engine: data.engine || 'Agentic Python Engine', tools: data.tools };
    }
    // Fallback check root / for Hugging Face Space coordinator
    const rootRes = await fetch(`${BACKEND_URL}/`, { method: 'GET', signal: AbortSignal.timeout(1500) }).catch(() => null);
    if (rootRes && rootRes.ok) {
      return { online: true, engine: 'Hugging Face Coordinator RAG', tools: ['Pinecone', 'Groq', 'Financial RAG'] };
    }
  } catch (_err) {
    // Backend offline - safe fallback
  }
  return { online: false };
}

export async function analyzeWithBackend(query: string, ticker: string): Promise<any> {
  try {
    const res = await fetch(`${BACKEND_URL}/api/analyze`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ query, ticker }),
      signal: AbortSignal.timeout(6000),
    });
    if (res.ok) {
      return await res.json();
    }
  } catch (err) {
    // Backend unavailable or timed out
  }
  return null;
}
