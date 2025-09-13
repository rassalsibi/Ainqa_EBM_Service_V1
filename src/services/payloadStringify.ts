import { systemPrompt } from "@/prompts/jsonToText";
import { e2eLLM } from "@/services/llm";

export interface ChatbotPayload {
  patient_data: object;
  possible_diagnosis: object | object[];
  recommendations?: object | object[];
}

export async function formatPayload(input: ChatbotPayload) {
  if (!input.patient_data) {
    throw new Error("Patinet Data is required");
  }

  if (!input.possible_diagnosis) {
    throw new Error("Possible Diagnosis is Required");
  }
  const possibleDiagnosis = Array.isArray(input.possible_diagnosis)
    ? input.possible_diagnosis
    : [input.possible_diagnosis];

  const recommendations = input.recommendations
    ? Array.isArray(input.recommendations)
      ? input.recommendations
      : [input.recommendations]
    : undefined;

  const payload = {
    patient_data: input.patient_data,
    possible_diagnosis: possibleDiagnosis,
    ...(recommendations && { recommendations }),
  };

  const llmResult = await e2eLLM.generateText({
    messages: [
      {
        role: "system",
        content: systemPrompt,
      },
      {
        role: "user",
        content: `Data: \n${JSON.stringify(payload, null, 2)}`,
      },
    ],
  });

  return llmResult.text;
}
