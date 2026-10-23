import type { Extraction, GuidanceVerdict } from '../domain/types';

/** Dev-only canned extraction that looks like a real model answer. */
export const MOCK_EXTRACTION: Extraction = {
  pack: 'medical',
  situation_summary:
    'An elderly man fell and hit his head on a stone step. He is awake but dizzy and has a small cut on his forehead.',
  severity: 'medium',
  confidence: 0.86,
  key_facts: [
    'Fell and hit his head on a stone step',
    'Awake but dizzy, small bleeding cut on forehead',
    'Takes warfarin (blood thinner) for a heart condition',
  ],
  patient: {
    age: 72,
    allergies: [],
    medications: ['Warfarin'],
    conditions: ['Atrial fibrillation'],
  },
  location_hint: 'Dadar, Mumbai',
  missing_info: ['Time of the fall', 'Whether he vomited or lost consciousness'],
  actions: [
    {
      priority: 1,
      type: 'first_aid',
      title: 'Keep him still',
      instruction: 'Let him sit or lie down and stay calm. Do not give food or drink.',
    },
    {
      priority: 2,
      type: 'first_aid',
      title: 'Press on the cut',
      instruction: 'Press a clean cloth firmly on the cut and keep pressing.',
    },
    {
      priority: 3,
      type: 'navigate',
      title: 'Go to the nearest hospital',
      instruction: 'Head injuries on blood thinners need a doctor today.',
    },
    {
      priority: 4,
      type: 'share',
      title: 'Show the hospital his medicines',
      instruction: 'Share the summary so staff know he takes warfarin.',
    },
  ],
};

/** Dev-only canned guidance verdicts matching MOCK_EXTRACTION. */
export const MOCK_VERDICTS: GuidanceVerdict[] = [
  { priority: 1, verdict: 'supported', ruleId: 'head-injury' },
  { priority: 2, verdict: 'supported', ruleId: 'bleeding' },
];
