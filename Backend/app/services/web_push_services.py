from fastapi import HTTPException, status
from fastapi.responses import JSONResponse
from app.schemas.web_push_schema import PushSubscriptionSchema, PushNotificationPayload
from app.models.push_subscriptions import PushSubscription
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select
from app.utils.logger import logger
from pathlib import Path
import json
from pywebpush import webpush, WebPushException
from app.core.config import settings

BASE_DIR = Path(__file__).resolve().parent.parent.parent
VAPID_PRIVATE_KEY = settings.VAPID_PRIVATE_KEY
VAPID_SUBJECT = settings.VAPID_SUBJECT


async def send_web_push_notification(
    user_id: int,
    push_notif: dict,
    db: AsyncSession
):
    try:
        result = await db.execute(
            select(PushSubscription).where(
                PushSubscription.user_id == user_id,
                PushSubscription.is_active == True
            )
        )
        subscriptions = result.scalars().all()

        for subscription in subscriptions:

            payload = {
                "title": push_notif["title"],
                "body": push_notif["body"],
                "icon": push_notif["icon"],
                "url": push_notif["url"]
            }

            subscription_info = {
                "endpoint": subscription.endpoint,
                "keys": {
                    "p256dh": subscription.p256dh,
                    "auth": subscription.auth
                }
            }

            try:
                logger.info(
                    f"[WebPush] Sending notification to subscription "
                    f"{subscription.id}"
                )

                logger.info(
                    f"[WebPush] Endpoint: {subscription.endpoint}"
                )

                logger.info(
                    f"[WebPush] Payload: {payload}"
                )

                response = webpush(
                    subscription_info,
                    data=json.dumps(payload),
                    vapid_private_key=VAPID_PRIVATE_KEY,
                    vapid_claims={"sub": VAPID_SUBJECT},
                )

                logger.info(
                    f"[WebPush] Successfully sent notification to "
                    f"user {user_id}"
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

                if e.response and e.response.status_code == 410:
                    subscription.is_active = False

                await db.commit()

        logger.info(
            f"[WebPush] Finished processing push notifications "
            f"for user {user_id}"
        )

    except HTTPException:
        raise

    except Exception as e:
        logger.error(
            f"An error occurred while sending push notification "
            f"to user {user_id}: {str(e)}"
        )
        await db.rollback()


async def subscribe_user_to_push_notifications(
    user_id: int,
    subscription_data: PushSubscriptionSchema,
    db: AsyncSession,
):
    try:
        result = await db.execute(
            select(PushSubscription).where(
                PushSubscription.endpoint == subscription_data.endpoint
            )
        )

        existing_subscription = result.scalars().first()

        if existing_subscription:
            existing_subscription.user_id = user_id
            existing_subscription.p256dh = subscription_data.keys.p256dh
            existing_subscription.auth = subscription_data.keys.auth
            existing_subscription.is_active = True

            push_subscription = existing_subscription

        else:
            push_subscription = PushSubscription(
                user_id=user_id,
                endpoint=subscription_data.endpoint,
                p256dh=subscription_data.keys.p256dh,
                auth=subscription_data.keys.auth,
                is_active=True,
            )

            db.add(push_subscription)

        await db.commit()

        return JSONResponse(
            status_code=status.HTTP_200_OK,
            content={"message": "User subscribed to push notifications successfully."},
        )

    except HTTPException:
        raise

    except Exception as e:
        await db.rollback()
        logger.exception(
            "An error occurred while subscribing the user to push notifications"
        )
        logger.error(f"Error details: {str(e)}")

        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=(
                "An error occurred while subscribing the user "
                f"to push notifications: {str(e)}"
            ),
        )