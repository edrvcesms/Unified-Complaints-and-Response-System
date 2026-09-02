from fastapi import HTTPException, status
from fastapi.responses import JSONResponse

from app.schemas.web_push_schema import (
    PushSubscriptionSchema,
    PushNotificationPayload,
)
from app.models.push_subscriptions import PushSubscription
from app.core.config import settings
from app.utils.logger import logger
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select
from pywebpush import webpush, WebPushException
from py_vapid import Vapid02
from cryptography.hazmat.primitives.serialization import Encoding, PublicFormat
import base64
import json


# ============================================================
# VAPID CONFIGURATION
# ============================================================

VAPID_SUBJECT = settings.VAPID_SUBJECT

# Railway stores the PEM as Base64
VAPID_PRIVATE_KEY_PEM = base64.b64decode(
    settings.VAPID_PRIVATE_KEY
).decode("utf-8")


try:
    VAPID = Vapid02.from_pem(
        VAPID_PRIVATE_KEY_PEM.encode("utf-8")
    )

    logger.info("[WebPush] VAPID private key loaded successfully")

except Exception as e:
    logger.exception(
        f"[WebPush] Failed to load VAPID private key: {e}"
    )
    raise


async def send_web_push_notification(
    user_id: int,
    push_notif: dict,
    db: AsyncSession,
):
    try:
        result = await db.execute(
            select(PushSubscription).where(
                PushSubscription.user_id == user_id,
                PushSubscription.is_active == True,
            )
        )

        subscriptions = result.scalars().all()

        if not subscriptions:
            logger.info(
                f"[WebPush] No active subscriptions for user {user_id}"
            )
            return
        
        for subscription in subscriptions:

            payload = {
                "title": push_notif["title"],
                "body": push_notif["body"],
                "icon": push_notif["icon"],
                "url": push_notif["url"],
            }

            subscription_info = {
                "endpoint": subscription.endpoint,
                "keys": {
                    "p256dh": subscription.p256dh,
                    "auth": subscription.auth,
                },
            }

            try:
                logger.info(
                    f"[WebPush] Sending notification to "
                    f"subscription {subscription.id}"
                )
                

                logger.info(
                    f"[WebPush] Endpoint: {subscription.endpoint}"
                )
            

                logger.info(
                    f"[WebPush] Payload: {payload}"
                )

                response = webpush(
                    subscription_info=subscription_info,
                    data=json.dumps(payload),
                    vapid_private_key=VAPID,
                    vapid_claims={
                        "sub": VAPID_SUBJECT,
                    },
                    ttl=86400,
                )

                logger.info(
                    f"[WebPush] Successfully sent notification "
                    f"to user {user_id}"
                )

                logger.info(
                    f"[WebPush] Response status: "
                    f"{response.status_code}"
                )

                logger.info(
                    f"[WebPush] Subscription ID: "
                    f"{subscription.id}"
                )

            except WebPushException as e:
                logger.error(
                    f"[WebPush] Response body: "
                    f"{repr(e.response.text)}"
                )

                logger.error(
                    f"[WebPush] Failed to send push notification "
                    f"to user {user_id}: {str(e)}"
                )

                if e.response:

                    logger.error(
                        f"[WebPush] Response status: "
                        f"{e.response.status_code}"
                    )

                    logger.error(
                        f"[WebPush] Response body: "
                        f"{e.response.text}"
                    )
                    
                    if e.response.status_code in (404, 410):

                        logger.warning(
                            f"[WebPush] Deactivating expired "
                            f"subscription {subscription.id}"
                        )

                        subscription.is_active = False

                        await db.commit()
                        
                    continue

            except Exception as e:

                logger.exception(
                    f"[WebPush] Unexpected error while sending "
                    f"to subscription {subscription.id}: {e}"
                )

        logger.info(
            f"[WebPush] Finished processing push notifications "
            f"for user {user_id}"
        )

    except HTTPException:
        raise

    except Exception as e:

        await db.rollback()

        logger.exception(
            f"[WebPush] Error while sending notification "
            f"to user {user_id}: {e}"
        )


# ============================================================
# SUBSCRIBE USER
# ============================================================

async def subscribe_user_to_push_notifications(
    user_id: int,
    subscription_data: PushSubscriptionSchema,
    db: AsyncSession,
):
    try:

        result = await db.execute(
            select(PushSubscription).where(
                PushSubscription.endpoint
                == subscription_data.endpoint
            )
        )

        existing_subscription = result.scalars().first()

        if existing_subscription:

            # Existing browser subscription
            existing_subscription.user_id = user_id
            existing_subscription.p256dh = (
                subscription_data.keys.p256dh
            )
            existing_subscription.auth = (
                subscription_data.keys.auth
            )
            existing_subscription.is_active = True

            logger.info(
                f"[WebPush] Updated existing subscription "
                f"{existing_subscription.id}"
            )

        else:

            # New browser/device subscription
            push_subscription = PushSubscription(
                user_id=user_id,
                endpoint=subscription_data.endpoint,
                p256dh=subscription_data.keys.p256dh,
                auth=subscription_data.keys.auth,
                is_active=True,
            )

            db.add(push_subscription)

            logger.info(
                f"[WebPush] Created new subscription "
                f"for user {user_id}"
            )

        await db.commit()

        return JSONResponse(
            status_code=status.HTTP_200_OK,
            content={
                "message": (
                    "User subscribed to push notifications "
                    "successfully."
                )
            },
        )

    except HTTPException:
        raise

    except Exception as e:

        await db.rollback()

        logger.exception(
            "[WebPush] Error subscribing user"
        )

        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=(
                "An error occurred while subscribing the user "
                f"to push notifications: {str(e)}"
            ),
        )