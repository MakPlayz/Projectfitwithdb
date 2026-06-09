'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { LockKeyhole, Mail, Lock, AlertCircle } from 'lucide-react';
import { getAccessTokenExpiry, saveSession, clearSession } from '@/lib/auth-client';
import styles from './page.module.css';

export default function ChefLogin() {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const router = useRouter();

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    setIsSubmitting(true);

    try {
      const response = await fetch('/api/auth/login', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ email, password }),
      });

      const text = await response.text();
      const data = text ? JSON.parse(text) : {};

      if (!response.ok) {
        throw new Error(data.error ?? 'Authentication failed.');
      }

      if (!data.access_token || !data.user) {
        throw new Error('Invalid authentication response.');
      }

      const userEmail = data.user.email ?? '';
      if (!userEmail.toLowerCase().endsWith('@projectfitvizag.com')) {
        clearSession();
        throw new Error('Access denied. Only @projectfitvizag.com accounts can access the kitchen portal.');
      }

      saveSession({
        accessToken: data.access_token,
        refreshToken: data.refresh_token ?? null,
        expiresAt: getAccessTokenExpiry(data.access_token),
        user: data.user,
      });

      router.push('/chef/dashboard');
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Login failed.');
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className={styles.container}>
      <form className={styles.form} onSubmit={handleLogin}>
        <div className={styles.iconWrap}>
          <LockKeyhole size={32} />
        </div>
        
        <h1 className={styles.title}>Chef Portal</h1>
        <p className={styles.subtitle}>Enter kitchen credentials to access orders.</p>
        
        <div className={styles.inputGroup}>
          <label style={{ display: 'block', marginBottom: '8px', fontSize: '14px', color: 'var(--text-dim)' }}>
            Email Address
          </label>
          <input 
            type="email" 
            placeholder="chef@projectfitvizag.com"
            value={email}
            onChange={(e) => {
              setEmail(e.target.value);
              setError('');
            }}
            className={`${styles.input} ${error ? styles.error : ''}`}
            required
            autoFocus
          />
        </div>

        <div className={styles.inputGroup} style={{ marginBottom: '32px' }}>
          <label style={{ display: 'block', marginBottom: '8px', fontSize: '14px', color: 'var(--text-dim)' }}>
            Password
          </label>
          <input 
            type="password" 
            placeholder="••••••••"
            value={password}
            onChange={(e) => {
              setPassword(e.target.value);
              setError('');
            }}
            className={`${styles.input} ${error ? styles.error : ''}`}
            required
          />
        </div>

        {error && (
          <div style={{ display: 'flex', alignItems: 'center', gap: '8px', color: '#ff4d4d', fontSize: '13px', marginBottom: '24px', textAlign: 'left' }}>
            <AlertCircle size={16} style={{ flexShrink: 0 }} />
            <p>{error}</p>
          </div>
        )}

        <button 
          type="submit" 
          disabled={isSubmitting} 
          className="btn-primary" 
          style={{ width: '100%', justifyContent: 'center', opacity: isSubmitting ? 0.7 : 1 }}
        >
          {isSubmitting ? 'Verifying...' : 'Access Dashboard'}
        </button>
      </form>
    </div>
  );
}
