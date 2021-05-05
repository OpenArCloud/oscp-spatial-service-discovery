import turf from "@turf/turf";

export interface Property {
  type: string;
  value: string;
}

export interface Service {
  id: string;
  type: string;
  title: string;
  description?: string;
  url: URL;
  properties?: Property[];
}

export interface Ssr {
  id: string;
  type: string;
  services: Service[];
  geometry: turf.Polygon;
  altitude?: number;
  provider: string;
  timestamp: number;
  active: boolean;
}
