# Investo Bot — Complete Project Bird's Eye View

## What the Project Builds

Investo Bot is a **finance-domain AI assistant** that combines two complementary techniques:

- **Fine-tuning** — A general Llama 3.2 3B model is adapted to speak finance using 157,000+ real financial Q&A pairs
- **RAG (Retrieval-Augmented Generation)** — At inference time, the fine-tuned model is given relevant excerpts from a 2,379-page document corpus before answering, so its answers are grounded in real documents

The project spans **four notebooks**, produces **eight persistent data files**, and flows through three Google Drive folders.

---

## The Four Notebooks at a Glance

| # | Notebook | What it does | Hands off to |
|---|---|---|---|
| 1 | `finetune.ipynb` | Fine-tunes Llama 3.2 on 157K finance conversations | Produces LoRA adapter pushed to Hugging Face Hub |
| 2 | `embeddings.ipynb` | Loads 61 PDFs, runs OCR on scanned ones, merges into unified corpus | Produces `final_documents.pkl` saved to Drive |
| 3 | `embedding_rag.ipynb` | Loads pickle → cleans → chunks → embeds → builds FAISS index → runs RAG inference | All files saved to `investo_rag/` folder |
| 4 | `test_investo.ipynb` | Loads base model + LoRA adapter, tests pure LLM without RAG | Standalone inference testing |

---

## Complete Data Flow — End to End

```
╔══════════════════════════════════════════════════════════════════╗
║  NOTEBOOK 1: finetune.ipynb                                      ║
║                                                                  ║
║  HuggingFace Hub                                                 ║
║  └── oieieio/Finance-Instruct-500k (518K rows)                   ║
║         │                                                        ║
║         ├── Filter Pass 1: finance keywords  → 253K rows         ║
║         ├── Filter Pass 2: clean + negative  → 157K rows         ║
║         ├── Format: Llama 3 chat template                        ║
║         └── SFTTrainer: 1,000 steps, lr=2e-4                     ║
║                │                                                 ║
║                ▼                                                 ║
║  investo_lora/                                                   ║
║  ├── adapter_model.safetensors  (93 MB)  ◄── THE TRAINED BRAIN   ║
║  ├── adapter_config.json                                         ║
║  ├── tokenizer.json                                              ║
║  └── chat_template.jinja                                         ║
║         │                                                        ║
║         ▼   (uploaded to Hugging Face Hub)                       ║
║  IndusYash/investo-llama-3.2-3b-finance-lora                     ║
╚══════════════════════════════════════════════════════════════════╝
                              │
                              │  (used by notebooks 3 and 4)
                              ▼

╔══════════════════════════════════════════════════════════════════╗
║  NOTEBOOK 2: embeddings.ipynb                                    ║
║                                                                  ║
║  Google Drive: /MyDrive/rag_data/  (61 PDF files)               ║
║         │                                                        ║
║         ├── PyMuPDFLoader  → 2,388 pages loaded                  ║
║         │                                                        ║
║         ├── Diagnostic: 12 PDFs = 100% empty (scanned)           ║
║         │                                                        ║
║         ├── Tesseract OCR on 12 bad PDFs → 756 pages recovered   ║
║         │                                                        ║
║         └── Merge: 1,623 text-layer + 756 OCR = 2,379 pages      ║
║                │                                                 ║
║                ▼   SAVED TO: /MyDrive/rag_processed/             ║
║  raw_documents.pkl      (5.9 MB)  — all 2,388 raw pages          ║
║  ocr_documents.pkl      (1.7 MB)  — 756 OCR-recovered pages      ║
║  final_documents.pkl    (7.5 MB)  — 2,379 merged pages  ◄─ KEY   ║
╚══════════════════════════════════════════════════════════════════╝
                              │
                    final_documents.pkl
                              │
                              ▼

╔══════════════════════════════════════════════════════════════════╗
║  NOTEBOOK 3: embedding_rag.ipynb                                 ║
║                                                                  ║
║  LOAD: final_documents.pkl → 2,379 Document objects             ║
║         │                                                        ║
║         ├── Clean: normalise whitespace, drop <100 chars         ║
║         │         2,379 → 2,340 documents                        ║
║         │                                                        ║
║         ├─ SAVE: cleaned_documents.pkl (7.1 MB)                  ║
║         │                                                        ║
║         ├── Chunk: RecursiveCharacterTextSplitter                ║
║         │         size=800 chars, overlap=150                    ║
║         │         2,340 docs → 11,635 chunks                     ║
║         │                                                        ║
║         ├─ SAVE: chunks.pkl (9.4 MB)                             ║
║         │                                                        ║
║         ├── Embed: BAAI/bge-small-en-v1.5                        ║
║         │         11,635 chunks → (11635, 384) float32 array     ║
║         │                                                        ║
║         ├─ SAVE: embeddings.npy (17.9 MB)                        ║
║         │                                                        ║
║         ├── Index: FAISS IndexFlatIP                             ║
║         │         11,635 vectors, 384 dims, cosine similarity    ║
║         │                                                        ║
║         ├─ SAVE: finance_index.faiss (17.9 MB)                   ║
║         ├─ SAVE: chunk_metadata.pkl  (9.4 MB)                    ║
║         │                                                        ║
║         └── RAG INFERENCE (in same notebook):                    ║
║              query → embed → FAISS search → top-5 chunks         ║
║              → build prompt → Llama 3.2 + LoRA → answer          ║
╚══════════════════════════════════════════════════════════════════╝

╔══════════════════════════════════════════════════════════════════╗
║  NOTEBOOK 4: test_investo.ipynb                                  ║
║                                                                  ║
║  LOAD: base Llama 3.2 3B (4-bit) + LoRA adapter from Hub        ║
║  (no RAG — pure LLM test)                                        ║
║         │                                                        ║
║         └── ask_investo_bot(question) function                   ║
║              ├── Test 1: "Explain stock vs bond" (factual)       ║
║              └── Test 2: "Put all savings in 1 stock?" (safety)  ║
╚══════════════════════════════════════════════════════════════════╝
```

---

## The Two Data Folders

### `rag_processed/` — Raw Ingestion Outputs (from `embeddings.ipynb`)

| File | Size | Created by | Used by | Contents |
|---|---|---|---|---|
| `raw_documents.pkl` | 5.9 MB | `embeddings.ipynb` | Debugging / reloading | All 2,388 pages from PyMuPDFLoader (includes 765 empty pages from scanned PDFs) |
| `ocr_documents.pkl` | 1.7 MB | `embeddings.ipynb` | Debugging | 756 pages recovered by Tesseract OCR from the 12 image-based PDFs |
| `final_documents.pkl` | 7.5 MB | `embeddings.ipynb` | **`embedding_rag.ipynb`** | 2,379 merged pages (1,623 text-layer + 756 OCR) — the primary handoff file |

### `investo_rag/` — Processed + Indexed Outputs (from `embedding_rag.ipynb`)

| File | Size | Created by | Used by | Contents |
|---|---|---|---|---|
| `cleaned_documents.pkl` | 7.1 MB | `embedding_rag.ipynb` | Reloading after session reset | 2,340 documents after whitespace normalisation and 100-char minimum filter |
| `chunks.pkl` | 9.4 MB | `embedding_rag.ipynb` | Reloading after session reset | 11,635 text chunks (800 chars each, 150 overlap) |
| `embeddings.npy` | 17.9 MB | `embedding_rag.ipynb` | Can skip re-embedding | (11635, 384) NumPy array — one 384-dim float32 vector per chunk |
| `finance_index.faiss` | 17.9 MB | `embedding_rag.ipynb` | **RAG retrieval** | FAISS `IndexFlatIP` — 11,635 vectors indexed for inner-product (cosine) search |
| `chunk_metadata.pkl` | 9.4 MB | `embedding_rag.ipynb` | **RAG retrieval** | Same 11,635 chunks with metadata (source PDF name, page number, extraction method) |

---

## Notebook Handoffs — Exactly Where Each One Stops and the Next Begins

### Handoff 1: `finetune.ipynb` → `test_investo.ipynb` and `embedding_rag.ipynb`

**What crosses the boundary:** The LoRA adapter weights uploaded to HuggingFace Hub as `IndusYash/investo-llama-3.2-3b-finance-lora`.

**Where finetune.ipynb ends:**
```python
# Last cell — package adapter and download
shutil.make_archive("investo_lora", "zip", "investo_lora")
files.download("investo_lora.zip")
```

**Where test_investo.ipynb picks up:**
```python
# Loads adapter from Hub — no local files needed
model.load_adapter("IndusYash/investo-llama-3.2-3b-finance-lora")
```

**Where embedding_rag.ipynb picks up (the LLM part):**
```python
BASE_MODEL = "unsloth/Llama-3.2-3B-Instruct-bnb-4bit"
ADAPTER_MODEL = "IndusYash/investo-llama-3.2-3b-finance-lora"
model = PeftModel.from_pretrained(base_model, ADAPTER_MODEL)
```

---

### Handoff 2: `embeddings.ipynb` → `embedding_rag.ipynb`

**What crosses the boundary:** `final_documents.pkl` — 2,379 LangChain `Document` objects with `page_content` and `metadata`.

**Where embeddings.ipynb ends:**
```python
# Saves the merged corpus
with open("/content/drive/MyDrive/rag_processed/final_documents.pkl", "wb") as f:
    pickle.dump(final_documents, f)
```

**Where embedding_rag.ipynb picks up:**
```python
# First real cell — loads that exact file
path = "/content/drive/MyDrive/final_documents.pkl"
with open(path, "rb") as f:
    final_documents = pickle.load(f)

print("Documents loaded:", len(final_documents))
# → Documents loaded: 2379
```

---

## How Pickle Files Flow Through `embedding_rag.ipynb`

This is the most pickle-intensive notebook — it reads one file and produces five:

```
                    READS
final_documents.pkl ──────► [Cell 2]  pickle.load()
                                │
                                ▼
                    [Cell 3]  Clean (whitespace, min length)
                                │
                    WRITES      │
cleaned_documents.pkl ◄──────── [Cell 4]  pickle.dump()
                                │
                    [Cell 7]  RecursiveCharacterTextSplitter
                                │   2,340 docs → 11,635 chunks
                    WRITES      │
chunks.pkl ◄───────────────── [Cell 8]  pickle.dump()
                                │
                    [Cell 13] SentenceTransformer.encode()
                                │   11,635 chunks → (11635, 384)
                    WRITES      │
embeddings.npy ◄─────────────── [Cell 14]  np.save()
                                │
                    [Cell 15] faiss.IndexFlatIP.add(embeddings)
                    WRITES      │
finance_index.faiss ◄────────── [Cell 16]  faiss.write_index()
                                │
                    WRITES      │
chunk_metadata.pkl ◄─────────── [Cell 17]  pickle.dump(chunks)
```

At inference time (later in the same notebook, after a session reset):

```
finance_index.faiss ──────► [Cell 33/34]  faiss.read_index()    READS
chunk_metadata.pkl ────────► [Cell 35]    pickle.load()          READS
                                │
                    [Cell 37]  retrieve(query, k=5) function
                    [Cell 41]  build_prompt(retrieved_chunks, question)
                    [Cell 42]  ask_investo_rag(question)
```

---

## The RAG Inference Loop (How It All Connects at Query Time)

When a user asks a question in `embedding_rag.ipynb`:

```
User question: "What is diversification?"
        │
        ▼
[1. EMBED QUERY]
retriever.encode(question, normalize_embeddings=True)
→ (1, 384) float32 vector

        │
        ▼
[2. SEARCH FAISS]  ← uses finance_index.faiss (17.9 MB on disk)
index.search(query_embedding, k=5)
→ scores: [0.852, 0.841, 0.829, 0.817, 0.803]
→ indices: [4812, 2341, 7109, 891, 5677]

        │
        ▼
[3. FETCH CHUNKS]  ← uses chunk_metadata.pkl (9.4 MB on disk)
chunks[4812], chunks[2341], ...
→ Top 5 text passages + metadata (source PDF, page number)

        │
        ▼
[4. BUILD PROMPT]
"You are Investo Bot...
 
 Source 1: [chunk from sebi.pdf page 12 — about asset diversification]
 Source 2: [chunk from mutual funds.pdf page 7 — about portfolio theory]
 ...
 
 User: What is diversification?
 Assistant:"

        │
        ▼
[5. GENERATE]  ← uses Llama 3.2 3B + LoRA adapter (from HF Hub)
model.generate(prompt, max_new_tokens=400)
→ "Diversification refers to spreading investments across various 
   types of assets to minimize potential losses..."

        │
        ▼
Final answer — grounded in actual retrieved documents
```

---

## Comparison: Pure LLM vs RAG

`test_investo.ipynb` tests the model **without** retrieval. `embedding_rag.ipynb` tests it **with** retrieval. Here's what each approach is good at:

| Capability | Pure LLM (`test_investo.ipynb`) | RAG (`embedding_rag.ipynb`) |
|---|---|---|
| General finance concepts | ✅ Very good (learned from 157K examples) | ✅ Good + cites sources |
| Specific document facts | ❌ Can hallucinate | ✅ Grounded in retrieved chunks |
| SEBI-specific rules | ❌ May not know exact rules | ✅ Retrieves from `sebi.pdf` directly |
| Berkshire letter insights | ❌ May paraphrase wrongly | ✅ Pulls exact text from annual letters |
| Speed | ✅ Faster (no retrieval step) | ➡ Slightly slower (embed + search + generate) |
| Requires FAISS index | ❌ No | ✅ Yes — `finance_index.faiss` must be loaded |

---

## Numbers at Every Stage

| Stage | Notebook | Count | Notes |
|---|---|---|---|
| Raw training examples | `finetune.ipynb` | 518,185 | Finance-Instruct-500k |
| After filter pass 1 | `finetune.ipynb` | 253,739 | −51% |
| After filter pass 2 | `finetune.ipynb` | 157,298 | −38% further |
| Training steps | `finetune.ipynb` | 1,000 | ~54 min on T4 |
| Trainable LoRA params | `finetune.ipynb` | 24.3M | 0.75% of 3.2B |
| Raw PDF files | `embeddings.ipynb` | 61 | Google Drive |
| Pages loaded (PyMuPDF) | `embeddings.ipynb` | 2,388 | Including 765 empty |
| Image-only PDFs detected | `embeddings.ipynb` | 12 | 100% empty pages |
| Pages recovered by OCR | `embeddings.ipynb` | 756 | Tesseract at 200 DPI |
| Final merged pages | `embeddings.ipynb` | 2,379 | → `final_documents.pkl` |
| After cleaning | `embedding_rag.ipynb` | 2,340 | −39 very short pages |
| Text chunks | `embedding_rag.ipynb` | 11,635 | 800 chars, 150 overlap |
| Embedding dimensions | `embedding_rag.ipynb` | 384 | BAAI/bge-small-en-v1.5 |
| FAISS index size | `embedding_rag.ipynb` | 11,635 vectors | IndexFlatIP |
| Retrieval k per query | `embedding_rag.ipynb` | 5 | Top-5 chunks |

---

## Why the Project Is Split This Way

### Why finetune.ipynb is separate?
Fine-tuning takes ~54 minutes and consumes the full 15 GB VRAM. It can't run in the same session as RAG inference (which also needs VRAM for embeddings and the LLM). Separating them also means the adapter only needs to be trained once and can be loaded cheaply via the Hub.

### Why embeddings.ipynb is separate from embedding_rag.ipynb?
`embeddings.ipynb` focuses on the slow, one-time work: loading 61 PDFs, running OCR on 12 of them (30–60 min), and saving the result. `embedding_rag.ipynb` starts from the saved pickle and handles the faster, iterative work: chunking, embedding, indexing, and querying. Separating them means if the embedding model changes or the index needs rebuilding, you don't have to re-run OCR.

### Why pickle files instead of a database?
Pickle is the fastest way to checkpoint Python objects (including LangChain `Document` instances) to disk in a Colab environment. The tradeoff is portability — these files only work in the same Python environment. For a production system, the chunks and metadata would live in a proper vector database (Pinecone, Weaviate, ChromaDB).

### Why does embedding_rag.ipynb have session-reset cells?
Colab disconnects after ~90 minutes of inactivity. The notebook has explicit Drive remount and file-reload cells (Cells 31–35) that let you resume from the saved FAISS index and chunk metadata without re-embedding 11,635 chunks.
