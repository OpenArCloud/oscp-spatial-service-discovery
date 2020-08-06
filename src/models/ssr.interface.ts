import turf from "@turf/turf";

export interface Ssr {
  id: string;
  type: string;
  services: string[];
  urls: URL[];
  geometry: turf.Polygon;
  altitude?: number;
  provider: string;
  timestamp: Date;
}
