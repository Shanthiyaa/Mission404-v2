import sys, os
sys.path.append(os.path.dirname(os.path.dirname(os.path.abspath(__file__))))
from member2.retriever import retrieve
import json
res = retrieve('Hello Timer')
print(json.dumps(res, indent=2))
