import { systemPrompt } from "@/prompts/generateDiagnosis";
import { e2eLLM } from "@/services/llm";

interface ChatStreamOptions {
  context: string;
  message: string;
}

export async function chatStream({ context, message }: ChatStreamOptions) {
  const result = await e2eLLM.generateText({
    messages: [
      {
        role: "system",
        content: systemPrompt,
      },
      {
        role: "user",
        content: `Patient context: \n${context}\n\nQuestion: ${message}`,
      },
    ],
  });
  return result.text;
}
