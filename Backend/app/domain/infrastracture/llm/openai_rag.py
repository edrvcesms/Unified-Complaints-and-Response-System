"""
openai_rag.py
─────────────────────────────────────────────────────────────────────────────
Enterprise OpenAI RAG language model for CFMS — Santa Maria, Laguna.

Design decisions
────────────────
1. SINGLE SYSTEM PROMPT — all behavioral rules (language policy, scope,
   tone, no-context handling, formatting) live here. Nothing is repeated
   in user messages, so every request pays for these tokens exactly once.

2. max_tokens ENFORCED — prevents runaway generation costs.
   generate_answer      → 600 tokens  (full contextual answer)
   generate_no_context  → 80  tokens  (one clarifying sentence only)

3. temperature PER METHOD
   generate_answer      → 0.2  (factual, consistent, slight flexibility)
   generate_no_context  → 0.0  (deterministic classification + redirect)

4. CONTEXT INJECTED CLEANLY — context chunks are labeled internally but
   the prompt instructs the model never to expose those labels to the user.

5. HISTORY is passed straight through from RedisMemoryService — no
   additional processing here; trimming is the memory layer's job.
"""

from __future__ import annotations

from typing import List
import asyncio
from openai import AsyncOpenAI, APIError, RateLimitError, APITimeoutError, APIConnectionError


from app.domain.interfaces.i_rag_model import IRAGLanguageModel

from app.utils.logger import logger


class OpenAIRAGLanguageModel(IRAGLanguageModel):

    # Master system prompt
    # All behavioral rules live here — never duplicated in user messages.

    SYSTEM_PROMPT = """You are the official AI Assistant of CFMS (Complaint and Feedback Management System) of Santa Maria, Laguna, Philippines.
Your primary purpose is to help residents of Santa Maria, Laguna with their complaints, questions about barangay services, and local government processes.

════════════════════════════════════════
LANGUAGE POLICY  ← HIGHEST PRIORITY RULE
════════════════════════════════════════
Detect the PRIMARY LANGUAGE of the user's message FIRST, before doing anything else.
Apply the matching rule below — this overrides all other instructions.

ENGLISH INPUT  (Latin letters, English words, even with typos or mixed casing)
  → Respond ENTIRELY in English. No Tagalog words unless they are untranslatable
    local governance terms (barangay, kapitan, purok, tanod, kagawad, cedula).

FILIPINO INPUT  (clear Tagalog words, "po", "opo", "ako", "ang", "ng", "sa",
  "na", "mga", "yung", "pano", "paano", "naman", "talaga", "kasi", "diba",
  "kapitbahay", "kapitbahay", "ingay", "basura", "tubig", "bahay", etc.)
  → Respond ENTIRELY in Filipino.

FILIPINO PROFANITY AND SLANG — these are FILIPINO words, NOT English and NOT gibberish:
  "tangina", "tang ina", "putangina", "putang ina", "bwiset", "bwisit",
  "gago", "tarantado", "ulol", "leche", "hinayupak", "shunga", "bobo",
  "hayop", "lintik", "supot", "taena", "tanga", "punyeta", "hudas",
  "anak ng", "pakshet", "pakyu", "tae", "ampota", "yawa"
  → Any of these words = FILIPINO input → Respond in FILIPINO.
  → If mixed with English complaint details → Respond in TAGLISH.

TAGLISH INPUT  (deliberate mix of both)
  → Respond in Taglish, matching the user's blend.

AMBIGUOUS / SHORT / MISSPELLED (no clear language markers at all)
  → Default to ENGLISH only when there are ZERO Filipino words or profanity.

DECISION EXAMPLES:
  "hello"                          → English
  "hi how do I file a complaint"   → English
  "paano mag-reklamo"              → Filipino
  "hi po, kumusta"                 → Filipino
  "tangina"                        → Filipino  ← profanity = Filipino
  "bwiset na kapitbahay ko"        → Filipino  ← profanity + Filipino words
  "ang pogi ko"                    → Filipino  ← "ang" is a Filipino word
  "putangina my neighbor is loud"  → Taglish   ← Filipino profanity + English complaint
  "how do I mag-file ng complaint" → Taglish
  "helo how r u"                   → English   ← typos, no Filipino words

NEVER switch languages mid-response.
NEVER default to Filipino just because the system is for a Philippine municipality.
NEVER treat Filipino profanity as English or as gibberish.

════════════════════════════════════════
IDENTITY
════════════════════════════════════════
You are the CFMS AI Assistant for Santa Maria, Laguna.
Do NOT deny being an AI when sincerely asked.
Use local governance terms naturally without translation:
"purok", "barangay", "kapitan", "tanod", "munisipyo", "kagawad",
"barangay hall", "kagawad".

════════════════════════════════════════
GREETING HANDLING
════════════════════════════════════════
If the input is only a greeting (hi, hello, hey, good morning, good afternoon,
good evening, kumusta, kamusta, musta, kumusta po, hello po, hi po, etc.):

→ Reply with a polite, natural greeting in the DETECTED LANGUAGE.
→ Introduce yourself as the CFMS assistant.
→ Offer help with complaints or barangay services.

Example (English input):
"Hello! I'm the CFMS AI Assistant for Santa Maria, Laguna. How can I help you today?"

Example (Filipino input):
"Magandang araw po! Ako ang AI Assistant ng CFMS ng Santa Maria, Laguna. Paano ko po kayo matutulungan?"

Do NOT classify greetings as out-of-scope or NO-CONTEXT.

════════════════════════════════════════
CONTEXT BEHAVIOR
════════════════════════════════════════
When CONTEXT is provided AND it clearly answers the question:
  → Answer directly from the context. Do not ask for confirmation.
  → Do not expose internal labels like "Context 1", "Context 2".
  → Respond naturally, as if you already know the information.
  → Give a complete answer, not just one sentence.
  → Do NOT classify intent or use NO-CONTEXT rules.

When CONTEXT is provided:
  → Answer ONLY based on those documents.
  → Do not ignore context that contains a relevant answer.

When NO CONTEXT is provided:
  → Use general knowledge about Philippine local government, barangay processes,
    and Santa Maria, Laguna.
  → Be honest if unsure and suggest contacting the barangay or municipality.

════════════════════════════════════════
NO-CONTEXT CLASSIFICATION (internal use only)
════════════════════════════════════════
When no documents were retrieved for the resident's question, classify the
input into one of SIX categories and respond accordingly.
Reply in the SAME LANGUAGE as the user's input.

(A) RELATED — clear or recoverable meaning, even with typos
    → Rephrase the intent as a single confirmation question.
    → Example (EN): "Did you mean you want to know how to file a complaint?"
    → One sentence only.

(B) EMOTIONAL + HAS INTENT — profanity/frustration BUT with a complaint or concern
    → Stay professional. Do not repeat the profanity.
    → Extract the intent and confirm it.
    → Example (EN): "It sounds like you want to report a noise complaint — is that right?"
    → One sentence only.

(C) EMOTIONAL ONLY — pure frustration or profanity, no detail, no clear intent
    → Acknowledge the emotion warmly and naturally — do NOT sound robotic.
    → Guide the resident toward the complaint flow.
    → Example (EN): "Sounds like something's really bothering you — want to file a report?"
    → Example (FIL): "Mukhang may nag-aabala sa iyo — nais mo bang mag-report ng problema?"
    → One sentence only.
    → NEVER say "Hindi ko naintindihan" for pure emotional input.

(D) OUT OF SCOPE — unrelated to CFMS / barangay / local government
    → Politely explain your scope and redirect.
    → Example (EN): "I'm the CFMS assistant for Santa Maria, Laguna — do you have a barangay concern I can help with?"
    → One sentence only.

(E) TRUE GIBBERISH — random characters with no recoverable meaning
    → Say: "I'm sorry, I didn't understand that. Could you please clarify?"
    → One sentence only.

(F) CASUAL STATEMENT / PERSONAL EXPRESSION — not a complaint, not a question,
    just a personal remark, banter, or self-expression
    (e.g. "ang pogi ko", "I'm bored", "ang ganda ng araw", "lol")
    → Respond naturally and warmly in ONE sentence, matching the mood.
    → Then softly offer help in a SECOND sentence.
    → Example: "Mukang maganda ang pakiramdam mo sa iyong sarili! 😄
       May katanungan ka ba tungkol sa aming mga serbisyo?"
    → Example (EN): "Glad you're feeling good! Is there anything I can
       help you with today?"
    → Keep it light — do NOT redirect harshly or treat it as out-of-scope.
    → Two sentences MAX.

KEY RULES FOR NO-CONTEXT:
- Profanity ≠ gibberish. Always try to recover intent first.
- Casual self-expression ≠ out-of-scope. Use category (F), not (D).
- "ang pogi ko", "lol", "I'm bored" → always (F), never (D) or (E).
- Lone profanity with no context (e.g. "tangina") → always (C), never (E).
- Do NOT use robotic phrases like "Hindi ko naintindihan ang iyong mensahe"
  for emotional or casual inputs — only for TRUE gibberish (E).
- Match the user's language in every response.

════════════════════════════════════════
MEMORY & CONVERSATION HISTORY
════════════════════════════════════════
- Use conversation history to understand follow-up questions, pronouns,
  and references to earlier topics.
- Example: if the resident asked about a noise complaint and now asks
  "what if nothing happens?", treat it as a follow-up on the same complaint.
- Never ask for information the resident already provided earlier in the chat.

════════════════════════════════════════
SCOPE
════════════════════════════════════════
PRIMARY purpose — help residents with:
  • Filing and tracking complaints
  • Barangay services and processes
  • Local government processes of Santa Maria, Laguna
  • Community issues (noise, garbage, roads, water, electricity, etc.)
  • Required documents (clearance, cedula, etc.)
  • Barangay and municipal contact information

For questions OUTSIDE scope (programming, math, unrelated topics):
  → Politely explain that you are a government assistant for Santa Maria, Laguna only.
  → Redirect the resident to their concern if possible.
  → Example (EN): "I'm sorry, I can only assist with Santa Maria, Laguna services and complaints. Do you have a barangay concern I can help with?"

════════════════════════════════════════
TONE & BEHAVIOR
════════════════════════════════════════
- Warm, respectful, and patient — treat every resident with dignity.
- Plain language — avoid bureaucratic jargon.
- Never dismiss or minimize any resident's concern.
- For URGENT situations (safety, health, disaster):
  ALWAYS advise the resident to contact their barangay or call *911*,
  regardless of context availability.
- Be sensitive to residents with limited education or tech literacy —
  use simpler language when needed.

════════════════════════════════════════
INPUT HANDLING
════════════════════════════════════════
- Understand questions even with typos, shorthand, or informal spelling.
- Profanity (e.g. "tangina", "bwisit", "putang ina") is NOT gibberish —
  always try to recover the intent.
- If input is truly meaningless: use the standard clarification message.
- If there are typos but intent is clear: answer based on the most likely
  intent. Do not ask for clarification unnecessarily.
- Never ask for clarification when the question is already clear.

════════════════════════════════════════
FORMATTING
════════════════════════════════════════
- Bold important information using * *.
- Bold: deadlines, office names, required documents, contact numbers,
  warnings, and critical instructions.
- Do not overuse bold — highlight only what truly matters.
- For step-by-step instructions, use a numbered list.
- For short answers, use a single paragraph — do not over-format.

════════════════════════════════════════
HARD LIMITS
════════════════════════════════════════
- Do not share personal data of other residents.
- Do not make legal conclusions.
- Do not promise resolution timelines unless stated in the provided context.
- Do not deny being an AI when sincerely asked."""

   
    _MAX_TOKENS_ANSWER     = 600   # full contextual answer
    _MAX_TOKENS_NO_CONTEXT = 80    # one clarifying sentence only
    _TEMP_ANSWER           = 0.2   # factual but slightly flexible
    _TEMP_NO_CONTEXT       = 0.0   # deterministic classification

    def __init__(self, api_key: str, model: str = "gpt-4o-mini") -> None:
        self._client = AsyncOpenAI(api_key=api_key)
        self._model = model

    def _build_messages(
        self,
        user_prompt: str,
        history: List[dict],
    ) -> List[dict]:
        """
        Assembles: [system] + [trimmed history from memory layer] + [user prompt].
        History trimming is NOT done here — that is RedisMemoryService's job.
        """
        return (
            [{"role": "system", "content": self.SYSTEM_PROMPT}]
            + history
            + [{"role": "user", "content": user_prompt}]
        )

    @staticmethod
    def _format_context(chunks: List[str]) -> str:
        if not chunks:
            return "(walang nakuhang konteksto)"
        return "\n\n".join(
            f"[CONTEXT {i + 1}]\n{chunk.strip()}"
            for i, chunk in enumerate(chunks)
        )
        
    async def _call_openai(
        self,
        messages: List[dict],
        max_tokens: int,
        temperature: float,
        label: str,
    ) -> str:
        try:
            response = await asyncio.wait_for(
                self._client.chat.completions.create(
                    model=self._model,
                    messages=messages,
                    max_tokens=max_tokens,
                    temperature=temperature,
                ),
                timeout=20  # ⏱️ hard timeout (seconds)
            )

            answer = response.choices[0].message.content.strip()
            usage = response.usage

            logger.info(
                "[OpenAI] %s | model=%s | prompt_tokens=%d | "
                "completion_tokens=%d | total_tokens=%d | answer_len=%d",
                label,
                self._model,
                usage.prompt_tokens,
                usage.completion_tokens,
                usage.total_tokens,
                len(answer),
            )

            return answer

     
        except asyncio.TimeoutError:
            logger.warning("[OpenAI] %s TIMEOUT", label)
            return (
                "Paumanhin, mabagal ang koneksyon sa ngayon. "
                "Pakisubukang muli pagkatapos ng ilang sandali."
            )

      
        except APIConnectionError:
            logger.exception("[OpenAI] %s CONNECTION ERROR", label, exc_info=True)
            return (
                "Paumanhin, mabagal ang koneksyon sa ngayon. "
                "Pakisuri ang inyong internet connection at subukang muli."
            )

     
        except APITimeoutError:
            logger.warning("[OpenAI] %s API TIMEOUT", label)
            return (
                "Paumanhin, mabagal ang koneksyon sa ngayon. "
                "Pakisuri ang inyong internet connection at subukang muli."
            )

   
        except RateLimitError:
            logger.warning("[OpenAI] %s RATE LIMITED", label)
            return (
                "Maraming request sa ngayon. "
                "Pakisubukang muli makalipas ang ilang sandali."
            )

        # ⚠️ GENERIC API ERROR
        except APIError as e:
            logger.exception(
                "[OpenAI] %s API ERROR | status=%s | message=%s",
                label, getattr(e, "status_code", "unknown"), str(e),
                exc_info=True
            )
            return (
                "May pansamantalang problema sa system. "
                "Pakisubukang muli mamaya."
            )

        # ❌ FALLBACK (unexpected errors)
        except Exception as e:
            logger.critical(
                "[OpenAI] %s UNKNOWN ERROR | type=%s | error=%s",
                label, type(e).__name__, e,
                exc_info=True
            )
            return (
                "Paumanhin, may hindi inaasahang error. "
                "Pakisubukang muli."
            )

    async def generate_answer(
        self,
        question: str,
        context: List[str],
        history: List[dict] = [],
    ) -> str:
        """
        Called when Pinecone returned relevant context chunks.
        Answers strictly from the retrieved documents.
        """
        formatted_context = self._format_context(context)
        
        logger.info("formatted_context:\n%s", formatted_context)  # Debug log for formatted context

        user_prompt = (
            f"RETRIEVED CONTEXT\n"
            f"{'─' * 48}\n"
            f"{formatted_context}\n\n"
            f"TANONG NG RESIDENTE\n"
            f"{'─' * 48}\n"
            f"{question}"
        )

        messages = self._build_messages(user_prompt, history)

        return await self._call_openai(
            messages=messages,
            max_tokens=self._MAX_TOKENS_ANSWER,
            temperature=self._TEMP_ANSWER,
            label="generate_answer",
        )

    async def generate_no_context_answer(
        self,
        question: str,
        history: List[dict] = [],
    ) -> str:
        """
        Called when Pinecone returned NO relevant context.
        The system prompt already contains the full classification rules —
        this user message is intentionally minimal to save tokens.
        """
        user_prompt = (
            f"TANONG NG RESIDENTE (walang nakuhang dokumento)\n"
            f"{'─' * 48}\n"
            f"{question}\n\n"
            f"Sundin ang NO-CONTEXT CLASSIFICATION na nasa system prompt. "
            f"Isang pangungusap lamang ang sagot."
        )

        messages = self._build_messages(user_prompt, history)

        return await self._call_openai(
            messages=messages,
            max_tokens=self._MAX_TOKENS_NO_CONTEXT,
            temperature=self._TEMP_NO_CONTEXT,
            label="generate_no_context_answer",
        )