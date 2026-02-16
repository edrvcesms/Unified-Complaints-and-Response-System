import asyncio
from datetime import datetime
import os
from app.models.attachment import Attachment
from fastapi_mail import FastMail, MessageSchema
from app.database.database import AsyncSessionLocal
from app.utils.cloudinary import upload_multiple_files_to_cloudinary, delete_from_cloudinary
from app.core.email_config import conf
from app.utils.logger import logger
from fastapi import UploadFile
from app.celery_worker import celery_worker
import nest_asyncio
import asyncio
from starlette.datastructures import Headers

nest_asyncio.apply()

@celery_worker.task(bind=True, max_retries=3, default_retry_delay=30)
def send_email_task(self, subject: str, recipient: str, body: str):
    
    try:
        
        async def _send():
            message = MessageSchema(subject=subject, recipients=[recipient], body=body, subtype="html")
            fm = FastMail(conf)
            await fm.send_message(message)
            logger.info(f"Email sent to {recipient} with subject '{subject}'")

        asyncio.run(_send())

    except Exception as e:
        logger.error(f"Failed to send email to {recipient}: {str(e)}")
        
        raise self.retry(exc=e)

@celery_worker.task(bind=True, max_retries=3, default_retry_delay=30)
def send_otp_email_task(self, recipient: str, otp: str, purpose: str):
    subject = f"Your OTP Code for Unified Complaints and Response System (UCRS) {purpose}"
    body = f"""
    <div style="font-family: Arial, sans-serif; text-align: center; padding: 20px;">
        <h2 style="color: #90ee90;">Your OTP Code for UCRS {purpose}</h2>
        <p style="font-size: 16px; color: #333;">Use the following code to proceed:</p>
        <div style="margin: 20px 0; font-size: 24px; font-weight: bold; color: #000; letter-spacing: 4px;">
            {otp}
        </div>
        <p style="font-size: 14px; color: #666;">This code is valid for 5 minutes. Do not share it with anyone.</p>
        <hr style="margin: 20px 0; border: none; border-top: 1px solid #ddd;">
        <p style="font-size: 12px; color: #999;">If you did not request this, please ignore this email.</p>
    </div>
    """
    send_email_task.delay(subject=subject, recipient=recipient, body=body)
    

@celery_worker.task(bind=True, max_retries=3, default_retry_delay=30)
def upload_attachments_task(self, files_data, complaint_id: int, uploader_id: int):
    file_objs = []

    try:
        for f in files_data:
            file_obj = open(f["temp_path"], "rb")
            headers = Headers({"content-type": f["content_type"]})
            upload_file = UploadFile(filename=f["filename"], file=file_obj, headers=headers)
            file_objs.append(upload_file)

        urls = asyncio.run(upload_multiple_files_to_cloudinary(file_objs, folder="attachments"))
        logger.info(f"Uploaded {len(urls)} attachments to Cloudinary.")

        asyncio.run(_save_attachments_to_db(files_data, urls, complaint_id, uploader_id))

        return urls

    except Exception as e:
        logger.error(f"Failed to upload attachments: {e}")
        raise self.retry(exc=e)

    finally:
        for f in file_objs:
            try:
                f.file.close()
            except Exception:
                pass

        for f in files_data:
            try:
                if os.path.exists(f["temp_path"]):
                    os.remove(f["temp_path"])
                    logger.info(f"Deleted temporary file: {f['temp_path']}")
            except Exception as e:
                logger.warning(f"Failed to delete temp file {f['temp_path']}: {e}")

        try:
            temp_dir = os.path.dirname(files_data[0]["temp_path"])
            if os.path.exists(temp_dir) and not os.listdir(temp_dir):
                os.rmdir(temp_dir)
        except Exception as e:
            logger.warning(f"Failed to delete temp folder {temp_dir}: {e}")
            
            
async def _save_attachments_to_db(files_data, urls, complaint_id: int, uploader_id: int):
    """
    Save uploaded file metadata to the database
    """
    attachments = []
    async with AsyncSessionLocal() as db:
        for f, url in zip(files_data, urls):
            file_size = os.path.getsize(f["temp_path"])
            attachment = Attachment(
                file_name=f["filename"],
                file_type=f["content_type"],
                file_size=file_size,
                file_path=url,
                uploaded_at=datetime.utcnow(),
                complaint_id=complaint_id,
                uploaded_by=uploader_id
            )
            attachments.append(attachment)
        db.add_all(attachments)
        await db.commit()