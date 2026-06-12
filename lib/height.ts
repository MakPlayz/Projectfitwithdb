export type HeightUnit = 'cm' | 'ft-in';

export function parseHeightToCm(value: FormDataEntryValue | string | null, unit: HeightUnit) {
  const raw = String(value ?? '').trim().toLowerCase();
  if (!raw) return null;

  if (unit === 'cm') {
    const centimeters = Number(raw.replace(/cm\b/g, '').trim());
    return Number.isFinite(centimeters) ? Math.round(centimeters) : null;
  }

  const decimalFeetMatch = raw.match(/^(\d+)\.(\d{1,2})$/);
  if (decimalFeetMatch) {
    const feet = Number(decimalFeetMatch[1]);
    const inches = Number(decimalFeetMatch[2]);
    if (!Number.isFinite(feet) || !Number.isFinite(inches)) return null;
    return Math.round((feet * 12 + inches) * 2.54);
  }

  const normalized = raw
    .replace(/feet|foot|ft|inches|inch|in|["']/g, ' ')
    .replace(/\s+/g, ' ')
    .trim();
  const feetInchesMatch = normalized.match(/^(\d+)(?:\s+(\d+))?$/);
  if (!feetInchesMatch) return null;

  const feet = Number(feetInchesMatch[1]);
  const inches = feetInchesMatch[2] ? Number(feetInchesMatch[2]) : 0;

  if (!Number.isFinite(feet) || !Number.isFinite(inches) || inches < 0 || inches >= 12) {
    return null;
  }

  return Math.round((feet * 12 + inches) * 2.54);
}

export function isValidHeightCm(height: number | null): height is number {
  return typeof height === 'number' && Number.isFinite(height) && height > 0;
}

export function formatHeightForUnit(heightCm: number | string, unit: HeightUnit) {
  const centimeters = Number(heightCm);
  if (!Number.isFinite(centimeters)) return '';

  if (unit === 'cm') {
    return String(Math.round(centimeters));
  }

  const totalInches = Math.round(centimeters / 2.54);
  const feet = Math.floor(totalInches / 12);
  const inches = totalInches % 12;
  return `${feet} ft ${inches} in`;
}
