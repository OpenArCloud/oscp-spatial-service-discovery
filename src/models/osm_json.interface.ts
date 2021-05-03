import turf from "@turf/turf";
import { Service } from "./ssr.interface";

export interface Tags {
  services: Service[];
  geometry: turf.Polygon;
  altitude?: number;
  provider: string;
  version: string;
  active: boolean;
}

export interface Element {
  id?: string;
  deleted?: boolean;
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
