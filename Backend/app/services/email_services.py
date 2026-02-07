from fastapi_mail import FastMail, MessageSchema
from app.core.email_config import conf
from app.utils.logger import logger

async def send_email(subject: str, recipient: str, body: str):

    message = MessageSchema(
        subject=subject,
        recipients=[recipient],
        body=body,
        subtype="html"
    )

    fm = FastMail(conf)
    try:
        logger.info(f"Sending email to {recipient} with subject '{subject}'")
        await fm.send_message(message)
        return {"message": "Email sent successfully"}
    except Exception as e:
        logger.error(f"Failed to send email to {recipient}: {str(e)}")
        return {"message": f"Failed to send email: {str(e)}"}
    
async def send_otp_email(recipient: str, otp: str):
    subject = "Your OTP Code for Unified Complaints and Response System (UCRS) Registration"
    body = f"""
    <div style="font-family: Arial, sans-serif; text-align: center; padding: 20px;">
            <h2 style="color: #90ee90;">Your OTP Code for Unified Complaints and Response System Registration</h2>
            <p style="font-size: 16px; color: #333;">Use the following code to proceed:</p>
            <div style="margin: 20px 0; font-size: 24px; font-weight: bold; color: #000; letter-spacing: 4px;">
                {otp}
            </div>
            <p style="font-size: 14px; color: #666;">This code is valid for 5 minutes. Do not share it with anyone.</p>
            <hr style="margin: 20px 0; border: none; border-top: 1px solid #ddd;">
            <p style="font-size: 12px; color: #999;">If you did not request this, please ignore this email.</p>
        </div>
      """
    await send_email(subject=subject, recipient=recipient, body=body)

    