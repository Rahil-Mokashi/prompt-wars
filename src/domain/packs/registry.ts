import type { PackId } from '../types';
import { medicalPack } from './medical';

export interface Pack {
  id: PackId;
  /** Domain-specific line added to the extraction instructions. */
  promptHint: string;
}

const PACKS: Partial<Record<PackId, Pack>> = { medical: medicalPack };

/**
 * Looks up a domain pack. Packs that are not registered fall back to medical.
 * @param id - pack id from the extraction
 * @returns the registered pack
 */
export function getPack(id: PackId): Pack {
  return PACKS[id] ?? medicalPack;
}
