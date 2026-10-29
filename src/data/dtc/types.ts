export type Section = 'Powertrain' | 'Chassis' | 'Body' | 'Network';
export type Severity = 'low' | 'medium' | 'high' | 'critical';

export interface DtcInfo {
  code: string;
  title: string;
  section: Section;
  system: string;
  severity: Severity;
  description: string;
  symptoms: string[];
  causes: string[];
  fixes: string[];
  canDrive: string;
  makes?: string[];
  /** true when the entry was synthesised from the code structure (unknown code). */
  fallback?: boolean;
}
