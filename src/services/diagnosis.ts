import { e2eLLM } from "@/services/llm";

interface DiagnosisInput {
  symptomMatches: any[];
  diagnosisMatches: any[];
  investigationMatches: any[];
  observationMatches: any[];
  textSummary: string;
  question: string;
}

function buildContext(input: Omit<DiagnosisInput, "question">) {
  return `
        PATIENT SUMMARY:
        ${input.textSummary}

        MEDICAL GUIDELINES FROM GRAPH:
        - Symptoms: ${input.symptomMatches.map((m) => m.name || JSON.stringify(m)).join(", ")}
        - Diagnoses: ${input.diagnosisMatches.map((m) => m.name || JSON.stringify(m)).join(", ")}
        - Investigations: ${input.investigationMatches.map((m) => m.name || JSON.stringify(m)).join(", ")}
        - Observations: ${input.observationMatches.map((m) => m.name || JSON.stringify(m)).join(", ")}
        `;
}

export async function runDiagnosis(input: DiagnosisInput) {
  const context = buildContext(input);
  const result = await e2eLLM.generateText({
    messages: [
      {
        role: "system",
        content:
          "You are a clinical decision support assistant. Use the given patient data and matches to answer the question clearly and precisely.",
      },
      {
        role: "user",
        content: `Context:\n${context}\n\nQuestion: ${input.question}`,
      },
    ],
  });

  return {
    text: result.text,
    context,
  };
}
