/** UI strings. English only for now; add a locale object here to translate. */
export const STRINGS = {
  analysing: 'Analysing. This usually takes a few seconds.',
  done: 'Analysis complete. Results are below.',
  busy: 'Service busy, try again in a minute. If this is an emergency, call 112 now.',
  failed: 'Something went wrong. If this is an emergency, call 112 now.',
  safeFallback: 'We could not safely understand this input. Call 112 now if this is an emergency.',
  webVerified: 'Web verified',
  guidanceChecked: 'Checked against built-in guidance',
  verified: 'Verified',
  needsCheck: 'Needs human check',
  copy: 'Copy',
  copied: 'Copied to clipboard.',
  alertCopied: 'Copied. Paste it in a message to someone you trust.',
  copyFailed: 'Could not copy. Select the text and copy it manually.',
  share: 'Share',
  readAloud: 'Read aloud',
  open: 'Open',
  call: 'Call',
  sources: 'Sources',
  situation: 'Situation',
  whatToDoNow: 'What to do now',
  stillUnknown: 'Still unknown',
} as const;

/** Text filled in by the "Try a sample" button. */
export const SAMPLE_TEXT =
  'My father, 72, slipped on the stairs and hit his head on the stone step. He is awake but ' +
  'dizzy and there is a small cut on his forehead that is bleeding. He takes warfarin every ' +
  'day for his heart. We are near Dadar station in Mumbai.';
