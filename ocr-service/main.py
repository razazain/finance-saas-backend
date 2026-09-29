import os
import tempfile
from pathlib import Path

import requests
from fastapi import FastAPI, HTTPException
from pydantic import BaseModel, HttpUrl

try:
    from paddleocr import PaddleOCR
except Exception as exc:  # pragma: no cover
    PaddleOCR = None
    IMPORT_ERROR = exc
else:
    IMPORT_ERROR = None

app = FastAPI(title="Finance SaaS OCR Service", version="1.0.0")

OCR_LANG = os.getenv("PADDLE_OCR_LANG", "en")
OCR_USE_DOC_ORIENTATION = os.getenv("PADDLE_OCR_DOC_ORIENTATION", "false").lower() == "true"

ocr_engine = None


def get_engine():
    global ocr_engine
    if ocr_engine is None:
        if PaddleOCR is None:
            raise RuntimeError(f"PaddleOCR import failed: {IMPORT_ERROR}")
        ocr_engine = PaddleOCR(
            lang=OCR_LANG,
            use_doc_orientation_classify=OCR_USE_DOC_ORIENTATION,
            use_doc_unwarping=False,
            use_textline_orientation=False,
        )
    return ocr_engine


class OCRRequest(BaseModel):
    url: HttpUrl
    mimeType: str | None = None
    fileName: str | None = None


def download_file(url: str, suffix: str = "") -> Path:
    response = requests.get(url, timeout=60, stream=True)
    response.raise_for_status()

    temp = tempfile.NamedTemporaryFile(delete=False, suffix=suffix)
    path = Path(temp.name)
    try:
        total = 0
        max_bytes = 15 * 1024 * 1024
        for chunk in response.iter_content(chunk_size=1024 * 1024):
            if not chunk:
                continue
            total += len(chunk)
            if total > max_bytes:
                raise ValueError("File exceeds OCR size limit")
            temp.write(chunk)
    finally:
        temp.close()
    return path


def result_to_text(result) -> list[str]:
    texts: list[str] = []

    # PaddleOCR 3.x result objects expose a JSON/dict representation.
    raw = None
    if hasattr(result, "json"):
        try:
            raw = result.json
            if callable(raw):
                raw = raw()
        except Exception:
            raw = None

    if isinstance(raw, str):
        import json
        try:
            raw = json.loads(raw)
        except Exception:
            raw = None

    if isinstance(raw, dict):
        texts.extend(str(x) for x in raw.get("rec_texts", []) if str(x).strip())
        if texts:
            return texts

        # Some pipeline results nest OCR output.
        for key in ("result", "res", "ocr"):
            nested = raw.get(key)
            if isinstance(nested, dict):
                texts.extend(str(x) for x in nested.get("rec_texts", []) if str(x).strip())

    if hasattr(result, "rec_texts"):
        try:
            texts.extend(str(x) for x in result.rec_texts if str(x).strip())
        except Exception:
            pass

    # Older result formats may be nested lists: [[box, [text, score]], ...]
    if not texts and isinstance(result, list):
        def walk(value):
            if isinstance(value, (list, tuple)):
                if len(value) == 2 and isinstance(value[0], str):
                    texts.append(value[0])
                    return
                for child in value:
                    walk(child)
        walk(result)

    return texts


@app.get("/health")
def health():
    return {"success": True, "service": "paddleocr", "language": OCR_LANG}


@app.post("/ocr")
def ocr(request: OCRRequest):
    temp_path = None
    try:
        suffix = Path(request.fileName or "").suffix.lower()
        temp_path = download_file(str(request.url), suffix)
        engine = get_engine()
        outputs = engine.predict(input=str(temp_path))

        pages = []
        all_text = []
        for output in outputs:
            page_texts = result_to_text(output)
            pages.append({"text": page_texts})
            all_text.extend(page_texts)

        return {
            "success": True,
            "text": "\n".join(all_text),
            "pages": pages,
        }
    except requests.RequestException as exc:
        raise HTTPException(status_code=502, detail=f"Unable to download Cloudinary asset: {exc}")
    except Exception as exc:
        raise HTTPException(status_code=500, detail=f"OCR processing failed: {exc}")
    finally:
        if temp_path:
            try:
                temp_path.unlink(missing_ok=True)
            except Exception:
                pass
