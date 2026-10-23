import './style.css';
import { buildActionCards } from './actions/build-actions';
import { buildSmsMessage, smsLink } from './actions/links';
import { extract } from './ai/extract';
import { AllModelsFailedError } from './ai/model-fallback';
import { verify } from './ai/verify';
import { alertSomeone, copyToClipboard } from './app/alert';
import { runPipeline } from './app/pipeline';
import { ResultCache } from './app/result-cache';
import { CACHE_MAX_ENTRIES, EMERGENCY_NUMBER, SMS_DEFAULT_MESSAGE } from './config';
import type { VerifiedResult } from './domain/types';
import { announce, focusResults } from './ui/a11y';
import { SAMPLE_TEXT, STRINGS } from './ui/i18n';
import { clearBusy, renderResult, renderSkeleton } from './ui/render';
import { speak } from './ui/speech';
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

const cache = new ResultCache<CachedAnalysis>(CACHE_MAX_ENTRIES);
const pipelineDeps = { extract, verify, prepareFile, now: () => performance.now() };
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
 * Updates the always-visible "Text 112" link and the share text.
 * @param message - short emergency message
 */
function setAlertMessage(message: string): void {
  alertMessage = message;
  smsAnchor.href = smsLink(EMERGENCY_NUMBER, message);
}

/**
 * Renders a finished analysis and moves focus to it.
 * @param entry - verified result and the model that produced it
 * @param extractMs - Extract latency
 * @param verifyMs - Verify latency
 */
function show(entry: CachedAnalysis, extractMs: number, verifyMs: number): void {
  clearBusy(results);
  setAlertMessage(buildSmsMessage(entry.result.extraction));
  const meta = { model: entry.model, extractMs, verifyMs };
  const handlers = {
    copy: (text: string) => {
      void copyToClipboard(navigator, text).then((ok) => {
        announce(statusRegion, ok ? STRINGS.copied : STRINGS.copyFailed);
      });
    },
    speak: (text: string) => void speak(text),
  };
  renderResult(results, entry.result, buildActionCards(entry.result), meta, handlers);
  announce(statusRegion, STRINGS.done);
  focusResults(results);
}

/** Runs the pipeline on fresh input, caches text-only results and renders them. */
async function analyseFresh(text: string, files: File[], cacheKey: string | null): Promise<void> {
  const { extracted, result, extractMs, verifyMs } = await runPipeline(text, files, pipelineDeps);
  if (import.meta.env.DEV) {
    console.info(
      `[latency] extract ${Math.round(extractMs)} ms, verify ${Math.round(verifyMs)} ms`,
    );
  }
  const entry = { result, model: extracted.model };
  if (cacheKey && !extracted.usedSafeFallback) cache.set(cacheKey, entry);
  show(entry, extractMs, verifyMs);
  if (extracted.usedSafeFallback) errorRegion.textContent = STRINGS.safeFallback;
}

/** Runs Input -> Extract -> Verify -> Act for the current form contents. */
async function analyse(): Promise<void> {
  if (busy) return;
  const files = Array.from(fileInput.files ?? []);
  const text = textInput.value;
  const meta = files.map((f) => ({ name: f.name, type: f.type, size: f.size }));
  const check = validateInput({ text, files: meta });
  errorRegion.textContent = check.ok ? '' : check.error;
  if (!check.ok) return;

  const cacheKey = files.length === 0 ? text.trim() : null;
  const cached = cacheKey ? cache.get(cacheKey) : undefined;
  if (cached) {
    show(cached, 0, 0);
    return;
  }

  setBusy(true);
  renderSkeleton(results);
  announce(statusRegion, STRINGS.analysing);
  try {
    await analyseFresh(text, files, cacheKey);
  } catch (caught) {
    errorRegion.textContent =
      caught instanceof AllModelsFailedError ? STRINGS.busy : STRINGS.failed;
    results.replaceChildren();
    clearBusy(results);
  } finally {
    setBusy(false);
  }
}

setAlertMessage(SMS_DEFAULT_MESSAGE);

trustBtn.addEventListener('click', () => {
  void alertSomeone(alertMessage, navigator).then((outcome) => {
    if (outcome === 'copied') trustStatus.textContent = STRINGS.alertCopied;
    if (outcome === 'failed') trustStatus.textContent = STRINGS.copyFailed;
  });
});

form.addEventListener('submit', (event) => {
  event.preventDefault();
  void analyse();
});

sampleBtn.addEventListener('click', () => {
  textInput.value = SAMPLE_TEXT;
  void analyse();
});
