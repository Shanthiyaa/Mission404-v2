import os
os.chdir(r'C:\Users\HP\Mission404-v2\ai-document-qa-system-2026')
from api import app
from fastapi.testclient import TestClient
client = TestClient(app)
resp = client.post('/api/auth/login', json={'email':'admin@example.com','password':'admin123'})
print(resp.status_code)
print(resp.text)
