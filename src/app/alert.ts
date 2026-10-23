/** The parts of `navigator` the alert needs, injectable for tests. */
export interface AlertNavigator {
  share?: (data: { text: string }) => Promise<void>;
  clipboard: { writeText: (text: string) => Promise<void> };
}

/** What happened when the user pressed "Alert someone you trust". */
export type AlertOutcome = 'shared' | 'cancelled' | 'copied' | 'failed';

/**
 * Copies text to the clipboard.
 * @param nav - navigator-like object
 * @param text - text to copy
 * @returns true when the copy succeeded
 */
export async function copyToClipboard(nav: AlertNavigator, text: string): Promise<boolean> {
  try {
    await nav.clipboard.writeText(text);
    return true;
  } catch {
    return false;
  }
}

/**
 * Shares the message with the share sheet, falling back to copying it. Closing the share sheet
 * is not an error and does not trigger the fallback.
 * @param message - text to share
 * @param nav - navigator-like object
 * @returns what happened
 */
export async function alertSomeone(message: string, nav: AlertNavigator): Promise<AlertOutcome> {
  if (typeof nav.share === 'function') {
    try {
      await nav.share({ text: message });
      return 'shared';
    } catch (error) {
      if (error instanceof DOMException && error.name === 'AbortError') return 'cancelled';
    }
  }
  return (await copyToClipboard(nav, message)) ? 'copied' : 'failed';
}
