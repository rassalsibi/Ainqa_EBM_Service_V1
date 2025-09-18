import { Hono } from "hono";
import { prompt } from "@/prompts/chatStreamPromptFunction";
import { e2eLLM } from "@/services/llm";

const chatbot = new Hono();

chatbot.get("/test", (c) =>
  c.json({ success: true, msg: "Chatbot router works!" }),
);

chatbot.post("/query", async (c) => {
  try {
    const {
      messages,
      patientDataRaw,
      potentialDiagnosisRaw,
      recommendationsRaw,
    }: {
      messages: Array<{ role: string; content: string; parts?: any[] }>;
      patientDataRaw: object | string;
      potentialDiagnosisRaw: object | object[];
      recommendationsRaw: object | object[];
    } = await c.req.json();

    if (!messages || !Array.isArray(messages)) {
      return c.json(
        { success: false, error: "Messages array is required" },
        400,
      );
    }

    const patientData = JSON.stringify(patientDataRaw);
    const possibleDiagnosis = JSON.stringify(potentialDiagnosisRaw);
    const recommendations = JSON.stringify(recommendationsRaw);

    const systemPrompt = prompt({
      messages,
      patientDataString: patientData,
      potentialDiagnosisString: possibleDiagnosis,
      recommendationsString: recommendations,
    });

    const streamResult = await e2eLLM.streamText({
      system: systemPrompt,
      messages: [{ role: "system", content: systemPrompt }],
    });

    // return a streaming response
    return streamResult.toTextStreamResponse();
  } catch (error: any) {
    return c.json({ success: false, error: error.message }, 400);
  }
});

export default chatbot;
