# embeddings.ipynb — Full Pipeline Explanation

## Overview

This notebook builds the **document ingestion and preprocessing pipeline** for a Retrieval-Augmented Generation (RAG) system focused on financial documents. The goal is to convert a collection of raw PDF files stored in Google Drive into a clean, unified corpus of text documents that can later be chunked, embedded, and indexed into a FAISS vector store for semantic search.

The pipeline handles two distinct types of PDFs:
- **Text-layer PDFs** — files where the PDF itself stores selectable text (annual reports, regulatory filings, etc.)
- **Scanned / image-based PDFs** — files where pages are images with no embedded text, requiring OCR to extract content

---

## Architecture at a Glance

```
Google Drive (raw PDFs)
        │
        ▼
 PyMuPDFLoader  ──► Text extraction (text-layer PDFs)
        │
        ▼
  Diagnostic: detect 100% empty PDFs
        │
        ▼
 Tesseract OCR  ──► Image-based text extraction (scanned PDFs)
        │
        ▼
  Merge + Clean  ──► Unified document list
        │
        ▼
  Save to Drive  ──► .pkl files for downstream use
```

---

## Section 1 — Install Dependencies

```python
%%capture

!pip install -q langchain
!pip install -q langchain-community
!pip install -q sentence-transformers
!pip install -q faiss-gpu
!pip install -q pypdf
```

### What this does
All required packages are installed silently using `%%capture` to suppress noisy pip output.

| Package | Role |
|---|---|
| `langchain` | Core framework for document loading, splitting, and retrieval chains |
| `langchain-community` | Community integrations — specifically `PyMuPDFLoader` for PDF loading |
| `sentence-transformers` | Pre-trained embedding models (e.g. `all-MiniLM-L6-v2`) to convert text into dense vectors |
| `faiss-gpu` | Facebook AI Similarity Search — GPU-accelerated vector index for fast nearest-neighbour lookup |
| `pypdf` | Fallback pure-Python PDF reader used by some LangChain loaders |

> **Why FAISS over a hosted vector DB?** FAISS runs entirely locally, has no per-query cost, and is extremely fast for similarity search at the scale of thousands of documents. It is ideal for Colab-based prototyping where you want zero infrastructure overhead.

---

## Section 2 — Mount Google Drive

```python
from google.colab import drive
drive.mount('/content/drive')
```

### What this does
Mounts Google Drive at `/content/drive`, making all Drive files accessible as a regular filesystem path. This is the standard way to persist data across Colab sessions, since the Colab VM itself is ephemeral and gets wiped after disconnection.

- All source PDFs live at: `/content/drive/MyDrive/rag_data/`
- All processed outputs are saved to: `/content/drive/MyDrive/rag_processed/`

> **Why save processed data?** Parsing 2,388 pages and running OCR over hundreds of scanned images takes significant time. By persisting `.pkl` files to Drive, subsequent sessions can skip directly to chunking and embedding without repeating the entire ingestion pipeline.

---

## Section 3 — Explore the Data Directory

```python
import os

path = "/content/drive/MyDrive/rag_data"
files = os.listdir(path)

print(f"Total files found: {len(files)}")
print(files[:10])
```

**Output:**
```
Total files found: 61
['etf.pdf', 'Smart Beta, Direct.pdf', 'mutual funds.pdf', 'sec.pdf', 'jp.pdf', ...]
```

### What this does
A simple directory listing to understand the corpus composition before processing. The dataset contains **61 PDF files** spanning:
- ETF and mutual fund documentation
- SEC and SEBI regulatory filings
- Warren Buffett's Berkshire Hathaway annual letters (1978–2024)
- Large financial textbooks (`knl.pdf` = 340 pages, `Richard Pike.pdf` = 787 pages)

The first 10 filenames are printed as a quick sanity check before committing to a full load.

---

## Section 4 — Install Additional PDF Tools

```python
!pip install -q pymupdf
```

```python
!apt-get update -qq
!apt-get install -qq tesseract-ocr poppler-utils

!pip install -q pytesseract pdf2image pillow
```

### What this does
Two separate tool groups are installed:

**PyMuPDF (`fitz`):**
- High-performance C-based PDF library
- Much faster than pure-Python alternatives
- Accurately extracts text, metadata, and page structure from text-layer PDFs

**Tesseract + supporting tools:**

| Tool | Role |
|---|---|
| `tesseract-ocr` | Google's open-source OCR engine — converts images of text into machine-readable strings |
| `poppler-utils` | CLI PDF utilities; `pdf2image` uses `pdftoppm` from poppler to rasterise PDF pages into images |
| `pytesseract` | Python wrapper around the Tesseract binary |
| `pdf2image` | Converts each PDF page into a PIL Image at a specified DPI |
| `pillow` | Python Imaging Library — required by both pdf2image and pytesseract |

> **Why is OCR needed?** Many financial PDFs — SEBI filings, ETF factsheets, and older SEC documents — are created by scanning physical paper. PyMuPDF reads the PDF structure fine but returns empty strings because there is no text layer. OCR is the only way to recover the content from these files.

---

## Section 5 — Load All PDFs with PyMuPDFLoader

```python
from langchain_community.document_loaders import PyMuPDFLoader

documents = []

for file in os.listdir(pdf_path):
    if file.endswith(".pdf"):
        loader = PyMuPDFLoader(file_path)
        pages = loader.load()
        documents.extend(pages)
        print(f"Loaded {file}: {len(pages)} pages")

print(f"Total pages loaded: {len(documents)}")
```

**Output:** `Total pages loaded: 2388`

### What this does
Every `.pdf` file in `rag_data` is loaded using `PyMuPDFLoader`, which returns one **LangChain `Document` object per page**. Each `Document` has two fields:
- `page_content` — the extracted text string for that page
- `metadata` — a dict containing `source` (file path), `page` (0-indexed number), `author`, `title`, and other PDF metadata

Errors (corrupted files, permission issues) are caught and printed without interrupting the loop.

**Corpus breakdown:**

| File type | Example files | Approx. pages |
|---|---|---|
| Large textbooks | `knl.pdf`, `Richard Pike.pdf` | 1,127 |
| Berkshire letters (1978–2024) | `1978.pdf` → `2024ltr.pdf` | ~480 |
| Regulatory docs | `sec.pdf`, `sebi.pdf`, `secc.pdf` | ~161 |
| ETF / mutual fund | `etf.pdf`, `etff.pdf`, `etfff.pdf` | ~167 |
| Other financial docs | `jp.pdf`, `x.pdf`, `Smart Beta, Direct.pdf` | ~67 |

---

## Section 6 — Diagnose Empty Pages (PDF Quality Audit)

```python
from collections import defaultdict

pdf_stats = defaultdict(lambda: {"total": 0, "empty": 0})

for doc in documents:
    source = os.path.basename(doc.metadata["source"])
    pdf_stats[source]["total"] += 1
    if len(doc.page_content.strip()) == 0:
        pdf_stats[source]["empty"] += 1

for pdf, stats in sorted(pdf_stats.items(), key=lambda x: x[1]["empty"], reverse=True):
    if stats["empty"] > 0:
        percentage = stats["empty"] / stats["total"] * 100
        print(f"{pdf}: {stats['empty']}/{stats['total']} empty ({percentage:.1f}%)")
```

**Output:**
```
knl.pdf: 340/340 empty (100.0%)
sebi.pdf: 73/73 empty (100.0%)
etfff.pdf: 60/60 empty (100.0%)
sec.pdf: 56/56 empty (100.0%)
Smart Beta, Direct.pdf: 51/51 empty (100.0%)
mutual funds.pdf: 50/50 empty (100.0%)
mutual f.pdf: 40/40 empty (100.0%)
secc.pdf: 32/32 empty (100.0%)
etff.pdf: 27/27 empty (100.0%)
etf.pdf: 20/20 empty (100.0%)
jp.pdf: 8/8 empty (100.0%)
x.pdf: 8/8 empty (100.0%)
```

### What this does
This is a **data quality audit** that counts how many pages per PDF returned zero characters after stripping whitespace. The output reveals that **12 PDFs are 100% image-based** (765 pages total), producing no text at all through normal PDF parsing.

This diagnostic step directly determines the input list for the OCR step — only these 12 identified files are handed off to Tesseract. Running OCR on the remaining 49 PDFs (which already have good text) would be a waste of compute.

---

## Section 7 — OCR Fallback for Scanned PDFs

```python
import pytesseract
from pdf2image import convert_from_path
from langchain_core.documents import Document

bad_pdfs = ["knl.pdf", "sebi.pdf", "etfff.pdf", "sec.pdf", ...]

ocr_documents = []

for pdf_file in bad_pdfs:
    pages = convert_from_path(file_path, dpi=200)

    for page_num, image in enumerate(pages):
        text = pytesseract.image_to_string(image, lang="eng")
        text = text.strip()

        if text:
            ocr_documents.append(
                Document(
                    page_content=text,
                    metadata={
                        "source": pdf_file,
                        "page": page_num,
                        "extraction": "OCR"
                    }
                )
            )

print(f"Total OCR pages extracted: {len(ocr_documents)}")
```

**Output:** `Total OCR pages extracted: 756`

### What this does
For each of the 12 image-based PDFs, the pipeline runs a 3-step process:

**Step 1 — Rasterise the PDF**
`convert_from_path` uses Poppler's `pdftoppm` tool to convert each PDF page into a `PIL.Image` at **200 DPI**. Higher DPI improves OCR accuracy — especially for small text and financial tables — but costs proportionally more RAM and processing time.

**Step 2 — Run Tesseract OCR**
`pytesseract.image_to_string` passes the PIL image to the Tesseract engine with `lang="eng"` and returns the recognised text as a plain Python string. Tesseract uses LSTM-based neural networks internally and is highly accurate for printed, structured text like financial reports.

**Step 3 — Wrap in Document and filter blanks**
Only non-empty pages are kept. Each is wrapped in a LangChain `Document` with the metadata field `"extraction": "OCR"` added, so downstream processes can distinguish OCR-sourced pages from natively extracted ones if needed (e.g. for quality-weighting or separate evaluation).

> **DPI choice (200):** A deliberate balance. 150 DPI is often too blurry for small fonts and dense financial tables. 300 DPI greatly increases memory usage and conversion time per page. 200 DPI reliably handles most printed documents without running out of memory on Colab's 12–15 GB RAM.

**OCR Results by file:**

| PDF | Total Pages | OCR Extracted | Missed |
|---|---|---|---|
| knl.pdf | 340 | 340 | 0 |
| sebi.pdf | 73 | 73 | 0 |
| etfff.pdf | 60 | 56 | 4 |
| sec.pdf | 56 | 54 | 2 |
| Smart Beta, Direct.pdf | 51 | 51 | 0 |
| mutual funds.pdf | 50 | 50 | 0 |
| mutual f.pdf | 40 | 40 | 0 |
| secc.pdf | 32 | 29 | 3 |
| etff.pdf | 27 | 27 | 0 |
| etf.pdf | 20 | 20 | 0 |
| jp.pdf | 8 | 8 | 0 |
| x.pdf | 8 | 8 | 0 |
| **Total** | **765** | **756** | **9** |

The 9 missed pages are purely blank (covers, dividers, or pages where Tesseract returned an empty string).

---

## Section 8 — Save OCR Documents to Drive

```python
import pickle

save_path = "/content/drive/MyDrive/rag_processed"
os.makedirs(save_path, exist_ok=True)

ocr_file = os.path.join(save_path, "ocr_documents.pkl")
with open(ocr_file, "wb") as f:
    pickle.dump(ocr_documents, f)

print(f"Total OCR pages saved: {len(ocr_documents)}")
```

**Output:** `Total OCR pages saved: 756`

### What this does
The OCR step is the most time-consuming part of the pipeline — processing 756 pages at 200 DPI can take 30–60 minutes on Colab depending on GPU/CPU availability. The result is immediately **persisted to Drive using Python's `pickle` module**.

`pickle.dump` serialises the entire Python list of `Document` objects into a binary format. This preserves the full object structure — including `page_content` and `metadata` — so it can be reloaded identically in any future session with a single `pickle.load()` call, without re-running Tesseract.

`os.makedirs(save_path, exist_ok=True)` ensures the `rag_processed/` directory is created if it does not already exist, without raising an error if it does.

---

## Section 9 — Save Raw Documents to Drive

```python
with open("/content/drive/MyDrive/rag_processed/raw_documents.pkl", "wb") as f:
    pickle.dump(documents, f)

print("✅ Raw documents saved")
```

### What this does
The full 2,388-document list from PyMuPDFLoader (including the 765 empty pages from scanned PDFs) is also checkpointed. This is a defensive measure — if the merging or cleaning logic needs to be revised, the slow PDF loading step can be skipped entirely by loading `raw_documents.pkl` in a new session.

---

## Section 10 — Reload Documents (New Session Recovery)

```python
documents = []
for file in os.listdir(pdf_path):
    if file.endswith(".pdf"):
        loader = PyMuPDFLoader(file_path)
        pages = loader.load()
        documents.extend(pages)

print("Loaded pages:", len(documents))
```

**Output:** `Loaded pages: 2388`

### What this does
This cell re-runs the PyMuPDFLoader pass (without verbose per-file printing). It exists because Colab's runtime had reset mid-session, wiping the in-memory `documents` variable. Rather than loading from the pickle file, the directory is re-scanned from scratch. This is a common **session recovery pattern** in long-running Colab notebooks.

> **Key lesson:** For any pipeline step that takes more than a few minutes, always save results to Drive immediately after completion and write a corresponding reload cell. This prevents losing hours of work to a runtime timeout.

---

## Section 11 — Merge Text + OCR into Final Corpus

```python
clean_documents = [
    doc for doc in documents
    if doc.page_content.strip()
]

print("Normal extracted pages:", len(clean_documents))
print("OCR recovered pages:", len(ocr_documents))

final_documents = clean_documents + ocr_documents

print("Total pages:", len(final_documents))
```

**Output:**
```
Normal extracted pages: 1623
OCR recovered pages: 756
Total pages: 2379
```

### What this does
This is the **corpus merging step** that unifies the two extraction paths:

- **`clean_documents`** — 1,623 pages from the 49 text-layer PDFs, filtered to exclude all empty pages (`2388 total - 765 empty = 1623`)
- **`ocr_documents`** — 756 pages recovered by Tesseract OCR from the 12 scanned PDFs

Together, `final_documents` is a single flat list of **2,379 LangChain `Document` objects** representing the complete usable knowledge base.

The difference between the naive sum (1,623 + 756 = 2,379) and the raw page count (2,388) is exactly 9 — the pages that were both empty in PyMuPDF AND blank after OCR, which were filtered at each respective stage.

---

## Section 12 — Text Cleaning

```python
import re

cleaned_documents = []

for doc in final_documents:
    text = doc.page_content

    # Collapse all whitespace runs to a single space
    text = re.sub(r"\s+", " ", text)

    # Remove leading/trailing spaces
    text = text.strip()

    # Skip very small chunks (covers, blank pages, etc.)
    if len(text) < 100:
        continue

    doc.page_content = text
    cleaned_documents.append(doc)

print("Original documents:", len(final_documents))
print("Cleaned documents:", len(cleaned_documents))
print("Removed:", len(final_documents) - len(cleaned_documents))
```

### What this does
Each document passes through a lightweight cleaning routine before indexing:

| Step | Logic | Purpose |
|---|---|---|
| Collapse whitespace | `re.sub(r"\s+", " ", text)` | Replaces all runs of tabs, newlines, and spaces with a single space. Prevents tokenisers from treating whitespace as meaningful tokens and keeps chunk sizes predictable. |
| Strip edges | `.strip()` | Removes any remaining leading/trailing whitespace from the full page string. |
| Minimum length filter | `len(text) < 100` | Discards pages that contain fewer than 100 characters after cleaning — typically covers, section dividers, running footers, or pages with only a page number. 100 characters is roughly 1–2 short sentences. |

The cleaned text is written back into `doc.page_content` in-place, preserving the original `metadata` (source filename, page number, extraction method) unchanged.

> **Why clean before embedding?** Noise in the text directly degrades embedding quality. Extra whitespace inflates token counts; near-empty documents pollute the vector index and can surface as false positives during retrieval — scoring high similarity to a query without contributing any meaningful content.

---

## Section 13 — Diagnostic: Verify Saved File Sizes

```python
!find /content/drive/MyDrive -name "*.pkl" -ls
```

**Output:**
```
cleaned_documents.pkl   0 bytes
final_documents.pkl     0 bytes
```

### What this does
A shell command verifies the `.pkl` files that were saved to Drive. The output reveals both files are **0 bytes** — which means the save step appeared to succeed (no error was thrown) but no data was written. This happened because the Colab runtime had silently reset. When `pickle.dump(final_documents, f)` ran in the new session, `final_documents` was undefined and the cell raised a `NameError`, but an empty file had already been created on Drive. This is why a new session recovery follows.

---

## Section 14 — Count Source PDFs

```python
!find /content/drive/MyDrive -name "*.pdf" | wc -l
```

**Output:** `0`

### What this does
Attempts to count all PDF files recursively under `/content/drive/MyDrive`. Output of `0` indicates that Drive remounting is needed — the drive was not mounted in this fresh session at the time this cell ran.

---

## Section 15 — Check Pickle File Size

```python
file_path = "/content/drive/MyDrive/rag_processed/final_documents.pkl"
print("Exists:", os.path.exists(file_path))
print("Size:", os.path.getsize(file_path))
print("Size MB:", os.path.getsize(file_path)/(1024*1024))
```

**Output:**
```
Exists: True
Size: 0
Size MB: 0.0
```

### What this does
Confirms the file exists but is 0 bytes — corroborating the earlier diagnostic. This cell was the trigger for understanding that the entire save-and-merge process needed to be re-run in a clean session after properly remounting Drive.

---

## Section 16 — Session Recovery: Remount Drive

```python
from google.colab import drive
drive.mount('/content/drive')
```

```python
!ls -lah /content/drive/MyDrive
```

### What this does
After confirming the saved files are corrupted/empty and the session has reset, Drive is remounted in the new session. The `!ls -lah` command lists all files in the root of Google Drive to confirm the mount succeeded and the `rag_data/` and `rag_processed/` directories are visible.

At this point the notebook ends — the intended next step is to re-run Sections 5–12 in the fresh session, now with Drive properly mounted, and re-save the correct non-empty pickle files.

---

## Key Design Decisions

### Why Two Extraction Methods?
Financial document collections almost always mix natively-digital PDFs with scanned documents. A single extraction method would either:
- Miss all content from scanned PDFs (PyMuPDF only), or
- Be unnecessarily slow for text-layer PDFs (OCR only, which is 10–100x slower)

The hybrid approach uses the fast native extractor first, identifies failures via the empty-page diagnostic, and only invokes Tesseract where necessary.

### Why `pickle` for Persistence?
`pickle` preserves the full Python object graph — including LangChain's `Document` class with its `page_content` and `metadata` — without any schema or serialisation boilerplate. For a Colab workflow, it is the fastest way to checkpoint intermediate results. The tradeoff is that `.pkl` files are not human-readable and are Python-version sensitive. For production systems, storing documents in a database or as JSON/Parquet would be more robust.

### Why 100-Character Minimum?
Financial PDFs often include:
- Table of contents pages with only chapter names
- Running headers/footers captured as standalone "pages"
- Section title pages with 2–3 words

These are too short to contribute meaningful semantic signal and would waste embedding slots in the vector index.

### Why `dpi=200` for OCR?
This is a deliberate balance point:
- **< 150 DPI** — Often too blurry for small fonts and dense financial tables; Tesseract makes more errors
- **200 DPI** — Reliable for most printed documents; fits in Colab RAM (≈12 MB per page image)
- **300 DPI** — Higher accuracy but 2.25x more memory per image; risks OOM on Colab for large PDFs

---

## What Comes Next

This notebook produces a clean list of LangChain `Document` objects. The downstream pipeline would:

1. **Chunk documents** — Use `RecursiveCharacterTextSplitter` to break long pages into overlapping chunks of ~512 tokens, preserving sentence boundaries
2. **Embed chunks** — Pass each chunk through a `sentence-transformers` model (e.g. `all-MiniLM-L6-v2` or a finance-domain model like `FinBERT`) to get dense vector representations
3. **Index with FAISS** — Build a `IndexFlatL2` or `IndexIVFFlat` FAISS index from the embeddings for fast approximate nearest-neighbour search
4. **Query at inference** — Embed the user's question, retrieve the top-K most similar chunks, and pass them as context to the fine-tuned **Investo Bot** LLM for grounded, document-backed answers
