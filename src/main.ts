import './style.css';
import { buildActionCards } from './actions/build-actions';
import { buildSmsMessage, smsLink } from './actions/links';
import { extract } from './ai/extract';
import { AllModelsFailedError } from './ai/model-fallback';
import { verify } from './ai/verify';
import { CACHE_MAX_ENTRIES, EMERGENCY_NUMBER, SMS_DEFAULT_MESSAGE } from './config';
import type { VerifiedResult } from './domain/types';
import { announce, focusResults } from './ui/a11y';
import { SAMPLE_TEXT, STRINGS } from './ui/i18n';
import { speak } from './ui/speech';
import { clearBusy, renderResult, renderSkeleton } from './ui/render';
import { prepareFile } from './utils/image';
import { validateInput } from './utils/validate';

/**
 * Finds a required element and checks its type, so later code needs no casts.
 * @param id - element id
 * @param type - expected element constructor
 * @throws Error when the element is missing or of another type
 */
function byId<T extends HTMLElement>(id: string, type: new () => T): T {
  const node = document.getElementById(id);
  if (!(node instanceof type)) throw new Error(`Missing element #${id}`);
  return node;
}

const form = byId('input-form', HTMLFormElement);
const textInput = byId('text-input', HTMLTextAreaElement);
const fileInput = byId('file-input', HTMLInputElement);
const analyseBtn = byId('analyse-btn', HTMLButtonElement);
const sampleBtn = byId('sample-btn', HTMLButtonElement);
const statusRegion = byId('status', HTMLElement);
const errorRegion = byId('error', HTMLElement);
const results = byId('results', HTMLElement);
const smsAnchor = byId('sms-link', HTMLAnchorElement);
const trustBtn = byId('trust-btn', HTMLButtonElement);
const trustStatus = byId('trust-status', HTMLElement);

interface CachedAnalysis {
  result: VerifiedResult;
  model: string;
}

const cache = new Map<string, CachedAnalysis>();
let busy = false;
let alertMessage = SMS_DEFAULT_MESSAGE;

/**
 * Enables or disables the controls while a request is in flight.
 * @param value - true while analysing
 */
function setBusy(value: boolean): void {
  busy = value;
  analyseBtn.disabled = value;
  sampleBtn.disabled = value;
}

/**
 * Shows an error and clears any previous results.
 * @param message - user-facing message
 */
function showError(message: string): void {
  errorRegion.textContent = message;
  results.replaceChildren();
  clearBusy(results);
}

/**
 * Copies text to the clipboard.
 * @param text - text to copy
 * @returns true when the copy succeeded
 */
async function copyToClipboard(text: string): Promise<boolean> {
  try {
    await navigator.clipboard.writeText(text);
    return true;
  } catch {
    return false;
  }
}

/**
 * Copies a card's text and announces the outcome.
 * @param text - text to copy
 */
function copyText(text: string): void {
  void copyToClipboard(text).then((ok) => {
    announce(statusRegion, ok ? STRINGS.copied : STRINGS.copyFailed);
  });
}

/**
 * Stores a result in the small in-memory cache, evicting the oldest entry when full.
 * @param key - trimmed input text
 * @param value - result and the model that produced it
 */
function remember(key: string, value: CachedAnalysis): void {
  if (cache.size >= CACHE_MAX_ENTRIES) {
    const oldest = cache.keys().next().value;
    if (oldest !== undefined) cache.delete(oldest);
  }
  cache.set(key, value);
}

/**
 * Updates the always-visible "Text 112" link and the share text.
 * @param message - short emergency message
 */
function setAlertMessage(message: string): void {
  alertMessage = message;
  smsAnchor.href = smsLink(EMERGENCY_NUMBER, message);
}

/** Copies the alert text and shows a visible confirmation under the buttons. */
async function copyAlert(): Promise<void> {
  const ok = await copyToClipboard(alertMessage);
  trustStatus.textContent = ok ? STRINGS.alertCopied : STRINGS.copyFailed;
}

/** Shares the alert text with the share sheet, falling back to copying it. */
function alertSomeone(): void {
  if (!('share' in navigator)) {
    void copyAlert();
    return;
  }
  navigator.share({ text: alertMessage }).catch((error: unknown) => {
    const cancelled = error instanceof DOMException && error.name === 'AbortError';
    if (!cancelled) void copyAlert();
  });
}

/**
 * Renders a finished analysis and moves focus to it.
 * @param result - verified result
 * @param model - model that answered
 * @param extractMs - Extract latency
 * @param verifyMs - Verify latency
 */
function show(result: VerifiedResult, model: string, extractMs: number, verifyMs: number): void {
  clearBusy(results);
  setAlertMessage(buildSmsMessage(result.extraction));
  renderResult(
    results,
    result,
    buildActionCards(result),
    { model, extractMs, verifyMs },
    { copy: copyText, speak: (text) => void speak(text) },
  );
  announce(statusRegion, STRINGS.done);
  focusResults(results);
}

/**
 * Validates the form contents.
 * @returns the text and files, or an error message
 */
function readInput(): { text: string; files: File[]; error: string | null } {
  const files = Array.from(fileInput.files ?? []);
  const text = textInput.value;
  const check = validateInput({
    text,
    files: files.map((f) => ({ name: f.name, type: f.type, size: f.size })),
  });
  return { text, files, error: check.ok ? null : check.error };
}

/**
 * Runs Extract then Verify, timing each call.
 * @param text - user text
 * @param files - validated files
 */
async function runPipeline(text: string, files: File[]) {
  const prepared = await Promise.all(files.map(prepareFile));
  const t0 = performance.now();
  const extracted = await extract({ text, files: prepared });
  const t1 = performance.now();
  const result = await verify(extracted.extraction);
  const t2 = performance.now();
  return { extracted, result, extractMs: t1 - t0, verifyMs: t2 - t1 };
}

/**
 * Logs per-call latency in development only.
 * @param extractMs - Extract latency
 * @param verifyMs - Verify latency
 */
function logLatency(extractMs: number, verifyMs: number): void {
  if (!import.meta.env.DEV) return;
  console.info(`[latency] extract ${Math.round(extractMs)} ms, verify ${Math.round(verifyMs)} ms`);
}

/**
 * Runs the pipeline on fresh input, caches text-only results and renders them.
 * @param text - user text
 * @param files - validated files
 * @param cacheKey - cache key for text-only input, else null
 */
async function analyseFresh(text: string, files: File[], cacheKey: string | null): Promise<void> {
  const { extracted, result, extractMs, verifyMs } = await runPipeline(text, files);
  logLatency(extractMs, verifyMs);
  if (cacheKey && !extracted.usedSafeFallback) {
    remember(cacheKey, { result, model: extracted.model });
  }
  show(result, extracted.model, extractMs, verifyMs);
  if (extracted.usedSafeFallback) errorRegion.textContent = STRINGS.safeFallback;
}

/** Runs Input -> Extract -> Verify -> Act for the current form contents. */
async function analyse(): Promise<void> {
  if (busy) return;
  const { text, files, error } = readInput();
  errorRegion.textContent = error ?? '';
  if (error) return;

  const cacheKey = files.length === 0 ? text.trim() : null;
  const cached = cacheKey ? cache.get(cacheKey) : undefined;
  if (cached) {
    show(cached.result, cached.model, 0, 0);
    return;
  }

  setBusy(true);
  renderSkeleton(results);
  announce(statusRegion, STRINGS.analysing);
  try {
    await analyseFresh(text, files, cacheKey);
  } catch (caught) {
    showError(caught instanceof AllModelsFailedError ? STRINGS.busy : STRINGS.failed);
  } finally {
    setBusy(false);
  }
}

setAlertMessage(SMS_DEFAULT_MESSAGE);
trustBtn.addEventListener('click', alertSomeone);

form.addEventListener('submit', (event) => {
  event.preventDefault();
  void analyse();
});

sampleBtn.addEventListener('click', () => {
  textInput.value = SAMPLE_TEXT;
  void analyse();
});
