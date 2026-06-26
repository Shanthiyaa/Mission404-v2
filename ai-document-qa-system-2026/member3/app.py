"""
Intelligent Document Q&A Assistant — full backup/reference version
Run with: streamlit run app.py
"""
import sys
import os
sys.path.append(os.path.dirname(os.path.dirname(os.path.abspath(__file__))))

import streamlit as st
import ollama
import numpy as np

from member1.extractor import process_documents
from member2.embeddings import SentenceTransformerEmbeddings
from vector_store import VectorStore

st.set_page_config(page_title="Document Q&A Assistant", page_icon="📄", layout="wide")

st.markdown("""
<style>
@import url('https://fonts.googleapis.com/css2?family=Space+Grotesk:wght@500;700&family=Inter:wght@400;500&family=JetBrains+Mono:wght@400;500&display=swap');

[data-testid="stAppViewContainer"], [data-testid="stHeader"] { background-color: #0F1115; }
[data-testid="stSidebar"] { background-color: #171A21; border-right: 1px solid #262B36; }
h1,h2,h3 { font-family: 'Space Grotesk', sans-serif !important; color: #E7E5DF !important; }
p,span,label,div { font-family: 'Inter', sans-serif; }

.eyebrow {
    font-family: 'JetBrains Mono', monospace;
    font-size: 0.75rem; color: #4FD1C5;
    letter-spacing: 0.1em; text-transform: uppercase; margin-bottom: 0.5rem;
}

/* ── landing page ── */
.hero { text-align: center; padding: 3rem 1rem 2rem; }
.hero-title { font-family: 'Space Grotesk', sans-serif; font-size: 2.2rem; font-weight: 700; color: #E7E5DF; line-height: 1.2; margin-bottom: 0.75rem; }
.hero-sub { font-size: 1rem; color: #8B92A0; max-width: 480px; margin: 0 auto 2rem; line-height: 1.6; }
.upload-zone {
    border: 1.5px dashed #4FD1C5; border-radius: 12px;
    padding: 2.5rem 2rem; max-width: 440px; margin: 0 auto 1.2rem;
    background: #171A21; cursor: pointer;
}
.upload-zone-icon { font-size: 2rem; color: #4FD1C5; margin-bottom: 0.5rem; }
.upload-zone p { font-size: 0.9rem; color: #8B92A0; margin: 0; }
.upload-zone small { font-size: 0.78rem; color: #555e6e; }
.file-badges { display: flex; gap: 8px; justify-content: center; flex-wrap: wrap; margin-top: 0.75rem; }
.file-badge { font-size: 0.72rem; padding: 3px 10px; border-radius: 20px; background: #171A21; border: 1px solid #262B36; color: #8B92A0; }

/* pipeline */
.pipeline-row { display: flex; align-items: center; justify-content: center; gap: 4px; margin: 1.5rem 0; flex-wrap: wrap; }
.pipe-step { display: flex; flex-direction: column; align-items: center; gap: 5px; }
.pipe-icon { width: 44px; height: 44px; border-radius: 10px; background: #1a2e2a; border: 1px solid #4FD1C5; display: flex; align-items: center; justify-content: center; font-size: 1.1rem; }
.pipe-text { font-size: 0.68rem; color: #8B92A0; text-align: center; line-height: 1.3; }
.pipe-arrow { color: #4FD1C5; font-size: 0.85rem; margin-bottom: 18px; padding: 0 2px; }

/* feature cards */
.features-grid { display: grid; grid-template-columns: repeat(auto-fit, minmax(150px, 1fr)); gap: 12px; margin: 1.5rem 0; }
.feat-card { background: #171A21; border: 1px solid #262B36; border-radius: 12px; padding: 1rem; }
.feat-icon { font-size: 1.2rem; color: #4FD1C5; margin-bottom: 0.5rem; }
.feat-title { font-size: 0.85rem; font-weight: 600; color: #E7E5DF; margin-bottom: 0.25rem; }
.feat-desc { font-size: 0.78rem; color: #8B92A0; line-height: 1.5; }

/* chat preview */
.chat-preview { background: #171A21; border: 1px solid #262B36; border-radius: 12px; overflow: hidden; max-width: 560px; margin: 0 auto; }
.chat-preview-header { padding: 0.6rem 1rem; border-bottom: 1px solid #262B36; display: flex; align-items: center; gap: 8px; }
.cp-dot { width: 8px; height: 8px; border-radius: 50%; background: #4FD1C5; }
.cp-label { font-size: 0.72rem; font-family: 'JetBrains Mono', monospace; color: #8B92A0; }
.chat-preview-body { padding: 1rem; display: flex; flex-direction: column; gap: 10px; }
.cp-msg { display: flex; gap: 8px; }
.cp-avatar { width: 24px; height: 24px; border-radius: 50%; display: flex; align-items: center; justify-content: center; font-size: 0.7rem; font-weight: 600; flex-shrink: 0; margin-top: 2px; }
.cp-avatar.u { background: #1a2438; color: #5ba3e8; }
.cp-avatar.b { background: #1a2e2a; color: #4FD1C5; }
.cp-bubble { background: #1e222b; border-radius: 8px; padding: 0.5rem 0.75rem; font-size: 0.82rem; color: #E7E5DF; line-height: 1.5; flex: 1; }
.cp-cite { margin-top: 0.4rem; border-left: 2px solid #4FD1C5; padding: 0.3rem 0.6rem; background: #1e222b; border-radius: 0 4px 4px 0; }
.cp-cite span { font-size: 0.7rem; font-family: 'JetBrains Mono', monospace; color: #4FD1C5; display: block; }
.cp-cite small { font-size: 0.68rem; color: #555e6e; }
.cp-miss { font-style: italic; color: #555e6e !important; }

/* ── chat UI (shown after upload) ── */
.cite-hit { font-family: 'JetBrains Mono', monospace; font-size: 0.82rem; background: #171A21; border-left: 3px solid #4FD1C5; padding: 0.6rem 0.9rem; margin-bottom: 0.5rem; border-radius: 0 4px 4px 0; color: #E7E5DF; }
.cite-hit .src { color: #4FD1C5; font-weight: 500; }
.cite-hit .body { color: #8B92A0; margin-top: 0.3rem; display: block; }
[data-testid="stChatMessage"] { background-color: #171A21; border-radius: 10px; border: 1px solid #262B36; }
button { border-radius: 6px !important; }
</style>
""", unsafe_allow_html=True)

# ── session state ──────────────────────────────────────────────────────
if "vector_store" not in st.session_state:
    st.session_state.vector_store = None
if "indexed_files" not in st.session_state:
    st.session_state.indexed_files = set()
if "messages" not in st.session_state:
    st.session_state.messages = []


@st.cache_resource(show_spinner="Loading embedding model (first run only)...")
def get_embedder():
    return EmbeddingModel()


def process_uploaded_files(files, embedder):
    new_files = [f for f in files if f.name not in st.session_state.indexed_files]
    if not new_files:
        return

    import tempfile, pathlib
    all_chunks = []
    with tempfile.TemporaryDirectory() as tmpdir:
        file_paths = []
        for f in new_files:
            tmp_path = str(pathlib.Path(tmpdir) / f.name)
            with open(tmp_path, "wb") as out:
                out.write(f.read())
            file_paths.append(tmp_path)
            st.session_state.indexed_files.add(f.name)

        documents = process_documents(file_paths)
        for doc in documents:
            all_chunks.append({
                "text": doc.page_content if hasattr(doc, "page_content") else str(doc),
                "source_file": doc.metadata.get("source", "unknown") if hasattr(doc, "metadata") else "unknown",
                "page": doc.metadata.get("page", 1) if hasattr(doc, "metadata") else 1,
            })

    if not all_chunks:
        return

    vectors = embedder.embed_texts([c["text"] for c in all_chunks])
    if st.session_state.vector_store is None:
        st.session_state.vector_store = VectorStore(dimension=embedder.dimension)
    st.session_state.vector_store.add(vectors, all_chunks)

def retrieve_chunks(question, embedder, k=3):
    if st.session_state.vector_store is None or st.session_state.vector_store.is_empty():
        return []
    q_vec = embedder.embed_query(question)
    return st.session_state.vector_store.search(q_vec, k=k)


def ask_llm(question, chunks, model="llama3.2"):
    context = "\n\n".join(
        f"[Source: {c['source_file']}, page {c['page']}]\n{c['text']}"
        for c in chunks
    )
    prompt = f"""You are a documentation assistant. Answer the question
using ONLY the context below. Be specific — include exact numbers, names,
or values from the context. If the answer isn't in the context, say
"I couldn't find this in the uploaded documents."
Always cite the source file and page number at the end of your answer.

Context:
{context}

Question: {question}
Answer:"""
    response = ollama.chat(
        model=model,
        messages=[{"role": "user", "content": prompt}],
    )
    return response["message"]["content"]


# ── sidebar ─────────────────────────────────────────────────────────────
with st.sidebar:
    st.markdown('<div class="eyebrow">// documents</div>', unsafe_allow_html=True)
    uploaded_files = st.file_uploader(
        "Upload PDFs",
        type="pdf",
        accept_multiple_files=True,
        label_visibility="collapsed",
    )

    if uploaded_files:
        embedder = get_embedder()
        with st.spinner("Indexing..."):
            process_uploaded_files(uploaded_files, embedder)
        st.success(f"{len(st.session_state.indexed_files)} file(s) ready")
        for name in st.session_state.indexed_files:
            st.caption(f"📄 {name}")
    else:
        st.info("No documents uploaded yet")

    st.divider()
    if st.button("🗑 Clear chat"):
        st.session_state.messages = []
        st.rerun()
    if st.button("🔄 Clear all documents"):
        st.session_state.vector_store = None
        st.session_state.indexed_files = set()
        st.rerun()


# ── landing page (shown when no docs uploaded) ──────────────────────────
if not st.session_state.indexed_files:
    st.markdown("""
    <div class="hero">
      <div class="eyebrow">// internal · pdf-grounded retrieval</div>
      <div class="hero-title">Ask anything.<br>Get answers from your docs.</div>
      <div class="hero-sub">Upload your user guides, release notes, SQA test cases,
      or KCS articles — and ask questions in plain English.</div>

      <div class="upload-zone">
        <div class="upload-zone-icon">📂</div>
        <p>Drop PDFs in the sidebar to get started</p>
        <small>Up to 200 MB per file · multiple files supported</small>
      </div>

      <div class="file-badges">
        <span class="file-badge">📘 user guides</span>
        <span class="file-badge">📋 release notes</span>
        <span class="file-badge">✅ SQA test cases</span>
        <span class="file-badge">📰 KCS articles</span>
      </div>
    </div>

    <div style="max-width:680px; margin: 0 auto; padding: 0 1rem 2rem;">
      <p class="eyebrow" style="text-align:center; margin-bottom:1rem;">how it works</p>
      <div class="pipeline-row">
        <div class="pipe-step"><div class="pipe-icon">📄</div><div class="pipe-text">Upload PDF</div></div>
        <div class="pipe-arrow">→</div>
        <div class="pipe-step"><div class="pipe-icon">✂️</div><div class="pipe-text">Extract &amp; chunk</div></div>
        <div class="pipe-arrow">→</div>
        <div class="pipe-step"><div class="pipe-icon">🔢</div><div class="pipe-text">Embed &amp; index</div></div>
        <div class="pipe-arrow">→</div>
        <div class="pipe-step"><div class="pipe-icon">🔍</div><div class="pipe-text">Semantic search</div></div>
        <div class="pipe-arrow">→</div>
        <div class="pipe-step"><div class="pipe-icon">🤖</div><div class="pipe-text">LLM answer</div></div>
        <div class="pipe-arrow">→</div>
        <div class="pipe-step"><div class="pipe-icon">💬</div><div class="pipe-text">Answer + citation</div></div>
      </div>

      <div class="features-grid">
        <div class="feat-card"><div class="feat-icon">🔒</div><div class="feat-title">Fully local</div><div class="feat-desc">Runs on your machine with Ollama. Documents never leave your network.</div></div>
        <div class="feat-card"><div class="feat-icon">📌</div><div class="feat-title">Source citations</div><div class="feat-desc">Every answer shows the exact file and page number it came from.</div></div>
        <div class="feat-card"><div class="feat-icon">📁</div><div class="feat-title">Multi-document</div><div class="feat-desc">Upload multiple PDFs and search across all of them at once.</div></div>
        <div class="feat-card"><div class="feat-icon">🧠</div><div class="feat-title">Semantic search</div><div class="feat-desc">Finds content by meaning, not just keyword matching.</div></div>
      </div>

      <p class="eyebrow" style="text-align:center; margin-bottom:1rem; margin-top:2rem;">example conversation</p>
      <div class="chat-preview">
        <div class="chat-preview-header">
          <div class="cp-dot"></div>
          <span class="cp-label">Red_Hat_Release_Notes.pdf · indexed</span>
        </div>
        <div class="chat-preview-body">
          <div class="cp-msg">
            <div class="cp-avatar u">U</div>
            <div class="cp-bubble">What's new in RHEL 10.2 for security?</div>
          </div>
          <div class="cp-msg">
            <div class="cp-avatar b">AI</div>
            <div style="flex:1">
              <div class="cp-bubble">RHEL 10.2 introduces updated SELinux policies, FIPS 140-3 compliance changes, and new OpenSSL 3.x defaults. Audit logging has been improved and hardware security key support expanded.</div>
              <div class="cp-cite">
                <span>Red_Hat_Release_Notes.pdf · page 12</span>
                <small>Chapter 2 — Security · matched via semantic search</small>
              </div>
            </div>
          </div>
          <div class="cp-msg">
            <div class="cp-avatar u">U</div>
            <div class="cp-bubble">What is the default SSH port?</div>
          </div>
          <div class="cp-msg">
            <div class="cp-avatar b">AI</div>
            <div class="cp-bubble cp-miss">I couldn't find this in the uploaded documents. The release notes don't cover SSH default configuration.</div>
          </div>
        </div>
      </div>
    </div>
    """, unsafe_allow_html=True)

# ── chat UI (shown once at least one doc is indexed) ────────────────────
else:
    st.markdown('<div class="eyebrow">// internal · pdf-grounded retrieval</div>', unsafe_allow_html=True)
    st.title("📄 Document Q&A Assistant")

    for msg in st.session_state.messages:
        with st.chat_message(msg["role"]):
            st.markdown(msg["content"])

    question = st.chat_input("Ask a question about your documents...")

    if question:
        st.session_state.messages.append({"role": "user", "content": question})
        with st.chat_message("user"):
            st.markdown(question)

        with st.chat_message("assistant"):
            with st.spinner("Searching documents and generating answer..."):
                try:
                    embedder = get_embedder()
                    chunks = retrieve_chunks(question, embedder)
                    if not chunks:
                        answer = "No relevant content found in the uploaded documents."
                        st.warning(answer)
                    else:
                        answer = ask_llm(question, chunks)
                        st.markdown(answer)
                        with st.expander("Sources used"):
                            for c in chunks:
                                st.markdown(
                                    f'<div class="cite-hit">'
                                    f'<span class="src">{c["source_file"]} · page {c["page"]}</span>'
                                    f'<span class="body">{c["text"][:300]}</span>'
                                    f'</div>',
                                    unsafe_allow_html=True,
                                )
                except Exception as e:
                    answer = (
                        "Something went wrong. Make sure Ollama is running "
                        "and the model name matches what you've pulled."
                    )
                    st.error(answer)
                    st.caption(f"Technical details: {e}")

        st.session_state.messages.append({"role": "assistant", "content": answer})
