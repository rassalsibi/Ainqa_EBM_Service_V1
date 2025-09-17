import { Hono } from "hono";
import { prompt } from "@/services/chatStreamPromptFunction";
import { e2eLLM } from "@/services/llm";

const chatbot = new Hono();

chatbot.get("/test", (c) =>
  c.json({ success: true, msg: "Chatbot router works!" }),
);

chatbot.post("/query", async (c) => {
  try {
    const {
      userMessage,
      patientDataRaw,
      potentialDiagnosisRaw,
      recommendationsRaw,
    }: {
      userMessage: string;
      patientDataRaw: object | string;
      potentialDiagnosisRaw: object | object[];
      recommendationsRaw: object | object[];
    } = await c.req.json();

    if (!userMessage) {
      return c.json({ success: false, error: "User message is required" }, 400);
    }

    const patientData = JSON.stringify(patientDataRaw);
    const possibleDiagnosis = JSON.stringify(potentialDiagnosisRaw);
    const recommendations = JSON.stringify(recommendationsRaw);

    const systemPrompt = prompt({
      userMessage,
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
