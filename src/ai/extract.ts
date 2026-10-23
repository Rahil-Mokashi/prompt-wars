import type { Part } from 'firebase/ai';
import { MOCK_LATENCY_MS, MODEL_CHAIN } from '../config';
import type { Extraction } from '../domain/types';
import { createModel } from './gemini';
import { runWithFallback } from './model-fallback';
import { extractionInstruction, wrapUserContent } from './prompts';
import { EXTRACTION_SCHEMA, parseExtraction, SAFE_FALLBACK } from './schemas';

/** Dev-only mock mode: constant-folded to false in production so the mock is tree-shaken out. */
const USE_MOCK = import.meta.env.DEV && import.meta.env.VITE_USE_MOCK === 'true';

export interface InputFile {
  mimeType: string;
  /** Base64 file contents without a data: prefix. */
  data: string;
}

export interface ExtractInput {
  text: string;
  files: InputFile[];
}

export interface ExtractOutput {
  extraction: Extraction;
  model: string;
  /** True when the model output failed validation and the safe fallback is shown. */
  usedSafeFallback: boolean;
}

function buildParts(input: ExtractInput): Part[] {
  const parts: Part[] = [];
  if (input.text.trim()) parts.push({ type: 'text', text: wrapUserContent(input.text) });
  for (const file of input.files) {
    parts.push({ type: 'inlineData', inlineData: { mimeType: file.mimeType, data: file.data } });
  }
  return parts;
}

/**
 * The single Extract call: messy input in, schema-validated JSON out.
 * Invalid output never reaches the UI; a safe "Call 112" extraction is returned instead.
 * @param input - validated text and base64 files
 * @returns the extraction, the model that answered and whether the fallback was used
 */
export async function extract(input: ExtractInput): Promise<ExtractOutput> {
  if (USE_MOCK) {
    const { MOCK_EXTRACTION } = await import('./mock');
    await new Promise((resolve) => setTimeout(resolve, MOCK_LATENCY_MS));
    return { extraction: MOCK_EXTRACTION, model: 'mock', usedSafeFallback: false };
  }

  const { value, model } = await runWithFallback(
    MODEL_CHAIN,
    async (name) => {
      const generative = createModel({
        model: name,
        systemInstruction: extractionInstruction(),
        generationConfig: {
          responseMimeType: 'application/json',
          responseSchema: EXTRACTION_SCHEMA,
        },
      });
      const result = await generative.generateContent(buildParts(input));
      return result.response.text();
    },
    {
      onModel: (m) => {
        if (import.meta.env.DEV) console.info(`[extract] answered by ${m}`);
      },
    },
  );

  const extraction = parseExtraction(value);
  return {
    extraction: extraction ?? SAFE_FALLBACK,
    model,
    usedSafeFallback: extraction === null,
  };
}
