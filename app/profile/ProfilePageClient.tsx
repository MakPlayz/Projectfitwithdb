'use client';

import { ChangeEvent, FormEvent, useEffect, useMemo, useState } from 'react';
import Image from 'next/image';
import Link from 'next/link';
import { useRouter, useSearchParams } from 'next/navigation';
import { Camera, CheckCircle2, Mail, MapPin, ShieldCheck, UserCircle } from 'lucide-react';
import { ensureSession, getAuthHeaders, getSession, saveSession, type ProjectFitSession } from '@/lib/auth-client';
import type { DeliveryAddress } from '@/lib/backend-types';
import {
  formatHeightForUnit,
  isValidHeightCm,
  parseHeightToCm,
  type HeightUnit,
} from '@/lib/height';
import {
  emptyStoredProfile,
  normalizeDeliveryAddress,
  readStoredProfile,
  type StoredProfile,
  writeStoredProfile,
} from '@/lib/profile-storage';
import { isServiceablePincode } from '@/lib/serviceable-pincodes';
import DeliveryAreaNotice from '@/components/DeliveryAreaNotice';
import LocationPickerModal from '@/components/LocationPickerModal';
import styles from './profile.module.css';

export default function ProfilePageClient() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const [session, setSession] = useState<ProjectFitSession | null>(null);
  const [profile, setProfile] = useState<StoredProfile>(emptyStoredProfile);
  const [isMapOpen, setIsMapOpen] = useState(false);
  const [heightUnit, setHeightUnit] = useState<HeightUnit>('cm');
  const [status, setStatus] = useState('');
  const [error, setError] = useState('');
  const nextPath = getSafeNextPath(searchParams.get('next'));

  useEffect(() => {
    async function initializeProfile() {
      const current = await ensureSession();
    if (!current) {
      router.replace('/login');
      return;
    }

    const parsed = readStoredProfile();

    const nextProfile = {
      ...emptyStoredProfile,
      ...parsed,
      deliveryAddress: normalizeDeliveryAddress(parsed.deliveryAddress),
      fullName:
        parsed.fullName ||
        current.user.user_metadata?.name ||
        current.user.user_metadata?.full_name ||
        '',
      phone: parsed.phone || current.user.user_metadata?.phone || '',
    };

    queueMicrotask(() => {
      setSession(current);
      setProfile(nextProfile);

      if (searchParams.get('completeProfile') === '1') {
        setStatus('Please complete your profile before continuing.');
      }
    });

      const headers = await getAuthHeaders();
      const response = await fetch('/api/profile', {
        headers,
        cache: 'no-store',
      });
      const data = response.ok ? await response.json() : null;

        const remote = data?.profile;
        const appUser = data?.user;
        if (!remote && !appUser) return;

        setProfile((currentProfile) => ({
          ...currentProfile,
          fullName: remote?.full_name || appUser?.name || currentProfile.fullName,
          phone: appUser?.phone || currentProfile.phone,
          age: remote?.age ?? currentProfile.age,
          gender: remote?.gender || currentProfile.gender,
          height: remote?.height_cm ?? currentProfile.height,
          weight: remote?.weight_kg ?? currentProfile.weight,
          healthNotes: remote?.health_notes ?? currentProfile.healthNotes,
        }));
    }

    initializeProfile().catch(() => undefined);
  }, [router, searchParams]);

  const initials = useMemo(() => {
    const source = profile.fullName || session?.user.email || 'PF';
    return source
      .split(/\s|@/)
      .filter(Boolean)
      .slice(0, 2)
      .map((part) => part[0]?.toUpperCase())
      .join('');
  }, [profile.fullName, session?.user.email]);
  const isOutsideSupportedDelivery =
    /^[1-9][0-9]{5}$/.test(profile.deliveryAddress.pincode.trim()) &&
    !isServiceablePincode(profile.deliveryAddress.pincode);

  const handleChange = (
    event: ChangeEvent<HTMLInputElement | HTMLSelectElement | HTMLTextAreaElement>
  ) => {
    const { name, value } = event.target;
    setProfile((current) => ({ ...current, [name]: value }));
    setStatus('');
  };

  const handleAddressChange = (field: keyof DeliveryAddress, value: string) => {
    setProfile((current) => ({
      ...current,
      deliveryAddress: {
        ...current.deliveryAddress,
        [field]: value,
      },
    }));
    setStatus('');
  };

  const handleHeightUnitChange = (unit: HeightUnit) => {
    setProfile((current) => {
      const heightCm = parseHeightToCm(String(current.height), heightUnit);
      return {
        ...current,
        height: heightCm ? formatHeightForUnit(heightCm, unit) : '',
      };
    });
    setHeightUnit(unit);
  };

  const handleMapAddressSelect = (address: Partial<DeliveryAddress>) => {
    setProfile((current) => ({
      ...current,
      deliveryAddress: normalizeDeliveryAddress({
        ...current.deliveryAddress,
        ...address,
        phone: current.deliveryAddress.phone || current.phone,
      }),
    }));
    setIsMapOpen(false);
    setStatus('Location added. Save profile to keep it for checkout.');
  };

  const handleImageChange = (event: ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file) return;

    const reader = new FileReader();
    reader.onload = () => {
      setProfile((current) => ({ ...current, image: String(reader.result ?? '') }));
      setStatus('');
    };
    reader.readAsDataURL(file);
  };

  const handleSubmit = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    setError('');
    setStatus('');

    const height = parseHeightToCm(String(profile.height), heightUnit);
    if (!isValidHeightCm(height)) {
      setError('Enter a valid height in centimeters or feet/inches.');
      return;
    }

    const nextProfile = {
      ...profile,
      height,
      deliveryAddress: normalizeDeliveryAddress({
        ...profile.deliveryAddress,
        phone: profile.deliveryAddress.phone || profile.phone,
      }),
    };
    writeStoredProfile(nextProfile);
    setProfile(nextProfile);

    if (session) {
      const response = await fetch('/api/profile', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          ...(await getAuthHeaders()),
        },
        body: JSON.stringify({
          full_name: nextProfile.fullName,
          phone: nextProfile.phone,
          age: Number(nextProfile.age),
          gender: nextProfile.gender || 'prefer-not-to-say',
          height_cm: height,
          weight_kg: Number(nextProfile.weight),
          health_notes: nextProfile.healthNotes,
        }),
      });
      const data = await response.json();

      if (!response.ok) {
        setError(data.error ?? 'Could not save profile.');
        return;
      }

      saveSession({
        ...session,
        user: {
          ...session.user,
          user_metadata: {
            ...session.user.user_metadata,
            name: profile.fullName,
            phone: profile.phone,
          },
        },
      });
      setSession(getSession());
    }

    setStatus('Profile updated');
    if (searchParams.get('completeProfile') === '1') {
      router.replace(nextPath);
    }
  };

  if (!session) {
    return null;
  }

  return (
    <main className={styles.main}>
      <section className={styles.hero}>
        <div className="container">
          <div className={styles.heroGrid}>
            <div>
              <p className="section-label">Account</p>
              <h1>Profile</h1>
              <p>
                Keep your nutrition profile current so plans and recommendations can match your
                goals when database-backed profiles are enabled.
              </p>
            </div>
            <div className={styles.accountCard}>
              <div className={styles.avatar}>
                {profile.image ? (
                  <Image src={profile.image} alt="Profile image" fill sizes="96px" />
                ) : (
                  <span>{initials || <UserCircle size={34} />}</span>
                )}
              </div>
              <div>
                <strong>{profile.fullName || 'Project Fit member'}</strong>
                <span>{session.user.email}</span>
              </div>
            </div>
          </div>
        </div>
      </section>

      <section className={styles.section}>
        <div className="container">
          <form className={styles.formCard} onSubmit={handleSubmit}>
            <div className={styles.formHeader}>
              <div>
                <h2>Your details</h2>
                <p>Email and password are managed by sign-in and cannot be edited here.</p>
              </div>
              {status && (
                <span className={styles.status}>
                  <CheckCircle2 size={16} />
                  {status}
                </span>
              )}
              {error && (
                <span className={styles.status}>
                  {error}
                </span>
              )}
            </div>

            <div className={styles.imageRow}>
              <div className={styles.largeAvatar}>
                {profile.image ? (
                  <Image src={profile.image} alt="Profile preview" fill sizes="132px" />
                ) : (
                  <UserCircle size={54} />
                )}
              </div>
              <label className={styles.uploadBtn}>
                <Camera size={17} />
                Add image
                <input type="file" accept="image/*" onChange={handleImageChange} />
              </label>
            </div>

            <div className={styles.grid}>
              <label className={styles.field}>
                <span>Full name</span>
                <input name="fullName" value={profile.fullName} onChange={handleChange} required />
              </label>
              <label className={styles.field}>
                <span>WhatsApp number</span>
                <input name="phone" value={profile.phone} onChange={handleChange} inputMode="tel" required />
              </label>
              <label className={styles.field}>
                <span>Age</span>
                <input name="age" type="number" min={13} max={100} value={profile.age} onChange={handleChange} required />
              </label>
              <label className={styles.field}>
                <span>Height</span>
                <div className={styles.heightControl}>
                  <input
                    name="height"
                    type="text"
                    value={profile.height}
                    onChange={handleChange}
                    placeholder={heightUnit === 'cm' ? '170 cm' : '5 ft 7 in'}
                    inputMode={heightUnit === 'cm' ? 'numeric' : 'text'}
                    required
                  />
                  <div className={styles.unitToggle} aria-label="Height unit">
                    <button
                      type="button"
                      className={heightUnit === 'cm' ? styles.unitActive : styles.unit}
                      onClick={() => handleHeightUnitChange('cm')}
                    >
                      cm
                    </button>
                    <button
                      type="button"
                      className={heightUnit === 'ft-in' ? styles.unitActive : styles.unit}
                      onClick={() => handleHeightUnitChange('ft-in')}
                    >
                      ft/in
                    </button>
                  </div>
                </div>
                <small>Enter your height in either centimeters or feet/inches.</small>
              </label>
              <label className={styles.field}>
                <span>Weight (kg)</span>
                <input name="weight" type="number" min={25} max={300} step="0.1" value={profile.weight} onChange={handleChange} required />
              </label>
              <label className={styles.field}>
                <span>Gender</span>
                <select name="gender" value={profile.gender} onChange={handleChange} required>
                  <option value="">Select gender</option>
                  <option value="male">Male</option>
                  <option value="female">Female</option>
                  <option value="non-binary">Non-binary</option>
                  <option value="prefer-not-to-say">Prefer not to say</option>
                </select>
              </label>
              <label className={`${styles.field} ${styles.readOnly}`}>
                <span>Email</span>
                <div className={styles.lockedValue}>
                  <Mail size={16} />
                  {session.user.email}
                </div>
              </label>
            </div>

            <label className={styles.field}>
              <span>Health notes</span>
              <textarea
                name="healthNotes"
                value={profile.healthNotes}
                onChange={handleChange}
                placeholder="Allergies, health issues, food preferences, or notes for the kitchen"
                rows={4}
                required
              />
            </label>

            <div className={styles.addressSection}>
              <div className={styles.addressHeader}>
                <div>
                  <h3>Saved delivery location</h3>
                  <p>This address will auto-fill during checkout.</p>
                </div>
                <button
                  type="button"
                  className={styles.locationBtn}
                  onClick={() => setIsMapOpen(true)}
                >
                  <MapPin size={16} />
                  {profile.deliveryAddress.latitude ? 'Change location' : 'Detect location'}
                </button>
              </div>

              <div className={styles.grid}>
                <label className={styles.field}>
                  <span>Address</span>
                  <input
                    value={profile.deliveryAddress.addressLine1}
                    onChange={(event) => handleAddressChange('addressLine1', event.target.value)}
                    placeholder="House no, street, area"
                    autoComplete="street-address"
                  />
                </label>
                <label className={styles.field}>
                  <span>Landmark</span>
                  <input
                    value={profile.deliveryAddress.addressLine2 ?? ''}
                    onChange={(event) => handleAddressChange('addressLine2', event.target.value)}
                    placeholder="Nearby landmark"
                  />
                </label>
                <label className={styles.field}>
                  <span>City</span>
                  <input
                    value={profile.deliveryAddress.city}
                    onChange={(event) => handleAddressChange('city', event.target.value)}
                    placeholder="City"
                    autoComplete="address-level2"
                  />
                </label>
                <label className={styles.field}>
                  <span>Pincode</span>
                  <input
                    value={profile.deliveryAddress.pincode}
                    onChange={(event) => handleAddressChange('pincode', event.target.value)}
                    placeholder="530001"
                    inputMode="numeric"
                    maxLength={6}
                    autoComplete="postal-code"
                  />
                </label>
              </div>
              {isOutsideSupportedDelivery && <DeliveryAreaNotice compact />}
            </div>

            <div className={styles.securityNote}>
              <ShieldCheck size={18} />
              <span>Password changes will be added after production auth settings are connected.</span>
            </div>

            <div className={styles.actions}>
              <button type="submit" className="btn-primary">
                Save profile
              </button>
              <Link href="/my-plan" className="btn-secondary">
                View my plan
              </Link>
            </div>
          </form>
        </div>
      </section>

      {isMapOpen && (
        <LocationPickerModal
          initialLocation={{
            latitude: profile.deliveryAddress.latitude,
            longitude: profile.deliveryAddress.longitude,
          }}
          onCancel={() => setIsMapOpen(false)}
          onSelect={handleMapAddressSelect}
        />
      )}
    </main>
  );
}

function getSafeNextPath(value: string | null) {
  return value && value.startsWith('/') && !value.startsWith('//') ? value : '/';
}
