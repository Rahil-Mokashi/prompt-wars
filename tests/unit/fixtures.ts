import type { Extraction } from '../../src/domain/types';

export function makeExtraction(overrides: Partial<Extraction> = {}): Extraction {
  return {
    pack: 'medical',
    situation_summary: 'A man cut his hand.',
    severity: 'low',
    confidence: 0.9,
    key_facts: ['Small cut on hand'],
    patient: { age: 30, allergies: [], medications: [], conditions: [] },
    location_hint: null,
    missing_info: [],
    actions: [
      { priority: 1, type: 'first_aid', title: 'Press', instruction: 'Press a clean cloth on it.' },
    ],
    ...overrides,
  };
}
