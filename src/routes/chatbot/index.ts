import { promises as fs } from "fs";
import { Hono } from "hono";
import path from "path";
import { chatStream } from "@/services/chatStream";
import { formatPayload } from "@/services/payloadStringify";

const chatbot = new Hono();

chatbot.get("/test", (c) =>
  c.json({ success: true, msg: "Chatbot router works!" }),
);

chatbot.post("/query", async (c) => {
  try {
    const body = await c.req.json<{ message: string }>();
    const userMessage = body.message;

    if (!userMessage) {
      return c.json({ success: false, error: "User message is required" }, 400);
    }

    const patientDataPath = path.join(
      process.cwd(),
      "patient-data/Amelia Anderson_AF.json",
    );
    const possibleDiagnosisPath = path.join(
      process.cwd(),
      "sample_data/Step1_Confirmed_Diagnoses.json",
    );

    const patientDataRaw = await fs.readFile(patientDataPath, "utf-8");
    const possibleDiagnosisRaw = await fs.readFile(
      possibleDiagnosisPath,
      "utf-8",
    );

    const patientData = JSON.parse(patientDataRaw);
    const possibleDiagnosis = JSON.parse(possibleDiagnosisRaw);

    const context = await formatPayload({
      patient_data: patientData,
      possible_diagnosis: possibleDiagnosis,
      recommendations: [],
    });
    const text = await chatStream({ context, message: userMessage });

    return c.json({ success: true, text });
  } catch (error: any) {
    return c.json({ success: false, error: error.message }, 400);
  }
});

export default chatbot;
