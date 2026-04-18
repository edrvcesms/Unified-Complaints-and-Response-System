import httpx
from app.core.config import settings
from app.schemas.sms_schema import SendSMSRequest
from datetime import datetime, timedelta

async def send_sms(sms_data: SendSMSRequest) -> dict:
    payload = {
        "recipient": sms_data.recipient_number,
        "message": sms_data.message,
        "type": "plain",
        "sender_id": "PhilSMS",
        "schedule_time": (datetime.now() + timedelta(minutes=5)).strftime("%Y-%m-%d %H:%M")
    }

    headers = {
        "Authorization": f"Bearer {settings.PHILMSMS_API_TOKEN}",
        "Accept": "application/json"
    }
    
    try:
        async with httpx.AsyncClient(timeout=10) as client:
            response = await client.post(settings.PHILSMS_API_URL, json=payload, headers=headers)

        try:
            data = response.json()
        except ValueError:
            data = None

        if response.status_code >= 400:
            error_message = None
            if isinstance(data, dict):
                error_message = data.get("message") or data.get("detail") or data.get("error")
            if not error_message:
                error_message = response.text or "SMS service returned an error."

            return {
                "success": False,
                "error": error_message,
                "status_code": response.status_code,
                "data": data,
            }

        if isinstance(data, dict) and data.get("status") == "error":
            return {
                "success": False,
                "error": data.get("message") or "SMS service returned an error.",
                "status_code": response.status_code,
                "data": data,
            }

        message = data.get("message") if isinstance(data, dict) else None
        return {
            "success": True,
            "message": message or "Message sent.",
            "data": data.get("data") if isinstance(data, dict) else data or response.text,
        }

    except httpx.HTTPError as e:
        return {
            "success": False,
            "error": "SMS service unavailable.",
            "status_code": 502,
            "details": str(e),
        }
      