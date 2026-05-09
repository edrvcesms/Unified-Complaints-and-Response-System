import logging
from dataclasses import dataclass
from openai import AsyncOpenAI
from app.domain.interfaces.i_incident_verifier import IIncidentVerifier

logger = logging.getLogger(__name__)


@dataclass
class VerificationResult:
    is_same_incident: bool
    is_emergency: bool


class OpenAIIncidentVerifier(IIncidentVerifier):
    """
    OpenAI GPT-based implementation of IIncidentVerifier.

    DIP: Implements IIncidentVerifier — use-case has no knowledge of OpenAI.
    OCP: Swap providers by implementing IIncidentVerifier, rewire DI.
    SRP: Only responsible for LLM-based incident verification.
    """

    SYSTEM_PROMPT = """You are a deduplication validator for UCRS (Santa Maria, Laguna, PH).
Upstream checks already confirmed: (1) GPS proximity, (2) high semantic similarity.

Answer TWO questions about the complaint pair.

QUESTION 1 — SAME INCIDENT:
Determine if complaints A and B describe the SAME problem at the SAME location.

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

QUESTION 2 — EMERGENCY:
Determine if either complaint describes a situation requiring immediate response.
Emergency examples: fire, landslide, flood, stabbing, death, serious injury,
drowning, building collapse, armed threat, medical emergency.
Non-emergency: noise complaints, garbage, broken streetlights, potholes.

NORMALIZATION (apply before deciding):
- Spelling/typos/slang/abbreviations are equivalent: "prk3"="purok 3", "basurra"="basura"
- Languages are equivalent: "ingay"="noise", "baha"="flood", "sunog"="fire", "patay"="dead"
- Paraphrases are equivalent: "kapitbahay maingay" = "ingay ng kapitbahay"
- Follow-ups count as SAME: "hindi pa naaayos", "kailan aayusin", "still not fixed"

OUTPUT FORMAT — exactly two lines, no punctuation, no explanation:
SAME: YES or NO
EMERGENCY: YES or NO"""

    EMERGENCY_SYSTEM_PROMPT = """You are an emergency detector for UCRS (Santa Maria, Laguna, PH).

Determine if the complaint describes a situation requiring immediate response.
Emergency examples: fire, landslide, flood, stabbing, death, serious injury,
drowning, building collapse, armed threat, medical emergency.
Non-emergency: noise complaints, garbage, broken streetlights, potholes.

NORMALIZATION:
- Spelling/typos/slang/abbreviations are equivalent: "sunog"="fire", "baha"="flood", "patay"="dead"
- Languages are equivalent: Filipino, Tagalog, English, mixed

OUTPUT FORMAT — exactly one line, no punctuation, no explanation:
EMERGENCY: YES or NO"""

    def __init__(self, api_key: str, model: str = "gpt-4.1-mini"):
        self._client = AsyncOpenAI(api_key=api_key)
        self._model = model

    async def is_same_incident(
        self,
        complaint_a: str,
        complaint_b: str,
    ) -> VerificationResult:
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
                            f"Same problem and location? Is it an emergency?"
                        ),
                    },
                ],
                max_tokens=10,
                temperature=0,
            )
            answer = response.choices[0].message.content.strip().upper()
            logger.info(f"OpenAI verification result: {answer}")

            is_same = False
            is_emergency = False
            for line in answer.splitlines():
                line = line.strip()
                if line.startswith("SAME:"):
                    is_same = "YES" in line
                elif line.startswith("EMERGENCY:"):
                    is_emergency = "YES" in line

            return VerificationResult(is_same_incident=is_same, is_emergency=is_emergency)

        except Exception as e:
            logger.exception(f"OpenAI verification failed: {e}")
            return VerificationResult(is_same_incident=False, is_emergency=False)

    async def detect_emergency(self, complaint: str) -> VerificationResult:
        try:
            response = await self._client.chat.completions.create(
                model=self._model,
                messages=[
                    {"role": "system", "content": self.EMERGENCY_SYSTEM_PROMPT},
                    {"role": "user", "content": complaint},
                ],
                max_tokens=5,
                temperature=0,
            )
            answer = response.choices[0].message.content.strip().upper()
            logger.info(f"OpenAI emergency detection result: {answer}")

            is_emergency = "YES" in answer
            return VerificationResult(is_same_incident=False, is_emergency=is_emergency)

        except Exception as e:
            logger.exception(f"OpenAI emergency detection failed: {e}")
            return VerificationResult(is_same_incident=False, is_emergency=False)