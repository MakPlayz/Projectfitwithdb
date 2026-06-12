'use client';

import { useEffect, useRef, useState } from 'react';
import { LocateFixed, MapPin, X } from 'lucide-react';
import type { DeliveryAddress } from '@/lib/backend-types';
import { isServiceablePincode } from '@/lib/serviceable-pincodes';
import { loadPublicConfig, usePublicConfig } from '@/lib/use-public-config';
import DeliveryAreaNotice from './DeliveryAreaNotice';
import styles from './LocationPickerModal.module.css';

type SelectedAddress = Pick<
  DeliveryAddress,
  'addressLine1' | 'addressLine2' | 'city' | 'pincode' | 'latitude' | 'longitude'
>;

interface LocationPickerModalProps {
  initialLocation?: { latitude?: number; longitude?: number };
  onCancel: () => void;
  onSelect: (address: SelectedAddress) => void;
}

type LatLngLiteral = { lat: number; lng: number };
type LatLngBoundsLiteral = { north: number; south: number; east: number; west: number };
type ListenerTarget = {
  addListener(eventName: string, handler: (event?: MapMouseEvent) => void): void;
};
type LatLngValue = {
  lat(): number;
  lng(): number;
};
type MapMouseEvent = {
  latLng?: LatLngValue;
};
type AddressComponent = {
  long_name: string;
  types?: string[];
};
type GeocodeResult = {
  address_components?: AddressComponent[];
  formatted_address?: string;
  geometry?: {
    location?: LatLngValue;
    viewport?: unknown;
  };
};
type GoogleMapsLike = {
  maps: {
    Geocoder: new () => {
      geocode(
        request: { location: LatLngLiteral },
        callback: (results: GeocodeResult[] | null, status: string) => void
      ): void;
    };
    Map: new (
      element: HTMLElement,
      options: {
        center: LatLngLiteral;
        zoom: number;
        restriction: {
          latLngBounds: LatLngBoundsLiteral;
          strictBounds: boolean;
        };
        clickableIcons: boolean;
        mapTypeControl: boolean;
        streetViewControl: boolean;
        fullscreenControl: boolean;
        zoomControl: boolean;
      }
    ) => ListenerTarget & {
      setCenter(position: LatLngLiteral): void;
      fitBounds(bounds: unknown): void;
    };
    Marker: new (options: {
      position: LatLngLiteral;
      map: unknown;
      draggable: boolean;
    }) => ListenerTarget & {
      setPosition(position: LatLngLiteral): void;
    };
    places?: {
      Autocomplete: new (
        input: HTMLInputElement,
        options: {
          bounds: LatLngBoundsLiteral;
          componentRestrictions: { country: string };
          fields: string[];
          strictBounds: boolean;
          types: string[];
        }
      ) => ListenerTarget & {
        getPlace(): GeocodeResult;
      };
    };
  };
};

declare global {
  interface Window {
    google?: GoogleMapsLike;
    __projectFitGoogleMapsPromise?: Promise<void>;
  }
}

const defaultCenter = { lat: 17.6868, lng: 83.2185 };
const vizagBounds = {
  north: 17.95,
  south: 17.55,
  east: 83.45,
  west: 82.95,
};

function loadGoogleMaps() {
  const bundledApiKey = process.env.NEXT_PUBLIC_GOOGLE_MAPS_API_KEY;

  if (window.google?.maps) {
    return Promise.resolve();
  }

  if (window.__projectFitGoogleMapsPromise) {
    return window.__projectFitGoogleMapsPromise;
  }

  window.__projectFitGoogleMapsPromise = loadPublicConfig().then((config) => new Promise<void>((resolve, reject) => {
    const apiKey = bundledApiKey || config.googleMapsApiKey;

    if (!apiKey) {
      reject(new Error('Google Maps API key is not configured.'));
      return;
    }

    const existing = document.querySelector<HTMLScriptElement>('script[data-projectfit-google-maps]');
    if (existing) {
      existing.addEventListener('load', () => resolve(), { once: true });
      existing.addEventListener('error', () => reject(new Error('Could not load Google Maps.')), { once: true });
      return;
    }

    const script = document.createElement('script');
    script.src = `https://maps.googleapis.com/maps/api/js?key=${encodeURIComponent(apiKey)}&libraries=places`;
    script.async = true;
    script.defer = true;
    script.dataset.projectfitGoogleMaps = 'true';
    script.onload = () => resolve();
    script.onerror = () => reject(new Error('Could not load Google Maps.'));
    document.head.appendChild(script);
  }));

  return window.__projectFitGoogleMapsPromise;
}

function componentValue(components: AddressComponent[], type: string) {
  return components.find((component) => component.types?.includes(type))?.long_name ?? '';
}

function parseGeocodeResult(result: GeocodeResult, lat: number, lng: number): SelectedAddress {
  const components = result?.address_components ?? [];
  const streetNumber = componentValue(components, 'street_number');
  const route = componentValue(components, 'route');
  const sublocality =
    componentValue(components, 'sublocality_level_1') ||
    componentValue(components, 'sublocality') ||
    componentValue(components, 'neighborhood');
  const city =
    componentValue(components, 'locality') ||
    componentValue(components, 'administrative_area_level_3') ||
    componentValue(components, 'administrative_area_level_2');
  const pincode = componentValue(components, 'postal_code');

  return {
    addressLine1:
      [streetNumber, route, sublocality].filter(Boolean).join(', ') ||
      result?.formatted_address ||
      '',
    addressLine2: result?.formatted_address ?? '',
    city,
    pincode,
    latitude: lat,
    longitude: lng,
  };
}

export default function LocationPickerModal({
  initialLocation,
  onCancel,
  onSelect,
}: LocationPickerModalProps) {
  usePublicConfig();

  const mapRef = useRef<HTMLDivElement | null>(null);
  const searchRef = useRef<HTMLInputElement | null>(null);
  const mapInstance = useRef<InstanceType<GoogleMapsLike['maps']['Map']> | null>(null);
  const markerRef = useRef<InstanceType<GoogleMapsLike['maps']['Marker']> | null>(null);
  const geocoderRef = useRef<InstanceType<GoogleMapsLike['maps']['Geocoder']> | null>(null);
  const autocompleteRef = useRef<(ListenerTarget & { getPlace(): GeocodeResult }) | null>(null);
  const [status, setStatus] = useState('Loading map...');
  const [selected, setSelected] = useState<SelectedAddress | null>(null);
  const [isLocating, setIsLocating] = useState(false);
  const isSelectedServiceable = selected?.pincode ? isServiceablePincode(selected.pincode) : true;

  const setPoint = (lat: number, lng: number) => {
    if (!window.google?.maps || !mapInstance.current || !markerRef.current || !geocoderRef.current) {
      return;
    }

    const position = { lat, lng };
    mapInstance.current.setCenter(position);
    markerRef.current.setPosition(position);
    setStatus('Reading address...');

    geocoderRef.current.geocode({ location: position }, (results, geocodeStatus) => {
      if (geocodeStatus !== 'OK' || !results?.[0]) {
        setSelected({
          addressLine1: '',
          addressLine2: '',
          city: '',
          pincode: '',
          latitude: lat,
          longitude: lng,
        });
        setStatus('Location selected. Please complete the address manually.');
        return;
      }

      const nextAddress = parseGeocodeResult(results[0], lat, lng);
      setSelected(nextAddress);
      if (!nextAddress.pincode) {
        setStatus('Location selected. Please enter pincode manually.');
      } else if (!isServiceablePincode(nextAddress.pincode)) {
        setStatus('Location selected. Additional delivery charges may apply for this area.');
      } else {
        setStatus('Location selected.');
      }
    });
  };

  const useCurrentLocation = () => {
    setStatus('');

    if (!navigator.geolocation) {
      setStatus('Location access is not available. Select on the map or enter manually.');
      return;
    }

    setIsLocating(true);
    navigator.geolocation.getCurrentPosition(
      (position) => {
        setPoint(position.coords.latitude, position.coords.longitude);
        setIsLocating(false);
      },
      () => {
        setStatus('Could not access your location. Select on the map or enter manually.');
        setIsLocating(false);
      },
      { enableHighAccuracy: true, timeout: 10000 }
    );
  };

  useEffect(() => {
    let cancelled = false;

    loadGoogleMaps()
      .then(() => {
        if (cancelled || !mapRef.current || !window.google?.maps) return;

        const center =
          typeof initialLocation?.latitude === 'number' && typeof initialLocation.longitude === 'number'
            ? { lat: initialLocation.latitude, lng: initialLocation.longitude }
            : defaultCenter;

        geocoderRef.current = new window.google.maps.Geocoder();
        mapInstance.current = new window.google.maps.Map(mapRef.current, {
          center,
          zoom: 15,
          restriction: {
            latLngBounds: vizagBounds,
            strictBounds: false,
          },
          clickableIcons: false,
          mapTypeControl: false,
          streetViewControl: false,
          fullscreenControl: false,
          zoomControl: true,
        });
        markerRef.current = new window.google.maps.Marker({
          position: center,
          map: mapInstance.current,
          draggable: true,
        });

        mapInstance.current.addListener('click', (event) => {
          if (event?.latLng) {
            setPoint(event.latLng.lat(), event.latLng.lng());
          }
        });

        markerRef.current.addListener('dragend', (event) => {
          if (event?.latLng) {
            setPoint(event.latLng.lat(), event.latLng.lng());
          }
        });

        if (searchRef.current && window.google.maps.places) {
          autocompleteRef.current = new window.google.maps.places.Autocomplete(searchRef.current, {
            bounds: vizagBounds,
            componentRestrictions: { country: 'in' },
            fields: ['address_components', 'formatted_address', 'geometry', 'name'],
            strictBounds: false,
            types: ['geocode', 'establishment'],
          });

          autocompleteRef.current.addListener('place_changed', () => {
            const place = autocompleteRef.current?.getPlace();
            const location = place?.geometry?.location;

            if (!location) {
              setStatus('Select a full address from the suggestions.');
              return;
            }

            if (place.geometry?.viewport && mapInstance.current) {
              mapInstance.current.fitBounds(place.geometry.viewport);
            }

            setPoint(location.lat(), location.lng());
          });
        }

        setPoint(center.lat, center.lng);
      })
      .catch((error) => {
        if (!cancelled) {
          setStatus(error instanceof Error ? error.message : 'Could not load map.');
        }
      });

    return () => {
      cancelled = true;
    };
  }, [initialLocation?.latitude, initialLocation?.longitude]);

  return (
    <div className={styles.overlay} onClick={onCancel}>
      <div className={styles.modal} onClick={(event) => event.stopPropagation()}>
        <div className={styles.header}>
          <div>
            <h3>Select delivery location</h3>
            <p>Click the map, drag the pin, or use your current location.</p>
          </div>
          <button type="button" className={styles.iconBtn} onClick={onCancel} aria-label="Close map">
            <X size={20} />
          </button>
        </div>

        <div className={styles.mapWrap}>
          <div className={styles.searchPanel}>
            <MapPin size={17} />
            <input
              ref={searchRef}
              type="text"
              placeholder="Search building, street, area or landmark"
              autoComplete="off"
            />
          </div>
          <div ref={mapRef} className={styles.map} />
        </div>

        <div className={styles.footer}>
          <div className={styles.selected}>
            <MapPin size={17} />
            <span>
              {selected?.addressLine1 || status || 'Select a location on the map'}
              {selected?.pincode ? ` · ${selected.pincode}` : ''}
            </span>
          </div>
          {selected?.pincode && !isSelectedServiceable && (
            <DeliveryAreaNotice compact />
          )}
          {status && <p className={styles.status}>{status}</p>}
          <div className={styles.actions}>
            <button type="button" className={styles.secondaryBtn} onClick={useCurrentLocation} disabled={isLocating}>
              <LocateFixed size={16} />
              {isLocating ? 'Locating...' : 'Current location'}
            </button>
            <button type="button" className={styles.secondaryBtn} onClick={onCancel}>
              Enter manually
            </button>
            <button
              type="button"
              className="btn-primary"
              onClick={() => selected && onSelect(selected)}
              disabled={!selected}
            >
              Use this address
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
