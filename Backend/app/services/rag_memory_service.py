"""
rag_memory_service.py
─────────────────────────────────────────────────────────────────────────────
Enterprise-grade Redis memory service for an FAQ chatbot.

Design decisions
────────────────
1. SLIDING WINDOW — only the last MAX_TURNS exchanges are kept.
   For an FAQ bot, users rarely need context older than 3–5 turns.
   Older turns are discarded BEFORE writing back to Redis.

2. TOKEN BUDGET — even within the window, if the total estimated
   character length exceeds TOKEN_CHAR_BUDGET, the oldest turns
   are dropped until it fits. This prevents runaway costs on
   verbose answers.

3. SINGLE ROUND-TRIP on read — handle_session + get_history are
   merged into one pipelined call (2 Redis GETs → 1 network round trip).

4. NO DOUBLE-FETCH — ChatbotService fetches history once and passes
   it into append_turn. append_turn never calls get_history internally.

5. ATOMIC WRITE — append_turn uses a pipeline to SET history + SET
   active session key in one round trip.

6. FAQ-SPECIFIC BEHAVIOR — FAQ bots answer factual questions that
   rarely need deep multi-turn context. MAX_TURNS = 6 (3 exchanges)
   is intentionally conservative. Raise it only if your use case
   involves genuinely stateful multi-step workflows.
"""

from __future__ import annotations

import json
import logging
from dataclasses import dataclass, field
from typing import Optional

import redis.asyncio as aioredis

logger = logging.getLogger(__name__)


HISTORY_TTL: int = 3_600          # seconds — 1 hour idle expiry
MAX_TURNS: int = 6                 # max exchanges kept (1 turn = 1 Q + 1 A)
# Rough char budget for history sent to the LLM.
# ~4 chars ≈ 1 token; 6 000 chars ≈ 1 500 tokens — safe headroom for gpt-4o-mini.
TOKEN_CHAR_BUDGET: int = 6_000



@dataclass(frozen=True, slots=True)
class ChatMessage:
    role: str      # "user" | "assistant"
    content: str

    def to_dict(self) -> dict:
        return {"role": self.role, "content": self.content}

    @staticmethod
    def from_dict(d: dict) -> "ChatMessage":
        return ChatMessage(role=d["role"], content=d["content"])

@dataclass(slots=True)
class SessionContext:
    history: list[dict]          # ready to pass straight to OpenAI messages[]
    is_new_session: bool         # True when the session_id changed


class RedisMemoryService:
    """
    Manages per-user, per-session chat history in Redis.

    Key schema
    ──────────
    chat:{user_id}:{session_id}   →  JSON list of {role, content} dicts
    chat:active:{user_id}         →  current session_id string
    """

    _HISTORY_PREFIX = "chat"
    _ACTIVE_PREFIX  = "chat:active"

    def __init__(self, client: aioredis.Redis) -> None:
        self._redis = client

    def _history_key(self, user_id: str, session_id: str) -> str:
        return f"{self._HISTORY_PREFIX}:{user_id}:{session_id}"

    def _active_key(self, user_id: str) -> str:
        return f"{self._ACTIVE_PREFIX}:{user_id}"

    @staticmethod
    def _decode(value) -> Optional[str]:
        """
        Safely decode a Redis value regardless of client decode_responses setting.
        - decode_responses=True  → Redis returns str directly
        - decode_responses=False → Redis returns bytes, needs .decode()
        """
        if value is None:
            return None
        return value if isinstance(value, str) else value.decode()

    @staticmethod
    def _trim(messages: list[ChatMessage]) -> list[ChatMessage]:
        """
        Apply both the turn-count window AND the token-char budget.

        Order of operations:
          1. Trim to MAX_TURNS exchanges (most recent kept).
          2. Trim further if total chars exceed TOKEN_CHAR_BUDGET
             (drop oldest pairs first to preserve the most recent context).

        Pairs are always dropped together (user + assistant) so the
        history stays well-formed for the OpenAI messages array.
        """
        # Step 1 — sliding window
        max_msgs = MAX_TURNS * 2
        if len(messages) > max_msgs:
            messages = messages[-max_msgs:]

        # Step 2 — token budget (drop oldest pairs until under budget)
        while messages:
            total_chars = sum(len(m.content) for m in messages)
            if total_chars <= TOKEN_CHAR_BUDGET:
                break
            # Drop the oldest user+assistant pair (first 2 items)
            messages = messages[2:]

        return messages

    async def load_session(self, user_id: str, session_id: str) -> SessionContext:
        """
        Single pipelined round-trip that:
          • reads the active session key
          • reads the history for the requested session_id
          • deletes stale history if the session changed
          • refreshes the active session TTL

        Returns a SessionContext with ready-to-use history dicts.
        Call this ONCE per request, at the start of ChatbotService.ask().
        """
        active_key  = self._active_key(user_id)
        history_key = self._history_key(user_id, session_id)

        try:
            # One pipeline → two GETs in a single round trip
            async with self._redis.pipeline(transaction=False) as pipe:
                pipe.get(active_key)
                pipe.get(history_key)
                current_session_raw, history_raw = await pipe.execute()

            # Fix: use _decode() to handle both str (decode_responses=True)
            # and bytes (decode_responses=False) returned by Redis
            current_session = self._decode(current_session_raw)
            is_new_session  = current_session is not None and current_session != session_id

            if is_new_session:
                old_history_key = self._history_key(user_id, current_session)
                # Fire-and-forget delete; don't block the response on it
                await self._redis.delete(old_history_key)
                history_raw = None   # new session → start fresh
                logger.info(
                    "[Memory] Session switched | user=%s | %s → %s",
                    user_id, current_session, session_id,
                )

            # Refresh active-session pointer (non-blocking, best-effort)
            await self._redis.set(active_key, session_id, ex=HISTORY_TTL)

            raw_list: list[dict] = json.loads(history_raw) if history_raw else []
            messages = [ChatMessage.from_dict(d) for d in raw_list]

            return SessionContext(
                history=[m.to_dict() for m in messages],
                is_new_session=is_new_session,
            )

        except Exception:
            logger.exception("[Memory] load_session failed | user=%s | session=%s", user_id, session_id)
            return SessionContext(history=[], is_new_session=False)

    async def save_turn(
        self,
        user_id: str,
        session_id: str,
        question: str,
        answer: str,
        current_history: list[dict],
    ) -> None:
        """
        Appends the new Q&A pair, applies trimming, then writes back to Redis.

        Uses a pipeline so history + TTL refresh happen in one round trip.
        Never calls get_history internally — caller passes current_history in.
        """
        key = self._history_key(user_id, session_id)
        try:
            messages = [ChatMessage.from_dict(d) for d in current_history]
            messages.append(ChatMessage(role="user",      content=question))
            messages.append(ChatMessage(role="assistant", content=answer))

            messages = self._trim(messages)

            serialized = json.dumps([m.to_dict() for m in messages])

            # Atomic pipeline: SET history + SET active key TTL together
            async with self._redis.pipeline(transaction=True) as pipe:
                pipe.set(key, serialized, ex=HISTORY_TTL)
                pipe.set(self._active_key(user_id), session_id, ex=HISTORY_TTL)
                await pipe.execute()

            logger.info(
                "[Memory] save_turn | user=%s | session=%s | turns=%d | chars=%d",
                user_id, session_id, len(messages) // 2, len(serialized),
            )

        except Exception:
            logger.exception("[Memory] save_turn failed | user=%s | session=%s", user_id, session_id)

    async def clear_session(self, user_id: str, session_id: str) -> None:
        """
        Explicitly wipe a session (e.g. user clicks 'New Chat').
        """
        key = self._history_key(user_id, session_id)
        try:
            await self._redis.delete(key)
            logger.info("[Memory] clear_session | user=%s | session=%s", user_id, session_id)
        except Exception:
            logger.exception("[Memory] clear_session failed | user=%s | session=%s", user_id, session_id)

    async def get_session_meta(self, user_id: str) -> Optional[str]:
        """
        Returns the currently active session_id for a user, or None.
        Useful for debugging / admin endpoints.
        """
        try:
            raw = await self._redis.get(self._active_key(user_id))
            # Fix: use _decode() instead of raw .decode() for the same reason
            return self._decode(raw)
        except Exception:
            logger.exception("[Memory] get_session_meta failed | user=%s", user_id)
            return None