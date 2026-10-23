import { MAPS_SEARCH_URL, SMS_MAX_CHARS } from '../config';
import type { Extraction } from '../domain/types';

/**
 * Builds a tel: link, keeping digits and a leading plus only.
 * @param number - phone number
 */
export function telLink(number: string): string {
  return `tel:${number.replace(/[^\d+]/g, '')}`;
}

/**
 * Builds a Google Maps search link for the nearest hospital.
 * @param locationHint - optional place name from the extraction
 */
export function hospitalMapsLink(locationHint: string | null): string {
  const hint = locationHint?.trim();
  const query = hint ? `hospital near ${hint}` : 'hospital near me';
  return `${MAPS_SEARCH_URL}${encodeURIComponent(query)}`;
}

/**
 * Builds a short emergency text from the extraction: situation, severity and location if known.
 * Control characters are removed and the result never exceeds SMS_MAX_CHARS.
 * @param extraction - the (escalated) extraction
 * @returns a single-line message for SMS or sharing
 */
export function buildSmsMessage(
  extraction: Pick<Extraction, 'situation_summary' | 'severity' | 'location_hint'>,
): string {
  const clean = (text: string): string =>
    text
      // eslint-disable-next-line no-control-regex
      .replace(/[\u0000-\u001f\u007f]+/g, ' ')
      .replace(/\s+/g, ' ')
      .trim();
  const location = clean(extraction.location_hint ?? '');
  const tail = location ? ` Location: ${location}.` : '';
  const head = `EMERGENCY (${extraction.severity}): `;
  const room = SMS_MAX_CHARS - head.length - tail.length;
  const summary = clean(extraction.situation_summary);
  const body =
    summary.length > room ? `${summary.slice(0, Math.max(room - 1, 0)).trimEnd()}…` : summary;
  return `${head}${body}${tail}`.slice(0, SMS_MAX_CHARS);
}

/**
 * Builds an sms: link with a prefilled, URL-encoded body.
 * @param number - recipient number
 * @param body - message text
 */
export function smsLink(number: string, body: string): string {
  return `sms:${number.replace(/[^\d+]/g, '')}?body=${encodeURIComponent(body)}`;
}
