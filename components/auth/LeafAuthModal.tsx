'use client';

import { useEffect, useRef, useState, useCallback, useLayoutEffect } from 'react';
import { createPortal } from 'react-dom';
import gsap from 'gsap';
import { Leaf, X } from 'lucide-react';
import { useAuthModalStore } from '@/store/authModalStore';
import AuthForm from './AuthForm';
import LeafAuthShell from './LeafAuthShell';
import styles from './LeafAuthModal.module.css';

export default function LeafAuthModal() {
  const { isOpen, origin, close } = useAuthModalStore();
  const [mounted, setMounted] = useState(false);
  const [ready, setReady] = useState(false);

  const overlayRef = useRef<HTMLDivElement>(null);
  const flyerRef = useRef<HTMLDivElement>(null);
  const panelRef = useRef<HTMLDivElement>(null);
  const contentRef = useRef<HTMLDivElement>(null);
  const timelineRef = useRef<gsap.core.Timeline | null>(null);

  useEffect(() => {
    setMounted(true);
  }, []);

  useLayoutEffect(() => {
    if (isOpen) setReady(true);
    else setReady(false);
  }, [isOpen]);

  const runCloseAnimation = useCallback(() => {
    const overlay = overlayRef.current;
    const panel = panelRef.current;
    const content = contentRef.current;
    const flyer = flyerRef.current;

    if (!overlay || !panel || !content || !origin) {
      close();
      return;
    }

    timelineRef.current?.kill();

    gsap.set(flyer, {
      left: '50%',
      top: '50%',
      xPercent: -50,
      yPercent: -50,
      scale: 0,
      opacity: 0,
    });

    const tl = gsap.timeline({
      onComplete: () => {
        close();
        gsap.set([panel, content, flyer, overlay], { clearProps: 'all' });
      },
    });

    tl.to(content, { opacity: 0, y: 16, duration: 0.22, ease: 'power2.in' })
      .to(
        panel,
        {
          scale: 0.12,
          x: origin.x - window.innerWidth / 2,
          y: origin.y - window.innerHeight / 2,
          opacity: 0,
          duration: 0.55,
          ease: 'power3.inOut',
        },
        0.05
      )
      .to(flyer, { scale: 1, opacity: 1, duration: 0.25 }, 0.35)
      .to(
        flyer,
        {
          left: origin.x,
          top: origin.y,
          scale: 0.6,
          opacity: 0,
          duration: 0.4,
          ease: 'power2.in',
        },
        0.45
      )
      .to(overlay, { opacity: 0, duration: 0.3 }, 0.5);

    timelineRef.current = tl;
  }, [close, origin]);

  useLayoutEffect(() => {
    if (!ready || !isOpen || !origin || !mounted) return;

    const overlay = overlayRef.current;
    const flyer = flyerRef.current;
    const panel = panelRef.current;
    const content = contentRef.current;

    if (!overlay || !flyer || !panel || !content) return;

    timelineRef.current?.kill();

    const centerX = window.innerWidth / 2;
    const centerY = window.innerHeight / 2;

    gsap.set(overlay, { opacity: 0 });
    gsap.set(flyer, {
      left: origin.x,
      top: origin.y,
      xPercent: -50,
      yPercent: -50,
      scale: 1,
      opacity: 1,
      rotation: 0,
    });
    gsap.set(panel, {
      left: '50%',
      top: '50%',
      xPercent: -50,
      yPercent: -50,
      scale: 0.08,
      opacity: 0,
      rotation: 0,
    });
    gsap.set(content, { opacity: 0, y: 16 });

    const tl = gsap.timeline({
      onComplete: () => {
        gsap.set(content, { opacity: 1, y: 0, clearProps: 'opacity,transform' });
      },
    });

    tl.to(overlay, { opacity: 1, duration: 0.4, ease: 'power2.out' })
      .to(
        flyer,
        {
          left: centerX,
          top: centerY,
          scale: 3.2,
          rotation: 0,
          duration: 1,
          ease: 'power2.inOut',
        },
        0
      )
      .to(flyer, { opacity: 0, scale: 4.5, duration: 0.3, ease: 'power2.in' }, 0.85)
      .to(
        panel,
        { scale: 1, opacity: 1, rotation: 0, duration: 0.8, ease: 'power3.out' },
        0.78
      )
      .to(content, { opacity: 1, y: 0, duration: 0.5, ease: 'power2.out' }, 1);

    timelineRef.current = tl;

    return () => {
      timelineRef.current?.kill();
    };
  }, [ready, isOpen, origin, mounted]);

  useEffect(() => {
    if (!isOpen) return;
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') runCloseAnimation();
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [isOpen, runCloseAnimation]);

  useEffect(() => {
    document.body.style.overflow = isOpen ? 'hidden' : '';
    return () => {
      document.body.style.overflow = '';
    };
  }, [isOpen]);

  if (!mounted || !isOpen) return null;

  return createPortal(
    <div
      ref={overlayRef}
      className={styles.overlay}
      role="dialog"
      aria-modal="true"
      aria-label="Log in or sign up"
      onClick={(e) => {
        if (e.target === overlayRef.current) runCloseAnimation();
      }}
    >
      <div ref={flyerRef} className={styles.flyer} aria-hidden>
        <Leaf size={32} strokeWidth={2.25} />
      </div>

      <div ref={panelRef} className={styles.panelWrap}>
        <button
          type="button"
          className={styles.closeBtn}
          onClick={runCloseAnimation}
          aria-label="Close"
        >
          <X size={20} />
        </button>

        <LeafAuthShell tilted={false}>
          <div ref={contentRef} className={styles.formLayer}>
            <AuthForm initialMode="signup" variant="leaf" onSuccess={runCloseAnimation} />
          </div>
        </LeafAuthShell>
      </div>
    </div>,
    document.body
  );
}
