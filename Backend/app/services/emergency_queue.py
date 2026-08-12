import json
from app.core.redis import redis_client
from typing import List, Dict, Any
from app.utils.logger import logger

emergency_prefix = "emergency_queue"

def _key(user_id: int) -> str:
    return f"{emergency_prefix}:{user_id}"
  
async def add_emergency(user_id: int | str, incident_id: int, payload: Dict[str, Any]) -> None:
    await redis_client.hset(_key(user_id), str(incident_id), json.dumps(payload))


async def remove_emergency(user_id: int | str, incident_id: int) -> None:
    await redis_client.hdel(_key(user_id), str(incident_id))


async def get_active_emergencies(user_id: int | str) -> List[Dict[str, Any]]:
    raw = await redis_client.hgetall(_key(user_id))
    items = []
    for field, value in raw.items():
        try:
            incident_id = field.decode() if isinstance(field, bytes) else field
            payload = value.decode() if isinstance(value, bytes) else value
            data = json.loads(payload)
            data["incidentId"] = int(incident_id)
            items.append(data)
        except Exception:
            continue
          
    logger.info(f"Retrieved {len(items)} active emergencies for user_id={user_id}")
    return items