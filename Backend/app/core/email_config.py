from fastapi_mail import ConnectionConfig
from app.core.config import settings

conf = ConnectionConfig(
    MAIL_USERNAME = settings.SMTP_USERNAME,
    MAIL_PASSWORD = settings.SMTP_PASSWORD,
    MAIL_FROM = settings.MAIL_FROM,
    MAIL_PORT = settings.SMTP_PORT,
    MAIL_SERVER = settings.SMTP_SERVER,
    MAIL_STARTTLS = True,
    MAIL_SSL_TLS = False,
    USE_CREDENTIALS = True
)

