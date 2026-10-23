import { describe, expect, it, vi } from 'vitest';
import { alertSomeone, copyToClipboard, type AlertNavigator } from '../../src/app/alert';
import { runPipeline, type PipelineDeps } from '../../src/app/pipeline';
import { ResultCache } from '../../src/app/result-cache';
import type { Extraction } from '../../src/domain/types';
import { runRules } from '../../src/domain/verifier';
import { makeExtraction } from './fixtures';

describe('ResultCache', () => {
  it('stores and returns values', () => {
    const cache = new ResultCache<number>(2);
    cache.set('a', 1);
    expect(cache.get('a')).toBe(1);
    expect(cache.get('missing')).toBeUndefined();
    expect(cache.size).toBe(1);
  });

  it('evicts the least recently used entry when full', () => {
    const cache = new ResultCache<number>(2);
    cache.set('a', 1);
    cache.set('b', 2);
    cache.get('a');
    cache.set('c', 3);
    expect(cache.get('b')).toBeUndefined();
    expect(cache.get('a')).toBe(1);
    expect(cache.get('c')).toBe(3);
    expect(cache.size).toBe(2);
  });

  it('overwriting a key does not grow the cache or evict others', () => {
    const cache = new ResultCache<number>(2);
    cache.set('a', 1);
    cache.set('b', 2);
    cache.set('a', 10);
    expect(cache.size).toBe(2);
    expect(cache.get('a')).toBe(10);
    expect(cache.get('b')).toBe(2);
  });
});

function makeDeps(): PipelineDeps {
  const extraction = makeExtraction();
  const times = [100, 400, 650];
  return {
    extract: vi.fn(() => Promise.resolve({ extraction, model: 'm', usedSafeFallback: false })),
    verify: vi.fn((e: Extraction) =>
      Promise.resolve({ ...runRules(e), method: 'guidance' as const }),
    ),
    prepareFile: vi.fn((file: File) => Promise.resolve({ mimeType: file.type, data: 'QQ==' })),
    now: () => times.shift() ?? 0,
  };
}

describe('runPipeline', () => {
  it('times each call and passes the extraction to verify', async () => {
    const deps = makeDeps();
    const out = await runPipeline('help', [], deps);
    expect(out.extractMs).toBe(300);
    expect(out.verifyMs).toBe(250);
    expect(deps.verify).toHaveBeenCalledWith(out.extracted.extraction);
    expect(out.result.method).toBe('guidance');
  });

  it('prepares every file before extracting', async () => {
    const deps = makeDeps();
    const files = [new File(['x'], 'a.pdf', { type: 'application/pdf' })];
    await runPipeline('', files, deps);
    expect(deps.prepareFile).toHaveBeenCalledTimes(1);
    expect(deps.extract).toHaveBeenCalledWith({
      text: '',
      files: [{ mimeType: 'application/pdf', data: 'QQ==' }],
    });
  });

  it('propagates extract failures', async () => {
    const deps = { ...makeDeps(), extract: vi.fn(() => Promise.reject(new Error('boom'))) };
    await expect(runPipeline('help', [], deps)).rejects.toThrow('boom');
  });
});

function makeNav(overrides: Partial<AlertNavigator> = {}): AlertNavigator {
  return { clipboard: { writeText: vi.fn(() => Promise.resolve()) }, ...overrides };
}

describe('alertSomeone', () => {
  it('uses the share sheet when available', async () => {
    const share = vi.fn(() => Promise.resolve());
    const nav = makeNav({ share });
    expect(await alertSomeone('hi', nav)).toBe('shared');
    expect(share).toHaveBeenCalledWith({ text: 'hi' });
    expect(nav.clipboard.writeText).not.toHaveBeenCalled();
  });

  it('treats a closed share sheet as cancelled, without copying', async () => {
    const share = vi.fn(() => Promise.reject(new DOMException('closed', 'AbortError')));
    const nav = makeNav({ share });
    expect(await alertSomeone('hi', nav)).toBe('cancelled');
    expect(nav.clipboard.writeText).not.toHaveBeenCalled();
  });

  it('copies when sharing fails or is unavailable', async () => {
    const failing = makeNav({ share: () => Promise.reject(new Error('nope')) });
    expect(await alertSomeone('hi', failing)).toBe('copied');
    const noShare = makeNav();
    expect(await alertSomeone('hi', noShare)).toBe('copied');
    expect(noShare.clipboard.writeText).toHaveBeenCalledWith('hi');
  });

  it('reports failure when copying also fails', async () => {
    const nav = makeNav({ clipboard: { writeText: () => Promise.reject(new Error('denied')) } });
    expect(await alertSomeone('hi', nav)).toBe('failed');
    expect(await copyToClipboard(nav, 'x')).toBe(false);
  });
});
