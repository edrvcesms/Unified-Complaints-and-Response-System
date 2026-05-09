# app/infrastructure/ai/openai_emergency_classifier.py
import json
import logging
from openai import AsyncOpenAI, APIConnectionError, APIStatusError, APITimeoutError
from app.domain.interfaces.i_emergency_classifier import IEmergencyClassifier
from app.schemas.emergency_schema import EmergencyClassifyRequest, EmergencyClassifyResponse

logger = logging.getLogger(__name__)


class ClassifierError(Exception):
    """Base error for classifier failures."""
    def __init__(self, message: str, status_code: int = 500):
        self.message = message
        self.status_code = status_code
        super().__init__(message)


class OpenAIEmergencyClassifier(IEmergencyClassifier):

    def __init__(self, api_key: str, model: str = "gpt-4o", max_tokens: int = 200):
        self._client = AsyncOpenAI(api_key=api_key)
        self._model = model
        self._max_tokens = max_tokens

    async def classify(self, data: EmergencyClassifyRequest) -> EmergencyClassifyResponse:
        self._validate_input(data)

        try:
            prompt = self._build_prompt(data)

            response = await self._client.chat.completions.create(
                model=self._model,
                max_tokens=self._max_tokens,
                messages=[{"role": "user", "content": prompt}],
                response_format={"type": "json_object"},
                timeout=10.0,
            )

        except APITimeoutError:
            logger.error("OpenAI API timed out")
            raise ClassifierError(
                message="The AI classifier timed out. Please try again.",
                status_code=504,
            )

        except APIConnectionError:
            logger.error("Failed to connect to OpenAI API")
            raise ClassifierError(
                message="Unable to reach the AI classifier. Please try again later.",
                status_code=503,
            )

        except APIStatusError as e:
            logger.error(f"OpenAI API returned status {e.status_code}: {e.message}")

            if e.status_code == 401:
                raise ClassifierError(
                    message="AI classifier authentication failed. Contact support.",
                    status_code=500,
                )
            elif e.status_code == 429:
                raise ClassifierError(
                    message="AI classifier is currently overloaded. Please try again shortly.",
                    status_code=429,
                )
            elif e.status_code == 402:
                raise ClassifierError(
                    message="AI classifier quota exceeded. Contact support.",
                    status_code=500,
                )
            else:
                raise ClassifierError(
                    message="AI classifier encountered an unexpected error. Please try again.",
                    status_code=502,
                )

        return self._parse_response(response)

    def _validate_input(self, data: EmergencyClassifyRequest) -> None:
        if not data.title or not data.title.strip():
            raise ClassifierError(
                message="Complaint title must not be empty.",
                status_code=422,
            )
        if not data.description or not data.description.strip():
            raise ClassifierError(
                message="Complaint description must not be empty.",
                status_code=422,
            )
        if len(data.title) > 200:
            raise ClassifierError(
                message="Complaint title must not exceed 200 characters.",
                status_code=422,
            )
        if len(data.description) > 2000:
            raise ClassifierError(
                message="Complaint description must not exceed 2000 characters.",
                status_code=422,
            )

    def _parse_response(self, response) -> EmergencyClassifyResponse:
        raw = response.choices[0].message.content

        if not raw or not raw.strip():
            logger.error("OpenAI returned an empty response")
            raise ClassifierError(
                message="AI classifier returned an empty response. Please try again.",
                status_code=502,
            )

        try:
            parsed = json.loads(raw.strip())
        except json.JSONDecodeError:
            logger.error(f"OpenAI returned invalid JSON: {raw}")
            raise ClassifierError(
                message="AI classifier returned an unreadable response. Please try again.",
                status_code=502,
            )

        required_fields = {"is_emergency", "agency", "confidence", "reason"}
        missing = required_fields - parsed.keys()
        if missing:
            logger.error(f"OpenAI response missing fields: {missing}")
            raise ClassifierError(
                message="AI classifier returned an incomplete response. Please try again.",
                status_code=502,
            )

        valid_agencies = {"BFP", "PNP", "MDRRMO"}
        if parsed.get("agency") not in valid_agencies | {None}:
            logger.warning(f"OpenAI returned unknown agency: {parsed.get('agency')}")
            parsed["agency"] = None

        if parsed.get("confidence") not in {"high", "medium", "low"}:
            logger.warning(f"OpenAI returned unexpected confidence: {parsed.get('confidence')}")
            parsed["confidence"] = "low"

        try:
            return EmergencyClassifyResponse(**parsed)
        except Exception as e:
            logger.error(f"Failed to construct EmergencyClassifyResponse: {e}")
            raise ClassifierError(
                message="AI classifier response could not be processed. Please try again.",
                status_code=502,
            )

    def _build_prompt(self, data: EmergencyClassifyRequest) -> str:
        return f"""You are an emergency classifier for a barangay complaint system in the Philippines.

Given a complaint, determine if it requires IMMEDIATE emergency response and which single agency should be contacted.

Complaint Title: {data.title}
Complaint Description: {data.description}

Agencies:
- BFP (Bureau of Fire Protection): fires, explosions, rescue from structures
- PNP (Philippine National Police): crimes, violence, threats, theft, assault
- MDRRMO (Disaster Risk Reduction): flooding, landslide, typhoon, calamity, collapsed structures

Respond ONLY with a JSON object, no markdown, no explanation:
{{
  "is_emergency": true or false,
  "agency": "BFP" | "PNP" | "MDRRMO" | null,
  "confidence": "high" | "medium" | "low",
  "reason": "brief reason or null"
}}

Rules:
- Only mark is_emergency as true for ACTIVE, ONGOING emergencies
- Pick only ONE agency — the most relevant one to the complaint
- Set agency to null if is_emergency is false
- Do NOT flag general complaints, noise, garbage, property disputes"""