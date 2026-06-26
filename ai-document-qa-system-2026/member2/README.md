Member 2 — Embeddings / FAISS store

Quick setup

1. Install dependencies (preferably inside a virtualenv):

```bash
pip install -r requirements.txt
```

2. (Optional but recommended) Set a Hugging Face token to avoid unauthenticated warnings and rate limits:

PowerShell (current session):

```powershell
$env:HF_TOKEN="hf_...your_token_here..."
```

To persist across sessions:

```powershell
setx HF_TOKEN "hf_...your_token_here..."
```

Run the demo

```bash
python member2/vector_store.py
python member2/retriever.py
```

What the code does

- `embeddings.py`: loads `sentence-transformers/all-MiniLM-L6-v2` and generates embeddings.
- `vector_store.py`: creates three dummy chunks, computes embeddings, builds a FAISS index and saves it to `faiss_index/`.
- `retriever.py`: loads the saved index and metadata, searches top-k chunks for a query, and prints `text`, `source_file`, and `page`.

If you want LangChain-style objects, I can adapt these files to use LangChain's vectorstore API instead.
