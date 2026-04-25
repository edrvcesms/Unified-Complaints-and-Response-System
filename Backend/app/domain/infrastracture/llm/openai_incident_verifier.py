import logging
from openai import AsyncOpenAI
from app.domain.interfaces.i_incident_verifier import IIncidentVerifier

logger = logging.getLogger(__name__)


class OpenAIIncidentVerifier(IIncidentVerifier):
    """
    OpenAI GPT-based implementation of IIncidentVerifier.

    DIP: Implements IIncidentVerifier — use-case has no knowledge of OpenAI.
    OCP: Swap providers by implementing IIncidentVerifier, rewire DI.
    SRP: Only responsible for LLM-based incident verification.
    """

    SYSTEM_PROMPT = """You are a deduplication validator for UCRS (Santa Maria, Laguna, PH).
Upstream checks already confirmed: (1) GPS proximity, (2) high semantic similarity.
Your only job: determine if two complaints describe the SAME problem at the SAME location.

PRIORITY RULE — evaluate in order, stop at first match:

1. EXPLICIT LOCATION CONFLICT (-> NO)
   Both complaints name a specific location (purok, street, sitio, landmark) AND they differ.
   "Purok 3" vs "Purok 4" -> NO. "Osmena St." vs "Rizal St." -> NO.
   One or both lack explicit location -> skip this rule, trust GPS.

2. DIFFERENT PROBLEM TYPE (-> NO)
   Core issues are clearly distinct after normalization (e.g., noise vs. flood).

3. DIFFERENT TIME EVENT (-> NO)
   Context clearly indicates separate events (e.g., "last month" vs. "today").

4. DEFAULT (-> YES)
   GPS and semantic checks passed. Paraphrases, language differences, and missing
   location text are not grounds for rejection.

NORMALIZATION (apply before deciding):
- Spelling/typos/slang/abbreviations are equivalent: "prk3"="purok 3", "basurra"="basura"
- Languages are equivalent: "ingay"="noise", "baha"="flood", "ilaw"="streetlight"
- Paraphrases are equivalent: "kapitbahay maingay" = "ingay ng kapitbahay"
- Follow-ups count as SAME: "hindi pa naaayos", "kailan aayusin", "still not fixed"

OUTPUT: Reply YES or NO only. No punctuation. No explanation."""

    def __init__(self, api_key: str, model: str = "gpt-4.1-mini"):
        self._client = AsyncOpenAI(api_key=api_key)
        self._model = model

    async def is_same_incident(
        self,
        complaint_a: str,
        complaint_b: str,
    ) -> bool:
        try:
            response = await self._client.chat.completions.create(
                model=self._model,
                messages=[
                    {"role": "system", "content": self.SYSTEM_PROMPT},
                    {
                        "role": "user",
                        "content": (
                            f"A: {complaint_a}\n"
                            f"B: {complaint_b}\n\n"
                            f"Same problem and location? YES or NO"
                        ),
                    },
                ],
                max_tokens=5,
                temperature=0,
            )
            answer = response.choices[0].message.content.strip().upper()
            logger.info(f"OpenAI verification result: {answer}")
            return answer == "YES"
        except Exception as e:
            logger.exception(f"OpenAI verification failed: {e}")
            return False