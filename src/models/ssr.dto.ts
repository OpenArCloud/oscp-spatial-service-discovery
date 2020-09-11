import { Type } from "class-transformer";

import {
  IsLatitude,
  IsLongitude,
  IsUrl,
  IsNumber,
  IsOptional,
  IsPositive,
  IsString,
  Equals,
  ValidateNested,
} from "class-validator";

import turf from "@turf/turf";

export class ServiceDto {
  @IsString()
  id: string;

  @IsString()
  type: string;

  @IsString()
  @IsOptional()
  title?: string;

  @IsString()
  @IsOptional()
  description?: string;

  @IsUrl()
  url: URL;

  @IsString({ each: true })
  @IsOptional()
  capabilities?: string[];
}

export class SsrDto {
  @IsString()
  @Equals("ssr")
  type: string;

  @ValidateNested({ each: true })
  @Type(() => ServiceDto)
  services: ServiceDto[];

  geometry: turf.Polygon;

  @IsNumber()
  @IsOptional()
  altitude?: number;
}
