import { e2eLLM } from "@/services/llm";

export interface ChatbotPayload {
  patient_data: object; // mandatory
  possible_diagnosis: object | object[];
  recommendations?: object | object[];
}

const systemPrompt = `You are a clinical summarization assistant.  
You will always receive input as a cleaned JSON object with the following possible keys:  
- "patient_data" → contains demographics, vitals, medical history, medications, etc.  
- "possible_diagnosis" → contains one or more candidate diagnoses with justifications.  
- "recommendations" → contains suggested treatments, tests, or next steps.  

Your task:  
1. Read the JSON input carefully.  
2. Convert each section into fluent, natural language text suitable for a medical report.  
3. Preserve important clinical details such as age, gender, vital signs, symptoms, confirmed diagnoses, and medications.  
4. For diagnoses, summarize them clearly and include justifications if available.  
5. For recommendations, phrase them as clinical guidance or next steps.  
6. Do not output raw JSON — only natural language text.

Example:  
Input JSON:  
{
  "patient_data": {
    "PatientDemographic": { "name": "Amelia Anderson", "age": "72", "gender": "Female" },
    "Vitals": { "Systolic": "158 mmHg", "Diastolic": "95 mmHg" },
    "ChiefComplaints": [ { "chiefcomplaints": "Fatigue", "duration": "Since 7 days" } ]
  },
  "possible_diagnosis": [
    { "diagnosiscode": "I48.0", "diagnosisdescription": "Paroxysmal Atrial Fibrillation" }
  ],
  "recommendations": []
}

Expected Output:  
"Amelia Anderson is a 72-year-old female presenting with fatigue for the past 7 days.  
Her blood pressure is 158/95 mmHg. She has a confirmed history of atrial fibrillation.  
Possible diagnosis includes paroxysmal atrial fibrillation.  
No specific recommendations are provided at this time."
`;

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

  const llm_result = await e2eLLM.generateText({
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

  return llm_result.text;
}
