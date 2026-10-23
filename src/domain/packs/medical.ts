import type { Pack } from './registry';

/** Medical pack: injuries, symptoms, prescriptions and medical history. */
export const medicalPack: Pack = {
  id: 'medical',
  promptHint:
    'Domain: medical emergency. Inputs may be a description of an injury or symptoms, a photo of an injury, ' +
    'prescriptions, lab reports or audio. Record medications, conditions and what happened as key_facts. ' +
    'Do not diagnose and never advise stopping prescribed medicine.',
};
