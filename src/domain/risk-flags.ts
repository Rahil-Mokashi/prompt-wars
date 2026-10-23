import { SEVERITIES, type Extraction, type RiskFlag, type Severity } from './types';

interface FlagRule {
  id: string;
  reason: string;
  floor: Severity;
  matches: (text: string, medications: string) => boolean;
}

const BLOOD_THINNERS =
  /warfarin|acitrom|apixaban|rivaroxaban|dabigatran|clopidogrel|heparin|blood thinner|anticoagulant/;
const HEAD_INJURY =
  /head injury|hit (his|her|their|the) head|head trauma|fell on (his|her|their) head|head strike|concussion/;
const RED_FLAG_SYMPTOMS =
  /chest pain|not breathing|cannot breathe|can't breathe|difficulty breathing|unconscious|unresponsive|seizure|severe bleeding|heavy bleeding|stroke|face droop|slurred speech/;
const ANAPHYLAXIS = /anaphyla|throat swelling|swollen throat|swollen tongue|allergic reaction/;

const RULES: readonly FlagRule[] = [
  {
    id: 'blood-thinner-head-injury',
    reason: 'Head injury while taking a blood thinner can cause bleeding inside the head.',
    floor: 'critical',
    matches: (text, meds) => HEAD_INJURY.test(text) && BLOOD_THINNERS.test(`${text} ${meds}`),
  },
  {
    id: 'red-flag-symptom',
    reason: 'The described symptoms can be life-threatening and need emergency care.',
    floor: 'high',
    matches: (text) => RED_FLAG_SYMPTOMS.test(text),
  },
  {
    id: 'possible-anaphylaxis',
    reason: 'Swelling of the throat or tongue after an allergic trigger can block breathing.',
    floor: 'critical',
    matches: (text) => ANAPHYLAXIS.test(text) && /throat|tongue|breath/.test(text),
  },
];

/**
 * Compares severities.
 * @returns the more severe of the two
 */
export function maxSeverity(a: Severity, b: Severity): Severity {
  return SEVERITIES.indexOf(a) <= SEVERITIES.indexOf(b) ? a : b;
}

/**
 * Reviewed escalation rules. They can only raise severity, never lower it.
 * @param extraction - the model's structured extraction
 * @returns the (possibly raised) severity and the flags that fired
 */
export function applyRiskFlags(extraction: Extraction): { severity: Severity; flags: RiskFlag[] } {
  const text = [extraction.situation_summary, ...extraction.key_facts].join(' ').toLowerCase();
  const meds = (extraction.patient?.medications ?? []).join(' ').toLowerCase();
  let severity = extraction.severity;
  const flags: RiskFlag[] = [];
  for (const rule of RULES) {
    if (rule.matches(text, meds)) {
      flags.push({ id: rule.id, reason: rule.reason });
      severity = maxSeverity(severity, rule.floor);
    }
  }
  return { severity, flags };
}
