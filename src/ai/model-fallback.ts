import { RETRY_DELAY_MS } from '../config';

/** Raised when every model in the chain failed or was rate limited. */
export class AllModelsFailedError extends Error {
  /** Creates the error with the friendly "service busy" message. */
  constructor() {
    super('Service busy, try again in a minute.');
    this.name = 'AllModelsFailedError';
  }
}

/** Raised for errors that retrying or switching model will not fix. */
export class AiRequestError extends Error {
  /**
   * @param message - user-facing message
   * @param options - standard error options, used to keep the original cause
   */
  constructor(message: string, options?: ErrorOptions) {
    super(message, options);
    this.name = 'AiRequestError';
  }
}

/** Hooks for runWithFallback: a fake sleep for tests and a callback for the answering model. */
export interface FallbackOptions {
  sleep?: (ms: number) => Promise<void>;
  /** Called with the model that answered (used for the dev-only log and UI). */
  onModel?: (model: string) => void;
}

/**
 * Reads the HTTP status from a Firebase AI Logic error.
 * @param error - anything thrown by a model call
 * @returns the status code, or undefined when none is present
 */
export function statusOf(error: unknown): number | undefined {
  if (typeof error !== 'object' || error === null) return undefined;
  const custom = (error as { customErrorData?: { status?: number } }).customErrorData;
  if (typeof custom?.status === 'number') return custom.status;
  const message = (error as { message?: unknown }).message;
  const match = typeof message === 'string' ? /\b([45]\d{2})\b/.exec(message) : null;
  return match?.[1] ? Number(match[1]) : undefined;
}

const defaultSleep = (ms: number): Promise<void> =>
  new Promise((resolve) => setTimeout(resolve, ms));

type Decision = 'next-model' | 'retry' | 'fail';

/**
 * Decides what to do after a failed attempt: 429 moves on, 500/503 retry once, the rest fail.
 * @param status - HTTP status of the failure, if known
 * @param attempt - zero-based attempt number on the current model
 */
function decide(status: number | undefined, attempt: number): Decision {
  if (status === 429) return 'next-model';
  if (status === 500 || status === 503) return attempt === 0 ? 'retry' : 'next-model';
  return 'fail';
}

/**
 * Runs a model call down the chain: 429 moves straight to the next model, 500/503 retries
 * once after a short wait and then moves on, anything else fails immediately.
 * @param models - model IDs in preference order
 * @param call - performs the request against one model
 * @param options - sleep and onModel hooks
 * @returns the value and the model that produced it
 * @throws AllModelsFailedError when no model answered, AiRequestError for other errors
 */
export async function runWithFallback<T>(
  models: readonly string[],
  call: (model: string) => Promise<T>,
  options: FallbackOptions = {},
): Promise<{ value: T; model: string }> {
  const sleep = options.sleep ?? defaultSleep;
  for (const model of models) {
    for (let attempt = 0; attempt < 2; attempt++) {
      try {
        const value = await call(model);
        options.onModel?.(model);
        return { value, model };
      } catch (error) {
        const decision = decide(statusOf(error), attempt);
        if (decision === 'fail') {
          throw new AiRequestError('The request could not be completed. Please try again.', {
            cause: error,
          });
        }
        if (decision === 'next-model') break;
        await sleep(RETRY_DELAY_MS);
      }
    }
  }
  throw new AllModelsFailedError();
}
