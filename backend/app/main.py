import logging
import os

from fastapi import FastAPI, Request
from fastapi.exceptions import RequestValidationError
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import JSONResponse
from fastapi.staticfiles import StaticFiles
from sqlalchemy import text

from app.config import settings
from app.database import engine
from app.routers import (
    auth, departments, environmental, social, governance,
    gamification, scores, reports, settings as settings_router,
    notifications, employees,
)

logging.basicConfig(level=logging.INFO if not settings.DEBUG else logging.DEBUG)
logger = logging.getLogger("ecosphere")

app = FastAPI(
    title=settings.APP_NAME,
    description=(
        "EcoSphere — ESG Management Platform API. Scores are always "
        "computed from live transactional data, never manually entered."
    ),
    version="1.0.0",
    debug=settings.DEBUG,
)

# ---- CORS -------------------------------------------------------------------
app.add_middleware(
    CORSMiddleware,
    allow_origins=settings.cors_origins_list,
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# ---- Static file serving for proof uploads ----------------------------------
os.makedirs(os.path.join(settings.UPLOAD_DIR, "proofs"), exist_ok=True)
app.mount("/uploads", StaticFiles(directory=settings.UPLOAD_DIR), name="uploads")


# ---- Global error handling ---------------------------------------------------
# Per Section 27 of the build reference: every error response follows the
# same {"detail": "..."} shape, and no foreseeable bad-input case should
# ever surface as a raw, generic 500.
@app.exception_handler(RequestValidationError)
async def validation_exception_handler(request: Request, exc: RequestValidationError):
    first_error = exc.errors()[0] if exc.errors() else {}
    field = ".".join(str(loc) for loc in first_error.get("loc", [])[1:]) or "request"
    message = first_error.get("msg", "Invalid request payload.")
    return JSONResponse(status_code=422, content={"detail": f"{field}: {message}"})


@app.exception_handler(Exception)
async def unhandled_exception_handler(request: Request, exc: Exception):
    logger.exception("Unhandled exception on %s %s", request.method, request.url.path)
    return JSONResponse(status_code=500, content={"detail": "An unexpected error occurred. This has been logged."})


# ---- Routers ------------------------------------------------------------------
app.include_router(auth.router)
app.include_router(employees.router)
app.include_router(departments.router)
app.include_router(environmental.router)
app.include_router(social.router)
app.include_router(governance.router)
app.include_router(gamification.router)
app.include_router(scores.router)
app.include_router(reports.router)
app.include_router(settings_router.router)
app.include_router(notifications.router)


@app.get("/", tags=["Health"])
def root():
    return {"service": settings.APP_NAME, "status": "running", "docs": "/docs"}


@app.get("/health", tags=["Health"])
def health():
    """Verifies the API process is up AND can reach the database — the
    database itself is provisioned out-of-band by docker-compose /
    ecosphere_schema.sql, this endpoint never issues DDL."""
    try:
        with engine.connect() as conn:
            conn.execute(text("SELECT 1"))
        db_status = "connected"
    except Exception as exc:  # pragma: no cover - defensive
        logger.error("Database health check failed: %s", exc)
        db_status = "unavailable"
    return {"status": "ok", "database": db_status}
