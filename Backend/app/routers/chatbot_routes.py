# app/api/v1/routes/chatbot.py
from fastapi import APIRouter, Depends
from pydantic import BaseModel
from app.services.rag_services import _upsert_chunks, _embed, _chunk_text, _extract_text
from fastapi import UploadFile, File, HTTPException
from fastapi.responses import JSONResponse
from pydantic import BaseModel
from app.schemas.chatbot_schema import ChatRequest, ChatResponse
from app.dependencies.auth_dependency import get_current_user
from app.models.user import User
from app.core.redis import redis_client 
from dotenv import load_dotenv
load_dotenv()


router = APIRouter()

from app.domain.infrastracture.service.chatbot_service import ChatbotService
from app.domain.infrastracture.service.chatbot_service import create_chatbot_service



@router.post("/ask", response_model=ChatResponse)
async def ask(
    body: ChatRequest,
    chatbot: ChatbotService = Depends(create_chatbot_service),
    user=Depends(get_current_user),
):
    result = await chatbot.ask(
        question=body.question,
        session_id=body.session_id,
        user_id=str(user.id),
    )
    return ChatResponse(answer=result.answer, is_grounded=result.is_grounded)
 


@router.post("/upload-pdf", summary="Upload a PDF to index into Pinecone")
async def upload_pdf(file: UploadFile = File(...)):
    """
    Accepts a PDF file, extracts text, chunks it by section headings,
    embeds each chunk via openAI, and upserts into Pinecone.
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

    embeddings = await _embed([c["content"] for c in chunks])
    count      = _upsert_chunks(chunks, embeddings)

    return JSONResponse({
        "message": f"Successfully indexed {count} chunks from '{file.filename}'.",
        "chunks_indexed": count,
        "chunk_titles": [c["title"] for c in chunks],
    })

