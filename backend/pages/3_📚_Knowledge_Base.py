import streamlit as st

from rag_utils import (
    build_or_load_vectorstore,
    get_indexed_documents,
    ingest_uploaded_files,
    retrieve_context_with_citations,
)

st.set_page_config(
    page_title="Knowledge Base | FinChat",
    page_icon="📚",
    layout="wide",
    initial_sidebar_state="collapsed",
)

st.markdown("""
<style>
@import url('https://fonts.googleapis.com/css2?family=Inter:wght@300;400;500;600;700&family=JetBrains+Mono:wght@400;600&display=swap');
html, body, [class*="css"] { font-family: 'Inter', sans-serif; background-color: #0A0A0F !important; color: #E4E4EF; }
.block-container { padding-top: 1.2rem !important; padding-bottom: 3rem !important; max-width: 1100px !important; }
#MainMenu, footer, header { visibility: hidden; }
.stTextInput > div > div > input { background: #111128 !important; border: 1px solid #2D2D50 !important; border-radius: 6px !important; color: #E4E4EF !important; }
.stButton > button { background: #6366F1 !important; color: #FFFFFF !important; border: none !important; border-radius: 8px !important; font-size: 0.82rem !important; font-weight: 600 !important; }
</style>
""", unsafe_allow_html=True)

st.markdown('<h2 style="font-size:1.5rem;font-weight:700;color:#FFFFFF;margin-bottom:0.2rem;">📚 RAG Document Vault & Indexer</h2>', unsafe_allow_html=True)
st.caption("Upload SEC filings, annual reports, equity research PDFs — index them into FAISS for instant semantic retrieval")

# Left Column: Upload & Ingestion | Right Column: Index Status & Search Sandbox
col1, col2 = st.columns([1, 1], gap="large")

with col1:
    st.subheader("Ingest New Financial Documents")
    uploaded_files = st.file_uploader(
        "Upload PDF Filings & Research Reports",
        type=["pdf"],
        accept_multiple_files=True,
        help="Upload SEC filings, shareholder letters, or broker memos to expand the assistant's knowledge base.",
    )

    if uploaded_files:
        if st.button("🚀 Process & Index PDFs into FAISS", type="primary"):
            with st.spinner("Extracting text, chunking passages, and computing MiniLM embeddings..."):
                num_chunks, saved_files = ingest_uploaded_files(uploaded_files)
            if num_chunks > 0:
                st.success(f"Successfully processed {len(saved_files)} file(s) into {num_chunks} vector chunks!")
            else:
                st.warning("No new text chunks could be extracted from the uploaded files.")

    st.divider()
    st.subheader("Currently Indexed Documents")
    docs = get_indexed_documents()
    if docs:
        st.write(f"**Total Documents Found:** {len(docs)}")
        for idx, doc_name in enumerate(docs, start=1):
            st.markdown(f"{idx}. 📄 `{doc_name}`")
    else:
        st.info("No user PDFs uploaded yet. Seed financial knowledge handbook is currently active.")

    if st.button("🔄 Rebuild FAISS Vector Index"):
        with st.spinner("Rebuilding FAISS index from scratch..."):
            build_or_load_vectorstore(rebuild=True)
        st.success("Vector index successfully rebuilt!")

with col2:
    st.subheader("🔎 Semantic Search Sandbox")
    st.caption("Test semantic similarity retrieval directly against the FAISS index with similarity scores.")

    test_query = st.text_input(
        "Search Query",
        value="What are the key operational and macroeconomic risk factors?",
        placeholder="e.g. debt maturity schedule, supply chain constraints",
    )
    top_k = st.slider("Top K Chunks", min_value=1, max_value=8, value=3)

    if st.button("Run Retrieval Test"):
        with st.spinner("Querying vector store..."):
            vectorstore = build_or_load_vectorstore()
            formatted_ctx, citations = retrieve_context_with_citations(vectorstore, test_query, top_k=top_k)

        if not citations:
            st.warning("No matching passages retrieved.")
        else:
            st.markdown(f"**Retrieved {len(citations)} Relevant Passages:**")
            for idx, cit in enumerate(citations, start=1):
                with st.expander(f"Chunk #{idx} — Source: {cit.source} (Page {cit.page or 'N/A'}) [Distance: {cit.relevance_score}]", expanded=True):
                    st.markdown(f"```text\n{cit.snippet}\n```")
