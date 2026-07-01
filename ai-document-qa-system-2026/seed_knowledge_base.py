"""
seed_knowledge_base.py — Pre-load company documents into the knowledge base.

Run ONCE at deploy time (or whenever the document set changes):
    python seed_knowledge_base.py --dir ./company_docs

This script:
  1. Scans the given folder for PDFs (and optionally .docx/.pptx).
  2. Runs the same extraction + FAISS pipeline used by the upload API.
  3. Registers each document in data/documents.json with category auto-detected
     from the filename (uses the same DOC_TYPE_MAP as config.py).
  4. Is idempotent — already-indexed files are skipped (duplicate detection).

After running, restart the FastAPI server. Normal users can query immediately.
"""

import argparse
import json
import logging
import sys
import uuid
from datetime import datetime
from pathlib import Path

logging.basicConfig(level=logging.INFO, format="%(asctime)s [%(levelname)s] %(message)s")
log = logging.getLogger("seed")

# ── Config ────────────────────────────────────────────────────────────────────
from config import (
    UPLOAD_DIR,
    FAISS_INDEX_DIR,
    SUPPORTED_EXTENSIONS,
    DOC_TYPE_MAP,
)

UPLOAD_PATH  = Path(UPLOAD_DIR)
FAISS_PATH   = Path(FAISS_INDEX_DIR)
DOCUMENTS_DB = Path("./data/documents.json")

UPLOAD_PATH.mkdir(parents=True, exist_ok=True)
FAISS_PATH.mkdir(parents=True, exist_ok=True)
Path("./data").mkdir(parents=True, exist_ok=True)


# ── Helpers ───────────────────────────────────────────────────────────────────

def _load_documents_db() -> list[dict]:
    if DOCUMENTS_DB.exists():
        with open(DOCUMENTS_DB, encoding="utf-8") as f:
            return json.load(f)
    return []


def _save_documents_db(docs: list[dict]) -> None:
    with open(DOCUMENTS_DB, "w", encoding="utf-8") as f:
        json.dump(docs, f, indent=2, ensure_ascii=False)


def _human_size(path: Path) -> str:
    b = path.stat().st_size
    for unit in ["B", "KB", "MB", "GB"]:
        if b < 1024:
            return f"{b:.1f} {unit}"
        b /= 1024
    return f"{b:.1f} GB"


def _get_pdf_page_count(filepath: Path) -> int:
    try:
        import re
        data = filepath.read_bytes()
        matches = re.findall(rb"/Type\s*/Page[^s]", data)
        return max(len(matches), 1)
    except Exception:
        return 1


def _detect_category(filename: str) -> str:
    name_lower = filename.lower()
    for cat, keywords in DOC_TYPE_MAP.items():
        if any(kw in name_lower for kw in keywords):
            return cat
    return "unknown"


def _already_indexed(filename: str, docs_db: list[dict]) -> bool:
    return any(d["name"] == filename and d.get("status") == "Indexed" for d in docs_db)


# ── Main seed logic ───────────────────────────────────────────────────────────

def seed(source_dir: Path, force: bool = False) -> None:
    if not source_dir.exists():
        log.error(f"Source directory not found: {source_dir}")
        sys.exit(1)

    # Gather files
    files = [
        p for p in source_dir.rglob("*")
        if p.suffix.lower() in SUPPORTED_EXTENSIONS and p.is_file()
    ]

    if not files:
        log.warning(f"No supported files found in {source_dir}. Supported: {SUPPORTED_EXTENSIONS}")
        sys.exit(0)

    log.info(f"Found {len(files)} file(s) to seed.")

    docs_db = _load_documents_db()

    # Import pipeline modules once
    try:
        from member1.extractor import process_documents
        from member2.vector_store import build_and_persist_faiss_index
    except ImportError as e:
        log.error(f"Cannot import pipeline modules: {e}")
        log.error("Make sure you are running from the project root with dependencies installed.")
        sys.exit(1)

    all_chunks: list[dict] = []

    # Load existing FAISS chunks so we merge, not overwrite
    meta_file = FAISS_PATH / "metadata.json"
    if meta_file.exists():
        try:
            with open(meta_file, encoding="utf-8") as f:
                all_chunks = json.load(f)
            log.info(f"Loaded {len(all_chunks)} existing chunks from FAISS metadata.")
        except Exception as e:
            log.warning(f"Could not load existing FAISS metadata: {e}. Starting fresh.")
            all_chunks = []

    seeded_count = 0

    for file_path in files:
        filename = file_path.name

        if not force and _already_indexed(filename, docs_db):
            log.info(f"  SKIP (already indexed): {filename}")
            continue

        log.info(f"  Processing: {filename}")

        # Copy to upload dir (mirrors the upload endpoint behaviour)
        dest = UPLOAD_PATH / filename
        if not dest.exists() or force:
            import shutil
            shutil.copy2(file_path, dest)

        try:
            documents = process_documents([str(dest)])
        except Exception as e:
            log.error(f"  Extraction failed for {filename}: {e}")
            continue

        if not documents:
            log.warning(f"  No content extracted from {filename}. Skipping.")
            continue

        log.info(f"  Extracted {len(documents)} chunks from {filename}.")

        category = _detect_category(filename)

        # Remove any stale chunks for this file (handles re-seed with --force)
        all_chunks = [c for c in all_chunks if c.get("source_file") != filename]

        # Build new chunk dicts
        new_chunks = [
            {
                "chunk_id":   f"{filename}__p{d.metadata.get('page',0)}__c{i}",
                "text":       d.page_content,
                "page":       d.metadata.get("page", d.metadata.get("chunk_index", 0)),
                "source_file": d.metadata.get("source", filename),
                "section":    d.metadata.get("section", ""),
                "doc_type":   d.metadata.get("doc_type", category),
                "is_table":   d.metadata.get("is_table", False),
                "word_count": d.metadata.get("word_count", 0),
            }
            for i, d in enumerate(documents)
        ]
        all_chunks.extend(new_chunks)

        # Register in documents DB
        docs_db = [d for d in docs_db if d["name"] != filename]  # remove old entry
        pages = _get_pdf_page_count(dest)
        docs_db.append({
            "id":          str(uuid.uuid4())[:12],
            "name":        filename,
            "category":    category,
            "size":        _human_size(dest),
            "size_bytes":  dest.stat().st_size,
            "pages":       pages,
            "status":      "Indexed",
            "uploaded_at": datetime.now().isoformat(),
            "task_id":     "seed",
            "chunks":      len(new_chunks),
            "seeded":      True,
        })

        seeded_count += 1
        log.info(f"  ✅ {filename} — {len(new_chunks)} chunks, category={category}, pages={pages}")

    if seeded_count == 0:
        log.info("Nothing new to seed. Use --force to re-index existing files.")
        return

    # Rebuild FAISS with merged chunks
    log.info(f"Building FAISS index with {len(all_chunks)} total chunks…")
    try:
        build_and_persist_faiss_index(all_chunks)
        log.info("FAISS index built successfully.")
    except Exception as e:
        log.error(f"FAISS build failed: {e}")
        sys.exit(1)

    _save_documents_db(docs_db)
    log.info(f"\n✅ Seed complete — {seeded_count} document(s) indexed.")
    log.info("Restart the API server. Users can now query without uploading.")


# ── CLI ───────────────────────────────────────────────────────────────────────

if __name__ == "__main__":
    parser = argparse.ArgumentParser(
        description="Pre-load company documents into the ALE knowledge base."
    )
    parser.add_argument(
        "--dir",
        type=Path,
        default=Path("./company_docs"),
        help="Folder containing PDFs / DOCX / PPTX to seed (default: ./company_docs)",
    )
    parser.add_argument(
        "--force",
        action="store_true",
        help="Re-index files even if they are already in the knowledge base.",
    )
    args = parser.parse_args()
    seed(args.dir, force=args.force)
