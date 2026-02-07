from dotenv import load_dotenv
import os
load_dotenv()

class Settings:
    DATABASE_URL_ASYNC: str = os.getenv("DATABASE_URL_ASYNC")
    DATABASE_URL_SYNC: str = os.getenv("DATABASE_URL_SYNC")
    SECRET_KEY: str = os.getenv("SECRET_KEY")
    ALGORITHM: str = os.getenv("ALGORITHM")
    ACCESS_TOKEN_EXPIRE_MINUTES: int = int(os.getenv("ACCESS_TOKEN_EXPIRE_MINUTES")) # Default to 5 minutes
    REFRESH_TOKEN_EXPIRE_MINUTES: int = int(os.getenv("REFRESH_TOKEN_EXPIRE_MINUTES"))  # Default to 7 days
    SMTP_SERVER: str = os.getenv("SMTP_SERVER")
    SMTP_PORT: int = int(os.getenv("SMTP_PORT"))
    SMTP_USERNAME: str = os.getenv("SMTP_USERNAME")
    SMTP_PASSWORD: str = os.getenv("SMTP_PASSWORD")
    MAIL_FROM: str = os.getenv("MAIL_FROM")

settings = Settings()