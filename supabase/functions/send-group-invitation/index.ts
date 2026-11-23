import { readSettings } from "./configuration.mts";
import { handleRequest } from "./handler.mts";

const settings = readSettings((name) => Deno.env.get(name));
Deno.serve((request) => handleRequest(request, settings));
