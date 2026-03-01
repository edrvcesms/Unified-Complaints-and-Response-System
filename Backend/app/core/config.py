from dotenv import load_dotenv
import os
load_dotenv()

class Settings:
    DATABASE_URL_ASYNC: str = os.getenv("DATABASE_URL_ASYNC")
    DATABASE_URL_SYNC: str = os.getenv("DATABASE_URL_SYNC")
    SECRET_KEY: str = os.getenv("SECRET_KEY")
    ALGORITHM: str = os.getenv("ALGORITHM")
    ACCESS_TOKEN_EXPIRE_MINUTES: int = int(os.getenv("ACCESS_TOKEN_EXPIRE_MINUTES", "15")) # Default to 5 minutes
    REFRESH_TOKEN_EXPIRE_MINUTES: int = int(os.getenv("REFRESH_TOKEN_EXPIRE_MINUTES", "10080"))  # Default to 7 days
    SMTP_SERVER: str = os.getenv("SMTP_SERVER")
    SMTP_PORT: int = int(os.getenv("SMTP_PORT"))
    SMTP_USERNAME: str = os.getenv("SMTP_USERNAME")
    SMTP_PASSWORD: str = os.getenv("SMTP_PASSWORD")
    MAIL_FROM: str = os.getenv("MAIL_FROM")
    REDIS_URL: str = os.getenv("REDIS_URL")
    CLOUDINARY_CLOUD_NAME: str = os.getenv("CLOUDINARY_CLOUD_NAME")
    CLOUDINARY_API_KEY: str = os.getenv("CLOUDINARY_API_KEY")
    CLOUDINARY_API_SECRET: str = os.getenv("CLOUDINARY_API_SECRET")
    PINECONE_API_KEY: str = os.getenv("PINECONE_API_KEY")
    PINECONE_ENVIRONMENT: str = os.getenv("PINECONE_ENVIRONMENT", "us-east-1")
    GEMINI_API_KEY: str = os.getenv("GEMINI_API_KEY")
    EXPO_PUSH_URL = os.getenv("EXPO_PUSH_URL")
    

settings = Settings()