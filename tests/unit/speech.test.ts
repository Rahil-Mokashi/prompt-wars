import { describe, expect, it, vi } from 'vitest';
import { SPEECH_LANG, SPEECH_START_DELAY_MS } from '../../src/config';
import { pickVoice, speak, type SpeechDeps } from '../../src/ui/speech';

function makeDeps(overrides: Partial<SpeechDeps['synth']> = {}) {
  const order: string[] = [];
  const spoken: SpeechSynthesisUtterance[] = [];
  const scheduled: { callback: () => void; delay: number }[] = [];
  const synth = {
    speaking: false,
    pending: false,
    cancel: vi.fn(() => {
      order.push('cancel');
    }),
    speak: vi.fn((utterance: SpeechSynthesisUtterance) => {
      order.push('speak');
      spoken.push(utterance);
    }),
    getVoices: vi.fn((): SpeechSynthesisVoice[] => []),
    ...overrides,
  };
  const deps: SpeechDeps = {
    synth,
    createUtterance: (text) => ({ text, lang: '' }) as SpeechSynthesisUtterance,
    schedule: (callback, delay) => scheduled.push({ callback, delay }),
  };
  return { deps, synth, spoken, scheduled, order };
}

const voice = (lang: string) => ({ lang, name: lang }) as SpeechSynthesisVoice;

describe('speak', () => {
  it('does not cancel when nothing is speaking, and speaks only after the delay', () => {
    const { deps, synth, spoken, scheduled } = makeDeps();
    expect(speak('hello', deps)).toBe(true);
    expect(synth.cancel).not.toHaveBeenCalled();
    expect(synth.speak).not.toHaveBeenCalled();
    expect(scheduled[0]?.delay).toBe(SPEECH_START_DELAY_MS);
    scheduled[0]?.callback();
    expect(spoken[0]?.text).toBe('hello');
  });

  it('cancels first when speech is in progress or pending', () => {
    for (const state of [{ speaking: true }, { pending: true }]) {
      const { deps, synth } = makeDeps(state);
      speak('again', deps);
      expect(synth.cancel).toHaveBeenCalledOnce();
    }
  });

  it('cancels before speaking and never speaks synchronously', () => {
    const { deps, synth, scheduled, order } = makeDeps({ speaking: true });
    speak('x', deps);
    expect(synth.speak).not.toHaveBeenCalled();
    scheduled[0]?.callback();
    expect(order).toEqual(['cancel', 'speak']);
  });

  it('sets the utterance language and works when no voices are loaded', () => {
    const { deps, spoken, scheduled } = makeDeps();
    speak('x', deps);
    scheduled[0]?.callback();
    expect(spoken[0]?.lang).toBe(SPEECH_LANG);
    expect(spoken[0]?.voice).toBeUndefined();
  });

  it('uses a matching installed voice when available', () => {
    const match = voice('en-IN');
    const { deps, spoken, scheduled } = makeDeps({ getVoices: () => [voice('fr-FR'), match] });
    speak('x', deps);
    scheduled[0]?.callback();
    expect(spoken[0]?.voice).toBe(match);
  });

  it('reports unsupported browsers', () => {
    expect(speak('x', null)).toBe(false);
  });
});

describe('pickVoice', () => {
  it('prefers an exact match, then the same language, else undefined', () => {
    const exact = voice('en-IN');
    const sameLanguage = voice('en-GB');
    expect(pickVoice([sameLanguage, exact], 'en-IN')).toBe(exact);
    expect(pickVoice([voice('fr-FR'), sameLanguage], 'en-IN')).toBe(sameLanguage);
    expect(pickVoice([voice('fr-FR')], 'en-IN')).toBeUndefined();
    expect(pickVoice([], 'en-IN')).toBeUndefined();
  });
});
