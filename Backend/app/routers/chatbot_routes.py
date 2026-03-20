# app/api/v1/routes/chatbot.py
from fastapi import APIRouter, Depends
from pydantic import BaseModel

router = APIRouter()


class ChatRequest(BaseModel):
    question: str


class ChatResponse(BaseModel):
    answer: str
    is_grounded: bool

from app.tasks import get_chatbot_service

@router.post("/ask", response_model=ChatResponse)
async def ask(body: ChatRequest):
    result = await get_chatbot_service().ask(body.question)
    return ChatResponse(answer=result.answer, is_grounded=result.is_grounded)