<br />
<p align="center">
  <h3 align="center">SSD-FastAPI-Tile38</h3>

  <p align="center">
    OSCP Spatial Service Discovery using FastAPI and Tile38.
    <br />
  </p>
</p>


![Search image](images/geojson.png?raw=true)

<!-- ABOUT THE PROJECT -->

## About The Project

Update of [OSCP Spatial Service Discovery](https://github.com/OpenArCloud/oscp-spatial-service-discovery) to support prototype development in the [MSF Real/Virtual World Integration Working Group](https://github.com/MetaverseStandards/Virtual-Real-Integration). Adapted from [FastAPI-Tile38](https://github.com/iwpnd/fastapi-tile38).


<!-- GETTING STARTED -->

## Getting Started

### Installation

1. Clone and install
    ```sh
    git clone https://github.com/OpenArCloud/SSD-FastAPI-Tile38.git
    cd SSD-FastAPI-Tile38
    poetry install
    ```
2. Setup environment
    ```sh
    cp .env.dist .env
    ```
3. Start your local stack
    ```python
    docker-compose up
    ```

## Usage

Once the application is started you can checkout and interact with it via on [localhost:8001/docs](http://localhost:8001/docs).

Or you can use it with [http](https://httpie.io/)/[curl](https://curl.se/):

```sh
echo '{ "data": { "type": "Feature", "geometry": {"type": "Polygon", "coordinates": [[[-1.472761207099694,50.93965177660982],[-1.4725627247506168,50.93627472651497],[-1.4696053377495275,50.93654990273757],[-97.72679999584793,50.93867620955203],[-1.472761207099694,50.93965177660982]]]}, "properties": {"id": "uuid1", "services":[{"type": "geopose", "url": "http://www.geopose.org", "tags": {"name1": "value1", "name2": "value2"}}]}}}' \
      | http post http://localhost:8001/ssr x-api-key:test
HTTP/1.1 201 Created
content-length: 34
content-type: application/json
date: Mon, 03 Jun 2024 04:00:15 GMT
server: uvicorn

{
    "elapsed": "5.595157ms",
    "ok": true
}


http get http://localhost:8001/search/nearby lat==50.937876 lon==-1.471582 radius==1000   x-api-key:test
HTTP/1.1 200 OK
content-length: 447
content-type: application/json
date: Mon, 03 Jun 2024 04:04:23 GMT
server: uvicorn

{
    "data": [
        {
            "distance": 0.0,
            "id": "uuid1",
            "object": {
                "geometry": {
                    "coordinates": [
                        [
                            [
                                -1.472761207099694,
                                50.93965177660982
                            ],
                            [
                                -1.4725627247506168,
                                50.93627472651497
                            ],
                            [
                                -1.4696053377495275,
                                50.93654990273757
                            ],
                            [
                                -97.72679999584793,
                                50.93867620955203
                            ],
                            [
                                -1.472761207099694,
                                50.93965177660982
                            ]
                        ]
                    ],
                    "type": "Polygon"
                },
                "properties": {
                    "id": "uuid1",
                    "services": [
                        {
                            "tags": {
                                "name1": "value1",
                                "name2": "value2"
                            },
                            "type": "geopose",
                            "url": "http://www.geopose.org"
                        }
                    ]
                },
                "type": "Feature"
            }
        }
    ]
}
```

## License

Distributed under the MIT License. See `LICENSE` for more information.


