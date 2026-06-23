'use client';

import { useEffect, useMemo, useState } from 'react';
import { ChevronLeft, ChevronRight } from 'lucide-react';
import type { HomepageAd } from '@/lib/backend-types';
import styles from './HomepageAdsBoard.module.css';

function useMobileMedia() {
  const [isMobile, setIsMobile] = useState(false);

  useEffect(() => {
    const mediaQuery = window.matchMedia('(max-width: 720px)');
    const update = () => setIsMobile(mediaQuery.matches);
    update();
    mediaQuery.addEventListener('change', update);
    return () => mediaQuery.removeEventListener('change', update);
  }, []);

  return isMobile;
}

function getAdMedia(ad: HomepageAd, isMobile: boolean) {
  if (isMobile && ad.mobile_media_url && ad.mobile_media_type) {
    return {
      type: ad.mobile_media_type,
      url: ad.mobile_media_url,
      path: ad.mobile_media_path,
    };
  }

  return {
    type: ad.media_type,
    url: ad.media_url,
    path: ad.media_path,
  };
}

function isUnsupportedVideoUrl(url: string, path?: string | null) {
  const source = path || url;
  const cleanUrl = source.split('?')[0]?.toLowerCase() ?? '';
  return cleanUrl.endsWith('.mov') || cleanUrl.endsWith('.qt');
}

function getPlayableVideoUrl(url: string) {
  return url;
}

function getVideoType(url: string, path?: string | null) {
  const source = (path || url).split('?')[0]?.toLowerCase() ?? '';
  return source.endsWith('.webm') ? 'video/webm' : 'video/mp4';
}

export default function HomepageAdsBoard() {
  const [ads, setAds] = useState<HomepageAd[]>([]);
  const [activeIndex, setActiveIndex] = useState(0);
  const [isLoading, setIsLoading] = useState(true);
  const [videoError, setVideoError] = useState(false);
  const isMobile = useMobileMedia();

  useEffect(() => {
    let cancelled = false;

    async function loadAds() {
      try {
        const response = await fetch('/api/homepage-ads', { cache: 'no-store' });
        const result = (await response.json()) as { enabled?: boolean; ads?: HomepageAd[] };
        if (!cancelled) {
          setAds(result.enabled ? result.ads ?? [] : []);
        }
      } catch {
        if (!cancelled) setAds([]);
      } finally {
        if (!cancelled) setIsLoading(false);
      }
    }

    void loadAds();

    return () => {
      cancelled = true;
    };
  }, []);

  useEffect(() => {
    if (activeIndex >= ads.length) setActiveIndex(0);
  }, [activeIndex, ads.length]);

  const activeAd = ads[activeIndex] ?? null;
  const media = useMemo(
    () => (activeAd ? getAdMedia(activeAd, isMobile) : null),
    [activeAd, isMobile]
  );

  useEffect(() => {
    setVideoError(false);
  }, [media?.url]);

  useEffect(() => {
    if (ads.length <= 1 || media?.type === 'video') return;
    const interval = window.setInterval(() => {
      setActiveIndex((current) => (current + 1) % ads.length);
    }, 7000);
    return () => window.clearInterval(interval);
  }, [ads.length, media?.type]);

  if (isLoading || !activeAd || !media) return null;

  function move(direction: -1 | 1) {
    setActiveIndex((current) => (current + direction + ads.length) % ads.length);
  }

  return (
    <section className={styles.section} aria-label="Project Fit announcements">
      <div className={styles.board}>
        <div className={styles.mediaWrap}>
          {media.type === 'video' && !videoError && !isUnsupportedVideoUrl(media.url, media.path) ? (
            <video
              key={media.url}
              className={styles.media}
              poster={activeAd.poster_url ?? undefined}
              autoPlay
              muted
              loop={ads.length <= 1}
              playsInline
              controls
              preload="auto"
              onEnded={() => {
                if (ads.length > 1) move(1);
              }}
              onError={() => setVideoError(true)}
            >
              <source src={getPlayableVideoUrl(media.url)} type={getVideoType(media.url, media.path)} />
            </video>
          ) : media.type === 'video' ? (
            <div className={styles.videoFallback}>
              <strong>Video unavailable</strong>
              <span>Please upload this ad video as MP4 or WebM.</span>
            </div>
          ) : (
            // eslint-disable-next-line @next/next/no-img-element
            <img className={styles.media} src={media.url} alt={activeAd.caption} />
          )}
          <div className={styles.overlay}>
            <span>Now at Project Fit</span>
            <p>{activeAd.caption}</p>
            {activeAd.cta_href && activeAd.cta_label && (
              <a href={activeAd.cta_href}>{activeAd.cta_label}</a>
            )}
          </div>
        </div>

        {ads.length > 1 && (
          <>
            <button type="button" className={styles.prev} onClick={() => move(-1)} aria-label="Previous ad">
              <ChevronLeft size={20} />
            </button>
            <button type="button" className={styles.next} onClick={() => move(1)} aria-label="Next ad">
              <ChevronRight size={20} />
            </button>
            <div className={styles.dots} aria-label="Ad slides">
              {ads.map((ad, index) => (
                <button
                  key={ad.id}
                  type="button"
                  className={index === activeIndex ? styles.dotActive : styles.dot}
                  onClick={() => setActiveIndex(index)}
                  aria-label={`Show ad ${index + 1}`}
                />
              ))}
            </div>
          </>
        )}
      </div>
    </section>
  );
}
