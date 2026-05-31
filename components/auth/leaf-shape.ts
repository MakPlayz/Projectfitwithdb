/**
 * Lucide "leaf" icon — viewBox 0 0 24 24
 * Tip: upper-right (~19, 2) · Stem: lower-left (~2, 21) · Widest: center-left
 */
export const LEAF_BODY_PATH =
  'M11 20A7 7 0 0 1 9.8 6.1C15.5 5 17 4.48 19 2c1 2 2 4.18 2 8 0 5.5-4.78 10-10 10Z';

export const LEAF_VEIN_PATH = 'M2 21c0-3 1.85-5.36 5.08-6C9.5 14.52 12 13 13 12';

export const LEAF_VIEWBOX = '0 0 24 24';

/** Scale 24×24 path → objectBoundingBox (0–1) for clip-path */
export const LEAF_CLIP_SCALE = 1 / 24;

/**
 * Safe rectangle inside the leaf for form content (% of shell box).
 * Tuned to keep UI out of the tip (top-right) and stem (bottom-left).
 */
export const LEAF_SAFE_AREA = {
  top: '22%',
  right: '17%',
  bottom: '15%',
  left: '20%',
} as const;

export const LEAF_SHELL = {
  width: 380,
  maxWidth: '92vw',
  aspectRatio: '380 / 440',
} as const;
