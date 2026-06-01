'use client';

import Link from 'next/link';
import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import {
  ACTIVITY_OPTIONS,
  DIET_PREFERENCE_OPTIONS,
  GENDER_OPTIONS,
  GOAL_OPTIONS,
  HEALTH_FOCUS_OPTIONS,
  normalizeCommaList,
} from '@/lib/customer-profile';
import { getAuthHeaders } from '@/lib/auth-client';
import type { CustomerProfile, CustomerProfilePayload } from '@/lib/backend-types';
import styles from './page.module.css';

const initialForm: CustomerProfilePayload = {
  full_name: '',
  age: 25,
  gender: 'prefer-not-to-say',
  height_cm: 170,
  weight_kg: 70,
  activity_level: 'lightly-active',
  primary_goal: 'better-fitness',
  health_focus: 'general',
  diet_preference: 'balanced',
  allergies: [],
  health_notes: '',
};

export default function OnboardingPage() {
  const router = useRouter();
  const [form, setForm] = useState<CustomerProfilePayload>(initialForm);
  const [allergiesInput, setAllergiesInput] = useState('');
  const [profile, setProfile] = useState<CustomerProfile | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [isSaving, setIsSaving] = useState(false);
  const [error, setError] = useState('');

  useEffect(() => {
    let isMounted = true;

    async function loadProfile() {
      try {
        const response = await fetch('/api/profile', {
          headers: {
            ...(await getAuthHeaders()),
          },
          cache: 'no-store',
        });
        const data = await response.json();

        if (response.status === 401) {
          router.push('/login');
          return;
        }

        if (!response.ok) {
          throw new Error(data.error ?? 'Could not load your profile.');
        }

        if (data.profile && isMounted) {
          const current = data.profile as CustomerProfile;
          setProfile(current);
          setForm({
            full_name: current.full_name,
            age: current.age,
            gender: current.gender,
            height_cm: current.height_cm,
            weight_kg: current.weight_kg,
            activity_level: current.activity_level,
            primary_goal: current.primary_goal,
            health_focus: current.health_focus,
            diet_preference: current.diet_preference,
            allergies: current.allergies ?? [],
            health_notes: current.health_notes ?? '',
          });
          setAllergiesInput((current.allergies ?? []).join(', '));
        }
      } catch (err) {
        if (isMounted) {
          setError(err instanceof Error ? err.message : 'Could not load your profile.');
        }
      } finally {
        if (isMounted) {
          setIsLoading(false);
        }
      }
    }

    loadProfile();

    return () => {
      isMounted = false;
    };
  }, [router]);

  const handleSubmit = async (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    setError('');
    setIsSaving(true);

    try {
      const response = await fetch('/api/profile', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          ...(await getAuthHeaders()),
        },
        body: JSON.stringify({
          ...form,
          allergies: normalizeCommaList(allergiesInput),
        }),
      });
      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.error ?? 'Could not save your profile.');
      }

      router.push('/menu');
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Could not save your profile.');
    } finally {
      setIsSaving(false);
    }
  };

  return (
    <main className={styles.page}>
      <section className="container">
        <div className={styles.hero}>
          <div>
            <span className="tag">Customer onboarding</span>
            <h1 className={styles.title}>Tell us about the person we are feeding.</h1>
            <p className={styles.subtitle}>
              We&apos;ll use this profile to guide meal recommendations, personalize your plan,
              and give the kitchen the right context when an order comes in.
            </p>
          </div>
          {profile?.is_profile_complete && (
            <div className={styles.summaryCard}>
              <h2>Current recommendation</h2>
              <p>{profile.recommendation_summary}</p>
              {profile.coach_notes.length > 0 && (
                <ul className={styles.noteList}>
                  {profile.coach_notes.map((note) => (
                    <li key={note}>{note}</li>
                  ))}
                </ul>
              )}
            </div>
          )}
        </div>

        <form className={styles.form} onSubmit={handleSubmit}>
          <div className={styles.grid}>
            <label className={styles.field}>
              <span>Full name</span>
              <input
                value={form.full_name}
                onChange={(event) => setForm((current) => ({ ...current, full_name: event.target.value }))}
                placeholder="Mak Playz"
                required
              />
            </label>

            <label className={styles.field}>
              <span>Age</span>
              <input
                type="number"
                min={13}
                max={100}
                value={form.age}
                onChange={(event) => setForm((current) => ({ ...current, age: Number(event.target.value) }))}
                required
              />
            </label>

            <label className={styles.field}>
              <span>Gender</span>
              <select
                value={form.gender}
                onChange={(event) =>
                  setForm((current) => ({
                    ...current,
                    gender: event.target.value as CustomerProfilePayload['gender'],
                  }))
                }
              >
                {GENDER_OPTIONS.map((option) => (
                  <option key={option.value} value={option.value}>
                    {option.label}
                  </option>
                ))}
              </select>
            </label>

            <label className={styles.field}>
              <span>Height (cm)</span>
              <input
                type="number"
                min={100}
                max={250}
                value={form.height_cm}
                onChange={(event) => setForm((current) => ({ ...current, height_cm: Number(event.target.value) }))}
                required
              />
            </label>

            <label className={styles.field}>
              <span>Weight (kg)</span>
              <input
                type="number"
                min={25}
                max={300}
                value={form.weight_kg}
                onChange={(event) => setForm((current) => ({ ...current, weight_kg: Number(event.target.value) }))}
                required
              />
            </label>

            <label className={styles.field}>
              <span>Activity level</span>
              <select
                value={form.activity_level}
                onChange={(event) =>
                  setForm((current) => ({
                    ...current,
                    activity_level: event.target.value as CustomerProfilePayload['activity_level'],
                  }))
                }
              >
                {ACTIVITY_OPTIONS.map((option) => (
                  <option key={option.value} value={option.value}>
                    {option.label}
                  </option>
                ))}
              </select>
            </label>

            <label className={styles.field}>
              <span>Primary goal</span>
              <select
                value={form.primary_goal}
                onChange={(event) =>
                  setForm((current) => ({
                    ...current,
                    primary_goal: event.target.value as CustomerProfilePayload['primary_goal'],
                  }))
                }
              >
                {GOAL_OPTIONS.map((option) => (
                  <option key={option.value} value={option.value}>
                    {option.label}
                  </option>
                ))}
              </select>
            </label>

            <label className={styles.field}>
              <span>Health focus</span>
              <select
                value={form.health_focus}
                onChange={(event) =>
                  setForm((current) => ({
                    ...current,
                    health_focus: event.target.value as CustomerProfilePayload['health_focus'],
                  }))
                }
              >
                {HEALTH_FOCUS_OPTIONS.map((option) => (
                  <option key={option.value} value={option.value}>
                    {option.label}
                  </option>
                ))}
              </select>
            </label>

            <label className={styles.field}>
              <span>Diet preference</span>
              <select
                value={form.diet_preference}
                onChange={(event) =>
                  setForm((current) => ({
                    ...current,
                    diet_preference: event.target.value as CustomerProfilePayload['diet_preference'],
                  }))
                }
              >
                {DIET_PREFERENCE_OPTIONS.map((option) => (
                  <option key={option.value} value={option.value}>
                    {option.label}
                  </option>
                ))}
              </select>
            </label>
          </div>

          <label className={styles.field}>
            <span>Allergies or foods to avoid</span>
            <input
              value={allergiesInput}
              onChange={(event) => setAllergiesInput(event.target.value)}
              placeholder="Peanuts, shellfish, lactose"
            />
          </label>

          <label className={styles.field}>
            <span>Health notes, injuries, or extra preferences</span>
            <textarea
              value={form.health_notes}
              onChange={(event) => setForm((current) => ({ ...current, health_notes: event.target.value }))}
              placeholder="Example: desk job, training 4x/week, prefers lighter dinners, mild PCOS symptoms..."
              rows={5}
            />
          </label>

          {error && <p className={styles.error}>{error}</p>}

          <div className={styles.actions}>
            <button className="btn-primary" type="submit" disabled={isSaving || isLoading}>
              {isSaving ? 'Saving profile...' : 'Save profile and continue'}
            </button>
            <Link href="/menu" className="btn-secondary">
              Browse menu first
            </Link>
          </div>
        </form>
      </section>
    </main>
  );
}
