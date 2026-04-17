import re
import io
import pdfplumber
from fastapi import FastAPI, UploadFile, File, HTTPException
from fastapi.responses import JSONResponse
from pydantic import BaseModel
from pinecone import Pinecone, ServerlessSpec
from google import genai
from app.tasks import get_gemini_embedding_service
import os

from dotenv import load_dotenv
load_dotenv()


PINECONE_API_KEY = os.getenv("PINECONE_API_KEY")
PINECONE_INDEX   = os.getenv("PINECONE_RAG_INDEX_NAME")
PINECONE_REGION  = "us-east-1"



SECTION_TITLES = [
    "Mayor of Santa Maria",
    "Vice Mayor of Santa Maria",
    "Office Hours",
    "How to Submit a Complaint",
    "Barangays",
    "Emergency Hotlines",
    "TRACKING COMPLAINT STATUS",
]

pinecone_client = Pinecone(api_key=PINECONE_API_KEY)


class QueryRequest(BaseModel):
    query: str
    top_k: int = 3


def _extract_text(file_bytes: bytes) -> str:
    """Extract all text from PDF bytes using pdfplumber."""
    pages = []
    with pdfplumber.open(io.BytesIO(file_bytes)) as pdf:
        for page in pdf.pages:
            text = page.extract_text()
            if text:
                pages.append(text)
    return "\n".join(pages)


def _is_section_title(line: str) -> bool:
    stripped = line.strip()
    if not stripped:
        return False
    for title in SECTION_TITLES:
        if stripped.lower().startswith(title.lower()):
            return True
    return False


def _chunk_text(text: str) -> list[dict]:
    """Split text into chunks on known section titles."""
    text = re.sub(r"-{3,}", "", text)
    lines = text.splitlines()
    chunks, current_title, current_content = [], None, []

    for line in lines:
        if _is_section_title(line):
            if current_title is not None:
                chunks.append(_build_chunk(len(chunks) + 1, current_title, current_content))
            current_title = line.strip()
            current_content = []
        elif current_title is not None:
            current_content.append(line)

    if current_title is not None:
        chunks.append(_build_chunk(len(chunks) + 1, current_title, current_content))

    return chunks


def _build_chunk(chunk_id: int, title: str, content_lines: list[str]) -> dict:
    return {
        "chunk_id": chunk_id,
        "title": title,
        "content": title + "\n" + "\n".join(content_lines).strip(),
    }

async def _embed(texts: list[str]) -> list[list[float]]:
    embedding_service = get_gemini_embedding_service()
    return [await embedding_service.generate(text) for text in texts]

def _get_or_create_index():
    """Return the Pinecone index, creating it if it doesn't exist."""
    existing = [i.name for i in pinecone_client.list_indexes()]
    if PINECONE_INDEX not in existing:
        pinecone_client.create_index(
            name=PINECONE_INDEX,
            dimension=3072,
            metric="cosine",
            spec=ServerlessSpec(cloud="aws", region=PINECONE_REGION),
        )
    return pinecone_client.Index(PINECONE_INDEX)


def _upsert_chunks(chunks: list[dict], embeddings: list[list[float]]) -> int:
    """Upsert chunk vectors into Pinecone. Returns number of vectors upserted."""
    index = _get_or_create_index()
    vectors = [
        {
            "id": f"chunk_{c['chunk_id']}",
            "values": emb,
            "metadata": {
                "chunk_id": c["chunk_id"],
                "title": c["title"],
                "content": c["content"],
            },
        }
        for c, emb in zip(chunks, embeddings)
    ]
    index.upsert(vectors=vectors)
    return len(vectors)




@app.post("/upload-pdf", summary="Upload a PDF to index into Pinecone")
async def upload_pdf(file: UploadFile = File(...)):
    """
    Accepts a PDF file, extracts text, chunks it by section headings,
    embeds each chunk via Gemini, and upserts into Pinecone.
    """
    if not file.filename.lower().endswith(".pdf"):
        raise HTTPException(status_code=400, detail="Only PDF files are accepted.")

    file_bytes = await file.read()
    if not file_bytes:
        raise HTTPException(status_code=400, detail="Uploaded file is empty.")

    # Pipeline: extract → chunk → embed → upsert
    raw_text  = _extract_text(file_bytes)
    if not raw_text.strip():
        raise HTTPException(status_code=422, detail="Could not extract text from PDF (image-only PDF?).")

    chunks     = _chunk_text(raw_text)
    if not chunks:
        raise HTTPException(status_code=422, detail="No recognizable section headings found in the PDF.")

    embeddings = _embed([c["content"] for c in chunks])
    count      = _upsert_chunks(chunks, embeddings)

    return JSONResponse({
        "message": f"Successfully indexed {count} chunks from '{file.filename}'.",
        "chunks_indexed": count,
        "chunk_titles": [c["title"] for c in chunks],
    })


