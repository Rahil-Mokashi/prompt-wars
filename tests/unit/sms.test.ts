import { describe, expect, it } from 'vitest';
import { buildSmsMessage, smsLink } from '../../src/actions/links';
import { SMS_MAX_CHARS } from '../../src/config';

const base = { situation_summary: 'Man fell and is bleeding.', severity: 'high' as const };

describe('buildSmsMessage', () => {
  it('includes severity, summary and location', () => {
    const text = buildSmsMessage({ ...base, location_hint: 'Dadar, Mumbai' });
    expect(text).toBe('EMERGENCY (high): Man fell and is bleeding. Location: Dadar, Mumbai.');
  });

  it('omits the location when missing or blank', () => {
    for (const location_hint of [null, '   ']) {
      const text = buildSmsMessage({ ...base, location_hint });
      expect(text).not.toContain('Location');
      expect(text).toBe('EMERGENCY (high): Man fell and is bleeding.');
    }
  });

  it('never exceeds the length limit and keeps the location', () => {
    const text = buildSmsMessage({
      situation_summary: 'x'.repeat(2000),
      severity: 'critical',
      location_hint: 'Dadar station',
    });
    expect(text.length).toBeLessThanOrEqual(SMS_MAX_CHARS);
    expect(text.endsWith('Location: Dadar station.')).toBe(true);
    expect(text).toContain('…');
  });

  it('stays within the limit even with a very long location', () => {
    const text = buildSmsMessage({ ...base, location_hint: 'y'.repeat(1000) });
    expect(text.length).toBeLessThanOrEqual(SMS_MAX_CHARS);
  });

  it('flattens newlines and control characters', () => {
    const text = buildSmsMessage({
      situation_summary: 'Line one\n\nLine\ttwo\u0000',
      severity: 'low',
      location_hint: null,
    });
    expect(text).toBe('EMERGENCY (low): Line one Line two');
  });

  it('keeps special characters and non-Latin text intact', () => {
    const text = buildSmsMessage({
      situation_summary: 'Père & fils "hurt" <b>100%</b> मदद चाहिए',
      severity: 'medium',
      location_hint: null,
    });
    expect(text).toContain('Père & fils "hurt" <b>100%</b> मदद चाहिए');
  });
});

describe('smsLink', () => {
  it('encodes the body so special characters cannot break the link', () => {
    const link = smsLink('112', 'a&b=c #1?\n"x"');
    expect(link.startsWith('sms:112?body=')).toBe(true);
    expect(link).not.toMatch(/[ \n"#]/);
    expect(decodeURIComponent(link.split('body=')[1] ?? '')).toBe('a&b=c #1?\n"x"');
  });

  it('strips non-digit characters from the number', () => {
    expect(smsLink('1 12<x>', 'hi')).toBe('sms:112?body=hi');
  });
});
