import { describe, expect, it } from 'vitest';
import { buildActionCards } from '../../src/actions/build-actions';
import { buildErSummary } from '../../src/actions/er-summary';
import { hospitalMapsLink, telLink } from '../../src/actions/links';
import type { Extraction } from '../../src/domain/types';
import { runRules } from '../../src/domain/verifier';
import { makeExtraction } from './fixtures';

function resultFor(overrides: Partial<Extraction> = {}) {
  const rules = runRules(makeExtraction(overrides));
  return { ...rules, method: 'guidance' as const };
}

describe('links', () => {
  it('builds tel links and strips unsafe characters', () => {
    expect(telLink('112')).toBe('tel:112');
    expect(telLink('+91 98 76<script>')).toBe('tel:+919876');
  });
  it('builds a Maps link with and without a location', () => {
    expect(hospitalMapsLink(null)).toContain('hospital%20near%20me');
    expect(hospitalMapsLink(' Dadar ')).toContain('hospital%20near%20Dadar');
  });
});

describe('buildErSummary', () => {
  it('includes patient details and omits empty sections', () => {
    const text = buildErSummary(
      makeExtraction({
        patient: { age: 72, allergies: [], medications: ['Warfarin'], conditions: [] },
        location_hint: 'Dadar',
      }),
    );
    expect(text).toContain('Age: 72');
    expect(text).toContain('Medications: Warfarin');
    expect(text).toContain('Location: Dadar');
    expect(text).not.toContain('Allergies');
  });
  it('handles a null patient', () => {
    expect(buildErSummary(makeExtraction({ patient: null }))).toContain('Severity: LOW');
  });
});

describe('buildActionCards', () => {
  it('puts Call 112 first', () => {
    expect(buildActionCards(resultFor())[0]?.href).toBe('tel:112');
  });
  it('adds an ambulance card for high severity only', () => {
    const high = buildActionCards(resultFor({ severity: 'high' }));
    const low = buildActionCards(resultFor());
    expect(high.some((c) => c.href === 'tel:108')).toBe(true);
    expect(low.some((c) => c.href === 'tel:108')).toBe(false);
  });
  it('maps navigate to a Maps link and share to a copy card', () => {
    const cards = buildActionCards(
      resultFor({
        actions: [
          { priority: 1, type: 'navigate', title: 'Go', instruction: 'Hospital.' },
          { priority: 2, type: 'share', title: 'Share', instruction: 'Summary.' },
        ],
      }),
    );
    expect(cards.find((c) => c.kind === 'link')?.href).toContain('google.com/maps');
    expect(cards.find((c) => c.kind === 'copy')?.copyText).toContain('EMERGENCY HANDOFF');
  });
  it('always offers a copy-summary card', () => {
    expect(buildActionCards(resultFor()).some((c) => c.kind === 'copy')).toBe(true);
  });
});
