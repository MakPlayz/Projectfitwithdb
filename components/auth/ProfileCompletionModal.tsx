'use client';

import { FormEvent, useState } from 'react';
import { getAuthHeaders, getSession, saveSession } from '@/lib/auth-client';
import { mergeStoredProfile } from '@/lib/profile-storage';
import styles from './ProfileCompletionModal.module.css';

interface ProfileCompletionModalProps {
  defaultName?: string;
  defaultPhone?: string;
  onComplete: () => void;
}

export default function ProfileCompletionModal({
  defaultName = '',
  defaultPhone = '',
  onComplete,
}: ProfileCompletionModalProps) {
  const [error, setError] = useState('');
  const [isSaving, setIsSaving] = useState(false);

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setError('');
    setIsSaving(true);

    const formData = new FormData(event.currentTarget);
    const fullName = String(formData.get('fullName') ?? '').trim();
    const phone = String(formData.get('phone') ?? '').trim();
    const age = Number(formData.get('age'));
    const height = Number(formData.get('height'));
    const weight = Number(formData.get('weight'));
    const gender = String(formData.get('gender') ?? '');
    const healthNotes = String(formData.get('healthNotes') ?? '').trim();

    try {
      const response = await fetch('/api/profile', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          ...(await getAuthHeaders()),
        },
        body: JSON.stringify({
          full_name: fullName,
          phone,
          age,
          gender,
          height_cm: height,
          weight_kg: weight,
          health_notes: healthNotes,
        }),
      });
      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.error ?? 'Could not save profile.');
      }

      mergeStoredProfile({
        fullName,
        phone,
        age,
        height,
        weight,
        gender,
        healthNotes,
      });

      const session = getSession();
      if (session) {
        saveSession({
          ...session,
          user: {
            ...session.user,
            user_metadata: {
              ...session.user.user_metadata,
              name: fullName,
              phone,
            },
          },
        });
      }

      onComplete();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Could not save profile.');
    } finally {
      setIsSaving(false);
    }
  }

  return (
    <div className={styles.backdrop} role="dialog" aria-modal="true" aria-labelledby="profile-complete-title">
      <div className={styles.modal}>
        <div className={styles.header}>
          <h2 id="profile-complete-title">Complete your details</h2>
          <p>Enter these details once so we can personalize plans and contact you on WhatsApp.</p>
        </div>
        <form className={styles.form} onSubmit={handleSubmit}>
          <div className={styles.grid}>
            <label className={styles.field}>
              <span>Full name</span>
              <input name="fullName" defaultValue={defaultName} autoComplete="name" required />
            </label>
            <label className={styles.field}>
              <span>WhatsApp number</span>
              <input name="phone" defaultValue={defaultPhone} inputMode="tel" autoComplete="tel" required />
            </label>
            <label className={styles.field}>
              <span>Age</span>
              <input name="age" type="number" min={13} max={100} required />
            </label>
            <label className={styles.field}>
              <span>Height (cm)</span>
              <input name="height" type="number" min={100} max={250} required />
            </label>
            <label className={styles.field}>
              <span>Weight (kg)</span>
              <input name="weight" type="number" min={25} max={300} step="0.1" required />
            </label>
            <label className={styles.field}>
              <span>Gender</span>
              <select name="gender" defaultValue="" required>
                <option value="" disabled>Select gender</option>
                <option value="male">Male</option>
                <option value="female">Female</option>
                <option value="non-binary">Non-binary</option>
                <option value="prefer-not-to-say">Prefer not to say</option>
              </select>
            </label>
            <label className={`${styles.field} ${styles.wide}`}>
              <span>Health notes</span>
              <textarea
                name="healthNotes"
                placeholder='Allergies, health issues, food preferences, or enter "None"'
                rows={4}
                required
              />
            </label>
          </div>
          {error && <p className={styles.error}>{error}</p>}
          <div className={styles.actions}>
            <button type="submit" className="btn-primary" disabled={isSaving}>
              {isSaving ? 'Saving...' : 'Continue'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
