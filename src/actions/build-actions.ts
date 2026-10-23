import { AMBULANCE_NUMBER, EMERGENCY_NUMBER } from '../config';
import type { Source, VerifiedResult, VerifyStatus } from '../domain/types';
import { buildErSummary } from './er-summary';
import { hospitalMapsLink, telLink } from './links';

export type CardKind = 'call' | 'link' | 'copy' | 'info';

export interface ActionCard {
  id: string;
  kind: CardKind;
  title: string;
  detail: string;
  status: VerifyStatus;
  reasons: string[];
  sources: Source[];
  href?: string;
  copyText?: string;
  /** True when the card text is worth reading aloud. */
  speakable: boolean;
}

function callCard(number: string, title: string, detail: string): ActionCard {
  return {
    id: `call-${number}`,
    kind: 'call',
    title,
    detail,
    status: 'verified',
    reasons: [],
    sources: [],
    href: telLink(number),
    speakable: true,
  };
}

/**
 * Turns verified output into the tappable cards the UI renders. Call 112 is always first.
 * @param result - output of the Verify step
 * @returns ordered action cards
 */
export function buildActionCards(result: VerifiedResult): ActionCard[] {
  const { extraction, actions } = result;
  const modelCall = actions.find((a) => a.type === 'call');
  const cards: ActionCard[] = [
    callCard(
      EMERGENCY_NUMBER,
      `Call ${EMERGENCY_NUMBER} now`,
      modelCall?.instruction ?? 'National emergency number. Say where you are and what happened.',
    ),
  ];
  if (extraction.severity === 'critical' || extraction.severity === 'high') {
    cards.push(
      callCard(AMBULANCE_NUMBER, `Call ${AMBULANCE_NUMBER} (ambulance)`, 'Ask for an ambulance.'),
    );
  }

  actions.forEach((action, index) => {
    if (action.type === 'call') return;
    const base = {
      id: `action-${index}`,
      title: action.title,
      detail: action.instruction,
      status: action.status,
      reasons: action.reasons,
      sources: action.sources,
      speakable: true,
    };
    if (action.type === 'navigate') {
      cards.push({ ...base, kind: 'link', href: hospitalMapsLink(extraction.location_hint) });
    } else if (action.type === 'share') {
      cards.push({ ...base, kind: 'copy', copyText: buildErSummary(extraction) });
    } else {
      cards.push({ ...base, kind: 'info' });
    }
  });

  if (!actions.some((a) => a.type === 'share')) {
    cards.push({
      id: 'share-er-summary',
      kind: 'copy',
      title: 'Copy summary for the hospital',
      detail: 'Copies a short handoff you can paste or show to emergency staff.',
      status: 'verified',
      reasons: [],
      sources: [],
      copyText: buildErSummary(extraction),
      speakable: false,
    });
  }
  return cards;
}
