import faiss
import numpy as np

class VectorStore:
    def __init__(self, dimension: int):
        self.index = faiss.IndexFlatL2(dimension)
        self.metadata = []

    def add(self, vectors: np.ndarray, metadata_list: list) -> None:
        self.index.add(vectors.astype("float32"))
        self.metadata.extend(metadata_list)

    def search(self, query_vector: np.ndarray, k: int = 3) -> list:
        if self.index.ntotal == 0:
            return []
        query = np.array([query_vector]).astype("float32")
        k = min(k, self.index.ntotal)
        distances, indices = self.index.search(query, k)
        results = []
        for idx in indices[0]:
            if 0 <= idx < len(self.metadata):
                results.append(self.metadata[idx])
        return results

    def is_empty(self) -> bool:
        return self.index.ntotal == 0