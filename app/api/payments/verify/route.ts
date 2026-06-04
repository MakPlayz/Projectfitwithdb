import { NextResponse } from 'next/server';
import { verifyRazorpaySignature } from '@/lib/razorpay';
import { supabaseRestFetch } from '@/lib/supabase-rest';
import type { ApiOrder } from '@/lib/backend-types';

interface VerifyPaymentBody {
  orderId?: string;
  razorpay_order_id?: string;
  razorpay_payment_id?: string;
  razorpay_signature?: string;
}

export async function POST(request: Request) {
  const body = (await request.json()) as VerifyPaymentBody;

  if (
    !body.orderId ||
    !body.razorpay_order_id ||
    !body.razorpay_payment_id ||
    !body.razorpay_signature
  ) {
    return NextResponse.json(
      { error: 'Payment verification details are required.' },
      { status: 400 }
    );
  }

  const orderResult = await supabaseRestFetch<ApiOrder[]>(
    `/orders?id=eq.${encodeURIComponent(body.orderId)}&select=*`
  );
  const order = orderResult.data?.[0] ?? null;

  if (orderResult.error) {
    return NextResponse.json(
      { error: orderResult.error },
      { status: orderResult.status || 500 }
    );
  }

  if (!order || order.razorpay_order_id !== body.razorpay_order_id) {
    return NextResponse.json(
      { error: 'Payment does not match this order.' },
      { status: 400 }
    );
  }

  const isValid = verifyRazorpaySignature({
    razorpayOrderId: body.razorpay_order_id,
    razorpayPaymentId: body.razorpay_payment_id,
    razorpaySignature: body.razorpay_signature,
  });

  if (!isValid) {
    await supabaseRestFetch<ApiOrder[]>(
      `/orders?id=eq.${encodeURIComponent(body.orderId)}`,
      {
        method: 'PATCH',
        body: JSON.stringify({ payment_status: 'failed' }),
      }
    );

    return NextResponse.json(
      { error: 'Payment verification failed.' },
      { status: 400 }
    );
  }

  const updateResult = await supabaseRestFetch<ApiOrder[]>(
    `/orders?id=eq.${encodeURIComponent(body.orderId)}`,
    {
      method: 'PATCH',
      body: JSON.stringify({
        payment_status: 'paid',
        razorpay_payment_id: body.razorpay_payment_id,
      }),
    }
  );

  if (updateResult.error) {
    return NextResponse.json(
      { error: updateResult.error },
      { status: updateResult.status || 500 }
    );
  }

  return NextResponse.json({ order: updateResult.data?.[0] ?? order });
}
