import asyncio
import os
from fastapi_mail import FastMail, MessageSchema
from app.core.email_config import conf
from app.utils.logger import logger
from app.celery_worker import celery_worker
import nest_asyncio

nest_asyncio.apply()

@celery_worker.task
def send_email(subject: str, recipient: str, body: str):
    async def _send():
        message = MessageSchema(subject=subject, recipients=[recipient], body=body, subtype="html")
        fm = FastMail(conf)
        await fm.send_message(message)
        logger.info(f"Email sent to {recipient} with subject '{subject}'")

    asyncio.get_event_loop().run_until_complete(_send())

@celery_worker.task
def send_otp_email(recipient: str, otp: str, purpose: str):
    subject = f"Your OTP Code for Unified Complaints and Response System (UCRS) {purpose}"
    body = f"""
    <div style="font-family: Arial, sans-serif; text-align: center; padding: 20px;">
            <h2 style="color: #90ee90;">Your OTP Code for Unified Complaints and Response System {purpose}</h2>
            <p style="font-size: 16px; color: #333;">Use the following code to proceed:</p>
            <div style="margin: 20px 0; font-size: 24px; font-weight: bold; color: #000; letter-spacing: 4px;">
                {otp}
            </div>
            <p style="font-size: 14px; color: #666;">This code is valid for 5 minutes. Do not share it with anyone.</p>
            <hr style="margin: 20px 0; border: none; border-top: 1px solid #ddd;">
            <p style="font-size: 12px; color: #999;">If you did not request this, please ignore this email.</p>
        </div>
      """
    send_email.delay(subject=subject, recipient=recipient, body=body)
    logger.info(f"OTP email task created for {recipient}")