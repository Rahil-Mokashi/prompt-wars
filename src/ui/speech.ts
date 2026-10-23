import { SPEECH_LANG, SPEECH_START_DELAY_MS } from '../config';

/** Browser speech APIs, injectable so the logic can be tested without a real engine. */
export interface SpeechDeps {
  synth: Pick<SpeechSynthesis, 'speak' | 'cancel' | 'speaking' | 'pending' | 'getVoices'>;
  createUtterance: (text: string) => SpeechSynthesisUtterance;
  schedule: (callback: () => void, delayMs: number) => void;
}

/**
 * Picks an installed voice for the language, if any. An empty voice list is normal in Chrome
 * until voices load, so the caller falls back to the default voice.
 * @param voices - voices reported by the browser
 * @param lang - BCP 47 language tag
 */
export function pickVoice(
  voices: SpeechSynthesisVoice[],
  lang: string,
): SpeechSynthesisVoice | undefined {
  const base = lang.split('-')[0] ?? lang;
  return (
    voices.find((voice) => voice.lang === lang) ??
    voices.find((voice) => voice.lang.startsWith(base))
  );
}

/**
 * Builds the default dependencies from the window, or null when speech is unsupported.
 */
export function browserSpeechDeps(): SpeechDeps | null {
  if (!('speechSynthesis' in window)) return null;
  return {
    synth: window.speechSynthesis,
    createUtterance: (text) => new SpeechSynthesisUtterance(text),
    schedule: (callback, delayMs) => {
      window.setTimeout(callback, delayMs);
    },
  };
}

/**
 * Reads text aloud. Cancels only if something is already speaking, then starts after a short
 * delay because Chrome drops a speak() issued right after cancel().
 * @param text - text to read
 * @param deps - speech APIs; defaults to the browser's
 * @returns false when speech is not supported
 */
export function speak(text: string, deps: SpeechDeps | null = browserSpeechDeps()): boolean {
  if (!deps) return false;
  if (deps.synth.speaking || deps.synth.pending) deps.synth.cancel();
  deps.schedule(() => {
    const utterance = deps.createUtterance(text);
    utterance.lang = SPEECH_LANG;
    const voice = pickVoice(deps.synth.getVoices(), SPEECH_LANG);
    if (voice) utterance.voice = voice;
    deps.synth.speak(utterance);
  }, SPEECH_START_DELAY_MS);
  return true;
}
