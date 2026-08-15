import { httpRouter } from "convex/server";
import { auth } from "./auth";
import { generateDebate } from "./debate";

const http = httpRouter();

auth.addHttpRoutes(http);

// OpenRouter debate generation — streams text back to the dashboard.
http.route({
  path: "/api/generate-debate",
  method: "POST",
  handler: generateDebate,
});
http.route({
  path: "/api/generate-debate",
  method: "OPTIONS",
  handler: generateDebate,
});

export default http;
