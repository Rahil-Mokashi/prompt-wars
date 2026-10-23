import { MAPS_SEARCH_URL } from '../config';

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
