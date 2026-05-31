'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { LockKeyhole } from 'lucide-react';
import styles from './page.module.css';

export default function ChefLogin() {
  const [pin, setPin] = useState('');
  const [error, setError] = useState(false);
  const router = useRouter();

  const handleLogin = (e: React.FormEvent) => {
    e.preventDefault();
    if (pin === 'chef123') {
      router.push('/chef/dashboard');
    } else {
      setError(true);
      setPin('');
    }
  };

  return (
    <div className={styles.container}>
      <form className={styles.form} onSubmit={handleLogin}>
        <div className={styles.iconWrap}>
          <LockKeyhole size={32} />
        </div>
        
        <h1 className={styles.title}>Chef Portal</h1>
        <p className={styles.subtitle}>Enter your PIN to access orders.</p>
        
        <div className={styles.inputGroup}>
          <input 
            type="password" 
            placeholder="Enter PIN (chef123)"
            value={pin}
            onChange={(e) => {
              setPin(e.target.value);
              setError(false);
            }}
            className={`${styles.input} ${error ? styles.error : ''}`}
            autoFocus
          />
          {error && <p className={styles.errorMsg}>Invalid PIN</p>}
        </div>

        <button type="submit" className="btn-primary" style={{ width: '100%', justifyContent: 'center' }}>
          Access Dashboard
        </button>
      </form>
    </div>
  );
}
