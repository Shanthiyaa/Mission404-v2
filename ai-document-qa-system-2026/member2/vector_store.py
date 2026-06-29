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
    Builds and saves a FAISS index from document chunks.
    """

    index_path = index_path or FAISS_INDEX_DIR

    # Filter empty chunks
    chunks = [c for c in chunks if c.get("text", "").strip()]
    if not chunks:
        raise ValueError("No valid chunks to index")

    texts = [c["text"] for c in chunks]

    embeddings = SentenceTransformerEmbeddings()
    vectors = np.array(
        embeddings.embed_documents(texts),
        dtype="float32"
    )

    if vectors.size == 0:
        raise ValueError("No vectors were generated from chunks")

    # Normalize for cosine similarity
    norms = np.linalg.norm(vectors, axis=1, keepdims=True)
    norms[norms == 0] = 1.0
    vectors = vectors / norms

    dim = vectors.shape[1]

    os.makedirs(index_path, exist_ok=True)

    index_file = os.path.join(index_path, "index.faiss")
    metadata_file = os.path.join(index_path, "metadata.json")

    # Create or load FAISS index
    index = faiss.IndexFlatIP(dim)
    index.add(vectors)

    # Save FAISS index
    faiss.write_index(index, index_file)

    # Save metadata
    with open(metadata_file, "w", encoding="utf-8") as f:
        json.dump(chunks, f, ensure_ascii=False, indent=2)

    print(f"FAISS index saved: {len(chunks)} chunks → {index_path}")


def build_from_chunks_json(
    chunks_json_path: str = None,
    index_path: str = None
) -> None:

    chunks_json_path = chunks_json_path or CHUNKS_JSON_PATH
    index_path = index_path or FAISS_INDEX_DIR

    if not os.path.exists(chunks_json_path):
        raise FileNotFoundError(
            f"Chunks JSON not found: {chunks_json_path}"
        )

    with open(chunks_json_path, "r", encoding="utf-8") as f:
        chunks = json.load(f)

        build_and_persist_faiss_index(
        chunks,
        index_path
    )
def add_to_faiss_index(chunks: List[Dict], index_path: str = None):
    """
    Add only NEW chunks to an existing FAISS index.
    Does not rebuild the whole index.
    """
    index_path = index_path or FAISS_INDEX_DIR
    os.makedirs(index_path, exist_ok=True)

    # Remove empty chunks
    chunks = [c for c in chunks if c.get("text", "").strip()]
    if not chunks:
        return

    texts = [c["text"] for c in chunks]

    # Generate embeddings only for the new chunks
    embeddings = SentenceTransformerEmbeddings()
    vectors = np.array(
        embeddings.embed_documents(texts),
        dtype="float32"
    )

    # Normalize vectors
    norms = np.linalg.norm(vectors, axis=1, keepdims=True)
    norms[norms == 0] = 1.0
    vectors = vectors / norms

    dim = vectors.shape[1]

    index_file = os.path.join(index_path, "index.faiss")
    metadata_file = os.path.join(index_path, "metadata.json")

    # Load existing index or create a new one
    if os.path.exists(index_file):
        index = faiss.read_index(index_file)
    else:
        index = faiss.IndexFlatIP(dim)

    # Add only the new vectors
    index.add(vectors)

    # Save updated FAISS index
    faiss.write_index(index, index_file)

    # Load existing metadata
    metadata = []
    if os.path.exists(metadata_file):
        with open(metadata_file, "r", encoding="utf-8") as f:
            metadata = json.load(f)

    # Append new chunk metadata
    metadata.extend(chunks)

    # Save updated metadata
    with open(metadata_file, "w", encoding="utf-8") as f:
        json.dump(metadata, f, ensure_ascii=False, indent=2)

    print(f"Added {len(chunks)} new chunks to FAISS.")