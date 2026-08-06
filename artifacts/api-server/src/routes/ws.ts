/**
 * WebSocket route — /api/ws/prices
 *
 * Clients connect here to receive real-time Binance price ticks.
 *
 * Protocol (JSON over WS):
 *   ← { type: "snapshot", data: PriceTick[] }   — sent once on connect
 *   ← { type: "tick",     data: PriceTick   }   — sent on every Binance tick
 *   ← { type: "ping"                         }   — sent every 30 s (keepalive)
 *   → { type: "pong"                         }   — client should reply (optional)
 */

import type { FastifyInstance } from "fastify";
import type { BinancePriceFeed, PriceTick } from "../services/binance-price-feed";

const PING_INTERVAL_MS = 30_000;

export async function registerPriceWsRoute(
  app: FastifyInstance,
  priceFeed: BinancePriceFeed,
): Promise<void> {
  app.get(
    "/api/ws/prices",
    { websocket: true },
    (socket) => {
      // 1. Send full snapshot immediately so the client has all prices right away
      const snapshot = priceFeed.getSnapshot();
      socket.send(JSON.stringify({ type: "snapshot", data: snapshot }));

      // 2. Forward every Binance tick to this client
      const onTick = (tick: PriceTick) => {
        if (socket.readyState === socket.OPEN) {
          socket.send(JSON.stringify({ type: "tick", data: tick }));
        }
      };
      priceFeed.on("tick", onTick);

      // 3. Keepalive ping every 30 s
      const pingTimer = setInterval(() => {
        if (socket.readyState === socket.OPEN) {
          socket.send(JSON.stringify({ type: "ping" }));
        }
      }, PING_INTERVAL_MS);

      // 4. Cleanup on disconnect
      socket.on("close", () => {
        clearInterval(pingTimer);
        priceFeed.off("tick", onTick);
      });

      socket.on("error", () => {
        clearInterval(pingTimer);
        priceFeed.off("tick", onTick);
      });

      // Optional: handle pong from client
      socket.on("message", (raw: Buffer) => {
        try {
          const msg = JSON.parse(raw.toString());
          if (msg?.type === "pong") return; // acknowledged
        } catch { /* ignore non-JSON */ }
      });
    },
  );

  app.log.info("WebSocket price route registered at /api/ws/prices");
}
