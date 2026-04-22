import logging
from openai import AsyncOpenAI
from app.domain.interfaces.i_rag_model import IRAGLanguageModel

logger = logging.getLogger(__name__)


class OpenAIRAGLanguageModel(IRAGLanguageModel):
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
- If CONTEXT sections are provided: answer ONLY from those documents.
  Never cite context numbers or internal labels (e.g. never say "Mula sa Context 1").
  Answer naturally as if you already know the information.
- If NO CONTEXT is provided: use your general knowledge about Philippine
  local government, barangay procedures, and Santa Maria, Laguna.
  Be honest if you are unsure of specific local details and suggest the
  resident contact their barangay or the munisipyo directly.

════════════════════════════════════════
SCOPE
════════════════════════════════════════
- Your PRIMARY purpose is to assist residents with UCRS-related concerns:
  complaints, barangay services, local government procedures, community issues.
- For questions OUTSIDE your scope (e.g. programming, math, unrelated topics):
  Politely explain that you are a government assistant and cannot help with
  that topic. Redirect the resident to their concern if possible.
  Example: "Paumanhin po, ako ay isang AI Assistant para sa mga serbisyo ng
  Santa Maria, Laguna. Para sa mga tanong tungkol sa [topic], maaari kayong
  humingi ng tulong sa ibang mapagkukunan. Mayroon po ba kayong katanungan
  tungkol sa aming mga serbisyo?"

════════════════════════════════════════
TONE & BEHAVIOR
════════════════════════════════════════
- Warm, respectful, and patient.
- Plain language — avoid bureaucratic jargon.
- Never dismiss or minimize a resident's concern.
- For urgent safety/health/disaster situations always advise contacting
  the barangay or calling 911 regardless of context availability.

════════════════════════════════════════
INPUT HANDLING
════════════════════════════════════════
- Understand questions even with typos, shorthand, or informal spelling.
- If the input is gibberish or completely unintelligible:
  Reply: "Paumanhin, hindi ko po naintindihan ang inyong mensahe.
  Maaari po bang ulitin o linawin?"
- If the input has typos but the intent is clear: answer based on the
  most likely intent. Do NOT ask for clarification unnecessarily.
- Never ask for clarification if the question is clearly understandable.

════════════════════════════════════════
FORMATTING
════════════════════════════════════════
- Bold important information using ** **.
- Bold: deadlines, office names, required documents, contact numbers,
  warnings, and critical instructions.
- Do not overuse bolding — only highlight what truly matters.

════════════════════════════════════════
HARD LIMITS
════════════════════════════════════════
- Never share personal data of other residents.
- Never make legal conclusions.
- Never promise resolution timelines unless stated in provided context.
- Never deny being an AI if sincerely asked."""

    def __init__(self, api_key: str, model: str = "gpt-4o-mini"):
        self._client = AsyncOpenAI(api_key=api_key)
        self._model = model

    async def generate_answer(
        self,
        question: str,
        context: list[str],
    ) -> str:
        formatted_context = "\n\n".join(
            f"[CONTEXT {i + 1}]\n{chunk}" for i, chunk in enumerate(context)
        )
        user_prompt = (
            f"{'═' * 48}\n"
            f"RETRIEVED CONTEXT\n"
            f"{'═' * 48}\n"
            f"{formatted_context}\n\n"
            f"{'═' * 48}\n"
            f"RESIDENT QUESTION\n"
            f"{'═' * 48}\n"
            f"{question}\n\n"
            f"Respond according to the system policy above."
        )

        print(f"[OpenAI] generate_answer called | model={self._model} | question='{question}' | chunks={len(context)}")

        try:
            print(f"[OpenAI] Sending request...")
            response = await self._client.chat.completions.create(
                model=self._model,
                messages=[
                    {"role": "system", "content": self.SYSTEM_PROMPT},
                    {"role": "user", "content": user_prompt},
                ],
            )
            answer = response.choices[0].message.content.strip()
            print(f"[OpenAI] generate_answer SUCCESS | answer_length={len(answer)}")
            logger.info(f"RAG answer generated ({len(answer)} chars)")
            return answer
        except Exception as e:
            print(f"[OpenAI] generate_answer FAILED | error_type={type(e).__name__} | error={e}")
            logger.error(f"OpenAI RAG generation failed: {e}", exc_info=True)
            return (
                "Paumanhin, may nangyaring error sa aming sistema. "
                "Subukan ulit o makipag-ugnayan sa inyong barangay para sa tulong."
            )

    async def generate_no_context_answer(self, question: str) -> str:
        """
        Called when Pinecone returns no relevant chunks.
        The LLM should still try to answer using general knowledge
        within UCRS scope, or politely redirect if out of scope.
        """
        user_prompt = (
    f"QUESTION: {question}\n\n"

    f"INSTRUCTION:\n"
    f"No documents were found for this question.\n"
    f"UCRS (Unified Complaint and Response System) is a complaints and service request system for residents of Santa Maria, Laguna.\n\n"

    f"STEP 1: UNDERSTAND INTENT FIRST\n"
    f"- Always try to understand the user's intent even if there are typos, shorthand, slang, or profanity.\n"
    f"- Do NOT immediately assume the message is unclear.\n"
    f"- Curse words (e.g. 'tangina', 'bwisit') are NOT gibberish.\n\n"

    f"STEP 2: CLASSIFY INPUT INTO ONE CATEGORY\n\n"

    f"(A) RELATED (clear or recoverable meaning, kahit may typo)\n"
    f"(B) EMOTIONAL WITH CONTEXT (may mura pero may reklamo o concern)\n"
    f"(C) EMOTIONAL ONLY (puro mura/frustration, walang detalye)\n"
    f"(D) NOT RELATED to UCRS/barangay/local government\n"
    f"(E) TRUE GIBBERISH (random letters/numbers, walang kahulugan)\n\n"

    f"STEP 3: RESPONSE RULES\n\n"

    f"If (A) RELATED:\n"
    f"- Rewrite the intent as a confirmation question\n"
    f"- Example: 'Ang ibig mo bang sabihin ay paano magreklamo?'\n"
    f"- One sentence only\n\n"

    f"If (B) EMOTIONAL WITH CONTEXT:\n"
    f"- Stay calm and professional\n"
    f"- Do NOT repeat curse words\n"
    f"- Extract intent and confirm it\n"
    f"- Example: 'Nais mo bang magreklamo tungkol sa maingay na kapitbahay?'\n"
    f"- One sentence only\n\n"

    f"If (C) EMOTIONAL ONLY:\n"
    f"- Acknowledge emotion naturally\n"
    f"- Do NOT say you don't understand\n"
    f"- Do NOT assume specific issue\n"
    f"- Guide user to complaint flow\n"
    f"- Example: 'Mukhang may concern ka, nais mo bang magreklamo o mag-report ng problema?'\n"
    f"- One sentence only\n\n"

    f"If (D) NOT RELATED:\n"
    f"- Say you are a UCRS assistant only\n"
    f"- Ask if they have a complaint or barangay concern\n"
    f"- One sentence only\n\n"

    f"If (E) TRUE GIBBERISH:\n"
    f"- Say: 'Paumanhin, hindi ko po naintindihan ang mensahe. Maaari po bang linawin?'\n"
    f"- One sentence only\n\n"

    f"STRICT RULES:\n"
    f"- NEVER treat profanity alone as gibberish\n"
    f"- ALWAYS try to recover meaning first\n"
    f"- Do NOT answer the question yet\n"
    f"- Do NOT give steps or explanations\n"
    f"- Do NOT add extra sentences\n"
    f"- Exactly ONE sentence only\n"
    f"- Match the user's language (Filipino, English, or Taglish)\n"
        )

        print(f"[OpenAI] generate_no_context_answer called | model={self._model} | question='{question}'")

        try:
            print(f"[OpenAI] Sending no-context request...")
            response = await self._client.chat.completions.create(
                model=self._model,
                messages=[
                    {"role": "system", "content": self.SYSTEM_PROMPT},
                    {"role": "user", "content": user_prompt},
                ],
            )
            answer = response.choices[0].message.content.strip()
            print(f"[OpenAI] generate_no_context_answer SUCCESS | answer_length={len(answer)}")
            logger.info(f"No-context answer generated ({len(answer)} chars)")
            return answer
        except Exception as e:
            print(f"[OpenAI] generate_no_context_answer FAILED | error_type={type(e).__name__} | error={e}")
            logger.error(f"OpenAI no-context generation failed: {e}", exc_info=True)
            return (
                "Paumanhin, may nangyaring error sa aming sistema. "
                "Subukan ulit o makipag-ugnayan sa inyong barangay para sa tulong."
            )