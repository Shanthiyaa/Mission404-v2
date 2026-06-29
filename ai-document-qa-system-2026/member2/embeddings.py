import os
from typing import List
import numpy as np
from sentence_transformers import SentenceTransformer

from config import EMBEDDING_MODEL, EMBEDDING_DEVICE, EMBEDDING_BATCH_SIZE


# ✅ LOAD MODEL ONLY ONCE (GLOBAL SINGLETON)
_model = SentenceTransformer(EMBEDDING_MODEL, device=EMBEDDING_DEVICE)


class SentenceTransformerEmbeddings:
    """Fast embedding wrapper using singleton model"""

    def __init__(self):
        self.model = _model
        self.batch_size = EMBEDDING_BATCH_SIZE

    def embed_documents(self, texts: List[str]) -> List[List[float]]:
        return self.model.encode(
            texts,
            batch_size=self.batch_size,
            show_progress_bar=len(texts) > 50,
            normalize_embeddings=True,
        ).tolist()

    def embed_query(self, text: str) -> List[float]:
        return self.model.encode(
            [text],
            show_progress_bar=False,
            normalize_embeddings=True,
        )[0].tolist()