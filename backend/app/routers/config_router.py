from __future__ import annotations

from fastapi import APIRouter

from app.models.schemas import ConfigUpdate
from app.services.config_service import get_config, update_config


router = APIRouter(prefix="/api/config", tags=["config"])


@router.get("")
def read_config() -> dict:
    return get_config()


@router.put("")
def save_config(payload: ConfigUpdate) -> dict:
    config = update_config(payload.model_dump())
    return {"success": True, "message": "설정이 저장되었습니다.", "config": config}

