"""Feedback endpoint — store user feedback in Azure Blob Storage."""

import os
from datetime import datetime, timezone

from azure.identity import DefaultAzureCredential
from azure.storage.blob import BlobServiceClient
from fastapi import APIRouter
from pydantic import BaseModel, Field

router = APIRouter(prefix="/api/feedback", tags=["feedback"])


class FeedbackRequest(BaseModel):
    text: str = Field(..., min_length=1, max_length=2000)


@router.post("", status_code=201)
async def submit_feedback(body: FeedbackRequest):
    """Store feedback as a .txt blob in the 'feedback' container."""
    blob_service = BlobServiceClient(
        account_url=os.environ["AZURE_BLOB_STORAGE_ENDPOINT"],
        credential=DefaultAzureCredential(),
    )
    container = blob_service.get_container_client("feedback")

    timestamp = datetime.now(timezone.utc).strftime("%Y%m%d_%H%M%S_%f")
    blob_name = f"feedback_{timestamp}.txt"

    container.upload_blob(blob_name, body.text, overwrite=True)

    return {"status": "ok", "blob": blob_name}
