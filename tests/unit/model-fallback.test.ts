import { beforeEach, describe, expect, it, vi } from 'vitest';
import {
  AiRequestError,
  AllModelsFailedError,
  runWithFallback,
  statusOf,
} from '../../src/ai/model-fallback';

const err = (status: number) =>
  Object.assign(new Error(`HTTP ${status}`), { customErrorData: { status } });
const sleep = vi.fn(() => Promise.resolve());

beforeEach(() => sleep.mockClear());

describe('statusOf', () => {
  it('reads customErrorData, then the message, else undefined', () => {
    expect(statusOf(err(429))).toBe(429);
    expect(statusOf(new Error('got 503 from server'))).toBe(503);
    expect(statusOf(new Error('boom'))).toBeUndefined();
    expect(statusOf('x')).toBeUndefined();
  });
});

describe('runWithFallback', () => {
  it('returns the first model that answers', async () => {
    const call = vi.fn().mockResolvedValue('ok');
    expect(await runWithFallback(['a', 'b'], call, { sleep })).toEqual({ value: 'ok', model: 'a' });
    expect(call).toHaveBeenCalledTimes(1);
  });
  it('moves straight to the next model on 429', async () => {
    const call = vi.fn().mockRejectedValueOnce(err(429)).mockResolvedValue('ok');
    const out = await runWithFallback(['a', 'b'], call, { sleep });
    expect(out.model).toBe('b');
    expect(sleep).not.toHaveBeenCalled();
  });
  it('retries once on 503 then succeeds on the same model', async () => {
    const call = vi.fn().mockRejectedValueOnce(err(503)).mockResolvedValue('ok');
    const out = await runWithFallback(['a', 'b'], call, { sleep });
    expect(out.model).toBe('a');
    expect(sleep).toHaveBeenCalledOnce();
  });
  it('moves on after a second 500', async () => {
    const call = vi
      .fn()
      .mockRejectedValueOnce(err(500))
      .mockRejectedValueOnce(err(500))
      .mockResolvedValue('ok');
    expect((await runWithFallback(['a', 'b'], call, { sleep })).model).toBe('b');
  });
  it('fails immediately on other errors', async () => {
    const call = vi.fn().mockRejectedValue(err(400));
    await expect(runWithFallback(['a', 'b'], call, { sleep })).rejects.toBeInstanceOf(
      AiRequestError,
    );
    expect(call).toHaveBeenCalledTimes(1);
  });
  it('throws a friendly error when all models fail', async () => {
    const call = vi.fn().mockRejectedValue(err(429));
    await expect(runWithFallback(['a', 'b'], call, { sleep })).rejects.toBeInstanceOf(
      AllModelsFailedError,
    );
  });
  it('reports the answering model', async () => {
    const onModel = vi.fn();
    await runWithFallback(['a'], () => Promise.resolve(1), { sleep, onModel });
    expect(onModel).toHaveBeenCalledWith('a');
  });
});
