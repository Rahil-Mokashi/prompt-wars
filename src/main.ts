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
import { clearBusy, renderResult, renderSkeleton } from './ui/render';
import { prepareFile } from './utils/image';
import { validateInput } from './utils/validate';

const byId = <T extends HTMLElement>(id: string): T => {
  const node = document.getElementById(id);
  if (!node) throw new Error(`Missing element #${id}`);
  return node as T;
};

const form = byId<HTMLFormElement>('input-form');
const textInput = byId<HTMLTextAreaElement>('text-input');
const fileInput = byId<HTMLInputElement>('file-input');
const analyseBtn = byId<HTMLButtonElement>('analyse-btn');
const sampleBtn = byId<HTMLButtonElement>('sample-btn');
const statusRegion = byId('status');
const errorRegion = byId('error');
const results = byId('results');
const smsAnchor = byId<HTMLAnchorElement>('sms-link');
const trustBtn = byId<HTMLButtonElement>('trust-btn');
const trustStatus = byId('trust-status');

const cache = new Map<string, { result: VerifiedResult; model: string }>();
let busy = false;

function setBusy(value: boolean): void {
  busy = value;
  analyseBtn.disabled = value;
  sampleBtn.disabled = value;
}

function showError(message: string): void {
  errorRegion.textContent = message;
  results.replaceChildren();
  clearBusy(results);
}

function copyText(text: string): void {
  navigator.clipboard
    .writeText(text)
    .then(() => announce(statusRegion, STRINGS.copied))
    .catch(() => announce(statusRegion, STRINGS.copyFailed));
}

function speak(text: string): void {
  if (!('speechSynthesis' in window)) return;
  window.speechSynthesis.cancel();
  window.speechSynthesis.speak(new SpeechSynthesisUtterance(text));
}

function remember(key: string, value: { result: VerifiedResult; model: string }): void {
  if (cache.size >= CACHE_MAX_ENTRIES) {
    const oldest = cache.keys().next().value;
    if (oldest !== undefined) cache.delete(oldest);
  }
  cache.set(key, value);
}

let alertMessage = SMS_DEFAULT_MESSAGE;

function setAlertMessage(message: string): void {
  alertMessage = message;
  smsAnchor.href = smsLink(EMERGENCY_NUMBER, message);
}

setAlertMessage(SMS_DEFAULT_MESSAGE);

trustBtn.addEventListener('click', () => {
  const copyInstead = (): void => {
    navigator.clipboard
      .writeText(alertMessage)
      .then(() => {
        trustStatus.textContent = 'Copied. Paste it in a message to someone you trust.';
      })
      .catch(() => {
        trustStatus.textContent = STRINGS.copyFailed;
      });
  };
  if (typeof navigator.share !== 'function') return copyInstead();
  navigator.share({ text: alertMessage }).catch((error: unknown) => {
    if (!(error instanceof DOMException && error.name === 'AbortError')) copyInstead();
  });
});

function show(result: VerifiedResult, model: string, extractMs: number, verifyMs: number): void {
  clearBusy(results);
  setAlertMessage(buildSmsMessage(result.extraction));
  renderResult(
    results,
    result,
    buildActionCards(result),
    { model, extractMs, verifyMs },
    {
      copy: copyText,
      speak,
    },
  );
  announce(statusRegion, STRINGS.done);
  focusResults(results);
}

/** Runs Input -> Extract -> Verify -> Act for the current form contents. */
async function analyse(): Promise<void> {
  if (busy) return;
  const files = Array.from(fileInput.files ?? []);
  const text = textInput.value;
  const check = validateInput({
    text,
    files: files.map((f) => ({ name: f.name, type: f.type, size: f.size })),
  });
  errorRegion.textContent = '';
  if (!check.ok) {
    errorRegion.textContent = check.error;
    return;
  }

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
    const prepared = await Promise.all(files.map(prepareFile));
    const t0 = performance.now();
    const extracted = await extract({ text, files: prepared });
    const t1 = performance.now();
    const result = await verify(extracted.extraction);
    const t2 = performance.now();
    const extractMs = t1 - t0;
    const verifyMs = t2 - t1;
    if (import.meta.env.DEV) {
      console.info(
        `[latency] extract ${Math.round(extractMs)} ms, verify ${Math.round(verifyMs)} ms`,
      );
    }
    if (cacheKey && !extracted.usedSafeFallback)
      remember(cacheKey, { result, model: extracted.model });
    show(result, extracted.model, extractMs, verifyMs);
    if (extracted.usedSafeFallback) errorRegion.textContent = STRINGS.safeFallback;
  } catch (error) {
    showError(error instanceof AllModelsFailedError ? STRINGS.busy : STRINGS.failed);
  } finally {
    setBusy(false);
  }
}

form.addEventListener('submit', (event) => {
  event.preventDefault();
  void analyse();
});

sampleBtn.addEventListener('click', () => {
  textInput.value = SAMPLE_TEXT;
  void analyse();
});
