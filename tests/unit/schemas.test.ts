import { describe, expect, it } from 'vitest';
import { parseExtraction, parseVerdicts, SAFE_FALLBACK } from '../../src/ai/schemas';
import { makeExtraction } from './fixtures';

describe('parseExtraction', () => {
  it('accepts a valid extraction', () => {
    expect(parseExtraction(JSON.stringify(makeExtraction()))).toEqual(makeExtraction());
  });
  it('accepts a fenced JSON block', () => {
    const fenced = '```json\n' + JSON.stringify(makeExtraction()) + '\n```';
    expect(parseExtraction(fenced)).not.toBeNull();
  });
  it('accepts a null patient', () => {
    expect(parseExtraction(JSON.stringify(makeExtraction({ patient: null })))).not.toBeNull();
  });
  it('rejects malformed JSON', () => {
    expect(parseExtraction('{not json')).toBeNull();
  });
  it('rejects non-object JSON', () => {
    expect(parseExtraction('[1,2]')).toBeNull();
  });
  it('rejects a wrong severity enum', () => {
    const bad = { ...makeExtraction(), severity: 'extreme' };
    expect(parseExtraction(JSON.stringify(bad))).toBeNull();
  });
  it('rejects a wrong action type', () => {
    const bad = makeExtraction({
      actions: [{ priority: 1, type: 'teleport' as never, title: 't', instruction: 'i' }],
    });
    expect(parseExtraction(JSON.stringify(bad))).toBeNull();
  });
  it('rejects missing fields', () => {
    const rest: Record<string, unknown> = { ...makeExtraction() };
    delete rest.situation_summary;
    expect(parseExtraction(JSON.stringify(rest))).toBeNull();
  });
  it('rejects confidence outside 0-1', () => {
    const bad = { ...makeExtraction(), confidence: 1.5 };
    expect(parseExtraction(JSON.stringify(bad))).toBeNull();
  });
  it('rejects a malformed patient', () => {
    const bad = { ...makeExtraction(), patient: { age: 'old' } };
    expect(parseExtraction(JSON.stringify(bad))).toBeNull();
  });
});

describe('parseVerdicts', () => {
  it('accepts valid verdicts', () => {
    const text = JSON.stringify({
      verdicts: [{ priority: 1, verdict: 'supported', ruleId: 'bleeding' }],
    });
    expect(parseVerdicts(text)).toHaveLength(1);
  });
  it('rejects an unknown verdict', () => {
    const text = JSON.stringify({ verdicts: [{ priority: 1, verdict: 'maybe', ruleId: null }] });
    expect(parseVerdicts(text)).toBeNull();
  });
  it('rejects malformed JSON and missing verdicts', () => {
    expect(parseVerdicts('nope')).toBeNull();
    expect(parseVerdicts('{}')).toBeNull();
  });
});

describe('SAFE_FALLBACK', () => {
  it('always tells the user to call 112', () => {
    const hasCall = SAFE_FALLBACK.actions.some((a) => a.type === 'call' && a.title.includes('112'));
    expect(hasCall).toBe(true);
  });
});
