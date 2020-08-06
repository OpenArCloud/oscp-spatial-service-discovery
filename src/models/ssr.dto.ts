import {
  IsLatitude,
  IsLongitude,
  IsUrl,
  IsNumber,
  IsOptional,
  IsPositive,
  IsString,
  Equals,
} from "class-validator";

import turf from "@turf/turf";

export class SsrDto {
  @IsString()
  @Equals("ssr")
  type: string;

  @IsString({ each: true })
  services: string[];

  urls: URL[];

  geometry: turf.Polygon;

  @IsNumber()
  @IsOptional()
  altitude?: number;
}
