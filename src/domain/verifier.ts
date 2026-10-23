import { EMERGENCY_NUMBER, LOW_CONFIDENCE_THRESHOLD } from '../config';
import { findRule } from './guidance';
import { applyRiskFlags } from './risk-flags';
import type {
  Action,
  Extraction,
  GuidanceVerdict,
  RiskFlag,
  Severity,
  Source,
  VerifiedAction,
} from './types';

export interface RuleCheck {
  extraction: Extraction;
  actions: VerifiedAction[];
  flags: RiskFlag[];
}

function needsCall(severity: Severity): boolean {
  return severity === 'critical' || severity === 'high';
}

function callAction(): Action {
  return {
    priority: 0,
    type: 'call',
    title: `Call ${EMERGENCY_NUMBER} now`,
    instruction: `Call ${EMERGENCY_NUMBER} (or 108 for an ambulance) and say where you are.`,
  };
}

/**
 * Deterministic layer of Verify. Rules only escalate: they raise severity, add a
 * call action and mark actions for human check. They never remove a safety action.
 * @param extraction - validated model extraction
 * @returns the extraction with escalated severity, plus per-action status and reasons
 */
export function runRules(extraction: Extraction): RuleCheck {
  const { severity, flags } = applyRiskFlags(extraction);
  const escalated: Extraction = { ...extraction, severity };

  const actions: Action[] = [...extraction.actions];
  if (needsCall(severity) && !actions.some((a) => a.type === 'call')) {
    actions.push(callAction());
  }

  const lowConfidence = extraction.confidence < LOW_CONFIDENCE_THRESHOLD;
  const verified = actions
    .sort((a, b) => a.priority - b.priority)
    .map<VerifiedAction>((action) => {
      const reasons: string[] = [];
      if (lowConfidence && action.type === 'first_aid') {
        reasons.push('The AI was not confident about this situation.');
      }
      return {
        ...action,
        status: reasons.length > 0 ? 'needs_human_check' : 'verified',
        reasons,
        sources: [],
      };
    });

  return { extraction: escalated, actions: verified, flags };
}

function flagForCheck(action: VerifiedAction, reason: string): VerifiedAction {
  return { ...action, status: 'needs_human_check', reasons: [...action.reasons, reason] };
}

/**
 * Applies guidance-check verdicts to first-aid actions. A verdict can only keep an action
 * verified or mark it for human check; it never removes or softens a safety action.
 * @param actions - actions after the rule layer
 * @param verdicts - verdicts from the guidance check, or null when the check could not run
 * @param extraSources - sources found by web grounding, attached to supported actions
 * @returns actions with final status, reasons and sources
 */
export function applyVerdicts(
  actions: VerifiedAction[],
  verdicts: GuidanceVerdict[] | null,
  extraSources: Source[] = [],
): VerifiedAction[] {
  return actions.map((action) => {
    if (action.type !== 'first_aid') return action;
    if (verdicts === null) return flagForCheck(action, 'This could not be checked automatically.');
    const verdict = verdicts.find((v) => v.priority === action.priority);
    if (!verdict) return flagForCheck(action, 'This could not be checked automatically.');
    if (verdict.verdict === 'not_supported') {
      return flagForCheck(action, 'This does not match our safety guidance.');
    }
    if (verdict.verdict === 'not_covered') {
      return flagForCheck(action, 'Our built-in guidance does not cover this. Ask a professional.');
    }
    const rule = findRule(verdict.ruleId);
    if (!rule) return flagForCheck(action, 'The matching guidance rule was not found.');
    return { ...action, sources: [rule.source, ...extraSources] };
  });
}
