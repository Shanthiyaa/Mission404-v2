"""
api.py — FastAPI REST layer for ALE Knowledge Assistant
Wraps member1/extractor, member2/retriever, member2/vector_store.
Run with: uvicorn api:app --reload --port 8000

Place this file in the ROOT of ai-document-qa-system-2026/
(same level as config.py, member1/, member2/, member3/)
"""

import os
import sys
import json
import time
import uuid
import shutil
import logging
import threading
from pathlib import Path
from datetime import datetime
from typing import Optional
from contextlib import asynccontextmanager

# ── FastAPI ───────────────────────────────────────────────────────────────────
from fastapi import FastAPI, UploadFile, File, Form, BackgroundTasks, HTTPException
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import JSONResponse, FileResponse
from pydantic import BaseModel

# ── Shared config ─────────────────────────────────────────────────────────────
from config import (
    UPLOAD_DIR,
    FAISS_INDEX_DIR,
    CHUNKS_JSON_PATH,
    OLLAMA_MODEL,
    OLLAMA_BASE_URL,
    TOP_K_RESULTS,
    RAG_PROMPT_TEMPLATE,
)

# ── Logging ───────────────────────────────────────────────────────────────────
logging.basicConfig(level=logging.INFO, format="%(asctime)s [%(levelname)s] %(message)s")
log = logging.getLogger(__name__)

# ── Paths ─────────────────────────────────────────────────────────────────────
UPLOAD_PATH  = Path(UPLOAD_DIR)
FAISS_PATH   = Path(FAISS_INDEX_DIR)
CHUNKS_PATH  = Path(CHUNKS_JSON_PATH)
DOCUMENTS_DB = Path("./data/documents.json")
ACTIVITY_LOG = Path("./data/activity.json")

UPLOAD_PATH.mkdir(parents=True, exist_ok=True)
FAISS_PATH.mkdir(parents=True, exist_ok=True)
(Path("./data")).mkdir(parents=True, exist_ok=True)

# ── In-memory task tracker ────────────────────────────────────────────────────
_tasks: dict[str, dict] = {}

# ── Cached FAISS retriever ────────────────────────────────────────────────────
_retriever_cache = {"loaded": False}

# ── Stats counter ─────────────────────────────────────────────────────────────
_query_counter = {"total": 0, "confidence_sum": 0.0}

# ── Lock to prevent concurrent uploads from corrupting the FAISS index ────────
_faiss_lock = threading.Lock()


# ══════════════════════════════════════════════════════════════════════════════
#  Lifespan
# ══════════════════════════════════════════════════════════════════════════════

@asynccontextmanager
async def lifespan(app: FastAPI):
    _ensure_retriever()
    log.info("ALE Knowledge API started.")
    log.info(f"  Upload dir  : {UPLOAD_PATH.resolve()}")
    log.info(f"  FAISS index : {FAISS_PATH.resolve()}")
    log.info(f"  Ollama model: {OLLAMA_MODEL} @ {OLLAMA_BASE_URL}")
    log.info(f"  FAISS ready : {_retriever_cache['loaded']}")
    yield


# ── App ───────────────────────────────────────────────────────────────────────
app = FastAPI(title="ALE Knowledge API", version="1.0.0", lifespan=lifespan)

app.add_middleware(
    CORSMiddleware,
    allow_origins=["http://localhost:5173", "http://127.0.0.1:5173"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)


# ══════════════════════════════════════════════════════════════════════════════
#  HELPERS
# ══════════════════════════════════════════════════════════════════════════════

def _load_documents_db() -> list[dict]:
    if DOCUMENTS_DB.exists():
        with open(DOCUMENTS_DB, encoding="utf-8") as f:
            return json.load(f)
    return []


def _save_documents_db(docs: list[dict]) -> None:
    with open(DOCUMENTS_DB, "w", encoding="utf-8") as f:
        json.dump(docs, f, indent=2, ensure_ascii=False)


def _load_activity() -> list[dict]:
    if ACTIVITY_LOG.exists():
        with open(ACTIVITY_LOG, encoding="utf-8") as f:
            return json.load(f)
    return []


def _append_activity(text: str, color: str = "bg-purple-500") -> None:
    events = _load_activity()
    events.insert(0, {
        "text": text,
        "time": datetime.now().isoformat(),
        "color": color,
    })
    events = events[:50]
    with open(ACTIVITY_LOG, "w", encoding="utf-8") as f:
        json.dump(events, f, indent=2, ensure_ascii=False)


def _format_time_ago(iso_str: str) -> str:
    try:
        dt = datetime.fromisoformat(iso_str)
        diff = int((datetime.now() - dt).total_seconds())
        if diff < 60:
            return f"{diff}s ago"
        if diff < 3600:
            return f"{diff // 60}m ago"
        if diff < 86400:
            return f"{diff // 3600}h ago"
        return f"{diff // 86400}d ago"
    except Exception:
        return "recently"


def _get_pdf_page_count(filepath: Path) -> int:
    try:
        import re
        data = filepath.read_bytes()
        matches = re.findall(rb"/Type\s*/Page[^s]", data)
        return max(len(matches), 1)
    except Exception:
        return 1


def _human_size(bytes_: int) -> str:
    for unit in ["B", "KB", "MB", "GB"]:
        if bytes_ < 1024:
            return f"{bytes_:.1f} {unit}"
        bytes_ /= 1024
    return f"{bytes_:.1f} GB"


def _ensure_retriever():
    idx_file  = FAISS_PATH / "index.faiss"
    meta_file = FAISS_PATH / "metadata.json"
    _retriever_cache["loaded"] = idx_file.exists() and meta_file.exists()


# ══════════════════════════════════════════════════════════════════════════════
#  BACKGROUND PIPELINE TASK
# ══════════════════════════════════════════════════════════════════════════════

def _run_pipeline(task_id: str, file_path: str, doc_entry: dict) -> None:
    t = _tasks[task_id]
    filename = doc_entry["name"]

    try:
        # Stage 1: Text extraction
        t.update({"stage": "Extracting text…", "progress": 10})
        log.info(f"[{task_id}] Extracting: {filename}")

        from member1.extractor import process_documents
        documents = process_documents([file_path])

        if not documents:
            raise ValueError("Extraction returned no content — check the PDF.")

        t.update({"stage": f"Chunked into {len(documents)} pieces", "progress": 40})
        log.info(f"[{task_id}] Chunks: {len(documents)}")

        # Stage 2: Embeddings + FAISS (with lock)
        t.update({"stage": f"Generating embeddings for {len(documents)} chunks...", "progress": 55})
        log.info(f"[{task_id}] Embedding…")

        with _faiss_lock:
            from member2.vector_store import build_and_persist_faiss_index

            new_chunks = [
                {
                    "text":        d.page_content,
                    "page":        d.metadata.get("page", d.metadata.get("chunk_index", 0)),
                    "source_file": d.metadata.get("source", filename),
                    "section":     d.metadata.get("section", ""),
                    "doc_type":    d.metadata.get("doc_type", "unknown"),
                    "is_table":    d.metadata.get("is_table", False),
                    "word_count":  d.metadata.get("word_count", 0),
                }
                for d in documents
            ]
            log.info(f"[{task_id}] New chunks to embed: {len(new_chunks)}")

            existing_chunks: list[dict] = []
            meta_file = FAISS_PATH / "metadata.json"
            if meta_file.exists():
                try:
                    with open(meta_file, encoding="utf-8") as f:
                        existing_chunks = json.load(f)
                    existing_chunks = [
                        c for c in existing_chunks
                        if c.get("source_file") != filename
                    ]
                    log.info(
                        f"[{task_id}] Merging {len(new_chunks)} new chunks "
                        f"with {len(existing_chunks)} existing chunks."
                    )
                except Exception as e:
                    log.warning(f"[{task_id}] Could not read existing metadata: {e}. Starting fresh.")
                    existing_chunks = []

            merged_chunks = existing_chunks + new_chunks
            build_and_persist_faiss_index(merged_chunks)

        t.update({"stage": "Indexing to FAISS…", "progress": 85})
        log.info(f"[{task_id}] FAISS index built with {len(merged_chunks)} total chunks.")

        # Stage 3: Register document
        docs_db = _load_documents_db()
        doc_entry["status"] = "Indexed"
        doc_entry["chunks"] = len(documents)
        docs_db.append(doc_entry)
        _save_documents_db(docs_db)

        _retriever_cache["loaded"] = True
        
        try:
            from member2.retriever import clear_cache
            clear_cache()
        except ImportError:
            pass

        _append_activity(
            f"{filename} indexed successfully ({len(documents)} chunks)",
            color="bg-purple-500"
        )

        t.update({
            "stage":    "Complete",
            "progress": 100,
            "done":     True,
            "chunks":   len(documents),
        })
        log.info(f"[{task_id}] ✅ Done.")

    except Exception as exc:
        log.error(f"[{task_id}] ✗ Pipeline failed: {exc}", exc_info=True)

        docs_db = _load_documents_db()
        for d in docs_db:
            if d.get("id") == doc_entry.get("id"):
                d["status"] = "Failed"
        _save_documents_db(docs_db)

        _append_activity(f"Failed to index {filename}: {exc}", color="bg-red-500")

        t.update({
            "stage":    "Failed",
            "progress": 0,
            "done":     True,
            "error":    str(exc),
        })


# ══════════════════════════════════════════════════════════════════════════════
#  UPLOAD  —  POST /api/upload
# ══════════════════════════════════════════════════════════════════════════════

@app.post("/api/upload")
async def upload_document(
    background_tasks: BackgroundTasks,
    file: UploadFile = File(...),
    category: str    = Form("unknown"),
):
    if not file.filename.lower().endswith(".pdf"):
        raise HTTPException(status_code=400, detail="Only PDF files are supported.")

    task_id = str(uuid.uuid4())[:8]
    doc_id  = str(uuid.uuid4())[:12]

    dest = UPLOAD_PATH / file.filename
    if dest.exists():
        raise HTTPException(
            status_code=409,
            detail="This document has already been uploaded."
        )

    contents = await file.read()
    with open(dest, "wb") as f:
        f.write(contents)

    try:
        from member1.extractor import is_duplicate
        dup, original = is_duplicate(str(dest))
        if dup:
            dest.unlink(missing_ok=True)
            raise HTTPException(
                status_code=409,
                detail=f"Duplicate document detected. This file has the same content as '{original}' already in the knowledge base."
            )
    except HTTPException:
        raise
    except Exception as e:
        log.warning(f"Duplicate check failed (continuing): {e}")

    file_size  = len(contents)
    page_count = _get_pdf_page_count(dest)

    doc_entry = {
        "id":          doc_id,
        "name":        file.filename,
        "category":    category,
        "size":        _human_size(file_size),
        "size_bytes":  file_size,
        "pages":       page_count,
        "status":      "Processing",
        "uploaded_at": datetime.now().isoformat(),
        "task_id":     task_id,
        "chunks":      0,
    }

    _tasks[task_id] = {
        "task_id":  task_id,
        "filename": file.filename,
        "stage":    "Queued…",
        "progress": 0,
        "done":     False,
        "error":    None,
        "chunks":   0,
    }

    _append_activity(
        f"{file.filename} uploaded by user ({_human_size(file_size)})",
        color="bg-purple-500"
    )

    background_tasks.add_task(_run_pipeline, task_id, str(dest), doc_entry)

    return {
        "task_id":  task_id,
        "doc_id":   doc_id,
        "filename": file.filename,
        "status":   "Processing",
        "message":  "Upload received. Pipeline started.",
    }


# ══════════════════════════════════════════════════════════════════════════════
#  UPLOAD STATUS  —  GET /api/upload/status/{task_id}
# ══════════════════════════════════════════════════════════════════════════════

@app.get("/api/upload/status/{task_id}")
async def upload_status(task_id: str):
    if task_id not in _tasks:
        raise HTTPException(status_code=404, detail="Task not found.")
    return _tasks[task_id]


# ══════════════════════════════════════════════════════════════════════════════
#  QUERY  —  POST /api/query
# ══════════════════════════════════════════════════════════════════════════════

class QueryRequest(BaseModel):
    question:   str
    session_id: Optional[str] = None
    top_k:      Optional[int] = TOP_K_RESULTS


@app.post("/api/query")
async def query(req: QueryRequest):
    if not req.question.strip():
        raise HTTPException(status_code=400, detail="Question cannot be empty.")

    if not _retriever_cache.get("loaded"):
        _ensure_retriever()
        if not _retriever_cache.get("loaded"):
            raise HTTPException(
                status_code=503,
                detail="No documents indexed yet. Please upload a PDF first."
            )

    try:
        from member2.retriever import retrieve
        chunks = retrieve(req.question, k=req.top_k)
    except FileNotFoundError:
        raise HTTPException(
            status_code=503,
            detail="FAISS index not found. Please upload and index a document first."
        )
    except Exception as exc:
        log.error(f"Retrieval error: {exc}", exc_info=True)
        raise HTTPException(status_code=500, detail=f"Retrieval failed: {exc}")

    if not chunks:
        return {
            "answer":     "I couldn't find relevant content for your question in the uploaded documents.",
            "citations":  [],
            "confidence": 0,
            "session_id": req.session_id,
        }

    # Build context for LLM
    context = "\n\n".join(
        f"[Source: {c['source_file']}, page {c['page']}]\n{c['text']}"
        for c in chunks
    )

    prompt = RAG_PROMPT_TEMPLATE.format(context=context, question=req.question)

    # Call Ollama
    try:
        import ollama
        response = ollama.chat(
            model=OLLAMA_MODEL,
            messages=[{"role": "user", "content": prompt}],
            options={
                "num_predict": 1024,
                "temperature": 0.2,
            },
        )
        answer = response.message.content.strip()
    except Exception as exc:
        log.error(f"Ollama error: {exc}", exc_info=True)
        raise HTTPException(
            status_code=503,
            detail=(
                f"LLM unavailable: {exc}. "
                "Make sure Ollama is running: `ollama serve` and model is pulled: `ollama pull llama3.2`"
            )
        )

    avg_score  = sum(c.get("score", 0) for c in chunks) / len(chunks)
    confidence = min(int(avg_score * 100), 99)

    _query_counter["total"]          += 1
    _query_counter["confidence_sum"] += confidence
    _append_activity(
        f"Query answered: \"{req.question[:60]}{'…' if len(req.question) > 60 else ''}\"",
        color="bg-green-500"
    )

    citations = []
    for i, c in enumerate(chunks):
        section   = c.get("section", "")
        full_text = c["text"]
        citations.append({
            "source_file":    c["source_file"],
            "page":           c["page"],
            "section":        section,
            "score":          round(c.get("score", 0), 3),
            "text":           full_text,
            "text_preview":   full_text[:300],
            "confidence":     min(int(c.get("score", 0) * 100), 99),
            "is_table":       c.get("is_table", False),
            "citation_label": f"Source {i+1}",
            "pdf_anchor":     f"#page={c['page']}",
        })

    return {
        "answer":     answer,
        "citations":  citations,
        "confidence": confidence,
        "session_id": req.session_id,
    }


# ══════════════════════════════════════════════════════════════════════════════
#  DOCUMENTS  —  GET /api/documents
# ══════════════════════════════════════════════════════════════════════════════

@app.get("/api/documents")
async def list_documents():
    docs = _load_documents_db()

    result = []
    for d in docs:
        uploaded_at = d.get("uploaded_at", "")
        result.append({
            "id":          d.get("id", ""),
            "name":        d.get("name", ""),
            "category":    d.get("category", "unknown"),
            "size":        d.get("size", "—"),
            "pages":       d.get("pages", 0),
            "status":      d.get("status", "Unknown"),
            "uploaded_at": uploaded_at,
            "date":        _format_time_ago(uploaded_at) if uploaded_at else "—",
            "chunks":      d.get("chunks", 0),
            "task_id":     d.get("task_id", ""),
        })

    result.sort(key=lambda x: x.get("uploaded_at", ""), reverse=True)
    return result


# ══════════════════════════════════════════════════════════════════════════════
#  VIEW DOCUMENT  —  GET /api/documents/{filename}/view
# ══════════════════════════════════════════════════════════════════════════════

@app.get("/api/documents/{filename}/view")
async def view_document(filename: str):
    """
    Serve the raw PDF file so the browser can open it.
    The frontend appends #page=N so the browser PDF viewer
    jumps directly to the cited page.
    """
    pdf_path = UPLOAD_PATH / filename
    if not pdf_path.exists():
        raise HTTPException(status_code=404, detail=f"File '{filename}' not found.")
    return FileResponse(
        path=str(pdf_path),
        media_type="application/pdf",
        filename=filename,
    )


# ══════════════════════════════════════════════════════════════════════════════
#  DELETE DOCUMENT  —  DELETE /api/documents/{doc_id}
# ══════════════════════════════════════════════════════════════════════════════

@app.delete("/api/documents/{doc_id}")
async def delete_document(doc_id: str):
    docs   = _load_documents_db()
    target = next((d for d in docs if d.get("id") == doc_id), None)

    if not target:
        raise HTTPException(status_code=404, detail="Document not found.")

    filename = target["name"]
    docs = [d for d in docs if d.get("id") != doc_id]
    _save_documents_db(docs)

    pdf_path = UPLOAD_PATH / filename
    if pdf_path.exists():
        pdf_path.unlink()

    with _faiss_lock:
        meta_file = FAISS_PATH / "metadata.json"
        if meta_file.exists():
            with open(meta_file, encoding="utf-8") as f:
                all_chunks = json.load(f)

            remaining = [c for c in all_chunks if c.get("source_file") != filename]

            if remaining:
                try:
                    from member2.vector_store import build_and_persist_faiss_index
                    build_and_persist_faiss_index(remaining)
                    try:
                        from member2.retriever import clear_cache
                        clear_cache()
                    except ImportError:
                        pass
                    log.info(f"FAISS rebuilt after deleting {filename} ({len(remaining)} chunks remain)")
                except Exception as exc:
                    log.error(f"FAISS rebuild failed: {exc}")
            else:
                for f in FAISS_PATH.iterdir():
                    f.unlink()
                _retriever_cache["loaded"] = False
                log.info("All documents deleted — FAISS index cleared.")

    _append_activity(f"{filename} deleted from knowledge base", color="bg-red-500")
    return {"success": True, "deleted": filename}


# ══════════════════════════════════════════════════════════════════════════════
#  STATS  —  GET /api/stats
# ══════════════════════════════════════════════════════════════════════════════

@app.get("/api/stats")
async def get_stats():
    docs         = _load_documents_db()
    total_docs   = len(docs)
    indexed_docs = sum(1 for d in docs if d.get("status") == "Indexed")
    total_q      = _query_counter["total"]
    avg_conf     = (
        int(_query_counter["confidence_sum"] / total_q)
        if total_q > 0 else 0
    )

    return {
        "total_documents":   total_docs,
        "indexed_documents": indexed_docs,
        "total_queries":     total_q,
        "avg_confidence":    avg_conf,
        "active_users":      1,
        "faiss_ready":       _retriever_cache.get("loaded", False),
    }


# ══════════════════════════════════════════════════════════════════════════════
#  ACTIVITY  —  GET /api/activity
# ══════════════════════════════════════════════════════════════════════════════

@app.get("/api/activity")
async def get_activity():
    events = _load_activity()
    return [
        {
            "text":  e["text"],
            "time":  _format_time_ago(e.get("time", "")),
            "color": e.get("color", "bg-purple-500"),
        }
        for e in events[:10]
    ]


# ══════════════════════════════════════════════════════════════════════════════
#  HEALTH  —  GET /api/health
# ══════════════════════════════════════════════════════════════════════════════

@app.get("/api/health")
async def health():
    return {
        "status":      "ok",
        "faiss_ready": _retriever_cache.get("loaded", False),
        "ollama_url":  OLLAMA_BASE_URL,
        "model":       OLLAMA_MODEL,
    }


# ══════════════════════════════════════════════════════════════════════════════
#  ENTRY POINT
# ══════════════════════════════════════════════════════════════════════════════

if __name__ == "__main__":
    import uvicorn
    uvicorn.run("api:app", host="0.0.0.0", port=8000, reload=True)