from exponent_server_sdk import (
    DeviceNotRegisteredError,
    PushClient,
    PushMessage,
    PushServerError,
    PushTicketError,
)
import requests
from requests.exceptions import ConnectionError, HTTPError


class ExpoPushService:
    def __init__(self, expo_token: str = None):
        self.session = requests.Session()

        headers = {
            "accept": "application/json",
            "accept-encoding": "gzip, deflate",
            "content-type": "application/json",
        }

        if expo_token:
            headers["Authorization"] = f"Bearer {expo_token}"

        self.session.headers.update(headers)
        self.client = PushClient(session=self.session)

    def send(
        self,
        token: str,
        title: str = None,
        body: str = "",
        data: dict = None,
        sound: str = "default",
    ) -> dict:
        """
        Send a push notification via Expo.

        Args:
            token (str): Expo push token
            title (str): Notification title
            body (str): Message body
            data (dict): Extra payload data
            sound (str): Notification sound

        Returns:
            dict: Response status
        """
        try:
            message = PushMessage(
                to=token,
                title=title,
                body=body,
                data=data or {},
                sound=sound,
            )

            response = self.client.publish(message)
            response.validate_response()

            return {
                "success": True,
                "message": "Notification sent successfully",
                "data": response.__dict__,
            }

        except DeviceNotRegisteredError:
            return {
                "success": False,
                "error": "Device not registered",
                "action": "Deactivate token in DB",
            }

        except PushTicketError as exc:
            return {
                "success": False,
                "error": "Push ticket error",
                "details": exc.push_response._asdict(),
            }

        except PushServerError as exc:
            return {
                "success": False,
                "error": "Expo server error",
                "details": exc.errors,
            }

        except (ConnectionError, HTTPError) as exc:
            return {
                "success": False,
                "error": "Network error",
                "details": str(exc),
            }

        except Exception as exc:
            return {
                "success": False,
                "error": "Unexpected error",
                "details": str(exc),
            }