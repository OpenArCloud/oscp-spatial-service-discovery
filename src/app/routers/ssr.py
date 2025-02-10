from typing import Optional

from fastapi import APIRouter, HTTPException, status
from pyle38.errors import Tile38IdNotFoundError, Tile38KeyNotFoundError
from pyle38.responses import JSONResponse, ObjectResponse, ObjectsResponse

from app.db.db import tile38
from app.models.ssr import (
    Ssr,
    SsrRequestBody,
    SsrResponse,
    SsrsResponse,
)

router = APIRouter()


@router.get(
    "/ssr/{id}",
    tags=["ssr"],
    response_model=SsrResponse,
    response_model_exclude_none=True,
    status_code=status.HTTP_200_OK,
)
async def get_ssr(id: str) -> Optional[SsrResponse]:
    try:
        ssr: ObjectResponse[Ssr] = await tile38.get("geozone", id).asObject()

        response = {"data": ssr.object}
        return SsrResponse(**response)

    except (Tile38KeyNotFoundError, Tile38IdNotFoundError):
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail=f"ssr with id '{id}' not found",
        )


@router.get(
    "/ssr",
    tags=["ssr"],
    response_model=SsrsResponse,
    response_model_exclude_none=True,
    status_code=status.HTTP_200_OK,
)
async def get_all_ssrs() -> SsrsResponse:
    ssrs: ObjectsResponse[Ssr] = await tile38.scan("geozone").asObjects()

    response = {"data": ssrs.objects}

    return SsrsResponse(**response)


@router.post(
    "/ssr",
    response_model=JSONResponse,
    response_model_exclude_none=True,
    tags=["ssr"],
    status_code=status.HTTP_201_CREATED,
)
async def set_ssr(body: SsrRequestBody) -> JSONResponse:
    ssr = body.data
    response = (
        await tile38.set("geozone", ssr.properties.id)
        .object(ssr.model_dump())
        .exec()
    )

    return JSONResponse(**response.dict())
