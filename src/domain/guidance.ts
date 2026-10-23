import type { Source } from './types';

export interface GuidanceRule {
  id: string;
  topic: string;
  /** First-aid or safety rule, written in our own words. */
  rule: string;
  source: Source;
}

const WHO: Source = { name: 'World Health Organization', url: 'https://www.who.int' };
const NDMA: Source = { name: 'NDMA India', url: 'https://ndma.gov.in' };
const RED_CROSS: Source = {
  name: 'Indian Red Cross Society',
  url: 'https://www.indianredcross.org',
};
const MOHFW: Source = {
  name: 'Ministry of Health and Family Welfare',
  url: 'https://mohfw.gov.in',
};

/** Curated, human-reviewed safety guidance. Sources are top-level official sites only. */
export const GUIDANCE: readonly GuidanceRule[] = [
  {
    id: 'bleeding',
    topic: 'Severe bleeding',
    rule: 'Press firmly on the wound with a clean cloth and keep pressing. Do not remove a soaked cloth; add another on top. Raise the injured limb if possible.',
    source: RED_CROSS,
  },
  {
    id: 'burns',
    topic: 'Burns and scalds',
    rule: 'Cool the burn under cool running water for about 20 minutes. Do not use ice, butter or toothpaste. Remove rings and tight items near the burn before swelling starts.',
    source: WHO,
  },
  {
    id: 'choking',
    topic: 'Choking',
    rule: 'If the person can cough, let them cough. If they cannot breathe, give up to five firm back blows between the shoulder blades, then up to five abdominal thrusts, and call 112.',
    source: RED_CROSS,
  },
  {
    id: 'unconscious',
    topic: 'Unconscious but breathing',
    rule: 'Lay the person on their side with the head tilted back so the airway stays open. Do not give food or drink. Stay with them and call 112.',
    source: RED_CROSS,
  },
  {
    id: 'not-breathing',
    topic: 'Not breathing, no response',
    rule: 'Call 112 at once. Push hard and fast in the centre of the chest, about twice per second, and keep going until help arrives or the person recovers.',
    source: WHO,
  },
  {
    id: 'head-injury',
    topic: 'Head injury',
    rule: 'Keep the person still and calm. Do not give food or drink. Get medical care urgently, and call 112 if there is vomiting, drowsiness, confusion, a seizure, or if they take blood thinners.',
    source: MOHFW,
  },
  {
    id: 'fracture',
    topic: 'Suspected fracture',
    rule: 'Keep the injured part still and supported in the position found. Do not try to straighten it. Cover any open wound with a clean cloth and get the person to a hospital.',
    source: RED_CROSS,
  },
  {
    id: 'snakebite',
    topic: 'Snakebite',
    rule: 'Keep the person calm and still, and keep the bitten limb still at heart level. Do not cut, suck or tie the wound. Reach a hospital quickly; anti-venom is given only there.',
    source: MOHFW,
  },
  {
    id: 'heat-illness',
    topic: 'Heatstroke',
    rule: 'Move the person to shade, remove extra clothing and cool the body with water and fanning. Give small sips of water only if fully awake. Call 112 if confused or not sweating.',
    source: NDMA,
  },
  {
    id: 'flood',
    topic: 'Flood safety',
    rule: 'Move to higher ground early. Do not walk or drive through floodwater. Switch off electricity at the mains if it is safe, and follow local authority evacuation advice.',
    source: NDMA,
  },
];

/**
 * Finds a guidance rule by id.
 * @param id - rule id returned by the guidance check
 * @returns the rule, or undefined when the id is unknown
 */
export function findRule(id: string | null): GuidanceRule | undefined {
  return GUIDANCE.find((rule) => rule.id === id);
}
