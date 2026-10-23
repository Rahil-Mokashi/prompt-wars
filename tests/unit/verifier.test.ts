import { describe, expect, it } from 'vitest';
import { applyRiskFlags, maxSeverity } from '../../src/domain/risk-flags';
import { applyVerdicts, runRules } from '../../src/domain/verifier';
import { findRule, GUIDANCE } from '../../src/domain/guidance';
import { SEVERITIES } from '../../src/domain/types';
import { makeExtraction } from './fixtures';

describe('risk flags', () => {
  it('escalates head injury on a blood thinner to critical', () => {
    const e = makeExtraction({
      situation_summary: 'He hit his head on a step.',
      patient: { age: 72, allergies: [], medications: ['Warfarin'], conditions: [] },
    });
    const { severity, flags } = applyRiskFlags(e);
    expect(severity).toBe('critical');
    expect(flags[0]?.id).toBe('blood-thinner-head-injury');
  });
  it('escalates red-flag symptoms to at least high', () => {
    const { severity } = applyRiskFlags(makeExtraction({ key_facts: ['Severe chest pain'] }));
    expect(severity).toBe('high');
  });
  it('escalates a swollen throat after an allergic reaction to critical', () => {
    const e = makeExtraction({
      key_facts: ['Allergic reaction, throat swelling, hard to breathe'],
    });
    expect(applyRiskFlags(e).severity).toBe('critical');
  });
  it('never lowers severity', () => {
    const e = makeExtraction({ severity: 'critical', key_facts: ['Small cut'] });
    expect(applyRiskFlags(e).severity).toBe('critical');
  });
  it('maxSeverity returns the more severe', () => {
    expect(maxSeverity('low', 'high')).toBe('high');
    expect(maxSeverity('critical', 'medium')).toBe('critical');
    for (const s of SEVERITIES) expect(maxSeverity(s, s)).toBe(s);
  });
});

describe('runRules', () => {
  it('adds a Call 112 action for high severity when none exists', () => {
    const result = runRules(makeExtraction({ severity: 'high' }));
    expect(result.actions.some((a) => a.type === 'call')).toBe(true);
  });
  it('does not duplicate an existing call action', () => {
    const e = makeExtraction({
      severity: 'critical',
      actions: [{ priority: 1, type: 'call', title: 'Call 112', instruction: 'Call.' }],
    });
    expect(runRules(e).actions.filter((a) => a.type === 'call')).toHaveLength(1);
  });
  it('keeps every original action', () => {
    const e = makeExtraction({ severity: 'high' });
    expect(runRules(e).actions.length).toBeGreaterThanOrEqual(e.actions.length);
  });
  it('marks first-aid for human check on low confidence', () => {
    const result = runRules(makeExtraction({ confidence: 0.2 }));
    expect(result.actions[0]?.status).toBe('needs_human_check');
  });
  it('keeps first-aid verified on high confidence', () => {
    expect(runRules(makeExtraction()).actions[0]?.status).toBe('verified');
  });
});

describe('applyVerdicts', () => {
  const base = () => runRules(makeExtraction()).actions;
  it('attaches the rule source when supported', () => {
    const out = applyVerdicts(base(), [{ priority: 1, verdict: 'supported', ruleId: 'bleeding' }]);
    expect(out[0]?.status).toBe('verified');
    expect(out[0]?.sources[0]?.url).toMatch(/^https:\/\//);
  });
  it('flags not_supported and not_covered for human check', () => {
    for (const verdict of ['not_supported', 'not_covered'] as const) {
      const out = applyVerdicts(base(), [{ priority: 1, verdict, ruleId: null }]);
      expect(out[0]?.status).toBe('needs_human_check');
    }
  });
  it('flags everything when the check could not run', () => {
    expect(applyVerdicts(base(), null)[0]?.status).toBe('needs_human_check');
  });
  it('flags actions with no verdict and unknown rule ids', () => {
    expect(applyVerdicts(base(), [])[0]?.status).toBe('needs_human_check');
    const out = applyVerdicts(base(), [{ priority: 1, verdict: 'supported', ruleId: 'nope' }]);
    expect(out[0]?.status).toBe('needs_human_check');
  });
  it('never drops actions', () => {
    const actions = runRules(makeExtraction({ severity: 'high' })).actions;
    expect(applyVerdicts(actions, null)).toHaveLength(actions.length);
  });
});

describe('guidance', () => {
  it('has 10 rules, each with a top-level https source', () => {
    expect(GUIDANCE).toHaveLength(10);
    for (const rule of GUIDANCE) expect(new URL(rule.source.url).pathname).toBe('/');
  });
  it('finds rules by id', () => {
    expect(findRule('burns')?.topic).toMatch(/burn/i);
    expect(findRule(null)).toBeUndefined();
  });
});
