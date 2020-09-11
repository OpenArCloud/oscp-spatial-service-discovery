import turf from "@turf/turf";

export interface Service {
  id: string;
  type: string;
  title?: string;
  description?: string;
  url: URL;
  capabilities?: string[];
}

export interface Ssr {
  id: string;
  type: string;
  services: Service[];
  geometry: turf.Polygon;
  altitude?: number;
  provider: string;
  timestamp: Date;
}
