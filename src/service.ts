import { Ssr } from "./models/ssr.interface";
import { Element } from "./models/osm_json.interface";
import { SsrDto } from "./models/ssr.dto";
import { validateOrReject, ValidationError } from "class-validator";
import "./noise-protocol-compat";
import kappa from "kappa-core";
import ram from "random-access-memory";
import memdb from "memdb";
import Osm from "kappa-osm";
import dotenv from "dotenv";
import * as Swarm from "./swarm";
import * as h3 from "h3-js";
import * as turf from "@turf/turf";
import { Global } from "./global";

dotenv.config();

function requireEnv(name: string): string {
  const value = process.env[name];
  if (value === undefined || value.trim() === "") {
    throw new Error(
      `Missing required environment variable: ${name}. Set it in .env or the process environment.`
    );
  }
  return value;
}

function optionalEnvNumber(name: string, defaultValue: number): number {
  const raw = process.env[name];
  if (raw === undefined || raw.trim() === "") {
    return defaultValue;
  }
  const value = Number(raw);
  if (!Number.isFinite(value) || value <= 0) {
    throw new Error(
      `Invalid environment variable: ${name}. Must be a positive number.`
    );
  }
  return value;
}

const KAPPA_CORE_DIR: string = requireEnv("KAPPA_CORE_DIR");
const SWARM_TOPIC_PREFIX: string = requireEnv("SWARM_TOPIC_PREFIX");
const SEARCH_RADIUS_KM: number = optionalEnvNumber("SEARCH_RADIUS_KM", 5);
const COUNTRIES: string[] = requireEnv("COUNTRIES")
  .split(",")
  .map((country) => country.trim().toUpperCase())
  .filter((country) => country.length > 0);

export function listCountries(): string[] {
  return [...COUNTRIES];
}

function flattenValidationErrors(
  errors: ValidationError[],
  parent = ""
): string[] {
  const messages: string[] = [];
  for (const error of errors) {
    const property = parent ? `${parent}.${error.property}` : error.property;
    if (error.constraints) {
      for (const msg of Object.values(error.constraints)) {
        messages.push(`${property}: ${msg}`);
      }
    }
    if (error.children && error.children.length > 0) {
      messages.push(...flattenValidationErrors(error.children, property));
    }
  }
  return messages;
}

async function assertValid(value: object): Promise<void> {
  try {
    await validateOrReject(value);
  } catch (errors) {
    if (Array.isArray(errors)) {
      const details = flattenValidationErrors(errors as ValidationError[]);
      throw new Error(
        details.length > 0
          ? `Validation failed: ${details.join("; ")}`
          : "Validation failed"
      );
    }
    throw errors;
  }
}

function sameIgnoreCase(a: string | undefined, b: string): boolean {
  return typeof a === "string" && a.toUpperCase() === b.toUpperCase();
}

function requireValidH3Index(h3Index: string): void {
  if (!h3Index || !h3.h3IsValid(h3Index)) {
    throw new Error("Invalid h3Index");
  }
}

/** Turf 7 polygon() requires a closed ring. h3-js 3 does not repeat the first vertex. */
function closedGeoJsonRing(boundary: number[][]): number[][] {
  if (boundary.length === 0) return boundary;
  const first = boundary[0];
  const last = boundary[boundary.length - 1];
  if (first[0] === last[0] && first[1] === last[1]) return boundary;
  return [...boundary, [first[0], first[1]]];
}

/**
 * kappa-osm only knows OSM primitives (node / way / relation). An SSR is stored
 * as a closed OSM *way* (`type === "way"`) whose `refs` are vertex nodes; the
 * SSR payload lives in the way's tags. Those ways are not OpenStreetMap streets.
 * Do not change the on-disk type: existing databases and bbox queries depend on
 * it. HTTP responses map these records to `type: "ssr"`.
 */
function isLiveSsr(element: Element): boolean {
  return element.type === "way" && !element.deleted;
}

export interface IHash {
  [key: string]: any;
}

let kappaCores: IHash = {};

COUNTRIES.forEach((country) => {
  kappaCores[country] = Osm({
    core: kappa(KAPPA_CORE_DIR + "/" + SWARM_TOPIC_PREFIX + "_" + country, {
      valueEncoding: "json",
    }),
    index: memdb(),
    storage: function (name, cb) {
      cb(null, ram());
    },
  });

  const swarm = Swarm.swarm(
    kappaCores[country],
    SWARM_TOPIC_PREFIX + "_" + country
  );
});

export const find = async (country: string, id: string): Promise<Ssr> => {
  if (!COUNTRIES.includes(country)) throw new Error("Invalid country");

  const osmGet = new Promise<Element[]>((resolve, reject) => {
    kappaCores[country].get(id, function (err, nodes) {
      if (err) reject(err);
      else resolve(nodes);
    });
  });

  const nodes: Element[] = await osmGet;

  if (nodes.length === 0) throw new Error("No record found");
  if (nodes[0].deleted) throw new Error("No record found");

  const mapResponse = (response: Element[]) =>
    response.map((p) => ({
      id: p.id,
      type: "ssr",
      services: p.tags.services,
      geometry: p.tags.geometry,
      altitude: p.tags.altitude,
      provider: p.tags.provider,
      timestamp: new Date(p.timestamp).getTime() / 1000,
      active: p.tags.active,
    }));

  const ssrs: Ssr[] = mapResponse(nodes);
  return ssrs[0];
};

export const remove = async (
  country: string,
  id: string,
  provider: string
): Promise<void> => {
  if (!COUNTRIES.includes(country)) throw new Error("Invalid country");

  if (!provider) throw new Error("Invalid provider");

  const osmGet = new Promise<Element[]>((resolve, reject) => {
    kappaCores[country].get(id, function (err, nodes) {
      if (err) reject(err);
      else resolve(nodes);
    });
  });

  const nodes: Element[] = await osmGet;

  if (nodes.length === 0) throw new Error("No record found");
  if (nodes[0].deleted) throw new Error("No record found");
  if (!sameIgnoreCase(nodes[0].tags.provider, provider))
    throw new Error("Invalid provider");

  const osmDel = new Promise<void>((resolve, reject) => {
    kappaCores[country].del(
      nodes[0].id,
      { changeset: nodes[0].changeset },
      function (err) {
        if (err) reject(err);
        else resolve();
      }
    );
  });

  await osmDel;
  return;
};

export const findHex = async (
  country: string,
  h3Index: string
): Promise<Ssr[]> => {
  if (!COUNTRIES.includes(country)) throw new Error("Invalid country");
  requireValidH3Index(h3Index);

  const hexBoundary = closedGeoJsonRing(h3.h3ToGeoBoundary(h3Index, true));
  const hexPoly = turf.polygon([hexBoundary]);
  const hexCenterCoordinates = h3.h3ToGeo(h3Index);

  const center = [hexCenterCoordinates[1], hexCenterCoordinates[0]];
  const circle = turf.circle(center, SEARCH_RADIUS_KM, {
    steps: 6,
    units: "kilometers",
  });
  const bbox = turf.bbox(circle);

  const osmQuery = new Promise<Element[]>((resolve, reject) => {
    kappaCores[country].query([bbox[0], bbox[1], bbox[2], bbox[3]], function (
      err,
      nodes
    ) {
      if (err) reject(err);
      else resolve(nodes);
    });
  });

  const elements: Element[] = await osmQuery;
  const ways = elements.filter(isLiveSsr);
  const waysActive = ways.filter((element) => element.tags.active === true);

  const waysIntersect = waysActive.filter((way) => {
    try {
      return Boolean(
        turf.intersect(
          turf.featureCollection([
            hexPoly,
            turf.polygon(way.tags.geometry.coordinates),
          ])
        )
      );
    } catch {
      return false;
    }
  });

  const mapResponse = (response: Element[]) =>
    response.map((p) => ({
      id: p.id,
      type: "ssr",
      services: p.tags.services,
      geometry: p.tags.geometry,
      altitude: p.tags.altitude,
      provider: p.tags.provider,
      timestamp: new Date(p.timestamp).getTime() / 1000,
      active: p.tags.active,
    }));

  const ssrs: Ssr[] = mapResponse(waysIntersect);

  return ssrs;
};

export const findAllProvider = async (
  country: string,
  provider: string
): Promise<Ssr[]> => {
  if (!COUNTRIES.includes(country)) throw new Error("Invalid country");
  if (!provider) throw new Error("Invalid provider");

  const osmQuery = new Promise<Element[]>((resolve, reject) => {
    kappaCores[country].query([-180, -90, 180, 90], function (err, nodes) {
      if (err) reject(err);
      else resolve(nodes);
    });
  });

  const elements: Element[] = await osmQuery;

  const ways = elements.filter(isLiveSsr);

  const waysAllProvider = ways.filter(
    (element) => sameIgnoreCase(element.tags.provider, provider)
  );

  const mapResponse = (response: Element[]) =>
    response.map((p) => ({
      id: p.id,
      type: "ssr",
      services: p.tags.services,
      geometry: p.tags.geometry,
      altitude: p.tags.altitude,
      provider: p.tags.provider,
      timestamp: new Date(p.timestamp).getTime() / 1000,
      active: p.tags.active,
    }));

  const ssrs: Ssr[] = mapResponse(waysAllProvider);

  return ssrs;
};

export const create = async (
  country: string,
  ssr: SsrDto,
  provider: string
): Promise<string> => {
  if (!COUNTRIES.includes(country)) throw new Error("Invalid country");

  if (!provider) throw new Error("Invalid provider");

  await assertValid(ssr);

  let nodeIds: string[] = [];

  // Vertex nodes so kappa-osm can bbox-index the closed way. They are not SSRs.
  for (let i = 0; i < ssr.geometry.coordinates[0].length - 1; i++) {
    const node: Element = {
      type: "node",
      changeset: "abcdef",
      lon: ssr.geometry.coordinates[0][i][0],
      lat: ssr.geometry.coordinates[0][i][1],
    };

    const osmCreate = new Promise<Element>((resolve, reject) => {
      kappaCores[country].create(node, function (err, nodes) {
        if (err) reject(err);
        else resolve(nodes);
      });
    });

    const nodeResp: Element = await osmCreate;

    if (!nodeResp.id) {
      throw new Error("Failed to create record");
    }

    nodeIds.push(nodeResp.id);
  }

  const way: Element = {
    // Repurposed OSM way: this is the SSR. Keep type "way" for existing records.
    type: "way",
    changeset: "abcdef",
    refs: nodeIds,
    tags: {
      services: ssr.services,
      geometry: ssr.geometry,
      provider: provider,
      altitude: ssr.altitude,
      version: Global.ssdVersion,
      active: ssr.active ?? true,
    },
  };

  const osmCreate = new Promise<Element>((resolve, reject) => {
    kappaCores[country].create(way, function (err, nodes) {
      if (err) reject(err);
      else resolve(nodes);
    });
  });

  const nodeResp: Element = await osmCreate;

  if (!nodeResp.id) {
    throw new Error("Failed to create record");
  }

  return nodeResp.id;
};

export const update = async (
  country: string,
  id: string,
  ssr: SsrDto,
  provider: string
): Promise<void> => {
  if (!COUNTRIES.includes(country)) throw new Error("Invalid country");

  if (!provider) throw new Error("Invalid provider");

  await assertValid(ssr);

  const osmGet = new Promise<Element[]>((resolve, reject) => {
    kappaCores[country].get(id, function (err, nodes) {
      if (err) reject(err);
      else resolve(nodes);
    });
  });

  const nodes: Element[] = await osmGet;

  if (nodes.length === 0) throw new Error("No record found");
  if (nodes[0].deleted) throw new Error("No record found");
  if (!sameIgnoreCase(nodes[0].tags.provider, provider))
    throw new Error("Invalid provider");

  let nodeIds: string[] = [];

  // Vertex nodes so kappa-osm can bbox-index the closed way. They are not SSRs.
  for (let i = 0; i < ssr.geometry.coordinates[0].length - 1; i++) {
    const node: Element = {
      type: "node",
      changeset: "abcdef",
      lon: ssr.geometry.coordinates[0][i][0],
      lat: ssr.geometry.coordinates[0][i][1],
    };

    const osmCreate = new Promise<Element>((resolve, reject) => {
      kappaCores[country].create(node, function (err, nodes) {
        if (err) reject(err);
        else resolve(nodes);
      });
    });

    const nodeResp: Element = await osmCreate;

    if (!nodeResp.id) {
      throw new Error("Failed to create record");
    }

    nodeIds.push(nodeResp.id);
  }

  const way: Element = {
    // Repurposed OSM way: this is the SSR. Keep type "way" for existing records.
    type: "way",
    changeset: "abcdef",
    refs: nodeIds,
    tags: {
      services: ssr.services,
      geometry: ssr.geometry,
      provider: provider,
      altitude: ssr.altitude,
      version: Global.ssdVersion,
      active: ssr.active ?? nodes[0].tags.active ?? true,
    },
  };

  const osmPut = new Promise<Element>((resolve, reject) => {
    kappaCores[country].put(nodes[0].id, way, function (err, nodes) {
      if (err) reject(err);
      else resolve(nodes);
    });
  });

  await osmPut;
  return;
};
