export const SEVERITIES = ['critical', 'high', 'medium', 'low'] as const;
export type Severity = (typeof SEVERITIES)[number];

export const ACTION_TYPES = ['call', 'navigate', 'first_aid', 'share', 'monitor'] as const;
export type ActionType = (typeof ACTION_TYPES)[number];

export const PACK_IDS = ['medical', 'disaster'] as const;
export type PackId = (typeof PACK_IDS)[number];

export interface Patient {
  age: number | null;
  allergies: string[];
  medications: string[];
  conditions: string[];
}

export interface Action {
  priority: number;
  type: ActionType;
  title: string;
  instruction: string;
}

/** The contract every module uses: the structured output of the Extract step. */
export interface Extraction {
  pack: PackId;
  situation_summary: string;
  severity: Severity;
  confidence: number;
  key_facts: string[];
  patient: Patient | null;
  location_hint: string | null;
  missing_info: string[];
  actions: Action[];
}

export type VerifyStatus = 'verified' | 'needs_human_check';

export interface Source {
  name: string;
  url: string;
}

export interface VerifiedAction extends Action {
  status: VerifyStatus;
  reasons: string[];
  sources: Source[];
}

export interface RiskFlag {
  id: string;
  reason: string;
}

export const VERDICT_KINDS = ['supported', 'not_supported', 'not_covered'] as const;
export type GuidanceVerdictKind = (typeof VERDICT_KINDS)[number];

export interface GuidanceVerdict {
  priority: number;
  verdict: GuidanceVerdictKind;
  ruleId: string | null;
}

/** How the Verify step checked the actions: never claims web verification that did not happen. */
export type VerificationMethod = 'web' | 'guidance';

export interface VerifiedResult {
  extraction: Extraction;
  actions: VerifiedAction[];
  flags: RiskFlag[];
  method: VerificationMethod;
}
