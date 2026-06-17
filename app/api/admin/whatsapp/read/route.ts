import { NextResponse } from 'next/server';
import { requireAdminUser } from '@/lib/admin-auth';
import type { WhatsAppMessageLog } from '@/lib/backend-types';
import { supabaseRestFetch } from '@/lib/supabase-rest';
import { formatWhatsAppPhone, sendWhatsAppReadReceipt } from '@/lib/whatsapp';

type ReadBody = {
  phone?: string;
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

  const body = (await request.json()) as ReadBody;
  const phone = String(body.phone ?? '').trim();
  if (!phone) {
    return NextResponse.json({ error: 'Phone is required.' }, { status: 400 });
  }

  const phoneVariants = getPhoneVariants(phone);
  const unread = await supabaseRestFetch<WhatsAppMessageLog[]>(
    `/whatsapp_message_logs?phone=in.(${phoneVariants.map(encodeURIComponent).join(',')})&direction=eq.incoming&status=eq.received&select=*&order=created_at.asc`
  );

  if (unread.error) {
    return NextResponse.json({ error: unread.error }, { status: unread.status });
  }

  const messages = unread.data ?? [];
  await Promise.all(
    messages
      .map((message) => message.provider_message_id)
      .filter((messageId): messageId is string => Boolean(messageId))
      .map((messageId) => sendWhatsAppReadReceipt(messageId).catch(() => undefined))
  );

  if (messages.length > 0) {
    await supabaseRestFetch<WhatsAppMessageLog[]>(
      `/whatsapp_message_logs?id=in.(${messages.map((message) => encodeURIComponent(message.id)).join(',')})`,
      {
        method: 'PATCH',
        body: JSON.stringify({
          status: 'read',
        }),
      }
    );
  }

  return NextResponse.json({ markedRead: messages.length });
}
