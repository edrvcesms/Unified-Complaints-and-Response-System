import base64
import re
import uuid
from io import BytesIO
from fastapi import UploadFile
from fastapi import HTTPException, status

# Matches "data:image/jpeg;base64,....." and captures the subtype + payload
DATA_URI_RE = re.compile(r'^data:image/(?P<subtype>\w+);base64,(?P<data>.+)$')

def data_uri_to_upload_file(data_uri: str, field_name: str) -> UploadFile:
    if not data_uri:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail=f"{field_name} is required."
        )

    match = DATA_URI_RE.match(data_uri)
    if not match:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail=f"{field_name} is not a valid image."
        )

    subtype = match.group("subtype").lower()
    b64_data = match.group("data")

    try:
        raw_bytes = base64.b64decode(b64_data, validate=True)
    except Exception:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail=f"{field_name} could not be decoded."
        )

    if not raw_bytes:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail=f"{field_name} is empty."
        )

    buffer = BytesIO(raw_bytes)
    buffer.seek(0)

    filename = f"{field_name}-{uuid.uuid4().hex}.{subtype}"
    content_type = f"image/{subtype}"

    # UploadFile signature varies slightly by Starlette version;
    # this works for Starlette >= 0.24 / FastAPI >= 0.100
    upload_file = UploadFile(filename=filename, file=buffer, headers=None)
    upload_file.headers = {"content-type": content_type}  # ensure content_type resolves correctly
    return upload_file