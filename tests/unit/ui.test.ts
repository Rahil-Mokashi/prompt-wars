import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { buildActionCards } from '../../src/actions/build-actions';
import { runRules } from '../../src/domain/verifier';
import { announce, focusResults } from '../../src/ui/a11y';
import { STRINGS } from '../../src/ui/i18n';
import { clearBusy, renderResult, renderSkeleton } from '../../src/ui/render';
import type { VerifiedResult } from '../../src/domain/types';
import { makeExtraction } from './fixtures';

const meta = { model: 'test-model', extractMs: 1500, verifyMs: 250 };

function resultFor(overrides = {}, method: 'web' | 'guidance' = 'guidance'): VerifiedResult {
  return { ...runRules(makeExtraction(overrides)), method };
}

function render(result: VerifiedResult) {
  const container = document.createElement('section');
  const handlers = { copy: vi.fn(), speak: vi.fn() };
  renderResult(container, result, buildActionCards(result), meta, handlers);
  return { container, handlers };
}

describe('renderResult', () => {
  it('renders severity, summary, cards and latency', () => {
    const { container } = render(resultFor({ severity: 'high' }));
    expect(container.querySelector('.badge')?.textContent).toBe('HIGH severity');
    expect(container.textContent).toContain('A man cut his hand.');
    expect(container.querySelectorAll('.card').length).toBeGreaterThan(1);
    expect(container.textContent).toContain('Extract 1.5 s, verify 0.3 s, model test-model');
  });

  it('says "Web verified" only for the web method', () => {
    expect(render(resultFor({}, 'web')).container.textContent).toContain(STRINGS.webVerified);
    const guidance = render(resultFor({}, 'guidance')).container.textContent;
    expect(guidance).toContain(STRINGS.guidanceChecked);
    expect(guidance).not.toContain(STRINGS.webVerified);
  });

  it('renders model text as text, never as HTML', () => {
    const payload = '<img src=x onerror="window.pwned=1"><script>window.pwned=1</script>';
    const { container } = render(resultFor({ situation_summary: payload }));
    expect(container.querySelector('img')).toBeNull();
    expect(container.querySelector('script')).toBeNull();
    expect(container.textContent).toContain(payload);
  });

  it('labels call links, marks status with text and shows risk flags', () => {
    const { container } = render(resultFor({ key_facts: ['Severe chest pain'], confidence: 0.2 }));
    const call = container.querySelector<HTMLAnchorElement>('a[href="tel:112"]');
    expect(call?.getAttribute('aria-label')).toBe('Call: Call 112 now');
    expect(container.textContent).toContain(STRINGS.needsCheck);
    expect(container.textContent).toContain('can be life-threatening');
  });

  it('lists missing information and source links safely', () => {
    const result = resultFor({ missing_info: ['Time of the fall'] });
    result.actions[0] = {
      ...result.actions[0]!,
      sources: [
        { name: 'WHO', url: 'https://www.who.int' },
        { name: 'NDMA', url: 'https://ndma.gov.in' },
      ],
    };
    const { container } = render(result);
    expect(container.textContent).toContain('Still unknown: Time of the fall');
    const link = container.querySelector<HTMLAnchorElement>('.sources a');
    expect(link?.rel).toBe('noopener noreferrer');
    expect(container.querySelectorAll('.sources a')).toHaveLength(2);
  });

  it('wires the copy and read-aloud buttons to the handlers', () => {
    const { container, handlers } = render(resultFor());
    const copy = container.querySelector<HTMLButtonElement>('button[aria-label^="Copy"]');
    copy?.click();
    expect(handlers.copy).toHaveBeenCalledWith(expect.stringContaining('EMERGENCY HANDOFF'));
    const speak = container.querySelector<HTMLButtonElement>('button[aria-label^="Read aloud"]');
    speak?.click();
    expect(handlers.speak).toHaveBeenCalled();
  });
});

describe('skeleton and busy state', () => {
  it('shows a skeleton and sets aria-busy, then clears it', () => {
    const container = document.createElement('section');
    renderSkeleton(container);
    expect(container.querySelectorAll('.skeleton').length).toBeGreaterThan(0);
    expect(container.getAttribute('aria-busy')).toBe('true');
    clearBusy(container);
    expect(container.hasAttribute('aria-busy')).toBe(false);
  });
});

describe('a11y helpers', () => {
  beforeEach(() => vi.useFakeTimers());
  afterEach(() => vi.useRealTimers());

  it('announces by clearing then setting the live region', () => {
    const region = document.createElement('div');
    announce(region, 'Done');
    expect(region.textContent).toBe('');
    vi.runAllTimers();
    expect(region.textContent).toBe('Done');
  });

  it('moves focus to the results container', () => {
    const element = document.createElement('section');
    element.tabIndex = -1;
    document.body.append(element);
    focusResults(element);
    expect(document.activeElement).toBe(element);
    element.remove();
  });
});
