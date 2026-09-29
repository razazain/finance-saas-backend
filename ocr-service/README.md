# Finance SaaS PaddleOCR Service

This service is intentionally separated from the Node.js API. It receives a Cloudinary URL, downloads the temporary document, runs PaddleOCR, returns text, and deletes the temporary local file.

## Python

Use a Python version supported by the PaddlePaddle/PaddleOCR wheels for your operating system. If Python 3.14 cannot install the selected PaddlePaddle wheel, use Python 3.12 for this service rather than changing the Node.js application's Python-independent stack.

## Install

```bash
python -m venv venv
# Windows
venv\Scripts\activate
# Linux/macOS
source venv/bin/activate

python -m pip install --upgrade pip
pip install -r requirements.txt
```

## Run

```bash
uvicorn main:app --host 127.0.0.1 --port 8001
```

Health:

```text
GET http://127.0.0.1:8001/health
```

The Node API calls `POST /ocr` with a JSON body containing the Cloudinary secure URL.
