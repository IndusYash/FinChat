import os
from pathlib import Path
from typing import Any, Dict, List, Optional, Tuple

from huggingface_hub import InferenceClient

try:
    from langchain_text_splitters import RecursiveCharacterTextSplitter
except ImportError:
    try:
        from langchain.text_splitter import RecursiveCharacterTextSplitter
    except ImportError:
        class RecursiveCharacterTextSplitter:
            def __init__(self, chunk_size=800, chunk_overlap=120, separators=None):
                self.chunk_size = chunk_size
                self.chunk_overlap = chunk_overlap

            def split_documents(self, documents):
                chunks = []
                for doc in documents:
                    text = doc.page_content
                    start = 0
                    while start < len(text):
                        end = min(start + self.chunk_size, len(text))
                        chunk_text = text[start:end]
                        chunks.append(Document(page_content=chunk_text, metadata=doc.metadata.copy()))
                        if end == len(text):
                            break
                        start += self.chunk_size - self.chunk_overlap
                return chunks

try:
    from langchain_core.documents import Document
except ImportError:
    try:
        from langchain.docstore.document import Document
    except ImportError:
        class Document:
            def __init__(self, page_content: str, metadata: dict = None):
                self.page_content = page_content
                self.metadata = metadata or {}

from langchain_community.document_loaders import PyPDFLoader
from langchain_community.embeddings import HuggingFaceEmbeddings
from langchain_community.vectorstores import FAISS

from schemas import CitationRef

BASE_DIR = Path(__file__).resolve().parent
DOCS_DIR = BASE_DIR / "data" / "docs"
INDEX_DIR = BASE_DIR / "data" / "faiss_index"


def _get_embeddings() -> HuggingFaceEmbeddings:
    return HuggingFaceEmbeddings(model_name="sentence-transformers/all-MiniLM-L6-v2")


def _split_documents(documents: List[Document]) -> List[Document]:
    splitter = RecursiveCharacterTextSplitter(
        chunk_size=800,
        chunk_overlap=120,
        separators=["\n\n", "\n", " ", ""],
    )
    return splitter.split_documents(documents)


def get_indexed_documents() -> List[str]:
    """Returns the list of document filenames found in the documents directory."""
    DOCS_DIR.mkdir(parents=True, exist_ok=True)
    return [p.name for p in DOCS_DIR.glob("*.pdf")]


def build_or_load_vectorstore(rebuild: bool = False) -> FAISS:
    """Loads existing FAISS index or creates a fresh index from data/docs/*.pdf."""
    DOCS_DIR.mkdir(parents=True, exist_ok=True)
    INDEX_DIR.mkdir(parents=True, exist_ok=True)
    embeddings = _get_embeddings()

    index_file = INDEX_DIR / "index.faiss"
    if index_file.exists() and not rebuild:
        try:
            return FAISS.load_local(
                str(INDEX_DIR),
                embeddings,
                allow_dangerous_deserialization=True,
            )
        except Exception:
            pass  # Fall back to rebuilding if corrupted

    pdf_files = list(DOCS_DIR.glob("*.pdf"))
    documents: List[Document] = []

    for pdf_path in pdf_files:
        try:
            loader = PyPDFLoader(str(pdf_path))
            docs = loader.load()
            for doc in docs:
                doc.metadata["source"] = pdf_path.name
            documents.extend(docs)
        except Exception as e:
            print(f"Error loading {pdf_path}: {e}")

    if not documents:
        documents = [
            Document(
                page_content=(
                    "Institutional Investment Framework: Portfolio risk and expected returns are intrinsically linked. "
                    "Diversification across uncorrelated assets mitigates unsystematic risk. "
                    "Fundamental valuation models like Discounted Cash Flow (DCF) project future free cash flows "
                    "discounted by the Weighted Average Cost of Capital (WACC). Capital structure management balance "
                    "debt tax shields against financial distress risks."
                ),
                metadata={"source": "institutional_seed_handbook.pdf", "page": 1},
            ),
            Document(
                page_content=(
                    "Regulatory Disclosures: Form 10-K filings require Item 1A (Risk Factors) delineating operational, "
                    "macroeconomic, and legal liabilities, while Item 7 (Management's Discussion & Analysis) analyzes "
                    "gross margin drivers, liquidity, and capital expenditures."
                ),
                metadata={"source": "sec_regulatory_overview.pdf", "page": 1},
            ),
        ]

    chunks = _split_documents(documents)
    vectorstore = FAISS.from_documents(chunks, embeddings)
    vectorstore.save_local(str(INDEX_DIR))
    return vectorstore


def ingest_uploaded_files(uploaded_files: List[Any]) -> Tuple[int, List[str]]:
    """Saves uploaded PDFs into data/docs and indexes them into the FAISS vectorstore.
    Returns (num_new_chunks, list_of_filenames).
    """
    DOCS_DIR.mkdir(parents=True, exist_ok=True)
    saved_names = []
    new_docs: List[Document] = []

    for uploaded_file in uploaded_files:
        file_path = DOCS_DIR / uploaded_file.name
        with open(file_path, "wb") as f:
            f.write(uploaded_file.getbuffer())
        saved_names.append(uploaded_file.name)

        try:
            loader = PyPDFLoader(str(file_path))
            docs = loader.load()
            for doc in docs:
                doc.metadata["source"] = uploaded_file.name
            new_docs.extend(docs)
        except Exception as e:
            print(f"Error parsing uploaded file {uploaded_file.name}: {e}")

    if not new_docs:
        return 0, saved_names

    chunks = _split_documents(new_docs)
    embeddings = _get_embeddings()

    # Load existing and append or create new
    try:
        vectorstore = build_or_load_vectorstore(rebuild=False)
        vectorstore.add_documents(chunks)
    except Exception:
        vectorstore = FAISS.from_documents(chunks, embeddings)

    INDEX_DIR.mkdir(parents=True, exist_ok=True)
    vectorstore.save_local(str(INDEX_DIR))
    return len(chunks), saved_names


def retrieve_context_with_citations(
    vectorstore: FAISS,
    query: str,
    top_k: int = 4,
) -> Tuple[str, List[CitationRef]]:
    """Performs similarity search and returns structured citations with relevance scores."""
    try:
        results = vectorstore.similarity_search_with_score(query, k=top_k)
    except Exception:
        results = [(doc, 0.0) for doc in vectorstore.similarity_search(query, k=top_k)]

    citations: List[CitationRef] = []
    context_blocks: List[str] = []

    for doc, score in results:
        source_name = doc.metadata.get("source", "Unknown Document")
        page_num = doc.metadata.get("page")
        if page_num is not None:
            try:
                page_num = int(page_num) + 1  # convert to 1-based index
            except Exception:
                page_num = None

        snippet = doc.page_content.strip()
        citations.append(
            CitationRef(
                source=source_name,
                page=page_num,
                snippet=snippet[:250] + ("..." if len(snippet) > 250 else ""),
                relevance_score=round(float(score), 3) if score is not None else None,
            )
        )
        context_blocks.append(
            f"[Source: {source_name} (Page {page_num or 'N/A'})]\n{snippet}"
        )

    formatted_context = "\n\n---\n\n".join(context_blocks) if context_blocks else "No relevant context found."
    return formatted_context, citations


# Backward-compatible helpers
def retrieve_context(vectorstore: FAISS, query: str, top_k: int = 4) -> List:
    return vectorstore.similarity_search(query, k=top_k)


def format_context(docs: List) -> str:
    if not docs:
        return "No external context available."
    context_blocks = []
    for doc in docs:
        source = doc.metadata.get("source", "unknown")
        context_blocks.append(f"Source: {source}\n{doc.page_content}")
    return "\n\n".join(context_blocks)


def generate_with_hf(prompt: str, model_id: Optional[str] = None) -> str:
    token = os.getenv("HUGGINGFACEHUB_API_TOKEN", "")
    if not token or "replace_me" in token:
        return (
            "⚠️ Hugging Face API token is missing or set to placeholder. "
            "Please configure HUGGINGFACEHUB_API_TOKEN in your .env or sidebar settings."
        )

    model = model_id or os.getenv("HF_MODEL_ID", "HuggingFaceH4/zephyr-7b-beta")
    client = InferenceClient(token=token)

    messages = [
        {
            "role": "system",
            "content": (
                "You are an institutional financial assistant. Use provided market data, quantitative models, "
                "and RAG context. Be precise, avoid making up numbers, and cite facts directly."
            ),
        },
        {"role": "user", "content": prompt},
    ]

    response = client.chat.completions.create(
        model=model,
        messages=messages,
        max_tokens=600,
        temperature=0.2,
    )
    return response.choices[0].message.content
