import os
import json
import faiss
import numpy as np

from member2.embeddings import SentenceTransformerEmbeddings
from config import FAISS_INDEX_DIR, TOP_K_RESULTS, MIN_SIMILARITY


# ───────────────────────────────────────────────────────────────
# Model & FAISS cache
# ───────────────────────────────────────────────────────────────
_embeddings_cache = None
_index_cache = None
_metadata_cache = None


def _get_embeddings():
    global _embeddings_cache

    if _embeddings_cache is None:
        _embeddings_cache = SentenceTransformerEmbeddings()

    return _embeddings_cache

def clear_cache():
    """Clear cached FAISS index and metadata."""
    global _index_cache, _metadata_cache

    _index_cache = None
    _metadata_cache = None


def retrieve(query: str, index_path: str = None, k: int = None, doc_files: list[str] = None) -> list:
    """
    Retrieve the most relevant chunks from FAISS, optionally filtering by specific source files.
    """

    global _index_cache, _metadata_cache

    index_path = index_path or FAISS_INDEX_DIR
    k = k or TOP_K_RESULTS

    idx_file = os.path.join(index_path, "index.faiss")
    meta_file = os.path.join(index_path, "metadata.json")

    if not os.path.exists(idx_file) or not os.path.exists(meta_file):
        raise FileNotFoundError(
            "Run vector_store.build_and_persist_faiss_index() first"
        )

    # Load FAISS index and metadata only once
    if _index_cache is None or _metadata_cache is None:
        _index_cache = faiss.read_index(idx_file)

        with open(meta_file, "r", encoding="utf-8") as f:
            _metadata_cache = json.load(f)

    index = _index_cache
    metadata = _metadata_cache

    embeddings = _get_embeddings()

    q_vec = np.array(
        embeddings.embed_query(query),
        dtype="float32"
    ).reshape(1, -1)

    # Normalize query vector
    q_norm = np.linalg.norm(q_vec)

    if q_norm == 0:
        q_norm = 1.0

    q_vec = q_vec / q_norm

    # If filtering by specific files, query the entire index to find matches,
    # otherwise query standard extra results for deduplication.
    if doc_files:
        search_k = len(metadata)
    else:
        search_k = min(k * 3, len(metadata))

    D, I = index.search(q_vec, search_k)

    output = []
    seen_content = set()
    for score, idx in zip(D[0], I[0]):
        if idx < 0 or idx >= len(metadata):
            continue

        if score < MIN_SIMILARITY:
            continue

        item = metadata[idx]
        
        # Apply document filter if specified
        if doc_files and item.get("source_file") not in doc_files:
            continue

        text = item.get("text", "")

        # Remove duplicate chunks
        text_sig = text[:80].strip().lower()

        if text_sig in seen_content:
            continue

        seen_content.add(text_sig)

        output.append({
            "text": text,
            "source_file": item.get("source_file", ""),
            "page": item.get("page", item.get("chunk_index", 0)),
            "section": item.get("section", ""),
            "doc_type": item.get("doc_type", "unknown"),
            "is_table": item.get("is_table", False),
            "score": float(score),
        })

        if len(output) >= k:
            break

    # Sort by similarity score
    output.sort(key=lambda x: x["score"], reverse=True)

    return output


if __name__ == "__main__":
    q = "What is the AOS release version?"

    results = retrieve(q)

    import json as _json
    print(_json.dumps(results, indent=2))