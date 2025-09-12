export interface PatientDemographic {
  name?: string;
  gender?: string;
  age?: string;
  patientid?: string;
}

export interface ChiefComplaint {
  chiefcomplaints: string;
  bodysite?: string;
  severity?: string;
  verification?: string;
  duration?: string;
  remarks?: string;
}

export interface DiagnosisEntry {
  diagnosis: string;
  verification?: string;
  duration?: string;
}

export interface Diagnosis {
  Primary?: DiagnosisEntry[];
  Admission?: DiagnosisEntry[];
}

export interface PatientData {
  PatientDemographic?: PatientDemographic;
  ChiefComplaints?: ChiefComplaint[];
  Diagnosis?: Diagnosis;
  MedicationOrder?: string[];
  Documentation?: string[];
  History?: Record<string, any>;
}
