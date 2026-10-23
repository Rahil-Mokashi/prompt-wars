/** Model chain, in fallback order (all confirmed IDs). */
export const MODEL_CHAIN: readonly string[] = [
  'gemini-3.5-flash-lite',
  'gemini-3.1-flash-lite',
  'gemini-3.6-flash',
  'gemini-3-flash-preview',
];

export const MAX_TEXT_CHARS = 5000;
export const MAX_FILES = 5;
export const MAX_FILE_BYTES = 10 * 1024 * 1024;
export const ALLOWED_MIME_TYPES: readonly string[] = [
  'image/jpeg',
  'image/png',
  'image/webp',
  'application/pdf',
  'audio/webm',
  'audio/ogg',
  'audio/mpeg',
  'audio/wav',
];

export const IMAGE_MAX_DIMENSION = 1600;
export const IMAGE_JPEG_QUALITY = 0.8;

export const RETRY_DELAY_MS = 1500;
export const REQUEST_TIMEOUT_MS = 45_000;
export const CACHE_MAX_ENTRIES = 20;

/** Below this model confidence, first-aid actions are marked for human check. */
export const LOW_CONFIDENCE_THRESHOLD = 0.5;

export const EMERGENCY_NUMBER = '112';
export const AMBULANCE_NUMBER = '108';

export const MAPS_SEARCH_URL = 'https://www.google.com/maps/search/?api=1&query=';

export const SMS_MAX_CHARS = 300;
export const SMS_DEFAULT_MESSAGE = 'Emergency. I cannot speak on a call. Please send help.';

/** Simulated model latency in dev mock mode. */
export const MOCK_LATENCY_MS = 700;
/** Number of placeholder blocks in the loading skeleton. */
export const SKELETON_BLOCKS = 3;
/** Delay that lets screen readers re-announce an identical live-region message. */
export const ANNOUNCE_DELAY_MS = 50;
export const BYTES_PER_MB = 1024 * 1024;
export const MS_PER_SECOND = 1000;
/** Priority of the Call 112 action the rules add; sorts before model actions. */
export const CALL_ACTION_PRIORITY = 0;
