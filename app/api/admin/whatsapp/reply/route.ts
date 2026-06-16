import { NextResponse } from 'next/server';
import { requireAdminUser } from '@/lib/admin-auth';
import { supabaseRestFetch } from '@/lib/supabase-rest';
import type { WhatsAppMessageLog } from '@/lib/backend-types';
import { formatWhatsAppPhone, sendAdminWhatsAppText } from '@/lib/whatsapp';

const WHATSAPP_REPLY_WINDOW_MS = 24 * 60 * 60 * 1000;

type ReplyBody = {
  phone?: string;
  message?: string;
  user_id?: string | null;
};

function getPhoneVariants(phone: string) {
  const formatted = formatWhatsAppPhone(phone) ?? phone.replace(/\D/g, '');
  const withoutCountry = formatted.startsWith('91') ? formatted.slice(2) : formatted;
  return Array.from(new Set([formatted, `+${formatted}`, withoutCountry].filter(Boolean)));
}

export async function POST(request: Request) {
  const admin = await requireAdminUser(request);
  if (admin.error) {
    return NextResponse.json({ error: admin.error }, { status: admin.status });
  }

  const body = (await request.json()) as ReplyBody;
  const phone = String(body.phone ?? '').trim();
  const message = String(body.message ?? '').trim();

  if (!phone) {
    return NextResponse.json({ error: 'Phone is required.' }, { status: 400 });
  }

  if (!message) {
    return NextResponse.json({ error: 'Message is required.' }, { status: 400 });
  }

  const phoneVariants = getPhoneVariants(phone);
  const lastIncoming = await supabaseRestFetch<WhatsAppMessageLog[]>(
    `/whatsapp_message_logs?phone=in.(${phoneVariants.map(encodeURIComponent).join(',')})&direction=eq.incoming&select=*&order=created_at.desc&limit=1`
  );

  if (lastIncoming.error) {
    return NextResponse.json({ error: lastIncoming.error }, { status: lastIncoming.status });
  }

  const latest = lastIncoming.data?.[0] ?? null;
  if (!latest) {
    return NextResponse.json({ error: 'No incoming WhatsApp message found for this customer.' }, { status: 400 });
  }

  const elapsedMs = Date.now() - new Date(latest.created_at).getTime();
  if (elapsedMs > WHATSAPP_REPLY_WINDOW_MS) {
    return NextResponse.json(
      { error: 'The 24-hour WhatsApp customer service window has expired. Ask the customer to message again first.' },
      { status: 400 }
    );
  }

  try {
    await sendAdminWhatsAppText(phone, message, body.user_id ?? latest.user_id);
  } catch (error) {
    return NextResponse.json(
      { error: error instanceof Error ? error.message : 'Could not send WhatsApp reply.' },
      { status: 502 }
    );
  }

  const latestMessages = await supabaseRestFetch<WhatsAppMessageLog[]>(
    `/whatsapp_message_logs?phone=in.(${phoneVariants.map(encodeURIComponent).join(',')})&select=*&order=created_at.desc&limit=50`
  );

  return NextResponse.json({
    sent: true,
    messages: latestMessages.error ? [] : latestMessages.data ?? [],
  });
}
