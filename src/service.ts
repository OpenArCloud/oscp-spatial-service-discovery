import { Ssr } from "./models/ssr.interface";
import request from "request-promise";
import { Element } from "./models/osm_json.interface";
import { SsrDto } from "./models/ssr.dto";
import { validateOrReject } from "class-validator";
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

const KAPPA_CORE_DIR: string = process.env.KAPPA_CORE_DIR as string;
const SWARM_TOPIC_PREFIX: string = process.env.SWARM_TOPIC_PREFIX as string;
let COUNTRIES: string[] = process.env.COUNTRIES.split(",");
COUNTRIES = COUNTRIES.map(function (x) {
  return x.toUpperCase();
});

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
      timestamp: p.timestamp,
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
  if (nodes[0].tags.provider.toUpperCase() !== provider.toUpperCase())
    throw new Error("Invalid provider");

  const osmDel = new Promise((resolve, reject) => {
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
  if (!h3Index) throw new Error("Invalid h3Index");

  const hexBoundary = h3.h3ToGeoBoundary(h3Index, true);
  const hexPoly = turf.polygon([hexBoundary]);
  const hexCenterCoordinates = h3.h3ToGeo(h3Index);

  const center = [hexCenterCoordinates[1], hexCenterCoordinates[0]];
  const radius = 5;
  const options = { steps: 6 };
  const circle = turf.circle(center, radius, options);
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
  const ways = elements.filter((element) => element.type === "way");

  const waysIntersect = ways.filter((way) =>
    turf.intersect(hexPoly, turf.polygon(way.tags.geometry.coordinates))
  );

  const mapResponse = (response: Element[]) =>
    response.map((p) => ({
      id: p.id,
      type: "ssr",
      services: p.tags.services,
      geometry: p.tags.geometry,
      altitude: p.tags.altitude,
      provider: p.tags.provider,
      timestamp: p.timestamp,
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

  const ways = elements.filter((element) => element.type === "way");

  const waysAllProvider = ways.filter(
    (element) => element.tags.provider === provider
  );

  const mapResponse = (response: Element[]) =>
    response.map((p) => ({
      id: p.id,
      type: "ssr",
      services: p.tags.services,
      geometry: p.tags.geometry,
      altitude: p.tags.altitude,
      provider: p.tags.provider,
      timestamp: p.timestamp,
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

  try {
    await validateOrReject(ssr);
  } catch (errors) {
    throw new Error("Validation failed");
  }

  if (
    JSON.stringify(ssr.geometry.coordinates[0][0]) !==
    JSON.stringify(
      ssr.geometry.coordinates[0][ssr.geometry.coordinates[0].length - 1]
    )
  )
    throw new Error("Invalid polygon");

  const newPoly = turf.polygon(ssr.geometry.coordinates);
  const center = turf.centerOfMass(newPoly);
  const radius = 10;
  const options = { steps: 6 };
  const circle = turf.circle(center, radius, options);
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
  const ways = elements.filter((element) => element.type === "way");
  const waysAllExclusion = ways.filter(
    (element) => element.tags.services[0].type === "exclusion"
  );
  const waysIntersect = waysAllExclusion.filter((way) =>
    turf.intersect(newPoly, turf.polygon(way.tags.geometry.coordinates))
  );

  if (waysIntersect.length > 0) {
    throw new Error("Exclusion intersection");
  }

  let nodeIds: string[] = [];

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
    type: "way",
    changeset: "abcdef",
    refs: nodeIds,
    tags: {
      services: ssr.services,
      geometry: ssr.geometry,
      provider: provider,
      altitude: ssr.altitude,
      version: Global.ssdVersion,
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

  try {
    await validateOrReject(ssr);
  } catch (errors) {
    throw new Error("Validation failed");
  }

  const osmGet = new Promise<Element[]>((resolve, reject) => {
    kappaCores[country].get(id, function (err, nodes) {
      if (err) reject(err);
      else resolve(nodes);
    });
  });

  const nodes: Element[] = await osmGet;

  if (nodes.length === 0) throw new Error("No record found");
  if (nodes[0].deleted) throw new Error("No record found");
  if (nodes[0].tags.provider.toUpperCase() !== provider.toUpperCase())
    throw new Error("Invalid provider");

  if (
    JSON.stringify(ssr.geometry.coordinates[0][0]) !==
    JSON.stringify(
      ssr.geometry.coordinates[0][ssr.geometry.coordinates[0].length - 1]
    )
  )
    throw new Error("Invalid polygon");

  let nodeIds: string[] = [];

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
    type: "way",
    changeset: "abcdef",
    refs: nodeIds,
    tags: {
      services: ssr.services,
      geometry: ssr.geometry,
      provider: provider,
      altitude: ssr.altitude,
      version: Global.ssdVersion,
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
