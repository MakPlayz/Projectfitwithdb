import { NextResponse } from 'next/server';
import type { NextRequest } from 'next/server';
import { getRequestIp, isRateLimited } from '@/lib/rate-limit';
import {
  buildBotReply,
  findUserByPhone,
  getWhatsAppVerifyToken,
  logWhatsAppMessage,
  sendWhatsAppText,
  verifyMetaSignature,
} from '@/lib/whatsapp';
import { supabaseRestFetch } from '@/lib/supabase-rest';
import type { WhatsAppMessageLog } from '@/lib/backend-types';

type WhatsAppWebhookPayload = {
  entry?: Array<{
    changes?: Array<{
      value?: {
        messages?: Array<{
          from: string;
          id: string;
          timestamp?: string;
          type: string;
          text?: {
            body?: string;
          };
        }>;
        statuses?: Array<{
          id: string;
          recipient_id?: string;
          status: 'sent' | 'delivered' | 'read' | 'failed';
          errors?: Array<{ message?: string; title?: string }>;
        }>;
      };
    }>;
  }>;
};

export async function GET(request: NextRequest) {
  const mode = request.nextUrl.searchParams.get('hub.mode');
  const token = request.nextUrl.searchParams.get('hub.verify_token');
  const challenge = request.nextUrl.searchParams.get('hub.challenge');

  if (mode === 'subscribe' && token === getWhatsAppVerifyToken() && challenge) {
    return new Response(challenge, { status: 200 });
  }

  return NextResponse.json({ error: 'Webhook verification failed.' }, { status: 403 });
}

export async function POST(request: Request) {
  if (isRateLimited(`whatsapp-webhook:${getRequestIp(request)}`, 120, 60_000)) {
    return NextResponse.json({ error: 'Rate limit exceeded.' }, { status: 429 });
  }

  const rawBody = await request.text();

  if (!verifyMetaSignature(rawBody, request.headers.get('x-hub-signature-256'))) {
    return NextResponse.json({ error: 'Invalid webhook signature.' }, { status: 401 });
  }

  const payload = JSON.parse(rawBody) as WhatsAppWebhookPayload;
  const changes = payload.entry?.flatMap((entry) => entry.changes ?? []) ?? [];

  for (const change of changes) {
    const messages = change.value?.messages ?? [];
    const statuses = change.value?.statuses ?? [];

    for (const statusUpdate of statuses) {
      const errorMessage = statusUpdate.errors
        ?.map((error) => error.message ?? error.title)
        .filter(Boolean)
        .join('; ');

      await supabaseRestFetch<WhatsAppMessageLog[]>(
        `/whatsapp_message_logs?provider_message_id=eq.${encodeURIComponent(statusUpdate.id)}`,
        {
          method: 'PATCH',
          body: JSON.stringify({
            status: statusUpdate.status,
            error_message: errorMessage || null,
          }),
        }
      );
    }

    for (const message of messages) {
      const body = message.text?.body?.trim() ?? '';
      const user = await findUserByPhone(message.from);

      await logWhatsAppMessage({
        userId: user?.id ?? null,
        phone: message.from,
        direction: 'incoming',
        messageType: message.type,
        messageBody: body,
        status: 'received',
        providerMessageId: message.id,
        payload: message,
      });

      if (!body) {
        await sendWhatsAppText(message.from, 'Please reply with 1, 2, 3, or 4.', user?.id);
        continue;
      }

      const reply = await buildBotReply(body);
      await sendWhatsAppText(message.from, reply, user?.id);
    }
  }

  return NextResponse.json({ received: true });
}
