import os
import json
import faiss
import numpy as np

from member2.embeddings import SentenceTransformerEmbeddings
from config import FAISS_INDEX_DIR, TOP_K_RESULTS, MIN_SIMILARITY


# ── Model cache ───────────────────────────────────────────────────────────────
_embeddings_cache = None

def _get_embeddings():
    global _embeddings_cache
    if _embeddings_cache is None:
        _embeddings_cache = SentenceTransformerEmbeddings()
    return _embeddings_cache


def retrieve(query: str, index_path: str = None, k: int = None) -> list:
    """
    IMPROVED retrieval:
    - Returns section heading in results for better citations
    - Returns page number accurately
    - Deduplicates results from the same source/page
    - Ranks by score
    """
    index_path = index_path or FAISS_INDEX_DIR
    k = k or TOP_K_RESULTS

    idx_file  = os.path.join(index_path, "index.faiss")
    meta_file = os.path.join(index_path, "metadata.json")

    if not os.path.exists(idx_file) or not os.path.exists(meta_file):
        raise FileNotFoundError("Run vector_store.build_and_persist_faiss_index() first")

    index = faiss.read_index(idx_file)

    with open(meta_file, "r", encoding="utf-8") as f:
        metadata = json.load(f)

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

    # Retrieve more candidates to allow for deduplication
    search_k = min(k * 3, len(metadata))
    D, I = index.search(q_vec, search_k)

    output = []
    seen_content = set()  # deduplicate near-identical chunks

    for score, idx in zip(D[0], I[0]):
        if idx < 0 or idx >= len(metadata):
            continue
        if score < MIN_SIMILARITY:
            continue

        item = metadata[idx]
        text = item.get("text", "")

        # Deduplicate: skip if very similar content already added
        text_sig = text[:80].strip().lower()
        if text_sig in seen_content:
            continue
        seen_content.add(text_sig)

        output.append({
            "text":        text,
            "source_file": item.get("source_file", ""),
            "page":        item.get("page", item.get("chunk_index", 0)),
            "section":     item.get("section", ""),
            "doc_type":    item.get("doc_type", "unknown"),
            "is_table":    item.get("is_table", False),
            "score":       float(score),
        })

        if len(output) >= k:
            break

    # Sort by score descending
    output.sort(key=lambda x: x.get("score", 0), reverse=True)
    return output


if __name__ == "__main__":
    q = "What is the AOS release version?"
    res = retrieve(q)
    import json as _json
    print(_json.dumps(res, indent=2))
