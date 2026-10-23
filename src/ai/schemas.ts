import type { SchemaRequest } from 'firebase/ai';
import {
  ACTION_TYPES,
  PACK_IDS,
  SEVERITIES,
  type Action,
  type Extraction,
  type GuidanceVerdict,
  type Patient,
} from '../domain/types';

const STR = { type: 'string' } as const;
const STR_LIST = { type: 'array', items: STR } as const;

/** Response schema sent to Gemini for the single extraction call. */
export const EXTRACTION_SCHEMA: SchemaRequest = {
  type: 'object',
  properties: {
    pack: { type: 'string', enum: [...PACK_IDS] },
    situation_summary: STR,
    severity: { type: 'string', enum: [...SEVERITIES] },
    confidence: { type: 'number' },
    key_facts: STR_LIST,
    patient: {
      type: 'object',
      nullable: true,
      properties: {
        age: { type: 'integer', nullable: true },
        allergies: STR_LIST,
        medications: STR_LIST,
        conditions: STR_LIST,
      },
      required: ['age', 'allergies', 'medications', 'conditions'],
    },
    location_hint: { type: 'string', nullable: true },
    missing_info: STR_LIST,
    actions: {
      type: 'array',
      items: {
        type: 'object',
        properties: {
          priority: { type: 'integer' },
          type: { type: 'string', enum: [...ACTION_TYPES] },
          title: STR,
          instruction: STR,
        },
        required: ['priority', 'type', 'title', 'instruction'],
      },
    },
  },
  required: [
    'pack',
    'situation_summary',
    'severity',
    'confidence',
    'key_facts',
    'patient',
    'location_hint',
    'missing_info',
    'actions',
  ],
};

/** Response schema for the guidance check. */
export const VERDICT_SCHEMA: SchemaRequest = {
  type: 'object',
  properties: {
    verdicts: {
      type: 'array',
      items: {
        type: 'object',
        properties: {
          priority: { type: 'integer' },
          verdict: { type: 'string', enum: ['supported', 'not_supported', 'not_covered'] },
          ruleId: { type: 'string', nullable: true },
        },
        required: ['priority', 'verdict', 'ruleId'],
      },
    },
  },
  required: ['verdicts'],
};

/** Shown when the model output cannot be trusted: never raw output, always Call 112. */
export const SAFE_FALLBACK: Extraction = {
  pack: 'medical',
  situation_summary: 'We could not safely understand this input.',
  severity: 'high',
  confidence: 0,
  key_facts: [],
  patient: null,
  location_hint: null,
  missing_info: ['The input could not be analysed.'],
  actions: [
    {
      priority: 1,
      type: 'call',
      title: 'Call 112 now',
      instruction: 'If this is an emergency, call 112 (or 108 for an ambulance) right away.',
    },
  ],
};

type Json = Record<string, unknown>;

const isObject = (value: unknown): value is Json =>
  typeof value === 'object' && value !== null && !Array.isArray(value);

const isStringList = (value: unknown): value is string[] =>
  Array.isArray(value) && value.every((item) => typeof item === 'string');

function oneOf<T extends string>(allowed: readonly T[], value: unknown): value is T {
  return typeof value === 'string' && (allowed as readonly string[]).includes(value);
}

function parsePatient(value: unknown): Patient | null | undefined {
  if (value === null) return null;
  if (!isObject(value)) return undefined;
  const { age, allergies, medications, conditions } = value;
  const ageOk = age === null || (typeof age === 'number' && Number.isFinite(age));
  if (
    !ageOk ||
    !isStringList(allergies) ||
    !isStringList(medications) ||
    !isStringList(conditions)
  ) {
    return undefined;
  }
  return { age, allergies, medications, conditions };
}

function parseActions(value: unknown): Action[] | undefined {
  if (!Array.isArray(value)) return undefined;
  const actions: Action[] = [];
  for (const item of value) {
    if (!isObject(item)) return undefined;
    const { priority, type, title, instruction } = item;
    if (
      typeof priority !== 'number' ||
      !oneOf(ACTION_TYPES, type) ||
      typeof title !== 'string' ||
      typeof instruction !== 'string'
    ) {
      return undefined;
    }
    actions.push({ priority, type, title, instruction });
  }
  return actions;
}

function parseJson(text: string): unknown {
  try {
    return JSON.parse(text.trim().replace(/^```(?:json)?\s*|\s*```$/g, ''));
  } catch {
    return undefined;
  }
}

type ScalarFields = Pick<
  Extraction,
  | 'pack'
  | 'situation_summary'
  | 'severity'
  | 'confidence'
  | 'key_facts'
  | 'location_hint'
  | 'missing_info'
>;

const isConfidence = (value: unknown): value is number =>
  typeof value === 'number' && value >= 0 && value <= 1;

const isNullableString = (value: unknown): value is string | null =>
  value === null || typeof value === 'string';

function hasValidFields(raw: Json): raw is Json & ScalarFields {
  return (
    oneOf(PACK_IDS, raw.pack) &&
    typeof raw.situation_summary === 'string' &&
    oneOf(SEVERITIES, raw.severity) &&
    isConfidence(raw.confidence) &&
    isStringList(raw.key_facts) &&
    isNullableString(raw.location_hint) &&
    isStringList(raw.missing_info)
  );
}

/**
 * Validates model text against the extraction contract.
 * @param text - raw model output
 * @returns the extraction, or null when it is malformed in any way
 */
export function parseExtraction(text: string): Extraction | null {
  const raw = parseJson(text);
  if (!isObject(raw) || !hasValidFields(raw)) return null;
  const patient = parsePatient(raw.patient);
  const actions = parseActions(raw.actions);
  if (patient === undefined || actions === undefined) return null;
  return {
    pack: raw.pack,
    situation_summary: raw.situation_summary,
    severity: raw.severity,
    confidence: raw.confidence,
    key_facts: raw.key_facts,
    patient,
    location_hint: raw.location_hint,
    missing_info: raw.missing_info,
    actions,
  };
}

/**
 * Validates the guidance check output.
 * @param text - raw model output
 * @returns the verdicts, or null when malformed
 */
export function parseVerdicts(text: string): GuidanceVerdict[] | null {
  const raw = parseJson(text);
  if (!isObject(raw) || !Array.isArray(raw.verdicts)) return null;
  const verdicts: GuidanceVerdict[] = [];
  for (const item of raw.verdicts) {
    if (!isObject(item)) return null;
    const { priority, verdict, ruleId } = item;
    if (
      typeof priority !== 'number' ||
      !oneOf(['supported', 'not_supported', 'not_covered'] as const, verdict) ||
      (ruleId !== null && typeof ruleId !== 'string')
    ) {
      return null;
    }
    verdicts.push({ priority, verdict, ruleId });
  }
  return verdicts;
}
