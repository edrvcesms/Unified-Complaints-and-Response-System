import resend
from app.core.config import settings
from app.utils.logger import logger
from app.celery_worker import celery_worker
from app.utils.template_renderer import render_template

def _send_email(subject, recipient, body):
    response = resend.Emails.send({
        "from": settings.MAIL_FROM,
        "to": [recipient],
        "subject": subject,
        "html": body,
    })

    logger.info(
        f"[EMAIL_SENT] to={recipient} subject={subject} id={response.get('id')}"
    )

    return response

@celery_worker.task(bind=True, max_retries=3, default_retry_delay=30)
def send_otp_email_task(self, recipient: str, otp: str, purpose: str):
    try:
        subject = f"OTP Code ({purpose})"
        body = render_template("email_otp.html", {"otp": otp, "purpose": purpose})

        _send_email(subject, recipient, body)

        logger.info(f"[OTP_EMAIL_SENT] to={recipient}")

    except Exception as e:
        msg = str(e).lower()

        if any(x in msg for x in ["invalid", "not verified", "domain"]):
            logger.exception(f"[PERMANENT_EMAIL_FAIL] to={recipient} error={e}")
            raise e

        logger.exception(f"[RETRY_EMAIL] to={recipient} error={e}")
        raise self.retry(exc=e)
      
@celery_worker.task(bind=True, max_retries=3, default_retry_delay=30)
def notify_user_for_hearing_task(
    self,
    recipient: str,
    barangay_name: str,
    compliant_name: str,
    hearing_day: str,
    hearing_month: str,
    hearing_year: str,
    hearing_time: str,
    issued_day: str,
    issued_month: str,
    issued_year: str,
    notified_day: str,
    notified_month: str,
    notified_year: str
):
    try:
        subject = "Notice of Hearing for Your Complaint - Unified Complaints and Response System (UCRS)"
        body = render_template(
            "hearing_notification_email.html",
            {
                "barangay_name": barangay_name,
                "compliant_name": compliant_name,
                "hearing_day": hearing_day,
                "hearing_month": hearing_month,
                "hearing_year": hearing_year,
                "hearing_time": hearing_time,
                "issued_day": issued_day,
                "issued_month": issued_month,
                "issued_year": issued_year,
                "notified_day": notified_day,
                "notified_month": notified_month,
                "notified_year": notified_year
            }
        )
        _send_email(subject, recipient, body)
        
        logger.info(f"[HEARING_NOTIFICATION_SENT] to={recipient}")
        
    except Exception as e:
        msg = str(e).lower()

        if any(x in msg for x in ["invalid", "not verified", "domain"]):
            logger.exception(f"[PERMANENT_EMAIL_FAIL] to={recipient} error={e}")
            raise e

        logger.exception(f"[RETRY_EMAIL] to={recipient} error={e}")
        raise self.retry(exc=e)
