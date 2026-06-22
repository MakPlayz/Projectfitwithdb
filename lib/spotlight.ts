import type { MouseEvent } from 'react';

/**
 * Tracks the cursor position relative to the hovered element and exposes it as
 * CSS custom properties (`--spot-x` / `--spot-y`). Pair with a radial-gradient
 * overlay in CSS to create a cursor-following spotlight glow.
 *
 * Purely presentational — does not interfere with clicks or links.
 */
export function trackSpotlight(event: MouseEvent<HTMLElement>) {
  const el = event.currentTarget;
  const rect = el.getBoundingClientRect();
  el.style.setProperty('--spot-x', `${event.clientX - rect.left}px`);
  el.style.setProperty('--spot-y', `${event.clientY - rect.top}px`);
}
