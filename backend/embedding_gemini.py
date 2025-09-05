# embeddings_gemini.py
import os
import google.generativeai as genai

def configure(api_key):
    if api_key:
        os.environ["GOOGLE_API_KEY"] = api_key
    genai.configure(api_key=os.environ["GOOGLE_API_KEY"])

class GeminiEmbeddings:
    def __init__(self, model="models/embedding-001"):
        self.model = model

    def embed_text(self, text: str):
        """Return a single embedding vector (list[float])"""
        # NOTE: depending on SDK version the function name may differ slightly.
        # This is a resilient wrapper — adapt if SDK changes.
        resp = genai.embed_content(model=self.model, content=text)
        # resp expected to contain {"embedding": [...float...]}
        return resp["embedding"]

    def embed_texts(self, texts: list[str], batch_size=8):
        out = []
        for i in range(0, len(texts), batch_size):
            batch = texts[i:i+batch_size]
            for t in batch:
                out.append(self.embed_text(t))
        return out
