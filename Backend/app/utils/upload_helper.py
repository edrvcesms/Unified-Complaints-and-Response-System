
from app.utils.attachments import validate_encoded_upload
import base64
import io
from fastapi import UploadFile
from starlette.datastructures import Headers


def prepare_upload_files(files_data):
    file_objs = []
    for f in files_data:
        validate_encoded_upload(f)
        content_bytes = base64.b64decode(f["content_b64"])
        file_obj = io.BytesIO(content_bytes)

        file_objs.append(
            UploadFile(
                filename=f["filename"],
                file=file_obj,
                headers=Headers({"content-type": f["content_type"]}),
            )
        )
    return file_objs