import Fastify from "fastify";
import { describe, expect, it } from "vitest";
import { registerHealthRoutes } from "../src/routes/health";

describe("Zebvix API foundation", () => {
  it("returns the standard health response", async () => {
    const app = Fastify();
    await registerHealthRoutes(app, {
      database: { ping: async () => undefined },
      redis: { ping: async () => undefined },
    });
    const response = await app.inject({ method: "GET", url: "/api/health" });
    expect(response.statusCode).toBe(200);
    expect(response.json()).toEqual({
      success: true,
      data: { status: "ok" },
    });
    await app.close();
  });
});