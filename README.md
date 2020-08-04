# oscp-spatial-service-discovery
OSCP Spatial Service Discovery


## Purpose

Baseline implementation of the OSCP Spatial Service Discovery APIs built on the [kappa-osm](https://github.com/digidem/kappa-osm) database for decentralized OpenStreetMap and synchronizing in real-time via [hyperswarm](https://github.com/hyperswarm/hyperswarm).

The P2P stack is based on components from the [Hypercore protocol](https://hypercore-protocol.org/). The [kappa-osm](https://github.com/digidem/kappa-osm) database builds on [kappa-core](https://github.com/kappa-db/kappa-core), which combines multi-writer append-only logs, [hypercores](https://github.com/mafintosh/hypercore) via [multifeed](https://github.com/kappa-db/multifeed), with materialized views. Spatial queries rely on a Bkd tree materialized view, [unordered-materialized-bkd](https://github.com/digidem/unordered-materialized-bkd).

Authentication/authorization is based on JSON Web Tokens (JWTs) via [OpenID Connect](https://openid.net/connect/). A sample integration with [Auth0](https://auth0.com/) is provided.


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


## Spatial Service Record

Base version of a Spatial Service Record (expected to evolve):

```js
Point {
  lat: number;
  lon: number;
}

Geometry {
  type: string;
  coordinates: Point[];
}

Ssr {
  id: string;
  type: string;
  services: string[];
  urls: URL[];
  geometry: Geometry;
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

- [ ] Read specific spatial service record via REST API 
- [ ] REST API authentication
- [ ] Read (bbox search) spatial service records via REST API
- [ ] Delete spatial service record via REST API (single)
- [ ] Create spatial service record via REST API (single)
- [x] Define base spatial service record (JSON)
- [ ] REST API authentication multi-tenancy
- [ ] Update spatial service record via REST API (single)