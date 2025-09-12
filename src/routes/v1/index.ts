import dotenv from "dotenv";
import { Hono } from "hono";
import { handleDiagnosisRequest } from "@/handlers/diagnosis";
import { apiKeyAuth } from "@/middleware/auth";

dotenv.config();

const v1 = new Hono();

// Apply API key authentication to all v1 routes
v1.use("*", apiKeyAuth);

// Diagnosis endpoint
v1.post("/diagnose", handleDiagnosisRequest);

export default v1;
