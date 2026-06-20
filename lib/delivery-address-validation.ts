import type { DeliveryAddress } from './backend-types';
import { isDeliverablePincode } from './serviceable-pincodes';

type GeocodeAddressComponent = {
  long_name: string;
  types?: string[];
};

type GeocodeResponse = {
  status: string;
  results?: Array<{
    address_components?: GeocodeAddressComponent[];
  }>;
  error_message?: string;
};

function getGoogleMapsApiKey() {
  return (
    process.env.GOOGLE_MAPS_API_KEY ||
    process.env.NEXT_PUBLIC_GOOGLE_MAPS_API_KEY ||
    ''
  ).trim();
}

function addressComponent(components: GeocodeAddressComponent[], type: string) {
  return components.find((component) => component.types?.includes(type))?.long_name ?? '';
}

export async function validateAddressPincodeMatch(deliveryAddress: DeliveryAddress) {
  const apiKey = getGoogleMapsApiKey();

  if (!apiKey) {
    return { valid: true, error: null };
  }

  const query = [
    deliveryAddress.addressLine1,
    deliveryAddress.addressLine2,
    deliveryAddress.city,
    deliveryAddress.pincode,
    'Andhra Pradesh',
    'India',
  ]
    .filter(Boolean)
    .join(', ');

  const url = new URL('https://maps.googleapis.com/maps/api/geocode/json');
  url.searchParams.set('address', query);
  url.searchParams.set('region', 'in');
  url.searchParams.set('key', apiKey);

  try {
    const response = await fetch(url, { cache: 'no-store' });
    const data = (await response.json()) as GeocodeResponse;

    if (!response.ok || data.status === 'REQUEST_DENIED') {
      return { valid: true, error: null };
    }

    const postalCode = data.results
      ?.map((result) => addressComponent(result.address_components ?? [], 'postal_code'))
      .find(Boolean);

    if (postalCode && postalCode !== deliveryAddress.pincode) {
      if (isDeliverablePincode(postalCode) && isDeliverablePincode(deliveryAddress.pincode)) {
        return { valid: true, error: null };
      }

      return {
        valid: false,
        error: `The selected address appears to belong to pincode ${postalCode}, not ${deliveryAddress.pincode}. Please correct the area or pincode.`,
      };
    }
  } catch {
    return { valid: true, error: null };
  }

  return { valid: true, error: null };
}
