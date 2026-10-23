/** Severity levels, most severe first. */
export const SEVERITIES = ['critical', 'high', 'medium', 'low'] as const;
export type Severity = (typeof SEVERITIES)[number];

/** Kinds of action the model may propose. */
export const ACTION_TYPES = ['call', 'navigate', 'first_aid', 'share', 'monitor'] as const;
export type ActionType = (typeof ACTION_TYPES)[number];

/** Domain packs. Only `medical` is registered today. */
export const PACK_IDS = ['medical', 'disaster'] as const;
export type PackId = (typeof PACK_IDS)[number];

/** Patient details the model found in the input. */
export interface Patient {
  age: number | null;
  allergies: string[];
  medications: string[];
  conditions: string[];
}

/** One step the user can take, as proposed by the model. */
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

/** Whether an action passed Verify or needs a person to check it. */
export type VerifyStatus = 'verified' | 'needs_human_check';

/** An official source backing an action. */
export interface Source {
  name: string;
  url: string;
}

/** An action plus the result of the Verify step. */
export interface VerifiedAction extends Action {
  status: VerifyStatus;
  reasons: string[];
  sources: Source[];
}

/** A reviewed rule that fired and escalated the result. */
export interface RiskFlag {
  id: string;
  reason: string;
}

/** Possible guidance-check verdicts. */
export const VERDICT_KINDS = ['supported', 'not_supported', 'not_covered'] as const;
export type GuidanceVerdictKind = (typeof VERDICT_KINDS)[number];

/** The guidance check's verdict for one action. */
export interface GuidanceVerdict {
  priority: number;
  verdict: GuidanceVerdictKind;
  ruleId: string | null;
}

/** How the Verify step checked the actions: never claims web verification that did not happen. */
export type VerificationMethod = 'web' | 'guidance';

/** Output of Verify: escalated extraction, checked actions and how they were checked. */
export interface VerifiedResult {
  extraction: Extraction;
  actions: VerifiedAction[];
  flags: RiskFlag[];
  method: VerificationMethod;
}
