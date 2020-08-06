# oscp-spatial-service-discovery
OSCP Spatial Service Discovery


## Purpose

Baseline implementation of the OSCP Spatial Service Discovery APIs. These APIs allow an OSCP client to discover nearby spatial service providers (ex. GeoPose provider, spatial content provider). Spatial service records are synchronized in real-time across multiple top-level (ex. country) providers in a peer-to-peer manner through the [kappa-osm](https://github.com/digidem/kappa-osm) database for decentralized OpenStreetMap. Discovery is managed via [hyperswarm](https://github.com/hyperswarm/hyperswarm).

The P2P stack is based on components from the [Hypercore protocol](https://hypercore-protocol.org/). [kappa-osm](https://github.com/digidem/kappa-osm) builds on [kappa-core](https://github.com/kappa-db/kappa-core), which combines multiple append-only logs, [hypercores](https://github.com/mafintosh/hypercore), via [multifeed](https://github.com/kappa-db/multifeed), and adds materialized views. Spatial queries rely on a Bkd tree materialized view, [unordered-materialized-bkd](https://github.com/digidem/unordered-materialized-bkd).

Authentication/authorization is based on JSON Web Tokens (JWTs) via the [OpenID Connect](https://openid.net/connect/) standard. A sample integration with [Auth0](https://auth0.com/) is provided.


## Usage


Tested on Node 12.18.3

```
git clone https://github.com/OpenArCloud/oscp-spatial-service-discovery
cd oscp-spatial-service-discovery
npm install
```

Create .env file with required params ex.

```
KAPPA_CORE_DIR="data"
AUTH0_ISSUER=https://ssd-oscp.us.auth0.com/
AUTH0_AUDIENCE=https://ssd.oscp.clouspose.io
COUNTRIES="IT,FI,US"
PORT=3000
```

Start the Spatial Service Discovery service (development)

```
npm run dev
```

Start the Spatial Service Discovery service (production)

```
npm start
```

## Testing via Swagger


```
http://localhost:3000/swagger/
```

![Swagger image](images/swagger.png?raw=true)


## Search Logic

The query API expects a client to provide a hexagonal coverage area by using an [H3 index](https://eng.uber.com/h3/) at precision level 8. This avoids exposing the client's specific location. The service performs a wider scale query at a configurable radius (default: 5km) to the p2p OpenStreetMap backend and returns any coverage polygons that intersect with the client H3 hexagon.

![Search image](images/search.png?raw=true)


## Spatial Service Record

Base version of a Spatial Service Record (expected to evolve):

```js
Ssr {
  id: string;
  type: string;
  services: string[];
  urls: URL[];
  geometry: GeoJSON Polygon;
  altitude?: number;
  provider: string;
  timestamp: Date;
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


## Release 0 Status

- [x] Read specific spatial service record via REST API 
- [x] REST API authentication
- [x] Read (hexagon search) spatial service records via REST API
- [x] Delete spatial service record via REST API (single)
- [x] Create spatial service record via REST API (single)
- [x] Define base spatial service record (JSON)
- [x] REST API authentication multi-tenancy
- [x] Update spatial service record via REST API (single)