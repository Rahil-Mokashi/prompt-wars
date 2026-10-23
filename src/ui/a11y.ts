/**
 * Announces a message to screen readers through the polite live region.
 * @param region - the aria-live element
 * @param message - text to announce
 */
export function announce(region: HTMLElement, message: string): void {
  region.textContent = '';
  // A second write after the clear makes repeated identical messages announce again.
  window.setTimeout(() => {
    region.textContent = message;
  }, 50);
}

/**
 * Moves keyboard focus to a container so the new content is read next.
 * @param element - a container with tabindex="-1"
 */
export function focusResults(element: HTMLElement): void {
  element.focus({ preventScroll: false });
}
