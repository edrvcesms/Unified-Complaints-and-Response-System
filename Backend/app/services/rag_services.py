import re
import io
import pdfplumber
from fastapi import FastAPI, UploadFile, File, HTTPException
from fastapi.responses import JSONResponse
from pydantic import BaseModel
from pinecone import Pinecone, ServerlessSpec
from app.tasks.incident_tasks import get_openai_embedding_service
import os
import asyncio



PINECONE_API_KEY = os.getenv("PINECONE_API_KEY")
PINECONE_INDEX   = os.getenv("PINECONE_RAG_INDEX_NAME")
PINECONE_REGION  = "us-east-1"

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
    """Detect headings by ALL CAPS convention."""
    stripped = line.strip()
    if not stripped:
        return False

    # Extract only alphabetic characters to check casing
    alpha_only = re.sub(r'[^a-zA-Z]', '', stripped)
    if not alpha_only:
        return False

    is_all_caps = alpha_only == alpha_only.upper()
    is_short = len(stripped) <= 60
    no_end_punct = not stripped.endswith(('.', '?', '!'))
    word_count = 1 <= len(stripped.split()) <= 10

    # Debug every line being checked
    print(f"  checking | caps={is_all_caps} short={is_short} punct={no_end_punct} words={word_count} | '{stripped}'")

    return is_all_caps and is_short and no_end_punct and word_count


def _chunk_text(text: str) -> list[dict]:
    """Split text into chunks on ALL CAPS section titles."""
    text = re.sub(r"-{3,}", "", text)
    lines = text.splitlines()
    chunks, current_title, current_content = [], None, []

    print("\n" + "="*60)
    print("📄 RAW EXTRACTED LINES:")
    print("="*60)
    for i, line in enumerate(lines):
        print(f"  [{i:03}] {repr(line)}")
    print("="*60 + "\n")

    for line in lines:
        if _is_section_title(line):
            print(f"✅ HEADING DETECTED: '{line.strip()}'")
            if current_title is not None:
                chunks.append(_build_chunk(len(chunks) + 1, current_title, current_content))
            current_title = line.strip()
            current_content = []
        elif current_title is not None:
            current_content.append(line)

    if current_title is not None and current_content:
        chunks.append(_build_chunk(len(chunks) + 1, current_title, current_content))

    # Debug summary
    print(f"\n{'='*60}")
    print(f"📦 TOTAL CHUNKS CREATED: {len(chunks)}")
    print(f"{'='*60}")
    for chunk in chunks:
        print(f"\n🔹 Chunk {chunk['chunk_id']}: '{chunk['title']}'")
        print(f"   Content preview: {chunk['content'][:120].strip()}...")
    print(f"{'='*60}\n")

    return chunks


def _build_chunk(chunk_id: int, title: str, content_lines: list[str]) -> dict:
    return {
        "chunk_id": chunk_id,
        "title": title,
        "content": title + "\n" + "\n".join(content_lines).strip(),
    }


async def _embed(texts: list[str]) -> list[list[float]]:
    embedding_service = get_openai_embedding_service()
    return await asyncio.gather(*[embedding_service.generate(text) for text in texts])


def _get_or_create_index():
    """Return the Pinecone index, creating it if it doesn't exist."""
    existing = [i.name for i in pinecone_client.list_indexes()]
    if PINECONE_INDEX not in existing:
        pinecone_client.create_index(
            name=PINECONE_INDEX,
            dimension=1024,
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