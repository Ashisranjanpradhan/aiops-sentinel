import uuid
from typing import Any, Generic, TypeVar

from pydantic import BaseModel, Field

DataT = TypeVar("DataT")


class ResponseMeta(BaseModel):
    request_id: str = Field(default_factory=lambda: f"req_{uuid.uuid4().hex[:12]}")
    timestamp: str | None = None
    page: int | None = None
    page_size: int | None = None
    total: int | None = None


class ResponseError(BaseModel):
    code: str
    message: str
    details: Any | None = None


class ApiResponse(BaseModel, Generic[DataT]):
    data: DataT | None = None
    meta: ResponseMeta = Field(default_factory=ResponseMeta)
    error: ResponseError | None = None


def make_response(
    data: Any = None,
    page: int | None = None,
    page_size: int | None = None,
    total: int | None = None,
    request_id: str | None = None,
) -> dict[str, Any]:
    meta = {"request_id": request_id or f"req_{uuid.uuid4().hex[:12]}"}
    if page is not None:
        meta["page"] = page
    if page_size is not None:
        meta["page_size"] = page_size
    if total is not None:
        meta["total"] = total

    return {"data": data, "meta": meta, "error": None}


def make_error_response(
    code: str, message: str, details: Any = None, request_id: str | None = None
) -> dict[str, Any]:
    return {
        "data": None,
        "meta": {"request_id": request_id or f"req_{uuid.uuid4().hex[:12]}"},
        "error": {"code": code, "message": message, "details": details},
    }
