'use client';

import { useState, useEffect, useRef, useCallback } from 'react';
import Link from 'next/link';
import { ShoppingCart, Menu, X, Leaf } from 'lucide-react';
import { useCartStore } from '@/store/cartStore';
import { useAuthModalStore } from '@/store/authModalStore';
import { dietCategories } from '@/data/diets';
import { useScrollAuthPrompt } from '@/hooks/useScrollAuthPrompt';
import styles from './Navbar.module.css';

export default function Navbar() {
  const [scrolled, setScrolled] = useState(false);
  const [menuOpen, setMenuOpen] = useState(false);
  const [programsOpen, setProgramsOpen] = useState(false);
  const leafRef = useRef<HTMLButtonElement>(null);
  const { toggleCart, getCount } = useCartStore();
  const count = useCartStore(getCount);
  const openAuth = useAuthModalStore((s) => s.open);

  const getLeafOrigin = useCallback(() => {
    const el = leafRef.current;
    if (!el) return null;
    const rect = el.getBoundingClientRect();
    return { x: rect.left + rect.width / 2, y: rect.top + rect.height / 2 };
  }, []);

  const handleOpenAuth = useCallback(() => {
    const origin = getLeafOrigin();
    if (origin) openAuth(origin);
  }, [getLeafOrigin, openAuth]);

  useScrollAuthPrompt(getLeafOrigin);

  useEffect(() => {
    const handler = () => setScrolled(window.scrollY > 20);
    window.addEventListener('scroll', handler);
    return () => window.removeEventListener('scroll', handler);
  }, []);

  useEffect(() => {
    if (!menuOpen) return;
    document.body.style.overflow = 'hidden';
    return () => {
      if (!useAuthModalStore.getState().isOpen) {
        document.body.style.overflow = '';
      }
    };
  }, [menuOpen]);

  return (
    <nav className={`${styles.nav} ${scrolled ? styles.scrolled : ''}`}>
      <div className={styles.inner}>
        <div className={styles.logo}>
          <button
            ref={leafRef}
            type="button"
            className={styles.leafBtn}
            onClick={handleOpenAuth}
            aria-label="Log in or sign up"
          >
            <Leaf size={22} />
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
          <Link href="/login">Log in</Link>
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
            onClick={handleOpenAuth}
          >
            Get Started
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
          <Link href="/login" onClick={() => setMenuOpen(false)}>
            Log in
          </Link>
          <Link href="/signup" onClick={() => setMenuOpen(false)}>
            Sign up
          </Link>
          <Link href="/chef" onClick={() => setMenuOpen(false)}>
            Chef Portal
          </Link>
        </div>
      )}
    </nav>
  );
}
