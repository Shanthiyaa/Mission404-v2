import faiss
import json
import numpy as np
import os
from typing import List, Dict

from member2.embeddings import SentenceTransformerEmbeddings
from config import FAISS_INDEX_DIR, CHUNKS_JSON_PATH


def build_and_persist_faiss_index(
    chunks: List[Dict],
    index_path: str = None
) -> None:
    """
    IMPROVED:
    - Uses pre-normalized embeddings (faster cosine similarity)
    - Saves full metadata including section and page
    - Validates chunks before indexing
    """
    index_path = index_path or FAISS_INDEX_DIR

    # Filter out empty chunks
    chunks = [c for c in chunks if c.get("text", "").strip()]
    if not chunks:
        raise ValueError("No valid chunks to index")

    texts = [c["text"] for c in chunks]

    embeddings = SentenceTransformerEmbeddings()
    # embed_documents already normalizes if normalize_embeddings=True
    vectors = np.array(embeddings.embed_documents(texts)).astype("float32")

    if vectors.size == 0:
        raise ValueError("No vectors were generated from chunks")

    # Normalize vectors for cosine similarity (IndexFlatIP)
    norms = np.linalg.norm(vectors, axis=1, keepdims=True)
    norms[norms == 0] = 1.0
    vectors = vectors / norms

    dim = vectors.shape[1]
    index = faiss.IndexFlatIP(dim)
    index.add(vectors)

    os.makedirs(index_path, exist_ok=True)

    faiss.write_index(index, os.path.join(index_path, "index.faiss"))

    # IMPROVED: save full metadata with section info for citations
    with open(os.path.join(index_path, "metadata.json"), "w", encoding="utf-8") as f:
        json.dump(chunks, f, ensure_ascii=False, indent=2)

    print(f"FAISS index saved: {len(chunks)} chunks → {index_path}")


def build_from_chunks_json(chunks_json_path: str = None, index_path: str = None) -> None:
    chunks_json_path = chunks_json_path or CHUNKS_JSON_PATH
    index_path = index_path or FAISS_INDEX_DIR

    if not os.path.exists(chunks_json_path):
        raise FileNotFoundError(f"Chunks JSON not found: {chunks_json_path}")

    with open(chunks_json_path, "r", encoding="utf-8") as f:
        chunks = json.load(f)

    build_and_persist_faiss_index(chunks, index_path=index_path)
