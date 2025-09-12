import fs from "fs/promises";
import { Hono } from "hono";
import neo4jDriver, { auth } from "neo4j-driver";
import path from "path";
import {
  createDriverConfig,
  createNeo4jConfig,
} from "@/config/database.config";
import { runDiagnosis } from "@/services/diagnosis";
import { openaiEmbedding } from "@/services/embedding";
import { patientToText } from "@/services/patientToText";
import { searchByEmbedding } from "@/services/vectorSearch";
import type { PatientData } from "@/types/patientData";

const patientRoute = new Hono();

patientRoute.post("/:id", async (c) => {
  const rawId = c.req.param("id");
  const patientId = rawId.trim();
  const folderPath = path.join(process.cwd(), "patient-data");

  const body = await c.req.json<{ question: string }>();
  const question = body.question;

  try {
    const files = await fs.readdir(folderPath);

    for (const file of files) {
      if (file.endsWith(".json")) {
        const filePath = path.join(folderPath, file);
        const fileContent = await fs.readFile(filePath, "utf-8");
        const patientData: PatientData = JSON.parse(fileContent);

        if (patientData.PatientDemographic?.patientid === patientId) {
          const text = patientToText(patientData);

          const embeddingResult = await openaiEmbedding.embed({
            value: text,
          });

          const config = createNeo4jConfig();
          const driverConfig = createDriverConfig(config);
          const driver = neo4jDriver.driver(
            config.url,
            auth.basic(config.username, config.password),
            driverConfig,
          );

          const symptomMatches = await searchByEmbedding(
            driver,
            "Symptom",
            embeddingResult.embedding,
            5,
          );
          const diagnosisMatches = await searchByEmbedding(
            driver,
            "Diagnosis",
            embeddingResult.embedding,
            5,
          );
          const investigationMatches = await searchByEmbedding(
            driver,
            "Investigation",
            embeddingResult.embedding,
            5,
          );
          const observationMatches = await searchByEmbedding(
            driver,
            "Observation",
            embeddingResult.embedding,
            5,
          );

          const { text: answer, context } = await runDiagnosis({
            symptomMatches,
            diagnosisMatches,
            investigationMatches,
            observationMatches,
            textSummary: text,
            question,
          });

          return c.json({
            patientId,
            question,
            answer,
            context,
          });
        }
      }
    }

    return c.json({ error: `Patient ${patientId} not found` }, 404);
  } catch (err: any) {
    return c.json({ error: `Error reading patient data: ${err.message}` }, 500);
  }
});

export default patientRoute;
