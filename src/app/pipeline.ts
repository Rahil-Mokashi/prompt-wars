import type { ExtractInput, ExtractOutput, InputFile } from '../ai/extract';
import type { Extraction, VerifiedResult } from '../domain/types';

/** Everything the pipeline needs from the outside, so it can run without network or DOM. */
export interface PipelineDeps {
  extract: (input: ExtractInput) => Promise<ExtractOutput>;
  verify: (extraction: Extraction) => Promise<VerifiedResult>;
  prepareFile: (file: File) => Promise<InputFile>;
  /** Monotonic clock in milliseconds. */
  now: () => number;
}

/** Output of Extract and Verify with the time each call took. */
export interface PipelineOutput {
  extracted: ExtractOutput;
  result: VerifiedResult;
  extractMs: number;
  verifyMs: number;
}

/**
 * Runs Extract then Verify, timing each call. File preparation is not counted in the latency.
 * @param text - user text
 * @param files - validated files
 * @param deps - injected extract, verify, file preparation and clock
 * @returns the extraction, the verified result and per-call latency
 */
export async function runPipeline(
  text: string,
  files: File[],
  deps: PipelineDeps,
): Promise<PipelineOutput> {
  const prepared = await Promise.all(files.map((file) => deps.prepareFile(file)));
  const t0 = deps.now();
  const extracted = await deps.extract({ text, files: prepared });
  const t1 = deps.now();
  const result = await deps.verify(extracted.extraction);
  const t2 = deps.now();
  return { extracted, result, extractMs: t1 - t0, verifyMs: t2 - t1 };
}
