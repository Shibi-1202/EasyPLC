# vectorstore_faiss.py
import json, numpy as np, faiss
from embedding_gemini import configure, GeminiEmbeddings

class SimpleFAISSRetriever:
    def __init__(self, index_path="plc_index.faiss", meta_path="plc_meta.json"):
        self.index = faiss.read_index(index_path)
        with open(meta_path, "r", encoding="utf-8") as f:
            self.meta = json.load(f)
        configure()
        self.emb = GeminiEmbeddings()

    def retrieve(self, query: str, top_k=5):
        qvec = self.emb.embed_text(query)
        qvec = np.array(qvec, dtype="float32")
        qvec = qvec / (np.linalg.norm(qvec) + 1e-12)
        D, I = self.index.search(qvec.reshape(1, -1), top_k)
        results = []
        for score, idx in zip(D[0], I[0]):
            if idx < 0:
                continue
            meta = self.meta[idx]
            meta_with_score = meta.copy()
            meta_with_score["score"] = float(score)
            results.append(meta_with_score)
        return results
