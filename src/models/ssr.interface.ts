import { Polygon } from "geojson";

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
  geometry: Polygon;
  altitude?: number;
  provider: string;
  timestamp: number;
  active: boolean;
}
