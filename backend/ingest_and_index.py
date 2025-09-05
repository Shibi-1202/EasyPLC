# ingest_and_index.py
import json
import numpy as np
import faiss
from pypdf import PdfReader
from embedding_gemini import configure,GeminiEmbeddings


# ---- simple text splitter (char-based) ----
def chunk_text(text, chunk_size=500, overlap=100):
    text = (text or "").replace("\r", "\n")
    out = []
    start = 0
    L = len(text)
    while start < L:
        end = min(L, start + chunk_size)
        chunk = text[start:end].strip()
        if chunk:
            out.append(chunk)
        start += chunk_size - overlap
    return out

def load_pdf_text(path):
    reader = PdfReader(path)
    pages = []
    for p in reader.pages:
        txt = p.extract_text()
        if txt:
            pages.append(txt)
    return "\n\n".join(pages)

def build_index(pdf_paths, index_path="plc_index.faiss", meta_path="plc_meta.json"):
    configure()  # reads GOOGLE_API_KEY from env
    emb = GeminiEmbeddings()

    docs = []
    for p in pdf_paths:
        text = load_pdf_text(p)
        chunks = chunk_text(text, chunk_size=1200, overlap=200)
        for i, c in enumerate(chunks):
            docs.append({
                "source": p,
                "page_chunk_index": i,
                "text": c
            })

    texts = [d["text"] for d in docs]
    vectors = emb.embed_texts(texts, batch_size=4)
    vecs = np.array(vectors, dtype="float32")

    # normalize for cosine similarity (dot product on normalized vectors)
    norms = np.linalg.norm(vecs, axis=1, keepdims=True)
    norms[norms==0] = 1.0
    vecs = vecs / norms

    dim = vecs.shape[1]
    index = faiss.IndexFlatIP(dim)   # inner product -> cosine when normalized
    index.add(vecs)

    faiss.write_index(index, index_path)
    # Save docs metadata (list order aligns with vectors/index rows)
    with open(meta_path, "w", encoding="utf-8") as f:
        json.dump(docs, f, indent=2, ensure_ascii=False)
    print(f"Saved FAISS index to {index_path} and metadata to {meta_path}")

if __name__ == "__main__":
    pdfs = ["IEC overview.pdf", "ABB IEC syntax.pdf"]
    build_index(pdfs)
    