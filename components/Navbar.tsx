'use client';

import { useState, useEffect, useCallback } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { ShoppingCart, Menu, X } from 'lucide-react';
import Broccoli from '@/components/ui/Broccoli';
import { useCartStore } from '@/store/cartStore';
import { dietCategories } from '@/data/diets';
import { clearSession, ensureSession } from '@/lib/auth-client';
import styles from './Navbar.module.css';

export default function Navbar() {
  const [scrolled, setScrolled] = useState(false);
  const [menuOpen, setMenuOpen] = useState(false);
  const [programsOpen, setProgramsOpen] = useState(false);
  const [isAuthenticated, setIsAuthenticated] = useState(false);
  const { toggleCart, getCount } = useCartStore();
  const count = useCartStore(getCount);
  const router = useRouter();

  const handleOpenAuth = useCallback(() => {
    if (isAuthenticated) {
      router.push('/menu');
    } else {
      router.push('/login');
    }
  }, [isAuthenticated, router]);

  useEffect(() => {
    const handler = () => setScrolled(window.scrollY > 20);
    window.addEventListener('scroll', handler);
    return () => window.removeEventListener('scroll', handler);
  }, []);

  useEffect(() => {
    let isMounted = true;

    async function loadSession() {
      const session = await ensureSession();
      if (isMounted) {
        setIsAuthenticated(Boolean(session?.accessToken));
      }
    }

    loadSession();

    const onStorage = () => {
      loadSession();
    };

    window.addEventListener('storage', onStorage);
    window.addEventListener('projectfit-auth-changed', onStorage);
    return () => {
      isMounted = false;
      window.removeEventListener('storage', onStorage);
      window.removeEventListener('projectfit-auth-changed', onStorage);
    };
  }, []);

  const handleLogout = useCallback(() => {
    clearSession();
    setIsAuthenticated(false);
  }, []);

  useEffect(() => {
    if (!menuOpen) return;
    document.body.style.overflow = 'hidden';
    return () => {
      document.body.style.overflow = '';
    };
  }, [menuOpen]);

  return (
    <nav className={`${styles.nav} ${scrolled ? styles.scrolled : ''}`}>
      <div className={styles.inner}>
        <div className={styles.logo}>
          <button
            type="button"
            className={styles.leafBtn}
            onClick={handleOpenAuth}
            aria-label="Log in or sign up"
          >
            <Broccoli size={22} />
          </button>
          <Link href="/" className={styles.logoText}>
            Project<strong>Fit</strong>
          </Link>
        </div>

        <div className={styles.links}>
          <div
            className={styles.dropdown}
            onMouseEnter={() => setProgramsOpen(true)}
            onMouseLeave={() => setProgramsOpen(false)}
          >
            <button type="button" className={styles.dropdownTrigger}>
              <span>Programs</span>
              <span className={`${styles.chevron} ${programsOpen ? styles.rotated : ''}`} aria-hidden />
            </button>
            {programsOpen && (
              <div className={styles.dropdownMenu}>
                {dietCategories.map((d) => (
                  <Link key={d.slug} href={d.href}>
                    <span style={{ color: d.accent }}>●</span>
                    {d.shortTitle}
                  </Link>
                ))}
              </div>
            )}
          </div>
          <Link href="/#how-it-works">How It Works</Link>
          {isAuthenticated ? (
            <>
              <Link href="/menu">Our Menu</Link>
              <button type="button" className={styles.inlineAction} onClick={handleLogout}>
                Log out
              </button>
            </>
          ) : (
            <Link href="/login">Log in</Link>
          )}
          <Link href="/chef">Chef Portal</Link>
        </div>

        <div className={styles.actions}>
          <button type="button" className={styles.cartBtn} onClick={toggleCart} aria-label="Cart">
            <ShoppingCart size={20} />
            {count > 0 && <span className={styles.badge}>{count}</span>}
          </button>
          <button
            type="button"
            className="btn-primary"
            style={{ padding: '10px 22px', fontSize: '14px' }}
            onClick={isAuthenticated ? () => router.push('/menu') : handleOpenAuth}
          >
            {isAuthenticated ? 'My Plan' : 'Get Started'}
          </button>
          <button
            type="button"
            className={styles.burger}
            onClick={() => setMenuOpen(!menuOpen)}
            aria-label="Menu"
          >
            {menuOpen ? <X size={22} /> : <Menu size={22} />}
          </button>
        </div>
      </div>

      {menuOpen && (
        <div className={styles.mobile}>
          <p className={styles.mobileLabel}>Programs</p>
          {dietCategories.map((d) => (
            <Link key={d.slug} href={d.href} onClick={() => setMenuOpen(false)}>
              {d.title}
            </Link>
          ))}
          <hr />
          <Link href="/#how-it-works" onClick={() => setMenuOpen(false)}>
            How It Works
          </Link>
          {isAuthenticated ? (
            <>
              <Link href="/menu" onClick={() => setMenuOpen(false)}>
                Our Menu
              </Link>
              <button type="button" className={styles.mobileAction} onClick={() => {
                setMenuOpen(false);
                handleLogout();
              }}>
                Log out
              </button>
            </>
          ) : (
            <>
              <Link href="/login" onClick={() => setMenuOpen(false)}>
                Log in
              </Link>
              <Link href="/signup" onClick={() => setMenuOpen(false)}>
                Sign up
              </Link>
            </>
          )}
          <Link href="/chef" onClick={() => setMenuOpen(false)}>
            Chef Portal
          </Link>
        </div>
      )}
    </nav>
  );
}
