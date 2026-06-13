const freeSampleDeviceKey = 'projectfit.free_sample_device_id';

function createFallbackId() {
  return `pf-device-${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 12)}`;
}

export function getFreeSampleDeviceId() {
  if (typeof window === 'undefined') return '';

  const existing = window.localStorage.getItem(freeSampleDeviceKey);
  if (existing) return existing;

  const next = window.crypto?.randomUUID?.() ?? createFallbackId();
  window.localStorage.setItem(freeSampleDeviceKey, next);
  return next;
}
