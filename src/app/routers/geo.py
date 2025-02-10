from typing import Optional

from fastapi import APIRouter, status
from pyle38.responses import ObjectsResponse

from app.db.db import tile38
from app.models.ssr import Ssr, SsrsResponse

router = APIRouter()


@router.get(
    "/search/within",
    response_model=SsrsResponse,
    response_model_exclude_none=True,
    tags=["geo-search"],
    status_code=status.HTTP_200_OK,
)
async def get_within(lat: float, lon: float, radius: float) -> SsrsResponse:
    ssrs: ObjectsResponse[Ssr] = (
        await tile38.within("geozone").circle(lat, lon, radius).asObjects()
    )
    return SsrsResponse(data=ssrs.dict()["objects"])


@router.get(
    "/search/nearby",
    response_model=SsrsResponse,
    response_model_exclude_none=True,
    tags=["geo-search"],
    status_code=status.HTTP_200_OK,
)
async def get_nearby(
    lat: float, lon: float, radius: Optional[int] = None
) -> SsrsResponse:
    if radius:
        ssrs_in_radius: ObjectsResponse[Ssr] = (
            await tile38.nearby("geozone")
            .point(lat, lon, radius)
            .distance()
            .nofields()
            .asObjects()
        )

        return SsrsResponse(data=ssrs_in_radius.model_dump()["objects"])

    ssrs: ObjectsResponse[Ssr] = (
        await tile38.nearby("geozone").point(lat, lon).distance().nofields().asObjects()
    )

    return SsrsResponse(data=ssrs.dict()["objects"])
