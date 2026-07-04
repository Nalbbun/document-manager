from __future__ import annotations

from contextlib import asynccontextmanager

from fastapi import FastAPI, Request
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import JSONResponse

from app.core.config import settings
from app.core.logger import configure_logging
from app.routers import (
    backup_router,
    config_router,
    document_router,
    folder_router,
    index_router,
    log_router,
    maintenance_router,
    search_router,
    trash_router,
    upload_router,
)
from app.services.bootstrap_service import initialize_runtime
from app.utils.exceptions import AppError


@asynccontextmanager
async def lifespan(_: FastAPI):
    configure_logging()
    initialize_runtime()
    yield


app = FastAPI(title="Document Manager v1 API", version="1.1.0", lifespan=lifespan)

app.add_middleware(
    CORSMiddleware,
    allow_origins=["http://127.0.0.1:5173", "http://localhost:5173"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)


@app.exception_handler(AppError)
async def app_error_handler(_: Request, exc: AppError) -> JSONResponse:
    return JSONResponse(status_code=exc.status_code, content={"success": False, "message": exc.message})


@app.exception_handler(Exception)
async def unhandled_error_handler(_: Request, exc: Exception) -> JSONResponse:
    return JSONResponse(status_code=500, content={"success": False, "message": str(exc)})


@app.get("/health")
def health_check() -> dict:
    return {"status": "ok", "appName": settings.app_name}


app.include_router(folder_router.router)
app.include_router(upload_router.router)
app.include_router(document_router.router)
app.include_router(search_router.router)
app.include_router(index_router.router)
app.include_router(trash_router.router)
app.include_router(backup_router.router)
app.include_router(maintenance_router.router)
app.include_router(config_router.router)
app.include_router(log_router.router)
