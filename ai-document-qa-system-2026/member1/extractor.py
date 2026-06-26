"""
member1/extractor.py — Document extraction and chunking pipeline
Uses PyMuPDF for PDF (fast, reliable).
Docling removed — was causing install/runtime failures.
"""

import os
import re
import json
import hashlib
import logging
from pathlib import Path
from datetime import datetime

# ── LangChain splitters ───────────────────────────────────────────────────────
from langchain_text_splitters import (
    RecursiveCharacterTextSplitter,
    MarkdownHeaderTextSplitter,
)
from langchain_core.documents import Document

# ── Language detection (optional) ────────────────────────────────────────────
try:
    from langdetect import detect as _detect_lang
    _LANGDETECT_OK = True
except ImportError:
    _LANGDETECT_OK = False

# ── Shared config ─────────────────────────────────────────────────────────────
import sys
sys.path.insert(0, str(Path(__file__).resolve().parent.parent))
from config import (
    SUPPORTED_EXTENSIONS, DOC_TYPE_MAP, CHUNK_CONFIG, CHUNKS_JSON_PATH
)

log = logging.getLogger(__name__)

_MD_HEADERS = [("#", "h1"), ("##", "h2"), ("###", "h3")]

_NOISE_RE = [
    (re.compile(r"Page\s+\d+\s+of\s+\d+", re.I), ""),
    (re.compile(r"©\s*\d{4}[^\n]*",        re.I), ""),
    (re.compile(r"Confidential[^\n]*",      re.I), ""),
    (re.compile(r"Proprietary[^\n]*",       re.I), ""),
    (re.compile(r"\ufb01"),                        "fi"),
    (re.compile(r"\ufb02"),                        "fl"),
    (re.compile(r"[\u2018\u2019]"),                "'"),
    (re.compile(r"[\u201c\u201d]"),                '"'),
    (re.compile(r"[\u2013\u2014]"),                "-"),
    (re.compile(r"\u00a0"),                        " "),
    (re.compile(r"\x00"),                          ""),
    (re.compile(r"\n{3,}"),                        "\n\n"),
    (re.compile(r"[ \t]{2,}"),                     " "),
]


# ══════════════════════════════════════════════════════════════════════════════
#  UTILITIES
# ══════════════════════════════════════════════════════════════════════════════

def detect_doc_type(filename: str) -> str:
    name = filename.lower()
    for dtype, keywords in DOC_TYPE_MAP.items():
        if any(k in name for k in keywords):
            return dtype
    return "unknown"


def detect_language(text: str) -> str:
    if not _LANGDETECT_OK or len(text.strip()) < 40:
        return "unknown"
    try:
        return _detect_lang(text)
    except Exception:
        return "unknown"


def chunk_id(text: str, source: str, idx: int) -> str:
    return hashlib.md5(f"{source}::{idx}::{text[:100]}".encode()).hexdigest()[:14]


def clean_text(text: str) -> str:
    for pattern, replacement in _NOISE_RE:
        text = pattern.sub(replacement, text)
    return text.strip()


# ══════════════════════════════════════════════════════════════════════════════
#  EXTRACTION — PyMuPDF for PDF (page-aware, fast, no ML models needed)
# ══════════════════════════════════════════════════════════════════════════════

def extract_pdf(filepath: str) -> dict:
    """
    Extract PDF using PyMuPDF (fitz).
    Returns page-aware segments with real page numbers.
    """
    import fitz  # PyMuPDF

    p        = Path(filepath)
    filename = p.name
    doc_type = detect_doc_type(filename)

    log.info(f"Extracting PDF: {filename}")

    page_segments = []
    tables        = []
    current_section = ""

    doc = fitz.open(str(p))
    total_pages = len(doc)
    log.info(f"  {filename}: {total_pages} pages")

    for page_num, page in enumerate(doc, start=1):
        text = page.get_text("text")
        if not text.strip():
            continue

        text = clean_text(text)
        lines = text.split("\n")

        for line in lines:
            line = line.strip()
            # Detect headings: short lines that look like titles
            if line and len(line) < 100 and line.isupper():
                current_section = line
            elif line and len(line) < 80 and line.endswith(":"):
                current_section = line.rstrip(":")

        page_segments.append({
            "text":    text,
            "page":    page_num,
            "section": current_section,
        })

    doc.close()

    full_text = "\n\n".join(s["text"] for s in page_segments)
    log.info(f"  ✓ {filename} — {len(full_text.split())} words, {total_pages} pages")

    return {
        "markdown":      full_text,
        "page_segments": page_segments,
        "tables":        tables,
        "metadata": {
            "source":       filename,
            "filepath":     str(p.resolve()),
            "doc_type":     doc_type,
            "headings":     [],
            "table_count":  0,
            "extracted_at": datetime.now().isoformat(),
        },
    }


# ══════════════════════════════════════════════════════════════════════════════
#  MAIN EXTRACTION ROUTER
# ══════════════════════════════════════════════════════════════════════════════

def extract_file(filepath: str) -> dict:
    """
    Route to the correct extractor based on file extension.
    All extractors return the same dict shape:
      {markdown, page_segments, tables, metadata}
    """
    ext = Path(filepath).suffix.lower()

    if ext == ".pdf":
        return extract_pdf(filepath)
    else:
        raise ValueError(
            f"Unsupported file type: {ext}. "
            f"Supported: {sorted(SUPPORTED_EXTENSIONS)}"
        )


# ══════════════════════════════════════════════════════════════════════════════
#  CHUNKING — page-aware
# ══════════════════════════════════════════════════════════════════════════════

def chunk_extraction(extracted: dict) -> list[Document]:
    """
    Chunk extracted content into LangChain Documents.
    Preserves real page numbers and section headings per chunk.
    """
    meta          = extracted["metadata"]
    cfg           = CHUNK_CONFIG.get(meta["doc_type"], CHUNK_CONFIG["unknown"])
    docs: list[Document] = []
    seen: set[str]       = set()

    char_splitter = RecursiveCharacterTextSplitter(
        chunk_size=cfg["chunk_size"],
        chunk_overlap=cfg["chunk_overlap"],
        separators=["\n\n", "\n", ". ", "! ", "? ", " ", ""],
    )

    page_segments = extracted.get("page_segments", [])

    if page_segments:
        # ── Page-aware path (PDF via PyMuPDF) ────────────────────────────────
        for seg in page_segments:
            seg_text    = seg.get("text", "").strip()
            seg_page    = seg.get("page", 1)
            seg_section = seg.get("section", "")

            if len(seg_text.split()) < 5:
                continue

            sub_chunks = (
                char_splitter.split_text(seg_text)
                if len(seg_text) > cfg["chunk_size"]
                else [seg_text]
            )

            for text in sub_chunks:
                text = text.strip()
                if len(text.split()) < 8:
                    continue
                h = hashlib.md5(text.encode()).hexdigest()
                if h in seen:
                    continue
                seen.add(h)

                idx = len(docs)
                docs.append(Document(
                    page_content=text,
                    metadata={
                        "chunk_id":     chunk_id(text, meta["source"], idx),
                        "source":       meta["source"],
                        "filepath":     meta["filepath"],
                        "doc_type":     meta["doc_type"],
                        "section":      seg_section,
                        "page":         seg_page,
                        "language":     detect_language(text),
                        "chunk_index":  idx,
                        "word_count":   len(text.split()),
                        "is_table":     False,
                        "processed_at": meta["extracted_at"],
                    }
                ))
    else:
        # ── Fallback: markdown header splitting ───────────────────────────────
        try:
            header_splitter = MarkdownHeaderTextSplitter(
                headers_to_split_on=_MD_HEADERS, strip_headers=False
            )
            header_chunks = header_splitter.split_text(extracted["markdown"])
        except Exception:
            header_chunks = [Document(page_content=extracted["markdown"], metadata={})]

        for h_chunk in header_chunks:
            for text in char_splitter.split_text(h_chunk.page_content):
                text = text.strip()
                if len(text.split()) < 8:
                    continue
                h = hashlib.md5(text.encode()).hexdigest()
                if h in seen:
                    continue
                seen.add(h)

                idx     = len(docs)
                section = (
                    h_chunk.metadata.get("h1")
                    or h_chunk.metadata.get("h2")
                    or h_chunk.metadata.get("h3", "")
                )
                docs.append(Document(
                    page_content=text,
                    metadata={
                        "chunk_id":     chunk_id(text, meta["source"], idx),
                        "source":       meta["source"],
                        "filepath":     meta["filepath"],
                        "doc_type":     meta["doc_type"],
                        "section":      section,
                        "page":         idx + 1,
                        "language":     detect_language(text),
                        "chunk_index":  idx,
                        "word_count":   len(text.split()),
                        "is_table":     False,
                        "processed_at": meta["extracted_at"],
                    }
                ))

    # ── Tables ────────────────────────────────────────────────────────────────
    for tbl in extracted.get("tables", []):
        text = tbl["text"].strip()
        if not text or len(text.split()) < 4:
            continue
        h = hashlib.md5(text.encode()).hexdigest()
        if h in seen:
            continue
        seen.add(h)
        idx = len(docs)
        docs.append(Document(
            page_content=text,
            metadata={
                "chunk_id":     chunk_id(text, meta["source"], idx),
                "source":       meta["source"],
                "filepath":     meta["filepath"],
                "doc_type":     meta["doc_type"],
                "section":      f"Table {tbl['table_index'] + 1}",
                "page":         tbl.get("page", 1),
                "language":     detect_language(text),
                "chunk_index":  idx,
                "word_count":   len(text.split()),
                "is_table":     True,
                "processed_at": meta["extracted_at"],
            }
        ))

    log.info(f"  Chunked {meta['source']} → {len(docs)} chunks")
    return docs


def chunk_all_extractions(extractions: list[dict]) -> list[Document]:
    all_docs: list[Document] = []
    for ex in extractions:
        all_docs.extend(chunk_extraction(ex))
    log.info(f"Total chunks: {len(all_docs)}")
    return all_docs


# ══════════════════════════════════════════════════════════════════════════════
#  SAVE — handoff to member2
# ══════════════════════════════════════════════════════════════════════════════

def save_chunks_json(documents: list[Document], path: str = CHUNKS_JSON_PATH) -> None:
    Path(path).parent.mkdir(parents=True, exist_ok=True)
    payload = [
        {
            "text":        d.page_content,
            "page":        d.metadata.get("page", d.metadata.get("chunk_index", 0)),
            "source_file": d.metadata.get("source", ""),
            "section":     d.metadata.get("section", ""),
            "doc_type":    d.metadata.get("doc_type", "unknown"),
            "is_table":    d.metadata.get("is_table", False),
        }
        for d in documents
    ]
    with open(path, "w", encoding="utf-8") as f:
        json.dump(payload, f, indent=2, ensure_ascii=False)
    log.info(f"Chunks saved → {path}  ({len(payload)} chunks)")


# ══════════════════════════════════════════════════════════════════════════════
#  PUBLIC API
# ══════════════════════════════════════════════════════════════════════════════

def process_documents(file_paths: list[str]) -> list[Document]:
    """
    Full pipeline: extract → chunk → save.
    Called by api.py background task.
    Returns list[Document] ready for member2 FAISS indexing.
    """
    extractions = []
    for fp in file_paths:
        try:
            extractions.append(extract_file(fp))
        except Exception as e:
            log.error(f"Failed to extract {fp}: {e}")

    if not extractions:
        return []

    documents = chunk_all_extractions(extractions)
    save_chunks_json(documents)
    return documents


# ══════════════════════════════════════════════════════════════════════════════
#  CLI
# ══════════════════════════════════════════════════════════════════════════════

if __name__ == "__main__":
    import argparse
    logging.basicConfig(level=logging.INFO, format="%(asctime)s [%(levelname)s] %(message)s")

    parser = argparse.ArgumentParser(description="Member 1 — Extract & Chunk Documents")
    parser.add_argument("--input", "-i", required=True, help="PDF file or directory")
    args = parser.parse_args()

    docs = process_documents(
        [str(f) for f in Path(args.input).rglob("*") if f.suffix.lower() in SUPPORTED_EXTENSIONS]
        if Path(args.input).is_dir()
        else [args.input]
    )
    print(f"\n✅ Done — {len(docs)} chunks ready in {CHUNKS_JSON_PATH}")