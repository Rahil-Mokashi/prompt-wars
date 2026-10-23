import { describe, expect, it } from 'vitest';
import { validateInput } from '../../src/utils/validate';

const file = (type: string, size = 1000) => ({ name: 'a.bin', type, size });

describe('validateInput', () => {
  it('rejects empty input', () => {
    expect(validateInput({ text: '   ', files: [] }).ok).toBe(false);
  });
  it('accepts text only', () => {
    expect(validateInput({ text: 'help', files: [] })).toEqual({ ok: true });
  });
  it('rejects text over 5000 characters', () => {
    expect(validateInput({ text: 'a'.repeat(5001), files: [] }).ok).toBe(false);
  });
  it('accepts exactly 5000 characters', () => {
    expect(validateInput({ text: 'a'.repeat(5000), files: [] }).ok).toBe(true);
  });
  it('rejects more than 5 files', () => {
    const files = Array.from({ length: 6 }, () => file('image/png'));
    expect(validateInput({ text: '', files }).ok).toBe(false);
  });
  it('rejects a wrong MIME type', () => {
    const result = validateInput({ text: '', files: [file('application/x-msdownload')] });
    expect(result.ok).toBe(false);
  });
  it('rejects a file over 10 MB', () => {
    const result = validateInput({ text: '', files: [file('image/png', 10 * 1024 * 1024 + 1)] });
    expect(result.ok).toBe(false);
  });
  it('accepts each whitelisted type', () => {
    const types = [
      'image/jpeg',
      'image/png',
      'image/webp',
      'application/pdf',
      'audio/webm',
      'audio/ogg',
      'audio/mpeg',
      'audio/wav',
    ];
    for (const type of types) {
      expect(validateInput({ text: '', files: [file(type)] }).ok).toBe(true);
    }
  });
});
