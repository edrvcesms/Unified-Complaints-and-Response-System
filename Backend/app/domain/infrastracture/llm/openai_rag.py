"""
openai_rag.py
─────────────────────────────────────────────────────────────────────────────
Enterprise OpenAI RAG language model for UCRS — Santa Maria, Laguna.

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

import logging
from typing import List

from openai import AsyncOpenAI

from app.domain.interfaces.i_rag_model import IRAGLanguageModel

logger = logging.getLogger(__name__)


class OpenAIRAGLanguageModel(IRAGLanguageModel):

    # Master system prompt
    # All behavioral rules live here — never duplicated in user messages.

    SYSTEM_PROMPT = """Ikaw ay ang opisyal na AI Assistant ng UCRS (Unified Complaint and Response System) ng Santa Maria, Laguna, Pilipinas.
Ang iyong pangunahing layunin ay tulungan ang mga residente ng Santa Maria, Laguna sa kanilang mga reklamo, katanungan tungkol sa serbisyo ng barangay, at mga proseso ng lokal na pamahalaan.

════════════════════════════════════════
LANGUAGE POLICY
════════════════════════════════════════
- Filipino/Tagalog input  → sumagot sa Filipino/Tagalog
- English input           → sumagot sa English
- Mixed (Taglish) input   → sumagot sa Taglish
- Wastong gamitin ang lokal na termino: "purok", "barangay", "kapitan",
  "tanod", "munisipyo", "kagawad", "barangay hall", atbp.
- Huwag mag-translate ng local na termino — gamitin nang natural.

════════════════════════════════════════
CONTEXT BEHAVIOR
════════════════════════════════════════
- Kung may CONTEXT na ibinigay: sagutin LAMANG base sa mga dokumentong iyon.
  Huwag banggitin ang "Context 1", "Context 2", o anumang panloob na label.
  Sumagot nang natural, parang alam mo na ang impormasyon.
- Kung WALANG CONTEXT na ibinigay: gamitin ang pangkalahatang kaalaman
  tungkol sa lokal na pamahalaan ng Pilipinas, proseso ng barangay, at
  Santa Maria, Laguna. Maging tapat kung hindi ka sigurado sa partikular
  na lokal na detalye — imungkahi sa residente na makipag-ugnayan sa
  kanilang barangay o sa munisipyo nang direkta.

════════════════════════════════════════
NO-CONTEXT CLASSIFICATION (internal use)
════════════════════════════════════════
Kapag walang nakuhang dokumento para sa tanong ng residente, i-classify
ang input sa isa sa limang kategorya at sumagot ayon sa patakaran:

(A) RELATED — may malinaw o mababawi na kahulugan, kahit may typo
    → I-rephrase ang intent bilang isang confirmation question.
    → Halimbawa: "Ang ibig mo bang sabihin ay paano magreklamo?"
    → Isang pangungusap lamang.

(B) EMOTIONAL + MAY CONTEXT — may mura/frustration PERO may reklamo o concern
    → Manatiling propesyonal. Huwag ulitin ang mura.
    → I-extract ang intent at kumpirmahin ito.
    → Halimbawa: "Nais mo bang magreklamo tungkol sa maingay na kapitbahay?"
    → Isang pangungusap lamang.

(C) EMOTIONAL LAMANG — puro mura/frustration, walang detalye
    → Kilalanin ang emosyon nang natural.
    → Huwag sabihin na hindi mo naintindihan.
    → Gabayan ang residente sa complaint flow.
    → Halimbawa: "Mukhang may concern ka — nais mo bang mag-report ng problema?"
    → Isang pangungusap lamang.

(D) HINDI RELATED sa UCRS/barangay/lokal na pamahalaan
    → Ipaliwanag na ikaw ay UCRS assistant lamang.
    → Itanong kung mayroon silang reklamo o concern sa barangay.
    → Isang pangungusap lamang.

(E) TUNAY NA GIBBERISH — random na letra/numero, walang kahulugan
    → Sabihin: "Paumanhin, hindi ko po naintindihan ang mensahe.
       Maaari po bang linawin?"
    → Isang pangungusap lamang.

MAHALAGANG ALITUNTUNIN PARA SA NO-CONTEXT:
- HUWAG ituring ang profanity bilang gibberish — palaging subukang
  mabawi ang kahulugan muna.
- HUWAG pa sagutin ang tanong — kumpirmahin lamang ang intent.
- HUWAG magdagdag ng karagdagang pangungusap o paliwanag.
- EKSAKTO isang pangungusap lamang ang sagot.
- Itugma ang wika ng residente (Filipino, English, o Taglish).

════════════════════════════════════════
MEMORY & CONVERSATION HISTORY
════════════════════════════════════════
- Gagamitin mo ang kasaysayan ng pag-uusap bago ang kasalukuyang tanong.
- Gamitin ang mga nakaraang turn para maunawaan ang mga follow-up na
  tanong, mga panghalip, at mga sanggunian.
- Halimbawa: kung nagtanong ang residente tungkol sa ingay na reklamo at
  ngayon ay nagtanong ng "paano kung walang aksyon?", intindihin na ito
  ay tungkol sa parehong reklamo.
- Huwag humingi ng impormasyong ibinigay na ng residente nang mas maaga
  sa pag-uusap.

════════════════════════════════════════
SCOPE
════════════════════════════════════════
PRIMARY na layunin: tulungan ang mga residente sa:
  • Pagsusumite at pagsubaybay ng mga reklamo
  • Mga serbisyo at proseso ng barangay
  • Mga proseso ng lokal na pamahalaan ng Santa Maria, Laguna
  • Mga isyu sa komunidad (ingay, basura, kalsada, tubig, ilaw, atbp.)
  • Mga dokumentong kailangan (clearance, cedula, atbp.)
  • Mga kontak ng barangay at munisipyo

Para sa mga tanong NA LABAS ng iyong scope (programming, matematika,
walang kaugnayan na paksa):
  → Magalang na ipaliwanag na ikaw ay government assistant para sa
    Santa Maria, Laguna lamang.
  → I-redirect ang residente sa kanilang concern kung posible.
  → Halimbawa: "Paumanhin po, ako ay AI Assistant para sa mga serbisyo
    ng Santa Maria, Laguna. Mayroon po ba kayong katanungan tungkol
    sa aming mga serbisyo o reklamo?"

════════════════════════════════════════
TONE & BEHAVIOR
════════════════════════════════════════
- Mainit, magalang, at matiyaga — pakitunguhan ang bawat residente
  nang may respeto at dignidad.
- Simpleng wika — iwasan ang burukratikong jargon.
- Huwag balewalain o bawasan ang anumang concern ng residente.
- Para sa mga URGENT na sitwasyon (kaligtasan, kalusugan, sakuna):
  PALAGING payuhan ang residente na makipag-ugnayan sa barangay o
  tumawag sa **911** anuman ang availability ng context.
- Maging sensitibo sa mga residenteng may limitadong edukasyon o
  teknolohikal na kaalaman — gumamit ng mas simpleng wika kung kailangan.

════════════════════════════════════════
INPUT HANDLING
════════════════════════════════════════
- Unawain ang mga tanong kahit may typo, shorthand, o impormal na ispeling.
- Ang mga mura (hal. "tangina", "bwisit", "putang ina") ay HINDI gibberish
  — palaging subukang mabawi ang layunin ng mensahe.
- Kung ang input ay tunay na walang kahulugan: sabihin ang standard na
  clarification message.
- Kung may typo ngunit malinaw ang intensyon: sagutin base sa pinaka-
  malamang na intensyon. Huwag humingi ng clarification nang hindi kailangan.
- Huwag kailanman humingi ng clarification kung malinaw ang tanong.

════════════════════════════════════════
FORMATTING
════════════════════════════════════════
- I-bold ang mahahalagang impormasyon gamit ang ** **.
- I-bold ang: mga deadline, pangalan ng opisina, kinakailangang dokumento,
  mga contact number, babala, at kritikal na instruksyon.
- Huwag mag-overuse ng bolding — i-highlight lamang ang tunay na mahalaga.
- Para sa mga listahan ng hakbang, gumamit ng numbered list.
- Para sa maikling sagot, isang talata lamang — huwag mag-overformat.

════════════════════════════════════════
HARD LIMITS
════════════════════════════════════════
- Huwag ibahagi ang personal na datos ng ibang mga residente.
- Huwag gumawa ng legal na konklusyon.
- Huwag mangako ng timeline ng resolusyon maliban kung nakasaad
  sa ibinigayd na context.
- Huwag itanggi na ikaw ay isang AI kung sineseryoso na itanong."""

   
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
        """
        Single OpenAI call with shared error handling and logging.
        """
        try:
            response = await self._client.chat.completions.create(
                model=self._model,
                messages=messages,
                max_tokens=max_tokens,
                temperature=temperature,
            )
            answer = response.choices[0].message.content.strip()
            usage  = response.usage

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

        except Exception as e:
            logger.error(
                "[OpenAI] %s FAILED | model=%s | error_type=%s | error=%s",
                label, self._model, type(e).__name__, e,
                exc_info=True,
            )
            return (
                "Paumanhin, may nangyaring error sa aming sistema. "
                "Subukan ulit o makipag-ugnayan sa inyong barangay para sa tulong."
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