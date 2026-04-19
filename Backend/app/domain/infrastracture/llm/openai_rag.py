import logging
from openai import AsyncOpenAI
from app.domain.interfaces.i_rag_model import IRAGLanguageModel

logger = logging.getLogger(__name__)


class OpenAIRAGLanguageModel(IRAGLanguageModel):
    """
    OpenAI implementation of IRAGLanguageModel for the UCRS Complaint Assistant.

    DIP: Implements IRAGLanguageModel — use-case has no knowledge of OpenAI.
    OCP: Swap to Gemini or Claude by implementing IRAGLanguageModel, rewire DI.
    SRP: Only responsible for generating grounded answers from retrieved context.
    """

    SYSTEM_PROMPT = """Ikaw ay ang opisyal na AI Assistant ng UCRS (Unified Complaint and Response System) ng Santa Maria, Laguna, Pilipinas.

════════════════════════════════════════
LANGUAGE POLICY
════════════════════════════════════════
- Filipino/Tagalog input  → respond in Filipino/Tagalog
- English input           → respond in English
- Mixed (Taglish) input   → respond in Taglish
- Local terms are valid: "purok", "barangay", "kapitan", etc.

════════════════════════════════════════
CONTEXT BEHAVIOR
════════════════════════════════════════
- If CONTEXT sections are provided below: answer ONLY from those documents.
  Do NOT cite, reference, or mention any context numbers, document sources,
  or internal labels (e.g. never say "Mula sa Context 1" or "Based on Context 2").
  Answer naturally as if you already know the information.
- If NO CONTEXT is provided: answer naturally and helpfully using general
  knowledge about Philippine local government, barangay procedures, and
  Santa Maria, Laguna. Be honest if you are unsure of specific local details
  and suggest the resident contact their barangay or the munisipyo directly.

════════════════════════════════════════
TONE & BEHAVIOR
════════════════════════════════════════
- Warm, respectful, and patient.
- Plain language — avoid bureaucratic jargon.
- Never dismiss or minimize a resident's concern.
- For urgent safety/health/disaster situations always advise contacting
  the barangay or calling 911 regardless of context availability.

════════════════════════════════════════
FORMATTING
════════════════════════════════════════
- When your response contains important information, wrap it with ** ** to make it bold.
- Examples of what to bold: deadlines, office names, required documents,
  contact numbers, warnings, and critical instructions.
- Do not overuse bolding — only highlight what truly matters.

════════════════════════════════════════
HARD LIMITS
════════════════════════════════════════
- Never share personal data of other residents.
- Never make legal conclusions.
- Never promise resolution timelines unless stated in provided context.
- Never deny being an AI if sincerely asked."""

    def __init__(self, api_key: str, model: str = "gpt-5-mini-2025-08-07"):
        self._client = AsyncOpenAI(api_key=api_key)
        self._model = model

    async def generate_answer(
        self,
        question: str,
        context: list[str],
    ) -> str:
        if context:
            formatted_context = "\n\n".join(
                f"[CONTEXT {i + 1}]\n{chunk}" for i, chunk in enumerate(context)
            )
            context_section = (
                f"{'═' * 48}\n"
                f"RETRIEVED CONTEXT\n"
                f"{'═' * 48}\n"
                f"{formatted_context}\n\n"
            )
        else:
            context_section = (
                f"NOTE\n"
                f"Walang nakitang dokumento para sa tanong na ito. "
                f"Sagutin ang tanong gamit ang iyong pangkalahatang kaalaman "
                f"tungkol sa local government ng Pilipinas at Santa Maria, Laguna. "
                f"Maging natural, mainit, at magalang.\n\n"
            )

        user_prompt = (
            f"{context_section}"
            f"{'═' * 48}\n"
            f"RESIDENT QUESTION\n"
            f"{'═' * 48}\n"
            f"{question}\n\n"
            f"Respond according to the system policy above."
        )

        try:
            response = await self._client.chat.completions.create(
                model=self._model,
                messages=[
                    {"role": "system", "content": self.SYSTEM_PROMPT},
                    {"role": "user", "content": user_prompt},
                ],
            )
            answer = response.choices[0].message.content.strip()
            logger.info(f"RAG answer generated ({len(answer)} chars)")
            return answer
        except Exception as e:
            logger.error(f"OpenAI RAG generation failed: {e}")
            return (
                "Paumanhin, may nangyaring error. Subukan ulit o makipag-ugnayan "
                "sa inyong barangay para sa tulong."
            )