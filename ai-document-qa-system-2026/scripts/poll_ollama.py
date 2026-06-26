import subprocess
import time
import sys

OLLAMA_PATH = r"C:\Users\HP\AppData\Local\Programs\Ollama\ollama.exe"
MODEL_NAME = "llama3"

for i in range(60):
    try:
        proc = subprocess.run([OLLAMA_PATH, "list"], capture_output=True, text=True)
        out = proc.stdout + proc.stderr
    except Exception as e:
        print("Error running ollama list:", e)
        out = ""
    if MODEL_NAME in out:
        print("MODEL_READY")
        sys.exit(0)
    print(f"Not ready yet ({i})")
    time.sleep(10)

print("TIMEOUT")
sys.exit(2)
