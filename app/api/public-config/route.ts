import { NextResponse } from 'next/server';
import { getServiceablePincodes, INCLUDED_DELIVERY_PINCODES } from '@/lib/serviceable-pincodes';

export async function GET() {
  return NextResponse.json(
    {
      googleMapsApiKey: process.env.NEXT_PUBLIC_GOOGLE_MAPS_API_KEY ?? '',
      serviceablePincodes: getServiceablePincodes(),
      includedDeliveryPincodes: INCLUDED_DELIVERY_PINCODES,
    },
    {
      headers: {
        'Cache-Control': 'no-store',
      },
    }
  );
}
