import { Hono } from "hono";
import { cors } from "hono/cors";
import { logger } from "hono/logger";
import { proxyRouter } from "./routes/proxy";
import { searchRouter } from "./routes/search";
import { streamRouter } from "./routes/stream";
import { trendingRouter } from "./routes/trending";
import { videoRouter } from "./routes/video";

const app = new Hono();

app.use("*", logger());
app.use(
  "*",
  cors({
    origin: "*",
    allowMethods: ["GET", "POST", "OPTIONS"],
    allowHeaders: ["Content-Type", "Range"],
    exposeHeaders: ["Content-Range", "Content-Length", "Accept-Ranges"],
  }),
);

// ヘルスチェック
app.get("/api/health", (c) => {
  return c.json({ status: "ok", timestamp: new Date().toISOString() });
});

// ルーターマウント
app.route("/api", proxyRouter);
app.route("/api", searchRouter);
app.route("/api", trendingRouter);
app.route("/api", videoRouter);
app.route("/api", streamRouter);

const PORT = Number(process.env.PORT) || 3000;

console.log(`[Server] YouTube Proxy API ready on port ${PORT}`);

export default {
  port: PORT,
  fetch: app.fetch,
};
