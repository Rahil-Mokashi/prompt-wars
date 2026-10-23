import { MS_PER_SECOND, SKELETON_BLOCKS } from '../config';
import type { ActionCard } from '../actions/build-actions';
import type { VerifiedResult } from '../domain/types';
import { STRINGS } from './i18n';

export interface ResultMeta {
  model: string;
  extractMs: number;
  verifyMs: number;
}

function el<K extends keyof HTMLElementTagNameMap>(
  tag: K,
  text?: string,
  className?: string,
): HTMLElementTagNameMap[K] {
  const node = document.createElement(tag);
  if (text !== undefined) node.textContent = text;
  if (className) node.className = className;
  return node;
}

function actionButton(label: string, onClick: () => void): HTMLButtonElement {
  const button = el('button', label, 'btn btn-secondary');
  button.type = 'button';
  button.addEventListener('click', onClick);
  return button;
}

function sourceLinks(card: ActionCard): HTMLElement | null {
  if (card.sources.length === 0) return null;
  const wrap = el('p', `${STRINGS.sources}: `, 'sources');
  card.sources.forEach((source, index) => {
    const link = el('a', source.name);
    link.href = source.url;
    link.target = '_blank';
    link.rel = 'noopener noreferrer';
    if (index > 0) wrap.append(', ');
    wrap.append(link);
  });
  return wrap;
}

export interface CardHandlers {
  copy: (text: string) => void;
  speak: (text: string) => void;
}

/**
 * Status line and reasons for a card. Call cards are always valid, so they show none.
 * @param card - the action card
 */
function statusLines(card: ActionCard): HTMLElement[] {
  if (card.kind === 'call') return [];
  const statusText = card.status === 'verified' ? STRINGS.verified : STRINGS.needsCheck;
  const icon = card.status === 'verified' ? '✔ ' : '⚠ ';
  return [
    el('p', `${icon}${statusText}`, `status status-${card.status}`),
    ...card.reasons.map((reason) => el('p', reason, 'meta')),
  ];
}

/**
 * The tel: or external link button of a card, if it has one.
 * @param card - the action card
 */
function linkButton(card: ActionCard): HTMLAnchorElement | null {
  if (!card.href) return null;
  const link = el('a', card.kind === 'call' ? STRINGS.call : STRINGS.open, 'btn btn-primary');
  link.href = card.href;
  if (card.kind === 'link') {
    link.target = '_blank';
    link.rel = 'noopener noreferrer';
  }
  link.setAttribute('aria-label', `${link.textContent}: ${card.title}`);
  return link;
}

/**
 * A labelled secondary button for one card action.
 * @param label - visible text, also used in the accessible name
 * @param card - the card the button belongs to
 * @param onClick - click handler
 */
function labelledButton(label: string, card: ActionCard, onClick: () => void): HTMLButtonElement {
  const button = actionButton(label, onClick);
  button.setAttribute('aria-label', `${label}: ${card.title}`);
  return button;
}

/**
 * The row of tappable controls (call/open, copy, read aloud) for a card.
 * @param card - the action card
 * @param handlers - copy and read-aloud callbacks
 */
function actionRow(card: ActionCard, handlers: CardHandlers): HTMLElement | null {
  const copyText = card.copyText;
  const candidates: (HTMLElement | null)[] = [
    linkButton(card),
    copyText ? labelledButton(STRINGS.copy, card, () => handlers.copy(copyText)) : null,
    card.speakable
      ? labelledButton(STRINGS.readAloud, card, () =>
          handlers.speak(`${card.title}. ${card.detail}`),
        )
      : null,
  ];
  const controls = candidates.filter((control) => control !== null);
  if (controls.length === 0) return null;
  const row = el('div', undefined, 'card-actions');
  row.append(...controls);
  return row;
}

/**
 * Renders one action card as a list item.
 * @param card - the action card
 * @param handlers - copy and read-aloud callbacks
 */
function renderCard(card: ActionCard, handlers: CardHandlers): HTMLLIElement {
  const item = el('li', undefined, 'card');
  const parts = [
    el('h3', card.title),
    el('p', card.detail),
    ...statusLines(card),
    sourceLinks(card),
    actionRow(card, handlers),
  ].filter((part): part is HTMLElement => part !== null);
  item.append(...parts);
  return item;
}

/**
 * Renders the result into the container using DOM APIs and textContent only.
 * @param container - results section
 * @param result - verified result
 * @param cards - action cards from buildActionCards
 * @param meta - model and per-call latency, shown to the user
 * @param handlers - copy and read-aloud callbacks
 */
export function renderResult(
  container: HTMLElement,
  result: VerifiedResult,
  cards: ActionCard[],
  meta: ResultMeta,
  handlers: CardHandlers,
): void {
  const { extraction } = result;
  const summary = el('div', undefined, 'summary');
  const heading = el('h2', STRINGS.situation);
  const badge = el(
    'span',
    `${extraction.severity.toUpperCase()} severity`,
    `badge badge-${extraction.severity}`,
  );
  summary.append(heading, badge, el('p', extraction.situation_summary));
  for (const flag of result.flags) summary.append(el('p', `⚠ ${flag.reason}`, 'status'));
  if (extraction.missing_info.length > 0) {
    summary.append(
      el('p', `${STRINGS.stillUnknown}: ${extraction.missing_info.join('; ')}`, 'meta'),
    );
  }
  const method = result.method === 'web' ? STRINGS.webVerified : STRINGS.guidanceChecked;
  const seconds = (ms: number): string => (ms / MS_PER_SECOND).toFixed(1);
  summary.append(
    el(
      'p',
      `${method}. Extract ${seconds(meta.extractMs)} s, verify ${seconds(meta.verifyMs)} s, model ${meta.model}.`,
      'meta',
    ),
  );

  const list = el('ol', undefined, 'cards');
  for (const card of cards) list.append(renderCard(card, handlers));
  container.replaceChildren(summary, el('h2', STRINGS.whatToDoNow), list);
}

/**
 * Shows a loading skeleton while the pipeline runs.
 * @param container - results section
 */
export function renderSkeleton(container: HTMLElement): void {
  const blocks = Array.from({ length: SKELETON_BLOCKS }, () => el('div', undefined, 'skeleton'));
  container.replaceChildren(...blocks);
  container.setAttribute('aria-busy', 'true');
}

/**
 * Clears the busy state once results or an error are shown.
 * @param container - results section
 */
export function clearBusy(container: HTMLElement): void {
  container.removeAttribute('aria-busy');
}
