import { Type } from "class-transformer";

import {
  ArrayNotEmpty,
  IsBoolean,
  IsDefined,
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
  @ArrayNotEmpty()
  @Type(() => PropertyDto)
  properties?: PropertyDto[];
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

  @IsDefined()
  geometry: turf.Polygon;

  @IsNumber()
  @IsOptional()
  altitude?: number;

  @IsBoolean()
  @IsOptional()
  active?: boolean;
}
