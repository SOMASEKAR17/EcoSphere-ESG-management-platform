import os
import uuid

from fastapi import UploadFile

from app.config import settings
from app.utils.errors import bad_request


async def save_proof_file(upload: UploadFile, prefix: str) -> str:
    """Saves an uploaded proof file to the local uploads/proofs directory
    (per Section 5 of the build reference: local filesystem, path stored in
    DB — no cloud storage for this build). Returns the relative path to store
    on the participation record."""
    contents = await upload.read()
    if len(contents) > settings.max_upload_size_bytes:
        raise bad_request(
            f"Uploaded file exceeds the {settings.MAX_UPLOAD_SIZE_MB}MB size limit."
        )

    proofs_dir = os.path.join(settings.UPLOAD_DIR, "proofs")
    os.makedirs(proofs_dir, exist_ok=True)

    ext = os.path.splitext(upload.filename or "")[1]
    filename = f"{prefix}_{uuid.uuid4().hex}{ext}"
    full_path = os.path.join(proofs_dir, filename)

    with open(full_path, "wb") as f:
        f.write(contents)

    return f"/uploads/proofs/{filename}"