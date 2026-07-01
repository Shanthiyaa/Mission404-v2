"""
config.py — Shared configuration for all 3 members + FastAPI layer
All settings in one place. Change here, applies everywhere.
"""

# ── Paths ─────────────────────────────────────────────────────────────────────
UPLOAD_DIR       = "./uploaded_docs"        # where files are saved on upload
CHUNKS_JSON_PATH = "./data/chunks.json"     # Member1 → Member2 handoff
FAISS_INDEX_DIR  = "./data/faiss_index"     # Member2 saves, Member3 + API loads

# ── Docling / Extraction ──────────────────────────────────────────────────────
SUPPORTED_EXTENSIONS = {".pdf", ".docx", ".pptx", ".html", ".htm"}

DOC_TYPE_MAP = {
    "user_guide":   ["user_guide", "userguide", "manual", "handbook"],
    "release_note": ["release", "changelog", "relnote", "release_note"],
    "sqa":          ["sqa", "test_case", "testcase", "test_plan"],
    "kcs":          ["kcs", "article", "kb_", "knowledge"],
}

# ── Chunking — FIX BUG 1: chunk_size was 450 chars (~60 words), far too small
# for a 1580-page technical manual. Procedures span paragraphs; 900–1200 chars
# (~150–200 words) keeps steps together and gives the LLM real content to answer from.
CHUNK_CONFIG = {
    "user_guide":   {"chunk_size": 1200, "chunk_overlap": 200},
    "release_note": {"chunk_size": 900,  "chunk_overlap": 150},
    "sqa":          {"chunk_size": 700,  "chunk_overlap": 120},
    "kcs":          {"chunk_size": 1000, "chunk_overlap": 180},
    "unknown":      {"chunk_size": 1000, "chunk_overlap": 180},
}

# ── Embeddings ────────────────────────────────────────────────────────────────
EMBEDDING_MODEL  = "sentence-transformers/all-MiniLM-L6-v2"
EMBEDDING_DEVICE = "cpu"          # change to "cuda" if GPU available
EMBEDDING_BATCH_SIZE = 32         # batch size for faster embedding generation

# ── FAISS retrieval — FIX BUG 4: TOP_K was 6. With old tiny chunks that was
# only ~360 words to the LLM. After the chunk size fix above, TOP_K=12 sends
# ~2400 words — enough for multi-step technical procedures.
TOP_K_RESULTS  = 12               # retrieve 12 chunks for full-procedure coverage
MIN_SIMILARITY = 0.20             # keep threshold; don't lower further

# ── Duplicate detection ───────────────────────────────────────────────────────
ENABLE_DUPLICATE_DETECTION = True  # detect and reject duplicate uploads

# ── Ollama / LLM ──────────────────────────────────────────────────────────────
OLLAMA_MODEL       = "llama3.2"
OLLAMA_BASE_URL    = "http://localhost:11434"
LLM_TEMPERATURE    = 0.1
LLM_CONTEXT_WINDOW = 4096

# ── RAG Prompt — FIX BUG 5: Add completeness instruction so model doesn't stop
# mid-procedure. api.py MUST import and use this template (not its own inline prompt).
RAG_PROMPT_TEMPLATE = """You are an expert technical assistant for ALE (Alcatel-Lucent Enterprise) documents.
Use ONLY the context provided below to answer the question accurately and completely.
If the answer is not found in the context, respond with EXACTLY:
"I couldn't find this in the uploaded documents."

Rules:
- Answer only from the context. Never make up information.
- Be specific: include exact CLI commands, version numbers, parameter names, and values from the context.
- If the answer involves a procedure or steps, list ALL steps completely — never truncate or summarize mid-procedure.
- Format multi-step answers as a numbered list.
- Do NOT start your response with any introductory phrases (e.g. "Based on the provided context...", "According to the document...", "Here is the answer...", etc.). Start directly with the first sentence of the actual answer.
- Do NOT mention words like "context", "documents", "retrieved documents", or "provided files" in your response. Answer the question directly in a professional, enterprise-grade tone.
- Merge information from multiple parts of the context into a single, coherent, and cohesive response. Do not list fragmented passages.
- Do NOT include any source citations, page numbers, or filenames in your text response (such as "Source: doc.pdf" or "(page 5)"). The system will render sources separately.

Context:
{context}

Question: {question}

Answer (complete, with all steps if applicable):"""

# ── API Server ────────────────────────────────────────────────────────────────
API_HOST    = "0.0.0.0"
API_PORT    = 8000
CORS_ORIGINS = [
    "http://localhost:5173",
    "http://127.0.0.1:5173",
]