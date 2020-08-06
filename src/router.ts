import * as express from "express";
import cors from "cors";
import * as Service from "./service";
import { Ssr } from "./models/ssr.interface";
import { SsrDto } from "./models/ssr.dto";
import { checkJwt } from "./middleware/authz.middleware";

const jwtAuthz = require("express-jwt-authz");

const AUTH0_AUDIENCE: string = process.env.AUTH0_AUDIENCE as string;

class Router {
  constructor(server: express.Express) {
    const router = express.Router();

    router.get(
      "/:country/ssrs/:id",
      async (req: express.Request, res: express.Response) => {
        try {
          const country: string = req.params.country.toUpperCase();
          const id: string = req.params.id;
          const ssr: Ssr = await Service.find(country, id);
          res.status(200).send(ssr);
        } catch (e) {
          res.status(404).send(e.message);
        }
      }
    );

    router.delete(
      "/:country/ssrs/:id",
      checkJwt,
      jwtAuthz(["delete:ssrs"]),
      async (req: express.Request, res: express.Response) => {
        try {
          const provider: string = req["user"][AUTH0_AUDIENCE + "/provider"];
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
          const h3Index: string = String(req.query.h3Index);
          const ssrs: Ssr[] = await Service.findHex(country, h3Index);
          res.status(200).send(ssrs);
        } catch (e) {
          res.status(404).send(e.message);
        }
      }
    );

    router.post(
      "/:country/ssrs",
      checkJwt,
      jwtAuthz(["create:ssrs"]),
      async (req: express.Request, res: express.Response) => {
        try {
          const provider: string = req["user"][AUTH0_AUDIENCE + "/provider"];
          const country: string = req.params.country.toUpperCase();
          let ssr = new SsrDto();
          Object.assign(ssr, req.body);
          const id: string = await Service.create(country, ssr, provider);
          res.status(201).send(id);
        } catch (e) {
          res.status(404).send(e.message);
        }
      }
    );

    router.put(
      "/:country/ssrs/:id",
      checkJwt,
      jwtAuthz(["update:ssrs"]),
      async (req: express.Request, res: express.Response) => {
        try {
          const provider: string = req["user"][AUTH0_AUDIENCE + "/provider"];
          const country: string = req.params.country.toUpperCase();
          const id: string = req.params.id;
          let ssr = new SsrDto();
          Object.assign(ssr, req.body);
          await Service.update(country, id, ssr, provider);
          res.sendStatus(200);
        } catch (e) {
          res.status(500).send(e.message);
        }
      }
    );

    router.options("*", cors());
    server.use("/", router);
  }
}

export default Router;
