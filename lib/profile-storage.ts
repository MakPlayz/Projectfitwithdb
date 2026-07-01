import type { DeliveryAddress } from '@/lib/backend-types';

export interface StoredProfile {
  fullName: string;
  phone: string;
  gender: string;
  age: number | string;
  height: number | string;
  weight: number | string;
  healthNotes: string;
  image: string;
  deliveryAddress: DeliveryAddress;
}

export const profileStorageKey = 'projectfit.profile';

export const emptyDeliveryAddress: DeliveryAddress = {
  addressLine1: '',
  addressLine2: '',
  city: '',
  pincode: '',
  phone: '',
};

export const emptyStoredProfile: StoredProfile = {
  fullName: '',
  phone: '',
  gender: '',
  age: '',
  height: '',
  weight: '',
  healthNotes: '',
  image: '',
  deliveryAddress: emptyDeliveryAddress,
};

export function normalizeDeliveryPhone(phone?: string | null) {
  const digits = String(phone ?? '').replace(/\D/g, '');

  if (/^91[6-9]\d{9}$/.test(digits)) {
    return digits.slice(2);
  }

  if (/^[6-9]\d{9}$/.test(digits)) {
    return digits;
  }

  return String(phone ?? '');
}
export function normalizeDeliveryAddress(address?: Partial<DeliveryAddress>): DeliveryAddress {
  return {
    ...emptyDeliveryAddress,
    ...address,
    addressLine1: address?.addressLine1 ?? '',
    addressLine2: address?.addressLine2 ?? '',
    city: address?.city ?? '',
    pincode: address?.pincode ?? '',
    phone: normalizeDeliveryPhone(address?.phone),
  };
}

export function readStoredProfile(): Partial<StoredProfile> {
  if (typeof window === 'undefined') {
    return {};
  }

  try {
    const saved = window.localStorage.getItem(profileStorageKey);
    return saved ? (JSON.parse(saved) as Partial<StoredProfile>) : {};
  } catch {
    return {};
  }
}

export function writeStoredProfile(profile: StoredProfile) {
  window.localStorage.setItem(profileStorageKey, JSON.stringify(profile));
}

export function mergeStoredProfile(profile: Partial<StoredProfile>) {
  const current = readStoredProfile();
  const next: StoredProfile = {
    ...emptyStoredProfile,
    ...current,
    ...profile,
    deliveryAddress: normalizeDeliveryAddress(
      profile.deliveryAddress ?? current.deliveryAddress
    ),
  };

  writeStoredProfile(next);
  return next;
}

export function hasCompleteStoredProfile(profile: Partial<StoredProfile>) {
  return Boolean(
    profile.fullName &&
      profile.phone &&
      profile.gender &&
      profile.age &&
      profile.height &&
      profile.weight &&
      profile.healthNotes
  );
}
