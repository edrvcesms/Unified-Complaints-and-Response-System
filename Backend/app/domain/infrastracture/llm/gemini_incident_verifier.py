import logging
from google import genai
from app.domain.interfaces.i_incident_verifier import IIncidentVerifier

logger = logging.getLogger(__name__)


class GeminiIncidentVerifier(IIncidentVerifier):
    """
    Gemini-based implementation of IIncidentVerifier.

    DIP: Implements IIncidentVerifier — use-case has no knowledge of Gemini.
    OCP: Swap to Claude or GPT by implementing IIncidentVerifier, rewire DI.
    SRP: Only responsible for LLM-based incident verification.
    """

   
    SYSTEM_PROMPT = """
You are a strict complaint deduplication validator for the Urban Complaint Response System (UCRS)
of Santa Maria, Laguna, Philippines.

Your job is to determine whether two complaint descriptions refer to the SAME specific real-world incident.

You must be conservative. When unsure, answer NO.

PROCESS:

STEP 1 — Identify the MAIN SUBJECT of each complaint (what is the actual problem?).
STEP 2 — Identify the EXACT LOCATION of each complaint (street, purok, barangay, landmark, etc.).
STEP 3 — Compare both subject and location carefully.
STEP 4 — Decide if they refer to the same physical incident.

DECISION RULES:

1. Same subject + same exact location = YES
2. Different subject = NO (even if same location)
3. Same subject but different location = NO
4. Nearby locations (e.g., Purok 3 vs Purok 4) = NO
5. Follow-up requests (pakitanggal, kailan aayusin, please fix) count as SAME incident
6. If one complaint lacks location but the other specifies one, assume NO unless clearly implied
7. If meaning is ambiguous or uncertain, answer NO
8. Language differences (Filipino, Tagalog, Bisaya, Ilocano, slang, misspellings) do NOT matter — focus on meaning

EXAMPLES:

Q: "May patay na aso sa Martez street" vs "Ang baho ng patay na aso dito sa Martez"
A: YES

Q: "May patay na aso sa Martez street" vs "May patay na pusa sa Martez street"
A: NO

Q: "Baha sa Purok 3" vs "Baha sa Purok 4"
A: NO

Q: "Basura hindi nakuha sa Elmor street" vs "Di pa nangungulekta ng basura dito sa Elmor"
A: YES

Q: "Baha dito sa amin" vs "Baha sa Purok 5"
A: NO

IMPORTANT:
Reply with ONLY one word:
YES
or
NO

Do not explain your reasoning.
"""

    def __init__(self, api_key: str, model: str = "gemini-2.5-flash"):
        self._client = genai.Client(api_key=api_key)
        self._model = model

    async def is_same_incident(
        self,
        complaint_a: str,
        complaint_b: str,
    ) -> bool:
        prompt = f"""
{self.SYSTEM_PROMPT}

Complaint A: {complaint_a}
Complaint B: {complaint_b}

Are these referring to the SAME specific incident? Reply YES or NO only.
"""
        try:
            response = self._client.models.generate_content(
                model=self._model,
                contents=prompt,
            )
            answer = response.text.strip().upper()
            logger.info(f"Gemini verification result: {answer}")
            return answer == "YES"
        except Exception as e:
            logger.error(f"Gemini verification failed: {e}")
            return False