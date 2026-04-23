from openai import AsyncOpenAI
import logging
import os


logger = logging.getLogger(__name__)
client = AsyncOpenAI(api_key=os.getenv("OPEN_AI_API_KEY"))

async def translate_to_english(text: str) -> str:
    if not text or not text.strip():
        return text

    try:
        response = await client.chat.completions.create(
            model="gpt-5-mini-2025-08-07",
            messages=[
                {
                    "role": "system",
                    "content": (
                        "You are a translation assistant for a Filipino barangay complaint system. "
                        "Your job is to translate complaint text into clean, natural English. "
                        "The text may be in:\n"
                        "- Pure Tagalog (e.g. 'Sira ang ilaw sa kalsada')\n"
                        "- Taglish/mixed (e.g. 'Yung streetlight sa San Jose ay broken na')\n"
                        "- English (return as-is, just clean up minor grammar)\n\n"
                        "Rules:\n"
                        "1. Translate the MEANING, not word-for-word\n"
                        "2. Preserve important details: location names, landmarks, street names\n"
                        "3. Preserve the complaint's urgency and context\n"
                        "4. Return ONLY the translated English text\n"
                        "5. No explanations, no quotes, no preamble"
                    )
                },
                {"role": "user", "content": text}
            ],
        )
        translated = response.choices[0].message.content.strip()
        logger.info(f"  Original   : '{text[:120]}'")
        logger.info(f"  Translated : '{translated[:120]}'")
        return translated

    except Exception as e:
        logger.error(f"Translation failed (returning original): {e}")
        return text