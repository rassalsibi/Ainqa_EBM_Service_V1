import { serve } from "@hono/node-server";
import dotenv from "dotenv";
import patientRoute from "@/routes/cb";
import dev from "@/routes/dev";
import v1 from "@/routes/v1";
import chatbot from "./routes/chatbot/index";
import "dotenv/config";
import { Hono } from "hono";
import { cors } from "hono/cors";
import { HTTPException } from "hono/http-exception";
import { logger } from "hono/logger";
import { timeout } from "hono/timeout";

dotenv.config();

const app = new Hono();

// Middleware
app.use("*", logger());
app.use(
  "*",
  cors({
    origin: "*",
    allowMethods: ["GET", "HEAD", "POST", "PUT", "DELETE"],
    credentials: true,
  }),
);
app.use("*", timeout(120000));

// Mount API routes
app.route("/v1", v1);
app.route("/dev", dev);
//app.route("/cb", patientRoute);
app.route("/chatbot", chatbot);

// Root endpoint
app.get("/", (c) => {
  return c.json({
    service: "EBM Diagnosis Service",
    version: "1.0.0",
    status: "running",
  });
});

// Global error handler
app.onError((err, c) => {
  console.error(`${err}`);

  if (err instanceof HTTPException) {
    return err.getResponse();
  }

  // Default handler for non-HTTP exceptions
  console.error("Server error:", err);
  return c.json(
    {
      success: false,
      error: "Internal Server Error",
      message: "An unexpected error occurred while processing your request",
    },
    500,
  );
});

// Default 404 handler
app.notFound((c) => {
  return c.json(
    {
      success: false,
      error: "Not Found",
      message: "The requested endpoint does not exist",
    },
    404,
  );
});

// Start the server
const port = Number.parseInt(process.env.PORT || "3001", 10);

serve(
  {
    fetch: app.fetch,
    port: port,
  },
  (info) => {
    console.log(
      `EBM Diagnosis Service is running on http://localhost:${info.port}`,
    );
  },
);

export default app;
