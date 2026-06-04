import { createHmac } from 'node:crypto';

interface RazorpayOrderRequest {
  amount: number;
  currency: 'INR';
  receipt: string;
  notes?: Record<string, string>;
}

interface RazorpayOrder {
  id: string;
  entity: 'order';
  amount: number;
  amount_paid: number;
  amount_due: number;
  currency: string;
  receipt: string;
  status: string;
  attempts: number;
  notes: Record<string, string>;
  created_at: number;
}

function normalizeEnv(value: string | undefined) {
  return value?.trim().replace(/^['"]|['"]$/g, '');
}

export function getRazorpayKeyId() {
  const keyId = normalizeEnv(process.env.NEXT_PUBLIC_RAZORPAY_KEY_ID);

  if (!keyId) {
    throw new Error('Missing NEXT_PUBLIC_RAZORPAY_KEY_ID. Add it to your Vercel/local environment variables.');
  }

  return keyId;
}

function getRazorpayKeySecret() {
  const keySecret = normalizeEnv(process.env.RAZORPAY_KEY_SECRET);

  if (!keySecret) {
    throw new Error('Missing RAZORPAY_KEY_SECRET. Add it to your Vercel/local environment variables.');
  }

  return keySecret;
}

export async function createRazorpayOrder(payload: RazorpayOrderRequest) {
  const credentials = Buffer.from(`${getRazorpayKeyId()}:${getRazorpayKeySecret()}`).toString('base64');
  const response = await fetch('https://api.razorpay.com/v1/orders', {
    method: 'POST',
    headers: {
      Authorization: `Basic ${credentials}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify(payload),
  });

  const data = await response.json();

  if (!response.ok) {
    const message =
      data?.error?.description ||
      data?.error?.reason ||
      `Razorpay order creation failed with ${response.status}`;
    throw new Error(message);
  }

  return data as RazorpayOrder;
}

export function verifyRazorpaySignature({
  razorpayOrderId,
  razorpayPaymentId,
  razorpaySignature,
}: {
  razorpayOrderId: string;
  razorpayPaymentId: string;
  razorpaySignature: string;
}) {
  const expectedSignature = createHmac('sha256', getRazorpayKeySecret())
    .update(`${razorpayOrderId}|${razorpayPaymentId}`)
    .digest('hex');

  return expectedSignature === razorpaySignature;
}
