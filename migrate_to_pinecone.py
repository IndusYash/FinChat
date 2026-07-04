import numpy as np
import pickle
import os
import time
import re
from pinecone import Pinecone, ServerlessSpec

# ── CONFIG ──────────────────────────────────────────────────────
INDEX_NAME       = "investo-rag"
DIMENSION        = 384
METRIC           = "cosine"
BATCH_SIZE       = 200

EMB_PATH   = r"C:\Users\yashv\Desktop\Finetune + Rag\investo_rag-20260704T072417Z-3-001\investo_rag\embeddings.npy"
CHUNK_PATH = r"C:\Users\yashv\Desktop\Finetune + Rag\investo_rag-20260704T072417Z-3-001\investo_rag\chunk_metadata.pkl"
ENV_PATH   = r"C:\Users\yashv\Desktop\Finetune + Rag\.env"
# ────────────────────────────────────────────────────────────────

# Try to load API key from environment first
api_key = os.environ.get("PINECONE_API_KEY", "")

# Fallback to reading from .env file
if not api_key and os.path.exists(ENV_PATH):
    print("Reading Pinecone API key from .env file...")
    with open(ENV_PATH, "r", encoding="utf-8") as f:
        content = f.read()
        # Find token starting with pcsk_
        match = re.search(r"(pcsk_[a-zA-Z0-9_]+)", content)
        if match:
            api_key = match.group(1)
            print("Successfully extracted Pinecone API key.")
        else:
            # Fallback to reading the whole line if pcsk_ prefix isn't found
            # but in this case the user has pcsk_
            parts = content.strip().split()
            for part in parts:
                if part.startswith("pcsk_") or len(part) > 20: # simple heuristic
                    api_key = part
                    print("Extracted key by token heuristics.")
                    break

if not api_key:
    raise ValueError("Pinecone API key not found in environment or .env file.")

print("Loading local data files...")
embeddings = np.load(EMB_PATH)
with open(CHUNK_PATH, "rb") as f:
    chunks = pickle.load(f)

print("  Embeddings:", embeddings.shape, embeddings.dtype)
print("  Chunks:    ", len(chunks))

pc = Pinecone(api_key=api_key)

existing = [idx.name for idx in pc.list_indexes()]
if INDEX_NAME not in existing:
    print("Creating index:", INDEX_NAME)
    pc.create_index(
        name=INDEX_NAME,
        dimension=DIMENSION,
        metric=METRIC,
        spec=ServerlessSpec(cloud="aws", region="us-east-1")
    )
    while not pc.describe_index(INDEX_NAME).status["ready"]:
        print("  Waiting for index to be ready...")
        time.sleep(2)
    print("  Index ready!")
else:
    print("Index already exists, upserting into it.")

index = pc.Index(INDEX_NAME)

print("Uploading", len(chunks), "vectors in batches of", BATCH_SIZE)
total_uploaded = 0
start = time.time()

for i in range(0, len(chunks), BATCH_SIZE):
    batch_emb    = embeddings[i : i + BATCH_SIZE]
    batch_chunks = chunks[i : i + BATCH_SIZE]

    vectors = []
    for j, (emb, chunk) in enumerate(zip(batch_emb, batch_chunks)):
        source = chunk.metadata.get("source", "")
        source = source.replace("/content/drive/MyDrive/rag_data/", "")
        vectors.append({
            "id": str(i + j),
            "values": emb.tolist(),
            "metadata": {
                "text":       chunk.page_content[:1000],
                "source":     source,
                "page":       str(chunk.metadata.get("page", "")),
                "extraction": chunk.metadata.get("extraction", "text"),
                "title":      chunk.metadata.get("title", ""),
                "author":     chunk.metadata.get("author", ""),
            }
        })

    index.upsert(vectors=vectors)
    total_uploaded += len(vectors)
    elapsed = time.time() - start
    rate = total_uploaded / elapsed if elapsed > 0 else 1
    remaining = (len(chunks) - total_uploaded) / rate
    pct = total_uploaded / len(chunks) * 100
    print("  [{:.0f}%] {}/{} | {:.0f} vecs/sec | ETA {:.0f}s".format(
        pct, total_uploaded, len(chunks), rate, remaining
    ))

elapsed_total = time.time() - start
print("Migration complete in {:.1f}s".format(elapsed_total))
stats = index.describe_index_stats()
print("Pinecone index now has", stats.total_vector_count, "vectors")
