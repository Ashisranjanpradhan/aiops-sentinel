from typing import Any

from fastapi import HTTPException, Request, status
from fastapi.exceptions import RequestValidationError
from fastapi.responses import JSONResponse

from app.core.response import make_error_response


class AppError(HTTPException):
    def __init__(self, status_code: int, code: str, message: str, details: Any | None = None):
        super().__init__(status_code=status_code, detail=message)
        self.code = code
        self.message = message
        self.details = details


class NotFoundError(AppError):
    def __init__(self, resource: str, identifier: Any):
        super().__init__(
            status_code=status.HTTP_404_NOT_FOUND,
            code="NOT_FOUND",
            message=f"{resource} '{identifier}' was not found",
        )


class ConflictError(AppError):
    def __init__(self, message: str, details: Any | None = None):
        super().__init__(
            status_code=status.HTTP_409_CONFLICT, code="CONFLICT", message=message, details=details
        )


class ValidationError(AppError):
    def __init__(self, message: str, details: Any | None = None):
        super().__init__(
            status_code=status.HTTP_422_UNPROCESSABLE_CONTENT,
            code="VALIDATION_ERROR",
            message=message,
            details=details,
        )


class UnauthorizedError(AppError):
    def __init__(self, message: str = "Authentication required"):
        super().__init__(
            status_code=status.HTTP_401_UNAUTHORIZED, code="UNAUTHORIZED", message=message
        )


class ForbiddenError(AppError):
    def __init__(self, message: str = "Access forbidden"):
        super().__init__(status_code=status.HTTP_403_FORBIDDEN, code="FORBIDDEN", message=message)


class RateLimitError(AppError):
    def __init__(
        self,
        message: str = "Rate limit exceeded. Please retry later.",
        retry_after_seconds: int = 60,
    ):
        super().__init__(
            status_code=status.HTTP_429_TOO_MANY_REQUESTS,
            code="RATE_LIMIT_EXCEEDED",
            message=message,
            details={"retry_after_seconds": retry_after_seconds},
        )


async def app_error_handler(request: Request, exc: AppError) -> JSONResponse:
    request_id = getattr(request.state, "request_id", None)
    return JSONResponse(
        status_code=exc.status_code,
        content=make_error_response(
            code=exc.code, message=exc.message, details=exc.details, request_id=request_id
        ),
    )


async def validation_error_handler(request: Request, exc: RequestValidationError) -> JSONResponse:
    request_id = getattr(request.state, "request_id", None)
    errors = []
    for err in exc.errors():
        loc = ".".join([str(p) for p in err.get("loc", []) if p != "body"])
        errors.append(
            {"field": loc, "message": err.get("msg", "Invalid value"), "type": err.get("type")}
        )

    return JSONResponse(
        status_code=status.HTTP_422_UNPROCESSABLE_CONTENT,
        content=make_error_response(
            code="VALIDATION_ERROR",
            message="Request input validation failed",
            details=errors,
            request_id=request_id,
        ),
    )


async def unhandled_error_handler(request: Request, exc: Exception) -> JSONResponse:
    request_id = getattr(request.state, "request_id", None)
    # We do NOT expose internal tracebacks/details to the user as per README Section 8.7 & 12.1
    return JSONResponse(
        status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
        content=make_error_response(
            code="INTERNAL_SERVER_ERROR",
            message="An unexpected error occurred. Please contact system administrator.",
            details=None,
            request_id=request_id,
        ),
    )
