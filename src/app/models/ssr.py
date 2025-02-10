from typing import List, Optional, Dict
from enum import Enum

from pydantic import BaseModel, Field
from pyle38.responses import Object

from typing_extensions import Annotated

Coordinates = Annotated[List[float], Field(min_length=2, max_length=2)]

LinearRing = Annotated[List[Coordinates], Field(min_length=3)]
PolygonCoordinates = Annotated[List[LinearRing], Field(min_length=1)]


class Geometry(BaseModel):
    type: str = "Polygon"
    coordinates: PolygonCoordinates

class SvcTypeEnum(str, Enum):
    geopose = 'geopose'
    contentdiscovery = 'contentdiscovery'

class Service(BaseModel):
    type: SvcTypeEnum
    url: str
    tags: Optional[Dict[str, str]] = None

class Properties(BaseModel):
    id: str
    # altitude: Optional[float] = None
    services: List[Service]

class Ssr(BaseModel):
    type: str = "Feature"
    geometry: Geometry
    properties: Properties

class SsrRequestBody(BaseModel):
    data: Ssr

class SsrResponse(BaseModel):
    data: Ssr

class SsrsResponse(BaseModel):
    data: List[Object[Ssr]]
