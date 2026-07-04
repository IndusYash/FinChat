import os
import re
import numpy as np
import sys
from pinecone import Pinecone

# ── ENCODING FIX FOR WINDOWS CONSOLE ────────────────────────────
if sys.platform.startswith('win'):
    sys.stdout.reconfigure(encoding='utf-8')

# ── PATH CONFIGS ────────────────────────────────────────────────
WORKSPACE_DIR = r"C:\Users\yashv\Desktop\Finetune + Rag"
LOCAL_ENV_PATH = os.path.join(WORKSPACE_DIR, ".env")
GLOBAL_ENV_PATH = r"C:\Users\yashv\Desktop\personalize\.env"
INDEX_NAME = "investo-rag"
EMBEDDING_MODEL_NAME = "BAAI/bge-small-en-v1.5"
# ────────────────────────────────────────────────────────────────

# 1. LOAD API KEYS
pinecone_key = ""
gemini_key = ""
anthropic_key = ""

# Load Pinecone key from local .env (where index is migrated)
if os.path.exists(LOCAL_ENV_PATH):
    with open(LOCAL_ENV_PATH, "r", encoding="utf-8") as f:
        content = f.read()
        match = re.search(r"(pcsk_[a-zA-Z0-9_]+)", content)
        if match:
            pinecone_key = match.group(1)

# Load Gemini and Anthropic keys from global personalize .env
if os.path.exists(GLOBAL_ENV_PATH):
    with open(GLOBAL_ENV_PATH, "r", encoding="utf-8") as f:
        for line in f:
            line = line.strip()
            if line.startswith("GEMINI_API_KEY="):
                gemini_key = line.split("=", 1)[1].strip()
            elif line.startswith("ANTHROPIC_API_KEY="):
                anthropic_key = line.split("=", 1)[1].strip()

# Fallbacks to environment variables
pinecone_key = os.environ.get("PINECONE_API_KEY", pinecone_key)
gemini_key = os.environ.get("GEMINI_API_KEY", gemini_key)
anthropic_key = os.environ.get("ANTHROPIC_API_KEY", anthropic_key)

if not pinecone_key:
    print("❌ Error: Pinecone API key not found in local .env or environment.")
    sys.exit(1)

# 2. CHECK DEPENDENCIES
try:
    from sentence_transformers import SentenceTransformer
except ImportError:
    print("❌ Error: 'sentence_transformers' is not installed locally.")
    print("   Please run: pip install sentence-transformers")
    sys.exit(1)

try:
    import google.generativeai as genai
except ImportError:
    print("❌ Error: 'google-generativeai' is not installed locally.")
    print("   Please run: pip install google-generativeai")
    sys.exit(1)

# 3. INITIALISE RETRIEVER & DATABASE
print("Loading local embedding model (BAAI/bge-small-en-v1.5)...")
retriever = SentenceTransformer(EMBEDDING_MODEL_NAME, device="cpu")

print("Connecting to Pinecone index 'investo-rag'...")
pc = Pinecone(api_key=pinecone_key)
index = pc.Index(INDEX_NAME)

# Initialise Gemini
if gemini_key:
    genai.configure(api_key=gemini_key)
    # Use gemini-1.5-flash for speed and free tier
    llm_model = genai.GenerativeModel("gemini-1.5-flash")
    print("Gemini API loaded.")
else:
    print("⚠️ Warning: GEMINI_API_KEY not found. LLM generation will be unavailable.")

def retrieve(query, k=5):
    # Embed query locally
    query_vector = retriever.encode(query, normalize_embeddings=True).tolist()
    
    # Query Pinecone
    response = index.query(
        vector=query_vector,
        top_k=k,
        include_metadata=True
    )
    
    results = []
    for match in response.get("matches", []):
        results.append({
            "score": match.get("score"),
            "text": match.get("metadata", {}).get("text", ""),
            "source": match.get("metadata", {}).get("source", "Unknown"),
            "page": match.get("metadata", {}).get("page", "N/A"),
            "title": match.get("metadata", {}).get("title", ""),
        })
    return results

def ask_investo_rag(question):
    print("\n🔍 Retrieving matching context from Pinecone...")
    results = retrieve(question, k=5)
    
    # Format context blocks
    context = ""
    sources = []
    for i, item in enumerate(results, 1):
        context += f"Source {i} (File: {item['source']}, Page: {item['page']}):\n{item['text']}\n\n"
        sources.append(f"{item['source']} (Page {item['page']})")
        
    print(f"📖 Context found from: {', '.join(set(sources))}")
    
    # System Prompt instructing the model to act as Investo Bot and ground answers in context
    prompt = f"""You are Investo Bot, an expert AI financial assistant. 
Your job is to answer the user's question accurately using ONLY the provided document sources.
If the answer cannot be found in the sources, say: "I'm sorry, but I cannot find the answer to that in the provided documents."

Always explain risks when discussing investments, avoid making unrealistic guarantees, and cite which source(s) you are using in your explanation.

---
RELEVANT SOURCES:
{context}
---

USER QUESTION:
{question}

ASSISTANT RESPONSE:"""

    if not gemini_key:
        print("\n[Mocking LLM Response because GEMINI_API_KEY is missing]")
        print("Retrieved context summary:")
        print(context[:300] + "...")
        return
        
    print("🤖 Generating answer using Gemini...")
    response = llm_model.generate_content(prompt)
    
    print("\n" + "="*50)
    print("INVESTO BOT:")
    print(response.text.strip())
    print("="*50 + "\n")

if __name__ == "__main__":
    print("\n=== Investo Bot Local RAG Chat ===")
    print("Type 'exit' to quit.")
    
    while True:
        try:
            query = input("Ask Investo Bot: ").strip()
            if not query:
                continue
            if query.lower() in ['exit', 'quit']:
                break
            ask_investo_rag(query)
        except KeyboardInterrupt:
            break
        except Exception as e:
            print(f"Error: {e}")
