import * as express from "express";
import * as Service from "./service";
import { Ssr } from "./models/ssr.interface";
import { SsrDto } from "./models/ssr.dto";
import { checkJwt } from "./middleware/authz.middleware";
import { Global } from "./global";
import { plainToClass } from "class-transformer";

const jwtAuthz = require("express-jwt-authz");

const AUTH0_AUDIENCE: string = process.env.AUTH0_AUDIENCE as string;

class Router {
  constructor(server: express.Express) {
    const router = express.Router();

    router.get(
      "/:country/provider/ssrs",
      async (req: express.Request, res: express.Response) => {
        try {
          const provider: string = "noauthtest";
          const country: string = req.params.country.toUpperCase();
          const ssrs: Ssr[] = await Service.findAllProvider(country, provider);
          res
            .status(200)
            .type("application/vnd.oscp+json; version=" + Global.ssdVersion)
            .send(ssrs);
        } catch (e) {
          res.status(404).send(e.message);
        }
      }
    );

    router.get(
      "/:country/ssrs/:id",
      async (req: express.Request, res: express.Response) => {
        try {
          const country: string = req.params.country.toUpperCase();
          const id: string = req.params.id;
          const ssr: Ssr = await Service.find(country, id);
          res
            .status(200)
            .type("application/vnd.oscp+json; version=" + Global.ssdVersion)
            .send(ssr);
        } catch (e) {
          res.status(404).send(e.message);
        }
      }
    );

    router.delete(
      "/:country/ssrs/:id",
      async (req: express.Request, res: express.Response) => {
        try {
          const provider: string = "noauthtest";
          const country: string = req.params.country.toUpperCase();
          const id: string = req.params.id;
          await Service.remove(country, id, provider);
          res.sendStatus(200);
        } catch (e) {
          res.status(500).send(e.message);
        }
      }
    );

    router.get(
      "/:country/ssrs",
      async (req: express.Request, res: express.Response) => {
        try {
          const country: string = req.params.country.toUpperCase();
          const h3Index: string = req.query.h3Index as string;
          const ssrs: Ssr[] = await Service.findHex(country, h3Index);
          res
            .status(200)
            .type("application/vnd.oscp+json; version=" + Global.ssdVersion)
            .send(ssrs);
        } catch (e) {
          res.status(404).send(e.message);
        }
      }
    );

    router.post(
      "/:country/ssrs",
      async (req: express.Request, res: express.Response) => {
        try {
          const provider: string = "noauthtest";
          const country: string = req.params.country.toUpperCase();
          const ssr = plainToClass(SsrDto, req.body);
          const id: string = await Service.create(country, ssr, provider);
          res.status(201).send(id);
        } catch (e) {
          res.status(404).send(e.message);
        }
      }
    );

    router.put(
      "/:country/ssrs/:id",
      async (req: express.Request, res: express.Response) => {
        try {
          const provider: string = "noauthtest";
          const country: string = req.params.country.toUpperCase();
          const ssr = plainToClass(SsrDto, req.body);
          const id: string = req.params.id;
          await Service.update(country, id, ssr, provider);
          res.sendStatus(200);
        } catch (e) {
          res.status(500).send(e.message);
        }
      }
    );

    server.use("/", router);
  }
}

export default Router;
