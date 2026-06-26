"""
Run a quick local extraction + FAISS build for uploaded PDFs.
Usage: python run_local_test.py

This script will:
 - call member1.process_documents() on files in `uploaded_docs/`
 - call member2.vector_store.build_from_chunks_json()
 - report created files and basic stats

If dependencies are missing it will print instructions.
"""
import os
import sys
from pathlib import Path

UPLOAD_DIR = Path("uploaded_docs")
CHUNKS_JSON = Path("data") / "chunks.json"
FAISS_DIR = Path("data") / "faiss_index"

print("Running local test: extraction -> chunks.json -> FAISS")

files = list(UPLOAD_DIR.glob("*.pdf"))
if not files:
    print("No PDFs found in uploaded_docs/. Place your PDF there and rerun.")
    sys.exit(1)

print(f"Found {len(files)} PDF(s): {[f.name for f in files]}")

try:
    from member1.extractor import process_documents
    from member2.vector_store import build_from_chunks_json
except Exception as e:
    print("Could not import modules. Are dependencies installed?\n", e)
    print("Please run:\n  python -m venv .venv\n  .venv\\Scripts\\Activate.ps1\n  pip install -r requirements.txt")
    sys.exit(1)

# Run extraction
paths = [str(p.resolve()) for p in files]
print("Calling member1.process_documents()...")
docs = process_documents(paths)
print(f"process_documents returned {len(docs)} chunks (LangChain Documents)")

# Ensure chunks.json exists
if not CHUNKS_JSON.exists():
    print(f"Expected {CHUNKS_JSON} not found after extraction. Aborting.")
    sys.exit(1)

print(f"Found chunks json: {CHUNKS_JSON} ({CHUNKS_JSON.stat().st_size} bytes)")

# Build FAISS
print("Building FAISS index from chunks.json...")
build_from_chunks_json()

if FAISS_DIR.exists():
    print(f"FAISS index built at: {FAISS_DIR}")
    idx = FAISS_DIR / "index.faiss"
    meta = FAISS_DIR / "metadata.json"
    print(f"  index file: {idx.exists()}\n  metadata file: {meta.exists()}")
else:
    print("FAISS index directory not found after build. Check logs.")

print("Local test completed. Run streamlit run member3/app.py to use the UI.")
