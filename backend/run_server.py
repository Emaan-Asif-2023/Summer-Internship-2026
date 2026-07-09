import os
import sys

# Force UTF-8 output on Windows to prevent emoji UnicodeEncodeError
os.environ["PYTHONIOENCODING"] = "utf-8"

import uvicorn

if __name__ == "__main__":
    uvicorn.run(
        "app.main:app",
        host="127.0.0.1",
        port=8000,
        reload=True,
    )
