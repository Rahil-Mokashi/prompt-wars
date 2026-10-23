/** Model chain, in fallback order (all confirmed IDs). */
export const MODEL_CHAIN: readonly string[] = [
  'gemini-3.5-flash-lite',
  'gemini-3.1-flash-lite',
  'gemini-3.6-flash',
  'gemini-3-flash-preview',
];

/** Longest text input accepted, in characters. */
export const MAX_TEXT_CHARS = 5000;
/** Most files accepted per request. */
export const MAX_FILES = 5;
/** Largest single file accepted, in bytes. */
export const MAX_FILE_BYTES = 10 * 1024 * 1024;
/** MIME whitelist for uploads. */
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

/** Longest image side after browser-side downscaling, in pixels. */
export const IMAGE_MAX_DIMENSION = 1600;
/** JPEG quality used when downscaling images. */
export const IMAGE_JPEG_QUALITY = 0.8;

/** Wait before retrying a model after a 500 or 503. */
export const RETRY_DELAY_MS = 1500;
/** Per-request timeout for Gemini calls. */
export const REQUEST_TIMEOUT_MS = 45_000;
/** Most results kept in the in-memory text cache. */
export const CACHE_MAX_ENTRIES = 20;

/** Below this model confidence, first-aid actions are marked for human check. */
export const LOW_CONFIDENCE_THRESHOLD = 0.5;

/** India national emergency number. */
export const EMERGENCY_NUMBER = '112';
/** India ambulance number. */
export const AMBULANCE_NUMBER = '108';

/** Google Maps search URL prefix for the nearest-hospital link. */
export const MAPS_SEARCH_URL = 'https://www.google.com/maps/search/?api=1&query=';

/** Longest prefilled SMS body, in characters. */
export const SMS_MAX_CHARS = 300;
/** SMS body used before any analysis has run. */
export const SMS_DEFAULT_MESSAGE = 'Emergency. I cannot speak on a call. Please send help.';

/** Simulated model latency in dev mock mode. */
export const MOCK_LATENCY_MS = 700;
/** Number of placeholder blocks in the loading skeleton. */
export const SKELETON_BLOCKS = 3;
/** Delay that lets screen readers re-announce an identical live-region message. */
export const ANNOUNCE_DELAY_MS = 50;
/** Bytes in one megabyte, for size messages. */
export const BYTES_PER_MB = 1024 * 1024;
/** Milliseconds in one second, for latency display. */
export const MS_PER_SECOND = 1000;
/** Priority of the Call 112 action the rules add; sorts before model actions. */
export const CALL_ACTION_PRIORITY = 0;

/** Language tag for read-aloud; the browser picks a matching voice when one is installed. */
export const SPEECH_LANG = 'en-IN';
/** Delay between cancelling speech and starting a new utterance; Chrome drops an immediate speak(). */
export const SPEECH_START_DELAY_MS = 50;

/**
 * Whether to try Google Search grounding before the guidance check. Off because grounding is
 * blocked on the free tier (HTTP 429); the code path and its tests are kept.
 */
export const GROUNDING_ENABLED = false as boolean;
