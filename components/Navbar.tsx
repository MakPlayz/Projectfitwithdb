'use client';

import { useState, useEffect, useCallback } from 'react';
import Image from 'next/image';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { ChevronDown, LogOut, Menu, ShoppingCart, UserCircle, X } from 'lucide-react';
import { useCartStore } from '@/store/cartStore';
import { dietCategories } from '@/data/diets';
import { clearSession, ensureSession } from '@/lib/auth-client';
import styles from './Navbar.module.css';

export default function Navbar() {
  const [scrolled, setScrolled] = useState(false);
  const [menuOpen, setMenuOpen] = useState(false);
  const [programsOpen, setProgramsOpen] = useState(false);
  const [profileOpen, setProfileOpen] = useState(false);
  const [isAuthenticated, setIsAuthenticated] = useState(false);
  const router = useRouter();
  const { toggleCart, getCount } = useCartStore();
  const count = useCartStore(getCount);

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
    setProfileOpen(false);
    setMenuOpen(false);
    router.push('/');
  }, [router]);

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
          <Link href="/" className={styles.logoLink} aria-label="Project Fit home">
            <Image
              src="/images/projectfit-logo.png"
              alt="Project Fit"
              width={64}
              height={64}
              priority
              className={styles.logoImage}
            />
            <span className={styles.logoText}>
              Project<strong>Fit</strong>
            </span>
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
            </>
          ) : null}
        </div>

        <div className={styles.actions}>
          {isAuthenticated ? (
            <>
              <button type="button" className={styles.cartBtn} onClick={toggleCart} aria-label="Cart">
                <ShoppingCart size={20} />
                {count > 0 && <span className={styles.badge}>{count}</span>}
              </button>
              <div
                className={styles.profileMenu}
                onMouseEnter={() => setProfileOpen(true)}
                onMouseLeave={() => setProfileOpen(false)}
              >
                <button
                  type="button"
                  className={styles.profileTrigger}
                  onClick={() => setProfileOpen((open) => !open)}
                  aria-expanded={profileOpen}
                  aria-haspopup="menu"
                >
                  <UserCircle size={18} />
                  <span>Profile</span>
                  <ChevronDown size={15} />
                </button>
                {profileOpen && (
                  <div className={styles.profileDropdown} role="menu">
                    <Link href="/profile" role="menuitem" onClick={() => setProfileOpen(false)}>
                      Profile
                    </Link>
                    <Link href="/my-plan" role="menuitem" onClick={() => setProfileOpen(false)}>
                      My Plan
                    </Link>
                    <button type="button" role="menuitem" onClick={handleLogout}>
                      <LogOut size={15} />
                      Log out
                    </button>
                  </div>
                )}
              </div>
            </>
          ) : (
            <div className={styles.authActions}>
              <Link href="/login" className={styles.signInBtn}>
                Sign in
              </Link>
              <Link href="/signup" className={styles.signUpBtn}>
                Sign up
              </Link>
            </div>
          )}
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
              <Link href="/profile" onClick={() => setMenuOpen(false)}>
                Profile
              </Link>
              <Link href="/my-plan" onClick={() => setMenuOpen(false)}>
                My Plan
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
                Sign in
              </Link>
              <Link href="/signup" onClick={() => setMenuOpen(false)}>
                Sign up
              </Link>
            </>
          )}
        </div>
      )}
    </nav>
  );
}
