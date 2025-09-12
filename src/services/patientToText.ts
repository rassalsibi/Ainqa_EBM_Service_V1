import type { PatientData } from "@/types/patientData";

export function patientToText(patient: PatientData): string {
  const parts: string[] = [];

  // Demographics
  if (patient.PatientDemographic) {
    const { name, gender, age, patientid } = patient.PatientDemographic;
    parts.push(
      `Patient ${name || "Unknown"} (${gender || "Unknown gender"}, ${age || "Unknown age"}), ID: ${
        patientid || "N/A"
      }.`,
    );
  }

  // Chief Complaints
  if (patient.ChiefComplaints && patient.ChiefComplaints.length > 0) {
    const complaints = patient.ChiefComplaints.map(
      (c) =>
        `${c.chiefcomplaints} (${c.severity || "unspecified severity"}, ${c.duration || "duration not specified"}, ${c.bodysite || "bodysite not specified"})`,
    ).join("; ");
    parts.push(`Chief complaints: ${complaints}.`);
  }

  // Diagnosis
  if (patient.Diagnosis?.Primary && patient.Diagnosis.Primary.length > 0) {
    const diagnoses = patient.Diagnosis.Primary.map(
      (d) =>
        `${d.diagnosis} (${d.verification || "unverified"}, ${d.duration || "N/A"})`,
    ).join("; ");
    parts.push(`Diagnoses: ${diagnoses}.`);
  }

  if (patient.Diagnosis?.Admission && patient.Diagnosis.Admission.length > 0) {
    const admissions = patient.Diagnosis.Admission.map(
      (d) =>
        `${d.diagnosis} (${d.verification || "unverified"}, ${d.duration || "N/A"})`,
    ).join("; ");
    parts.push(`Admissions: ${admissions}.`);
  }

  // Medications
  if (patient.MedicationOrder && patient.MedicationOrder.length > 0) {
    parts.push(`Current medications: ${patient.MedicationOrder.join(", ")}.`);
  }

  // Documentation
  if (patient.Documentation && patient.Documentation.length > 0) {
    parts.push(`Clinical notes: ${patient.Documentation.join(" ")}`);
  }

  // History
  if (patient.History && Object.keys(patient.History).length > 0) {
    parts.push(`Medical history: ${JSON.stringify(patient.History)}.`);
  }

  return parts.join("\n");
}
