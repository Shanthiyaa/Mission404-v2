import sys, os
sys.path.append(os.path.dirname(os.path.dirname(os.path.abspath(__file__))))
from member2.retriever import retrieve
from config import RAG_PROMPT_TEMPLATE, OLLAMA_MODEL, OLLAMA_BASE_URL, LLM_TEMPERATURE, MIN_SIMILARITY, TOP_K_RESULTS
import ollama


q = "What is the Hello interval?"
chunks = retrieve(q)
print("Retrieved chunks:")
for c in chunks:
    print(c.get('score'), c.get('source_file'), c.get('page'))

# Build filtered context similar to app.ask_llm
filtered = [c for c in chunks if c.get("score", 1.0) >= MIN_SIMILARITY]
if not filtered:
    filtered = chunks[: TOP_K_RESULTS]

context_parts = []
total_chars = 0
for c in filtered:
    part = f"[Source: {c['source_file']}, page {c['page']}]\n{c['text']}"
    context_parts.append(part)
    total_chars += len(part)
    if total_chars > 3000:
        break

context = "\n\n".join(context_parts)
prompt = RAG_PROMPT_TEMPLATE.format(context=context, question=q)

try:
    ollama.api_base = OLLAMA_BASE_URL
    response = ollama.chat(model=OLLAMA_MODEL, messages=[{"role":"user","content":prompt}], temperature=LLM_TEMPERATURE)
    out = response.get("message", {}).get("content", "") or ""
except Exception:
    if not chunks:
        out = "I couldn't find this in the uploaded documents."
    else:
        top_chunks = (filtered or chunks)[:3]
        snippets = []
        for t in top_chunks:
            s = t.get("text", "").strip().replace("\n", " ")
            if len(s) > 400:
                s = s[:400].rsplit(" ", 1)[0] + "..."
            snippets.append(f"{s} (Source: {t.get('source_file')}, page {t.get('page')})")
        out = "\n\n".join(snippets)

print('\nAnswer:\n')
print(out)
