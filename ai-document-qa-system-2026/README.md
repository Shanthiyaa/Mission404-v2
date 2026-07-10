# ai-document-qa-system-2026
AI-powered Engineering Document Assistant using RAG, LangChain, FAISS, and Llama 3 to answer questions from SFS, Validation Reports, Test Cases, User Guides, and other technical documents with source citations.

## Run API locally

```powershell
python run_api.py
```

The API defaults to `http://127.0.0.1:8001` because port `8000` is commonly already in use on Windows development machines. If `8001` is busy, `run_api.py` automatically tries the next available port.
