import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { makeExtraction } from './fixtures';

type Params = { model: string; tools?: unknown };
type Handler = (params: Params) => Promise<unknown>;

let handler: Handler;
const getGenerativeModel = vi.fn((_ai: unknown, params: Params) => ({
  generateContent: () => handler(params),
}));

vi.mock('firebase/ai', () => ({ getGenerativeModel }));
vi.mock('../../src/firebase', () => ({ getAiClient: () => ({}) }));

const verdictsJson = JSON.stringify({
  verdicts: [{ priority: 1, verdict: 'supported', ruleId: 'bleeding' }],
});

const reply = (text: string, chunks: unknown[] = []) =>
  Promise.resolve({
    response: {
      text: () => text,
      candidates: [{ groundingMetadata: { groundingChunks: chunks } }],
    },
  });

const status = (code: number) =>
  Object.assign(new Error(`HTTP ${code}`), { customErrorData: { status: code } });

const groundingCalls = () =>
  getGenerativeModel.mock.calls.filter(([, params]) => params.tools !== undefined).length;

async function load(mock = false) {
  vi.resetModules();
  vi.stubEnv('VITE_USE_MOCK', mock ? 'true' : 'false');
  return import('../../src/ai/verify');
}

beforeEach(() => getGenerativeModel.mockClear());
afterEach(() => vi.unstubAllEnvs());

describe('verify', () => {
  it('makes no model call when there are no first-aid actions', async () => {
    const { verify } = await load();
    const result = await verify(
      makeExtraction({
        actions: [{ priority: 1, type: 'monitor', title: 'Watch', instruction: 'Watch.' }],
      }),
    );
    expect(getGenerativeModel).not.toHaveBeenCalled();
    expect(result.method).toBe('guidance');
  });

  it('reports "web" and attaches web sources only when grounding ran', async () => {
    handler = () =>
      reply(verdictsJson, [{ web: { uri: 'https://example.org/a', title: 'Example' } }, {}]);
    const { verify } = await load();
    const result = await verify(makeExtraction());
    expect(result.method).toBe('web');
    expect(result.actions[0]?.status).toBe('verified');
    expect(result.actions[0]?.sources.map((s) => s.url)).toContain('https://example.org/a');
  });

  it('falls back to the guidance check when grounding is blocked, and never retries grounding', async () => {
    handler = (params) => (params.tools ? Promise.reject(status(429)) : reply(verdictsJson));
    const { verify } = await load();
    const first = await verify(makeExtraction());
    const second = await verify(makeExtraction());
    expect(first.method).toBe('guidance');
    expect(first.actions[0]?.sources[0]?.url).toMatch(/^https:\/\//);
    expect(second.method).toBe('guidance');
    expect(groundingCalls()).toBe(1);
  });

  it('treats an unparseable grounded answer as unavailable', async () => {
    handler = (params) => (params.tools ? reply('not json') : reply(verdictsJson));
    const { verify } = await load();
    expect((await verify(makeExtraction())).method).toBe('guidance');
  });

  it('marks first-aid for human check when the guidance check cannot run', async () => {
    handler = () => Promise.reject(status(400));
    const { verify } = await load();
    const result = await verify(makeExtraction());
    expect(result.method).toBe('guidance');
    expect(result.actions[0]?.status).toBe('needs_human_check');
  });

  it('marks first-aid for human check when guidance output is malformed', async () => {
    handler = (params) => (params.tools ? Promise.reject(status(403)) : reply('garbage'));
    const { verify } = await load();
    expect((await verify(makeExtraction())).actions[0]?.status).toBe('needs_human_check');
  });

  it('escalates severity through the rules before checking', async () => {
    handler = (params) => (params.tools ? Promise.reject(status(429)) : reply(verdictsJson));
    const { verify } = await load();
    const result = await verify(makeExtraction({ key_facts: ['Severe chest pain'] }));
    expect(result.extraction.severity).toBe('high');
    expect(result.flags.length).toBeGreaterThan(0);
  });

  it('uses canned verdicts and makes no Gemini call in mock mode', async () => {
    const { verify } = await load(true);
    const result = await verify(makeExtraction());
    expect(result.method).toBe('guidance');
    expect(getGenerativeModel).not.toHaveBeenCalled();
  });

  it('resetGroundingState allows grounding to be tried again', async () => {
    handler = (params) => (params.tools ? Promise.reject(status(429)) : reply(verdictsJson));
    const { verify, resetGroundingState } = await load();
    await verify(makeExtraction());
    resetGroundingState();
    await verify(makeExtraction());
    expect(groundingCalls()).toBe(2);
  });
});
