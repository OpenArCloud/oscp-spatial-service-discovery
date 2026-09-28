import { Type } from "class-transformer";

import {
  ArrayNotEmpty,
  Equals,
  IsArray,
  IsBoolean,
  IsDefined,
  IsNumber,
  IsOptional,
  IsString,
  IsUrl,
  Validate,
  ValidateNested,
  ValidationArguments,
  ValidatorConstraint,
  ValidatorConstraintInterface,
} from "class-validator";

import * as turf from "@turf/turf";

export class PropertyDto {
  @IsString()
  type: string;

  @IsString()
  value: string;
}

export class ServiceDto {
  @IsString()
  id: string;

  @IsString()
  type: string;

  @IsString()
  title: string;

  @IsString()
  @IsOptional()
  description?: string;

  @IsUrl()
  url: URL;

  @ValidateNested({ each: true })
  @IsOptional()
  @Type(() => PropertyDto)
  properties?: PropertyDto[];
}

export class PolygonDto {
  @Equals("Polygon")
  type: "Polygon";

  @IsDefined()
  @IsArray()
  @ArrayNotEmpty()
  coordinates: number[][][];
}

function isFiniteNumber(value: unknown): value is number {
  return typeof value === "number" && Number.isFinite(value);
}

function isValidPosition(position: unknown): position is number[] {
  if (!Array.isArray(position) || position.length < 2 || position.length > 3) {
    return false;
  }
  const lon = position[0];
  const lat = position[1];
  if (!isFiniteNumber(lon) || !isFiniteNumber(lat)) {
    return false;
  }
  if (lon < -180 || lon > 180 || lat < -90 || lat > 90) {
    return false;
  }
  if (position.length === 3 && !isFiniteNumber(position[2])) {
    return false;
  }
  return true;
}

function positionsEquivalent(a: number[], b: number[]): boolean {
  const length = Math.max(a.length, b.length);
  for (let i = 0; i < length; i++) {
    if (a[i] !== b[i]) {
      return false;
    }
  }
  return true;
}

/** GeoJSON Polygon that turf.polygon / turf.intersect can consume. */
export function assertGeoJsonPolygon(geometry: unknown): void {
  if (
    !geometry ||
    typeof geometry !== "object" ||
    (geometry as PolygonDto).type !== "Polygon" ||
    !Array.isArray((geometry as PolygonDto).coordinates)
  ) {
    throw new Error("geometry must be a GeoJSON Polygon");
  }

  const rings = (geometry as PolygonDto).coordinates;
  if (rings.length === 0) {
    throw new Error("geometry.coordinates must contain at least one linear ring");
  }

  for (let r = 0; r < rings.length; r++) {
    const ring = rings[r];
    if (!Array.isArray(ring) || ring.length < 4) {
      throw new Error(
        `geometry.coordinates[${r}] must have at least 4 positions`
      );
    }
    for (let i = 0; i < ring.length; i++) {
      if (!isValidPosition(ring[i])) {
        throw new Error(
          `geometry.coordinates[${r}][${i}] must be [lon, lat] (optional altitude) with valid lon/lat`
        );
      }
    }
    if (!positionsEquivalent(ring[0], ring[ring.length - 1])) {
      throw new Error(
        `geometry.coordinates[${r}] must be closed (first position equals last)`
      );
    }
  }

  const polygon = turf.polygon(rings);
  turf.intersect(turf.featureCollection([polygon, polygon]));
}

@ValidatorConstraint({ name: "isGeoJsonPolygon", async: false })
class IsGeoJsonPolygonConstraint implements ValidatorConstraintInterface {
  validate(geometry: unknown): boolean {
    try {
      assertGeoJsonPolygon(geometry);
      return true;
    } catch {
      return false;
    }
  }

  defaultMessage(args?: ValidationArguments): string {
    try {
      assertGeoJsonPolygon(args?.value);
      return "geometry must be a closed GeoJSON Polygon";
    } catch (e) {
      return e instanceof Error
        ? e.message
        : "geometry must be a closed GeoJSON Polygon";
    }
  }
}

export class SsrDto {
  @IsString()
  @Equals("ssr")
  type: string;

  @ValidateNested({ each: true })
  @IsDefined()
  @ArrayNotEmpty()
  @Type(() => ServiceDto)
  services: ServiceDto[];

  @ValidateNested()
  @IsDefined()
  @Type(() => PolygonDto)
  @Validate(IsGeoJsonPolygonConstraint)
  geometry: PolygonDto;

  @IsNumber()
  @IsOptional()
  altitude?: number;

  @IsBoolean()
  @IsOptional()
  active?: boolean;
}
