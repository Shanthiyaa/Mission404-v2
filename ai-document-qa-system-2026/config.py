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

# ── Chunking — IMPROVED: larger overlap, smaller chunks for better precision ──
CHUNK_CONFIG = {
    "user_guide":   {"chunk_size": 500,  "chunk_overlap": 100},
    "release_note": {"chunk_size": 400,  "chunk_overlap": 80},
    "sqa":          {"chunk_size": 300,  "chunk_overlap": 60},
    "kcs":          {"chunk_size": 500,  "chunk_overlap": 100},
    "unknown":      {"chunk_size": 450,  "chunk_overlap": 90},
}

# ── Embeddings ────────────────────────────────────────────────────────────────
EMBEDDING_MODEL  = "sentence-transformers/all-MiniLM-L6-v2"
EMBEDDING_DEVICE = "cpu"          # change to "cuda" if GPU available
EMBEDDING_BATCH_SIZE = 32         # batch size for faster embedding generation

# ── FAISS retrieval — IMPROVED: retrieve more, filter less aggressively ───────
TOP_K_RESULTS  = 6                # retrieve more chunks for better coverage
MIN_SIMILARITY = 0.20             # lowered slightly to avoid missing relevant chunks

# ── Duplicate detection ───────────────────────────────────────────────────────
ENABLE_DUPLICATE_DETECTION = True  # detect and reject duplicate uploads

# ── Ollama / LLM ──────────────────────────────────────────────────────────────
OLLAMA_MODEL       = "llama3.2"
OLLAMA_BASE_URL    = "http://localhost:11434"
LLM_TEMPERATURE    = 0.1
LLM_CONTEXT_WINDOW = 4096

# ── RAG Prompt — IMPROVED: forces structured citations in response ─────────────
RAG_PROMPT_TEMPLATE = """You are an expert technical assistant for enterprise documents.
Use ONLY the context provided below to answer the question accurately.
If the answer is not found in the context, respond with EXACTLY:
"I couldn't find this in the uploaded documents."

Rules:
- Answer only from the context. Never make up information.
- Be specific and include exact values, names, version numbers from the context.
- At the end of your answer, always list the sources you used.

Context:
{context}

Question: {question}

Answer (be specific, then list sources used):"""

# ── API Server ────────────────────────────────────────────────────────────────
API_HOST    = "0.0.0.0"
API_PORT    = 8000
CORS_ORIGINS = [
    "http://localhost:5173",
    "http://127.0.0.1:5173",
]
