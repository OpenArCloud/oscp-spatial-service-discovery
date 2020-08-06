import turf from "@turf/turf";

export interface Tags {
  services: string[];
  urls: URL[];
  geometry: turf.Polygon;
  altitude?: number;
  provider: string;
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
