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

function renderCard(card: ActionCard, handlers: CardHandlers): HTMLLIElement {
  const item = el('li', undefined, 'card');
  item.append(el('h3', card.title), el('p', card.detail));

  if (card.kind !== 'call') {
    const statusText = card.status === 'verified' ? STRINGS.verified : STRINGS.needsCheck;
    const icon = card.status === 'verified' ? '✔ ' : '⚠ ';
    item.append(el('p', `${icon}${statusText}`, `status status-${card.status}`));
    for (const reason of card.reasons) item.append(el('p', reason, 'meta'));
  }
  const sources = sourceLinks(card);
  if (sources) item.append(sources);

  const row = el('div', undefined, 'card-actions');
  if (card.href) {
    const link = el('a', card.kind === 'call' ? STRINGS.call : STRINGS.open, 'btn btn-primary');
    link.href = card.href;
    if (card.kind === 'link') {
      link.target = '_blank';
      link.rel = 'noopener noreferrer';
    }
    link.setAttribute('aria-label', `${link.textContent}: ${card.title}`);
    row.append(link);
  }
  const copyText = card.copyText;
  if (copyText) {
    const copy = actionButton(STRINGS.copy, () => handlers.copy(copyText));
    copy.setAttribute('aria-label', `${STRINGS.copy}: ${card.title}`);
    row.append(copy);
  }
  if (card.speakable) {
    const speak = actionButton(STRINGS.readAloud, () =>
      handlers.speak(`${card.title}. ${card.detail}`),
    );
    speak.setAttribute('aria-label', `${STRINGS.readAloud}: ${card.title}`);
    row.append(speak);
  }
  if (row.childElementCount > 0) item.append(row);
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
  const heading = el('h2', 'Situation');
  const badge = el(
    'span',
    `${extraction.severity.toUpperCase()} severity`,
    `badge badge-${extraction.severity}`,
  );
  summary.append(heading, badge, el('p', extraction.situation_summary));
  for (const flag of result.flags) summary.append(el('p', `⚠ ${flag.reason}`, 'status'));
  if (extraction.missing_info.length > 0) {
    summary.append(el('p', `Still unknown: ${extraction.missing_info.join('; ')}`, 'meta'));
  }
  const method = result.method === 'web' ? STRINGS.webVerified : STRINGS.guidanceChecked;
  const seconds = (ms: number): string => (ms / 1000).toFixed(1);
  summary.append(
    el(
      'p',
      `${method}. Extract ${seconds(meta.extractMs)} s, verify ${seconds(meta.verifyMs)} s, model ${meta.model}.`,
      'meta',
    ),
  );

  const list = el('ol', undefined, 'cards');
  for (const card of cards) list.append(renderCard(card, handlers));
  container.replaceChildren(summary, el('h2', 'What to do now'), list);
}

/**
 * Shows a loading skeleton while the pipeline runs.
 * @param container - results section
 */
export function renderSkeleton(container: HTMLElement): void {
  const blocks = [0, 1, 2].map(() => el('div', undefined, 'skeleton'));
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
