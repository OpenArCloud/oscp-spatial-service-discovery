import { Polygon } from "geojson";
import { Service } from "./ssr.interface";

export interface Tags {
  services: Service[];
  geometry: Polygon;
  altitude?: number;
  provider: string;
  version: string;
  active?: boolean;
}

export interface Element {
  id?: string;
  deleted?: boolean;
  // kappa-osm primitive: "node" (polygon vertex) or "way" (repurposed as an SSR).
  type: string;
  refs?: string[];
  changeset: string;
  uid?: string;
  lon?: number;
  lat?: number;
  tags?: Tags;
  timestamp?: Date;
  links?: any[];
  version?: string;
}
