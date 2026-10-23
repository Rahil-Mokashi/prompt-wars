import { getGenerativeModel, type GenerativeModel, type ModelParams } from 'firebase/ai';
import { REQUEST_TIMEOUT_MS } from '../config';
import { getAiClient } from '../firebase';

/**
 * Creates a Gemini model through Firebase AI Logic with the shared request timeout.
 * @param params - model name, instructions, tools and generation config
 * @returns a model ready for generateContent
 */
export function createModel(params: ModelParams): GenerativeModel {
  return getGenerativeModel(getAiClient(), params, { timeout: REQUEST_TIMEOUT_MS });
}
