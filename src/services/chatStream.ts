// services/chatStream.ts
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
        content:
          "You are a clinical decision support assistant. Use the given patient data and matches to answer the question clearly and precisely.",
      },
      {
        role: "user",
        content: `Patient context: \n${context}\n\nQuestion: ${message}`,
      },
    ],
  });
  return result.text;
}
