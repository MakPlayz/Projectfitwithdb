'use client';

import { ChangeEvent, FormEvent, useEffect, useMemo, useState } from 'react';
import Image from 'next/image';
import Link from 'next/link';
import { useRouter, useSearchParams } from 'next/navigation';
import { CalendarDays, Camera, CheckCircle2, FileText, Mail, MapPin, MessageSquareText, ShieldCheck, UserCircle, X } from 'lucide-react';
import { ensureSession, getAuthHeaders, getSession, saveSession, type ProjectFitSession } from '@/lib/auth-client';
import type { ApiOrder, CustomerFeedback, DeliveryAddress, PlanPauseRequest } from '@/lib/backend-types';
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
import { isDeliverablePincode, isIncludedDeliveryPincode } from '@/lib/serviceable-pincodes';
import { usePublicConfig } from '@/lib/use-public-config';
import DeliveryAreaNotice from '@/components/DeliveryAreaNotice';
import LocationPickerModal from '@/components/LocationPickerModal';
import styles from './profile.module.css';

type PauseEligibleOrder = ApiOrder & {
  pause_kind: 'weekly' | 'monthly';
  pause_limit: number;
  pauses_used: number;
  pause_window: {
    startDate: string;
    endDate: string;
  } | null;
  selectable_pause_dates: string[];
};

function formatDate(value: string | null | undefined) {
  if (!value) return 'Not set';
  return new Intl.DateTimeFormat('en-IN', {
    day: '2-digit',
    month: 'short',
    year: 'numeric',
  }).format(new Date(`${value}T00:00:00`));
}

function addDays(dateKey: string, days: number) {
  const [year, month, day] = dateKey.split('-').map(Number);
  const date = new Date(Date.UTC(year, month - 1, day + days));
  return date.toISOString().slice(0, 10);
}

function compareDateKeys(left: string, right: string) {
  return left.localeCompare(right);
}

function eachDateKey(startDate: string, endDate: string) {
  const dates: string[] = [];
  let cursor = startDate;
  while (compareDateKeys(cursor, endDate) <= 0) {
    dates.push(cursor);
    cursor = addDays(cursor, 1);
  }
  return dates;
}

function isSunday(dateKey: string) {
  const [year, month, day] = dateKey.split('-').map(Number);
  return new Date(Date.UTC(year, month - 1, day)).getUTCDay() === 0;
}

function getPlanName(order: ApiOrder) {
  return order.items[0]?.name ?? 'Meal plan';
}

export default function ProfilePageClient() {
  usePublicConfig();

  const router = useRouter();
  const searchParams = useSearchParams();
  const [session, setSession] = useState<ProjectFitSession | null>(null);
  const [profile, setProfile] = useState<StoredProfile>(emptyStoredProfile);
  const [isMapOpen, setIsMapOpen] = useState(false);
  const [heightUnit, setHeightUnit] = useState<HeightUnit>('cm');
  const [feedback, setFeedback] = useState<CustomerFeedback[]>([]);
  const [feedbackMessage, setFeedbackMessage] = useState('');
  const [feedbackStatus, setFeedbackStatus] = useState('');
  const [feedbackError, setFeedbackError] = useState('');
  const [isFeedbackSubmitting, setIsFeedbackSubmitting] = useState(false);
  const [pauseOrders, setPauseOrders] = useState<PauseEligibleOrder[]>([]);
  const [pauseRequests, setPauseRequests] = useState<PlanPauseRequest[]>([]);
  const [selectedPauseOrderId, setSelectedPauseOrderId] = useState('');
  const [pauseStartDate, setPauseStartDate] = useState('');
  const [pauseEndDate, setPauseEndDate] = useState('');
  const [pauseStatus, setPauseStatus] = useState('');
  const [pauseError, setPauseError] = useState('');
  const [isPauseSubmitting, setIsPauseSubmitting] = useState(false);
  const [medicalReport, setMedicalReport] = useState<{
    name: string;
    type: string;
    data: string;
    uploadedAt?: string | null;
  } | null>(null);
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

      const feedbackResponse = await fetch('/api/feedback', {
        headers,
        cache: 'no-store',
      });
      const feedbackData = feedbackResponse.ok ? await feedbackResponse.json() : null;
      const pausesResponse = await fetch('/api/plan-pauses', {
        headers,
        cache: 'no-store',
      });
      const pausesData = pausesResponse.ok ? await pausesResponse.json() : null;

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
        setMedicalReport(
          remote?.medical_report_file_data
            ? {
                name: remote.medical_report_file_name ?? 'Health report',
                type: remote.medical_report_file_type ?? 'application/octet-stream',
                data: remote.medical_report_file_data,
                uploadedAt: remote.medical_report_uploaded_at,
              }
            : null
        );
        setFeedback(feedbackData?.feedback ?? []);
        const eligiblePauseOrders = pausesData?.eligibleOrders ?? [];
        setPauseOrders(eligiblePauseOrders);
        setPauseRequests(pausesData?.pauses ?? []);
        setSelectedPauseOrderId((currentOrderId) => currentOrderId || eligiblePauseOrders[0]?.id || '');
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
  const hasValidDeliveryPincode = /^[1-9][0-9]{5}$/.test(profile.deliveryAddress.pincode.trim());
  const isOutsideDeliverableArea =
    hasValidDeliveryPincode && !isDeliverablePincode(profile.deliveryAddress.pincode);
  const requiresRapidoFare =
    hasValidDeliveryPincode &&
    isDeliverablePincode(profile.deliveryAddress.pincode) &&
    !isIncludedDeliveryPincode(profile.deliveryAddress.pincode);

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

  const handleMedicalReportChange = (event: ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file) return;

    const allowedTypes = ['application/pdf', 'image/jpeg', 'image/png', 'image/webp'];
    if (!allowedTypes.includes(file.type)) {
      setError('Upload a PDF, JPG, PNG, or WebP report file.');
      event.target.value = '';
      return;
    }

    if (file.size > 1_500_000) {
      setError('Medical report file must be below 1.5 MB.');
      event.target.value = '';
      return;
    }

    const reader = new FileReader();
    reader.onload = () => {
      setMedicalReport({
        name: file.name,
        type: file.type,
        data: String(reader.result ?? ''),
      });
      setStatus('');
      setError('');
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
          medical_report_file_name: medicalReport?.name ?? null,
          medical_report_file_type: medicalReport?.type ?? null,
          medical_report_file_data: medicalReport?.data ?? null,
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

  const handleFeedbackSubmit = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    setFeedbackError('');
    setFeedbackStatus('');

    const message = feedbackMessage.trim();
    if (message.length < 5) {
      setFeedbackError('Write at least a few words before sending feedback.');
      return;
    }

    setIsFeedbackSubmitting(true);
    try {
      const response = await fetch('/api/feedback', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          ...(await getAuthHeaders()),
        },
        body: JSON.stringify({ message }),
      });
      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.error ?? 'Could not send feedback.');
      }

      setFeedback((current) => [data.feedback, ...current].filter(Boolean));
      setFeedbackMessage('');
      setFeedbackStatus('Feedback sent to the kitchen team.');
    } catch (err) {
      setFeedbackError(err instanceof Error ? err.message : 'Could not send feedback.');
    } finally {
      setIsFeedbackSubmitting(false);
    }
  };

  const selectedPauseOrder = pauseOrders.find((order) => order.id === selectedPauseOrderId) ?? null;
  const selectablePauseDates = new Set(selectedPauseOrder?.selectable_pause_dates ?? []);
  const calendarDates = selectedPauseOrder?.pause_window
    ? eachDateKey(
        selectedPauseOrder.selectable_pause_dates[0] ?? selectedPauseOrder.pause_window.startDate,
        selectedPauseOrder.pause_window.endDate
      )
    : [];
  const selectedSkippedDates =
    pauseStartDate && pauseEndDate && compareDateKeys(pauseEndDate, pauseStartDate) >= 0
      ? eachDateKey(pauseStartDate, pauseEndDate).filter(
          (dateKey) => !isSunday(dateKey) && selectablePauseDates.has(dateKey)
        )
      : [];

  function handlePauseDateClick(dateKey: string) {
    setPauseStatus('');
    setPauseError('');

    if (!pauseStartDate || (pauseStartDate && pauseEndDate) || compareDateKeys(dateKey, pauseStartDate) < 0) {
      setPauseStartDate(dateKey);
      setPauseEndDate('');
      return;
    }

    setPauseEndDate(dateKey);
  }

  async function handlePauseSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setPauseError('');
    setPauseStatus('');

    if (!selectedPauseOrder || !pauseStartDate || !pauseEndDate || selectedSkippedDates.length === 0) {
      setPauseError('Select a valid non-Sunday date range inside your plan.');
      return;
    }

    setIsPauseSubmitting(true);
    try {
      const response = await fetch('/api/plan-pauses', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          ...(await getAuthHeaders()),
        },
        body: JSON.stringify({
          orderId: selectedPauseOrder.id,
          startDate: pauseStartDate,
          endDate: pauseEndDate,
        }),
      });
      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.error ?? 'Could not pause meals.');
      }

      const refreshResponse = await fetch('/api/plan-pauses', {
        headers: await getAuthHeaders(),
        cache: 'no-store',
      });
      const refreshData = refreshResponse.ok ? await refreshResponse.json() : null;
      setPauseOrders(refreshData?.eligibleOrders ?? []);
      setPauseRequests(refreshData?.pauses ?? []);
      setSelectedPauseOrderId(data.order?.id ?? '');
      setPauseStartDate('');
      setPauseEndDate('');
      setPauseStatus(`Meals paused for ${data.pause?.extension_days ?? selectedSkippedDates.length} delivery day${selectedSkippedDates.length === 1 ? '' : 's'}. Your plan was extended automatically.`);
    } catch (err) {
      setPauseError(err instanceof Error ? err.message : 'Could not pause meals.');
    } finally {
      setIsPauseSubmitting(false);
    }
  }

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

            <div className={styles.reportBox}>
              <div>
                <span>Doctor report or recent test report (optional)</span>
                <p>
                  If you have a recent doctor report or test report related to fatigue, vitamin or mineral
                  deficiencies, or food-related fitness concerns, you can share it here. It is optional,
                  but it helps us understand your issue better and suggest more suitable food options.
                </p>
              </div>
              {medicalReport ? (
                <div className={styles.reportPreview}>
                  <FileText size={18} />
                  <div>
                    <strong>{medicalReport.name}</strong>
                    <small>
                      {medicalReport.uploadedAt
                        ? `Uploaded ${new Date(medicalReport.uploadedAt).toLocaleDateString('en-IN')}`
                        : 'Ready to save'}
                    </small>
                  </div>
                  <button type="button" onClick={() => setMedicalReport(null)} aria-label="Remove report">
                    <X size={16} />
                  </button>
                </div>
              ) : (
                <label className={styles.reportUpload}>
                  <FileText size={17} />
                  Upload report
                  <input type="file" accept="application/pdf,image/jpeg,image/png,image/webp" onChange={handleMedicalReportChange} />
                </label>
              )}
            </div>

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
              {isOutsideDeliverableArea && (
                <span className={styles.status}>
                  Your area is outside our current deliverable areas. Please enter a supported delivery pincode.
                </span>
              )}
              {requiresRapidoFare && <DeliveryAreaNotice compact />}
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

      <section className={styles.section}>
        <div className="container">
          <div className={styles.pauseCard}>
            <div className={styles.formHeader}>
              <div>
                <h2>Pause Meals, Keep Your Plan Days</h2>
                <p>
                  Week and month plan customers can pause meals from the day after tomorrow onward.
                  Sundays are unavailable because regular delivery is off.
                </p>
              </div>
              <CalendarDays size={24} />
            </div>

            {pauseOrders.length === 0 ? (
              <div className={styles.pauseEmpty}>
                <strong>Available for active week and month plans</strong>
                <p>
                  Once your eligible plan is active, you can select skip dates here and those delivery
                  days will be added to the end of your plan.
                </p>
              </div>
            ) : (
              <form className={styles.pauseForm} onSubmit={handlePauseSubmit}>
                <label className={styles.field}>
                  <span>Active plan</span>
                  <select
                    value={selectedPauseOrderId}
                    onChange={(event) => {
                      setSelectedPauseOrderId(event.target.value);
                      setPauseStartDate('');
                      setPauseEndDate('');
                      setPauseStatus('');
                      setPauseError('');
                    }}
                  >
                    {pauseOrders.map((order) => (
                      <option key={order.id} value={order.id}>
                        {getPlanName(order)} - {order.pause_kind === 'monthly' ? 'Month plan' : 'Week plan'} ({order.pause_limit - order.pauses_used} pause request{order.pause_limit - order.pauses_used === 1 ? '' : 's'} left)
                      </option>
                    ))}
                  </select>
                </label>

                {selectedPauseOrder && (
                  <>
                    <div className={styles.pauseSummary}>
                      <span>Plan window: {formatDate(selectedPauseOrder.pause_window?.startDate)} to {formatDate(selectedPauseOrder.pause_window?.endDate)}</span>
                      <span>Used: {selectedPauseOrder.pauses_used} / {selectedPauseOrder.pause_limit}</span>
                      {selectedPauseOrder.payment_stage === 'half_paid' && (
                        <span>Half-paid plans can pause only inside the already-paid half.</span>
                      )}
                    </div>

                    <div className={styles.pauseCalendar} aria-label="Pause meal calendar">
                      {calendarDates.map((dateKey) => {
                        const disabled = !selectablePauseDates.has(dateKey);
                        const selected =
                          pauseStartDate &&
                          ((pauseEndDate &&
                            compareDateKeys(dateKey, pauseStartDate) >= 0 &&
                            compareDateKeys(dateKey, pauseEndDate) <= 0) ||
                            dateKey === pauseStartDate);

                        return (
                          <button
                            key={dateKey}
                            type="button"
                            className={selected ? styles.pauseDateSelected : styles.pauseDate}
                            disabled={disabled}
                            onClick={() => handlePauseDateClick(dateKey)}
                            title={isSunday(dateKey) ? 'Sunday delivery is off' : undefined}
                          >
                            <strong>{new Date(`${dateKey}T00:00:00`).toLocaleDateString('en-IN', { day: '2-digit' })}</strong>
                            <span>{new Date(`${dateKey}T00:00:00`).toLocaleDateString('en-IN', { weekday: 'short' })}</span>
                          </button>
                        );
                      })}
                    </div>

                    <div className={styles.pauseSummary}>
                      <span>Selected: {selectedSkippedDates.length} delivery day{selectedSkippedDates.length === 1 ? '' : 's'}</span>
                      {pauseStartDate && <span>From: {formatDate(pauseStartDate)}</span>}
                      {pauseEndDate && <span>To: {formatDate(pauseEndDate)}</span>}
                    </div>
                  </>
                )}

                {pauseStatus && <span className={styles.status}>{pauseStatus}</span>}
                {pauseError && <span className={styles.status}>{pauseError}</span>}
                <button type="submit" className="btn-primary" disabled={isPauseSubmitting || selectedSkippedDates.length === 0}>
                  {isPauseSubmitting ? 'Applying pause...' : 'Confirm meal pause'}
                </button>
              </form>
            )}

            {pauseRequests.length > 0 && (
              <div className={styles.pauseHistory}>
                <h3>Pause history</h3>
                {pauseRequests.slice(0, 5).map((pause) => (
                  <article key={pause.id}>
                    <strong>{formatDate(pause.start_date)} to {formatDate(pause.end_date)}</strong>
                    <span>{pause.extension_days} delivery day{pause.extension_days === 1 ? '' : 's'} added</span>
                  </article>
                ))}
              </div>
            )}
          </div>
        </div>
      </section>

      <section className={styles.section}>
        <div className="container">
          <div className={styles.feedbackCard}>
            <div className={styles.formHeader}>
              <div>
                <h2>Feedback</h2>
                <p>Share meal quality, delivery, taste, or service feedback directly with the chef team.</p>
              </div>
              <MessageSquareText size={24} />
            </div>

            <form className={styles.feedbackForm} onSubmit={handleFeedbackSubmit}>
              <label className={styles.field}>
                <span>Your feedback</span>
                <textarea
                  value={feedbackMessage}
                  onChange={(event) => setFeedbackMessage(event.target.value)}
                  placeholder="Tell us what worked well or what should be improved"
                  rows={4}
                  maxLength={1200}
                />
              </label>
              {feedbackStatus && <span className={styles.status}>{feedbackStatus}</span>}
              {feedbackError && <span className={styles.status}>{feedbackError}</span>}
              <button type="submit" className="btn-primary" disabled={isFeedbackSubmitting}>
                {isFeedbackSubmitting ? 'Sending...' : 'Send feedback'}
              </button>
            </form>

            {feedback.length > 0 && (
              <div className={styles.feedbackList}>
                <h3>Your previous feedback</h3>
                {feedback.map((item) => (
                  <article key={item.id} className={styles.feedbackItem}>
                    <p>{item.message}</p>
                    <span>{new Date(item.created_at).toLocaleDateString('en-IN', {
                      day: '2-digit',
                      month: 'short',
                      year: 'numeric',
                    })}</span>
                  </article>
                ))}
              </div>
            )}
          </div>
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
