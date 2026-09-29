# oscp-spatial-service-discovery
OSCP Spatial Service Discovery


## Purpose

Baseline implementation of the OSCP Spatial Service Discovery APIs. These APIs allow an OSCP client to discover nearby spatial service providers (ex. GeoPose provider, spatial content provider, reality modeling provider). Spatial service records are synchronized in real-time across multiple top-level (ex. country) providers in a peer-to-peer manner through the [kappa-osm](https://github.com/digidem/kappa-osm) database for decentralized OpenStreetMap. Discovery is managed via [hyperswarm](https://github.com/hyperswarm/hyperswarm).

The P2P stack is based on components from the [Hypercore protocol](https://hypercore-protocol.org/). [kappa-osm](https://github.com/digidem/kappa-osm) builds on [kappa-core](https://github.com/kappa-db/kappa-core), which combines multiple append-only logs, [hypercores](https://github.com/mafintosh/hypercore), via [multifeed](https://github.com/kappa-db/multifeed), and adds materialized views. Spatial queries rely on a Bkd tree materialized view, [unordered-materialized-bkd](https://github.com/digidem/unordered-materialized-bkd).

Authentication/authorization is based on JSON Web Tokens (JWTs) via the [OpenID Connect](https://openid.net/connect/) standard. A sample integration with [Auth0](https://auth0.com/) is provided.


## Usage


Tested on Node 14-24

```
git clone https://github.com/OpenArCloud/oscp-spatial-service-discovery
cd oscp-spatial-service-discovery
npm install
```

Create .env file as described below

```
KAPPA_CORE_DIR=data
SWARM_TOPIC_PREFIX=oscpdev_ssd
AUTH_REQUIRED=true
AUTH0_ISSUER=https://ssd-oscp.us.auth0.com/
AUTH0_AUDIENCE=https://ssd.oscp.cloudpose.io
COUNTRIES=IT,FI,US
PORT=8031
SEARCH_RADIUS_KM=5
```

The service listens on port **8031** when `PORT` is unset. Set `PORT` to use a different port.

Start the Spatial Service Discovery service (development)

```
npm run dev
```

Start the Spatial Service Discovery service (production)

```
npm start
```

## Running the project via Docker

Copy `.env.example` to `.env` and edit it first. The runtime image does not contain that file (the final stage only has `dist` and production dependencies). The process reads `process.env`, so the variables have to be injected when the container starts.

Write values **without** surrounding quotes, as in `.env.example`. A quoted `COUNTRIES="IT,FI"` can keep the quote characters when Docker passes the file through, and the service would then reject the country list.

`PORT` in `.env` is both the port Node listens on and the port to publish. `KAPPA_CORE_DIR` is a path relative to the project directory; the same relative path is mounted at `/app/<KAPPA_CORE_DIR>` inside the container. The entrypoint creates that directory and makes it writable.

`APP_PORT` is only a build argument. It becomes the image's default `PORT` (and the `EXPOSE` value). A `PORT` value passed at run time overrides it. Use the same number in all three places.

### docker compose

From the project directory (the folder that contains `docker-compose.yaml` and `.env`):

```
docker compose up --build -d
```

That build is tagged `oscp/oscp-spatial-service-discovery:latest`.

Compose reads `.env` twice:

- It substitutes `${PORT}` and `${KAPPA_CORE_DIR}` in `docker-compose.yaml` (published port, `APP_PORT` build arg, and the data volume).
- `env_file: .env` injects every variable from that file into the container, including `SWARM_TOPIC_PREFIX`, `COUNTRIES`, `AUTH_REQUIRED`, `AUTH0_ISSUER`, `AUTH0_AUDIENCE`, and `SEARCH_RADIUS_KM`.

Rebuild after source or Dockerfile changes, then recreate the container so it picks up `.env` edits:

```
docker compose down
docker compose up --build --force-recreate --no-deps -d
```

`docker compose down` stops the container and does not delete the host data directory.

### docker run

Build with the same port you will publish, then pass `.env` and mount the data directory. This example matches the defaults (`PORT=8031`, `KAPPA_CORE_DIR=data`):

```
docker build --build-arg APP_PORT=8031 -t oscp/oscp-spatial-service-discovery:latest .
docker run -d --name oscp-spatial-service-discovery --env-file .env -p 8031:8031 -v "./data:/app/data" oscp/oscp-spatial-service-discovery:latest
```

`--env-file .env` is what supplies the runtime configuration. `-e NAME=value` overrides a single variable from that file. If `PORT` or `KAPPA_CORE_DIR` in `.env` is not the default, change `--build-arg`, `-p`, and `-v` to match. For `PORT=9000` and `KAPPA_CORE_DIR=data`:

```
docker build --build-arg APP_PORT=9000 -t oscp/oscp-spatial-service-discovery:latest .
docker run -d --name oscp-spatial-service-discovery --env-file .env -p 9000:9000 -v "./data:/app/data" oscp/oscp-spatial-service-discovery:latest
```

Stop and remove the container with `docker rm -f oscp-spatial-service-discovery`. The host `data` directory remains.

### Environment Configuration

The project uses a `.env` file to configure both runtime and Docker build settings. Create or update `.env` in the project root with the following variables:

```
# Data storage directory (relative path, will be mounted into container)
KAPPA_CORE_DIR=data

# P2P swarm topic prefix for node identification
SWARM_TOPIC_PREFIX=<your_prefix>

# Authentication (default: true; set false only for local/dev without Auth0)
AUTH_REQUIRED=true
AUTH0_ISSUER=https://<your_tenant>.auth0.com/
AUTH0_AUDIENCE=https://<your_domain>:<your_port>

# Spatial discovery regions (ISO country codes). No surrounding quotes.
COUNTRIES=AT,BE,BG,CY,CZ,DE,DK,EE,ES,FI,FR,GR,HR,HU,UI,IT,LT,LU,LV,MT,NL,PL,PT,RO,SE,SG,SI,SK,TR,US

# Service port (default: 8031). Docker publishes the same port on the host.
PORT=8031

# Wider bbox query around the client H3 hex (Turf kilometers). Default: 5
SEARCH_RADIUS_KM=5
```

**Variable Reference:**
- `KAPPA_CORE_DIR`: Local directory for persistent kappa-core database files. This folder is bind-mounted into the container at `/app/${KAPPA_CORE_DIR}` and is not copied into the image. On startup, the container makes that directory readable by every user, so a host account can back it up.
- `SWARM_TOPIC_PREFIX`: Prefix used for hyperswarm topic generation and P2P network identification. It has the same role as GEOZONE in Spatial Content Discovery, servers with the same SWARM_TOPIC_PREFIX will synchronize their data.
- `AUTH_REQUIRED`: When `true` (the default), mutating and provider routes require a JWT. Set to `false` only for local/dev; writes then use provider `noauthtest`.
- `AUTH0_ISSUER`: Auth0 OAuth provider issuer URL.
- `AUTH0_AUDIENCE`: Auth0 audience identifier (typically your service URL).
- `COUNTRIES`: Comma-separated ISO country codes this service instance manages. Spatial Service Records are stored in per-country databases. `GET /countries` returns this list as uppercase JSON, so each client asks the server it is using.
- `PORT`: The port the Node.js service listens on. Default: `8031` when unset. Docker publishes that same port on the host.
- `SEARCH_RADIUS_KM`: Radius in kilometers of the bbox query around the client H3 hex (Turf `kilometers`). Default: `5`.

## Testing via Swagger


```
http://localhost:8031/swagger/
```

![Swagger image](images/swagger.png?raw=true)


## Search Logic

The query API expects a client to provide a hexagonal coverage area by using an [H3 index](https://eng.uber.com/h3/) ex. precision level 8. This avoids exposing the client's specific location. The service then performs a wider scale query at a configurable radius (`SEARCH_RADIUS_KM`, default: 5 km) to the p2p OpenStreetMap backend and returns any coverage polygons that intersect with the client provided H3 hexagon. Invalid H3 indexes are rejected.

![Search image](images/search.png?raw=true)


## API Versioning

Current version: 1.0

The API version can be specified by the HTTP Accept header using a vendor-specific media type as per [RFC4288](https://tools.ietf.org/html/rfc4288):

```
application/vnd.oscp+json; version=1.0;
```


## Spatial Service Record (SSR)

Base version of a Spatial Service Record (expected to evolve):

```js
export interface Property {
  type: string;
  value: string;
}

export interface Service {
  id: string; //provider supplied reference ID
  type: string; //type of spatial services provider ex. geopose, spatial-content
  title: string;
  description?: string;
  url: URL;
  properties?: Property[]; //loosely specified service properties
}

export interface Ssr {
  id: string; //platform generated SSR ID
  type: string; //record type, "ssr" is currently the only valid type
  services: Service[];
  geometry: turf.Polygon; //GeoJSON polygon
  altitude?: number;
  provider: string; //spatial services provider, populated by platform based on auth
  timestamp: number; //platform generated timestamp
  active?: boolean; //state of SSR
}
```


## OSM Document

Documents (OSM elements, observations, etc) have a common format within [kappa-osm](https://github.com/digidem/kappa-osm):

```js
  {
    id: String,
    type: String,
    lat: String,
    lon: String,
    tags: Object,
    changeset: String,
    links: Array<String>,
    version: String,
    deviceId: String
  }
```

## Mapping to OSM Data Model

GeoJSON polygons are mapped to OSM closed *ways* which reference an ordered set of OSM *nodes*. In addition, the GeoJSON polygons are stored as tags within the OSM *ways* to avoid the need to iterate through all nodes on reads. An OSM bounding box query returns a *way* if at least one of the corresponding *nodes* are covered.


## Configuring a Reference Auth Service

To configure Auth0 as a reference auth service please see [Auth0 for SSD](auth0_ssd.md).
