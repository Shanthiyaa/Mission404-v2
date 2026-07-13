import logging
from typing import List
import numpy as np
from sentence_transformers import SentenceTransformer

from config import EMBEDDING_MODEL, EMBEDDING_DEVICE, EMBEDDING_BATCH_SIZE

log = logging.getLogger(__name__)

def _resolve_device(device_setting: str) -> str:
    """Resolve the execution device dynamically.
    
    If 'cuda' is selected but not available via PyTorch, falls back to 'cpu'.
    """
    if device_setting == "cuda":
        try:
            import torch
            if torch.cuda.is_available():
                log.info("CUDA is available. Using GPU for sentence embeddings.")
                return "cuda"
            else:
                log.warning("CUDA was requested/configured for embeddings, but is not available. Falling back to 'cpu'.")
                return "cpu"
        except ImportError:
            log.warning("PyTorch import failed. Falling back to 'cpu' for embeddings.")
            return "cpu"
    return device_setting

ACTUAL_DEVICE = _resolve_device(EMBEDDING_DEVICE)

# ✅ LOAD MODEL ONLY ONCE (GLOBAL SINGLETON)
_model = SentenceTransformer(EMBEDDING_MODEL, device=ACTUAL_DEVICE)


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