'use client';

import { useEffect, useState } from 'react';
import { setRuntimeServiceablePincodes } from './serviceable-pincodes';

type PublicConfig = {
  googleMapsApiKey: string;
  serviceablePincodes: string[];
  includedDeliveryPincodes: string[];
};

let publicConfigPromise: Promise<PublicConfig> | null = null;

export function loadPublicConfig() {
  if (!publicConfigPromise) {
    publicConfigPromise = fetch('/api/public-config', { cache: 'no-store' })
      .then((response) => {
        if (!response.ok) {
          throw new Error('Could not load public app configuration.');
        }

        return response.json() as Promise<PublicConfig>;
      })
      .then((config) => {
        setRuntimeServiceablePincodes(config.serviceablePincodes ?? []);
        return config;
      });
  }

  return publicConfigPromise;
}

export function usePublicConfig() {
  const [config, setConfig] = useState<PublicConfig | null>(null);

  useEffect(() => {
    let cancelled = false;

    loadPublicConfig()
      .then((nextConfig) => {
        if (!cancelled) {
          setConfig(nextConfig);
        }
      })
      .catch(() => undefined);

    return () => {
      cancelled = true;
    };
  }, []);

  return config;
}
