import { getGenerativeModel, type SchemaRequest } from 'firebase/ai';
import { MODEL_CHAIN, REQUEST_TIMEOUT_MS } from '../config';
import { applyVerdicts, runRules } from '../domain/verifier';
import type {
  Extraction,
  GuidanceVerdict,
  Source,
  VerificationMethod,
  VerifiedAction,
  VerifiedResult,
} from '../domain/types';
import { getAiClient } from '../firebase';
import { runWithFallback } from './model-fallback';
import { guidancePrompt } from './prompts';
import { parseVerdicts, VERDICT_SCHEMA } from './schemas';

/** Dev-only mock mode: constant-folded to false in production so the mock is tree-shaken out. */
const USE_MOCK = import.meta.env.DEV && import.meta.env.VITE_USE_MOCK === 'true';

type GroundingState = 'untried' | 'available' | 'unavailable';
let groundingState: GroundingState = 'untried';

interface CheckOutcome {
  verdicts: GuidanceVerdict[] | null;
  method: VerificationMethod;
  sources: Source[];
}

/** Forgets whether grounding worked. Used by tests only. */
export function resetGroundingState(): void {
  groundingState = 'untried';
}

async function tryGrounding(actions: VerifiedAction[]): Promise<CheckOutcome | null> {
  if (groundingState === 'unavailable') return null;
  try {
    const model = getGenerativeModel(
      getAiClient(),
      { model: MODEL_CHAIN[0] ?? '', tools: [{ googleSearch: {} }] },
      { timeout: REQUEST_TIMEOUT_MS },
    );
    const prompt = `${guidancePrompt(actions)}\n\nUse Google Search to confirm. Reply with JSON only: {"verdicts":[{"priority":1,"verdict":"supported","ruleId":null}]}`;
    const result = await model.generateContent(prompt);
    const verdicts = parseVerdicts(result.response.text());
    if (!verdicts) throw new Error('Grounded answer was not valid JSON.');
    const chunks = result.response.candidates?.[0]?.groundingMetadata?.groundingChunks ?? [];
    const sources = chunks
      .filter((chunk) => chunk.web?.uri)
      .map((chunk) => ({ name: chunk.web?.title ?? 'Web source', url: chunk.web?.uri ?? '' }));
    groundingState = 'available';
    return { verdicts, method: 'web', sources };
  } catch {
    // 429/401/403 (blocked on the free tier) or any other failure: one attempt per session.
    groundingState = 'unavailable';
    return null;
  }
}

async function guidanceCheck(actions: VerifiedAction[]): Promise<GuidanceVerdict[] | null> {
  if (USE_MOCK) {
    const { MOCK_VERDICTS } = await import('./mock');
    return MOCK_VERDICTS;
  }
  try {
    const { value } = await runWithFallback(MODEL_CHAIN, async (name) => {
      const model = getGenerativeModel(
        getAiClient(),
        {
          model: name,
          generationConfig: {
            responseMimeType: 'application/json',
            responseSchema: VERDICT_SCHEMA as unknown as SchemaRequest,
          },
        },
        { timeout: REQUEST_TIMEOUT_MS },
      );
      const result = await model.generateContent(guidancePrompt(actions));
      return result.response.text();
    });
    return parseVerdicts(value);
  } catch {
    return null;
  }
}

/**
 * Verify step. Layer 1: deterministic rules (escalate-only). Layer 2: first-aid actions are
 * checked against curated guidance. Google Search grounding is tried at most once per session,
 * on the first model only; `method` is "web" only when grounding actually ran.
 * @param extraction - validated extraction
 * @returns actions with status, reasons and sources, plus how they were checked
 */
export async function verify(extraction: Extraction): Promise<VerifiedResult> {
  const rules = runRules(extraction);
  const firstAid = rules.actions.filter((a) => a.type === 'first_aid');
  if (firstAid.length === 0) {
    return {
      extraction: rules.extraction,
      actions: rules.actions,
      flags: rules.flags,
      method: 'guidance',
    };
  }

  const grounded = USE_MOCK ? null : await tryGrounding(firstAid);
  const outcome: CheckOutcome = grounded ?? {
    verdicts: await guidanceCheck(firstAid),
    method: 'guidance',
    sources: [],
  };
  return {
    extraction: rules.extraction,
    actions: applyVerdicts(rules.actions, outcome.verdicts, outcome.sources),
    flags: rules.flags,
    method: outcome.method,
  };
}
