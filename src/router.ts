import * as express from "express";
import * as Service from "./service";
import { Ssr } from "./models/ssr.interface";
import { SsrDto } from "./models/ssr.dto";
import { checkJwt } from "./middleware/authz.middleware";
import { Global } from "./global";
import { plainToClass } from "class-transformer";

const jwtAuthz = require("express-jwt-authz");

const AUTH0_AUDIENCE: string = process.env.AUTH0_AUDIENCE as string;
const AUTH_REQUIRED: boolean = ["1", "true", "yes", "on"].includes(
  (process.env.AUTH_REQUIRED || "true").toLowerCase()
);

const NOAUTH_PROVIDER = "noauthtest";

function httpStatusForError(message: string): number {
  if (message && message.startsWith("Validation failed")) {
    return 400;
  }
  switch (message) {
    case "No record found":
      return 404;
    case "Invalid country":
    case "Invalid h3Index":
    case "Invalid polygon":
      return 400;
    case "Invalid provider":
      return 403;
    default:
      return 500;
  }
}

class Router {
  constructor(server: express.Express) {
    const router = express.Router();
    const getProvider = (req: express.Request): string => {
      if (!AUTH_REQUIRED) {
        return NOAUTH_PROVIDER;
      }

      const userClaims = req["user"] as Record<string, string> | undefined;
      const provider = userClaims?.[AUTH0_AUDIENCE + "/provider"];

      if (!provider) {
        throw new Error("Invalid provider");
      }

      return provider;
    };

    router.get("/health", (_req: express.Request, res: express.Response) => {
      res.status(200).json({ status: "ok" });
    });

    router.get("/countries", (_req: express.Request, res: express.Response) => {
      res.status(200).json(Service.listCountries());
    });

    router.get(
      "/:country/provider/ssrs",
      ...(AUTH_REQUIRED ? [checkJwt, jwtAuthz(["read:ssrs"])] : []),
      async (req: express.Request, res: express.Response) => {
        try {
          const provider: string = getProvider(req);
          const country: string = req.params.country.toUpperCase();
          const ssrs: Ssr[] = await Service.findAllProvider(country, provider);
          res
            .status(200)
            .type("application/vnd.oscp+json; version=" + Global.ssdVersion)
            .send(ssrs);
        } catch (e: any) {
          res.status(httpStatusForError(e.message)).send(e.message);
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
        } catch (e: any) {
          res.status(httpStatusForError(e.message)).send(e.message);
        }
      }
    );

    router.delete(
      "/:country/ssrs/:id",
      ...(AUTH_REQUIRED ? [checkJwt, jwtAuthz(["delete:ssrs"])] : []),
      async (req: express.Request, res: express.Response) => {
        try {
          const provider: string = getProvider(req);
          const country: string = req.params.country.toUpperCase();
          const id: string = req.params.id;
          await Service.remove(country, id, provider);
          res.sendStatus(200);
        } catch (e: any) {
          res.status(httpStatusForError(e.message)).send(e.message);
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
        } catch (e: any) {
          res.status(httpStatusForError(e.message)).send(e.message);
        }
      }
    );

    router.post(
      "/:country/ssrs",
      ...(AUTH_REQUIRED ? [checkJwt, jwtAuthz(["create:ssrs"])] : []),
      async (req: express.Request, res: express.Response) => {
        try {
          const provider: string = getProvider(req);
          const country: string = req.params.country.toUpperCase();
          const ssr = plainToClass(SsrDto, req.body);
          const id: string = await Service.create(country, ssr, provider);
          res.status(201).send(id);
        } catch (e: any) {
          res.status(httpStatusForError(e.message)).send(e.message);
        }
      }
    );

    router.put(
      "/:country/ssrs/:id",
      ...(AUTH_REQUIRED ? [checkJwt, jwtAuthz(["update:ssrs"])] : []),
      async (req: express.Request, res: express.Response) => {
        try {
          const provider: string = getProvider(req);
          const country: string = req.params.country.toUpperCase();
          const ssr = plainToClass(SsrDto, req.body);
          const id: string = req.params.id;
          await Service.update(country, id, ssr, provider);
          res.sendStatus(200);
        } catch (e: any) {
          res.status(httpStatusForError(e.message)).send(e.message);
        }
      }
    );

    server.use("/", router);
  }
}

export default Router;
