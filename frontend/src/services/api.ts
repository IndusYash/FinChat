/**
 * Investo API Bridge Client
 * Automatically checks backend connectivity and transparently falls back to
 * responsive offline simulation so beginners experience zero crashes.
 */

const LOCAL_URL = 'http://localhost:8000';
const CLOUD_URL = 'https://indusyash-coordinator-rag.hf.space';

let ACTIVE_BACKEND_URL = (import.meta as any).env?.VITE_BACKEND_URL || CLOUD_URL;

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

export async function analyzeWithBackend(query: string, ticker: string): Promise<any> {
  try {
    const res = await fetch(`${ACTIVE_BACKEND_URL}/api/analyze`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ query, ticker }),
      signal: AbortSignal.timeout(8000),
    });
    if (res.ok) {
      return await res.json();
    }
  } catch (err) {
    // Backend unavailable or timed out
  }
  return null;
}
