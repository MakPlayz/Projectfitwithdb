import { NextResponse } from 'next/server';
import type { NextRequest } from 'next/server';
import { getRequestIp, isRateLimited } from '@/lib/rate-limit';
import {
  findUserByPhone,
  getWhatsAppVerifyToken,
  logWhatsAppMessage,
  sendFreeSampleContactInstructions,
  sendProgramPaymentInstructions,
  sendWhatsAppText,
  verifyMetaSignature,
} from '@/lib/whatsapp';
import {
  convertCheckoutIntentFromWhatsApp,
  findCheckoutCode,
  markFreeSampleDeliveryStatus,
} from '@/lib/checkout-intents';
import { supabaseRestFetch } from '@/lib/supabase-rest';
import type { WhatsAppMessageLog } from '@/lib/backend-types';

const whatsappDivider = '------------------------------';

function formatWebhookWhatsAppMessage(lines: Array<string | null | undefined | false>) {
  return lines
    .filter((line): line is string => line !== null && line !== undefined && line !== false)
    .join('\n');
}
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
          image?: {
            id?: string;
            caption?: string;
            mime_type?: string;
          };
          document?: {
            id?: string;
            caption?: string;
            filename?: string;
            mime_type?: string;
          };
          interactive?: {
            type?: string;
            button_reply?: {
              id?: string;
              title?: string;
            };
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

  let payload: WhatsAppWebhookPayload;
  try {
    payload = JSON.parse(rawBody) as WhatsAppWebhookPayload;
  } catch {
    return NextResponse.json({ error: 'Invalid JSON payload.' }, { status: 400 });
  }

  const changes = payload.entry?.flatMap((entry) => entry.changes ?? []) ?? [];
  const errors: string[] = [];

  for (const change of changes) {
    const messages = change.value?.messages ?? [];
    const statuses = change.value?.statuses ?? [];

    for (const statusUpdate of statuses) {
      const errorMessage = statusUpdate.errors
        ?.map((error) => error.message ?? error.title)
        .filter(Boolean)
        .join('; ');

      const result = await supabaseRestFetch<WhatsAppMessageLog[]>(
        `/whatsapp_message_logs?provider_message_id=eq.${encodeURIComponent(statusUpdate.id)}`,
        {
          method: 'PATCH',
          body: JSON.stringify({
            status: statusUpdate.status,
            error_message: errorMessage || null,
          }),
        }
      );

      if (result.error) {
        errors.push(`Could not update status ${statusUpdate.id}: ${result.error}`);
      }
    }

    for (const message of messages) {
      try {
        const buttonId = message.interactive?.button_reply?.id?.trim() ?? '';
        const buttonTitle = message.interactive?.button_reply?.title?.trim() ?? '';
        const body =
          message.text?.body?.trim() ||
          message.image?.caption?.trim() ||
          message.document?.caption?.trim() ||
          buttonTitle;
        const user = await findUserByPhone(message.from);

        await logWhatsAppMessage({
          userId: user?.id ?? null,
          phone: message.from,
          direction: 'incoming',
          messageType: message.type,
          messageBody: body || buttonId,
          status: 'received',
          providerMessageId: message.id,
          payload: message,
        });

        if (buttonId.startsWith('FREE_SAMPLE_RECEIVED:') || buttonId.startsWith('FREE_SAMPLE_NOT_RECEIVED:')) {
          const [action, orderId] = buttonId.split(':');
          if (!orderId) {
            await sendWhatsAppText(
              message.from,
              formatWebhookWhatsAppMessage([
                '*Project Fit Free Sample*',
                whatsappDivider,
                'We could not read that free sample response.',
                'Please contact the kitchen team and we will help you confirm the delivery.',
              ]),
              user?.id
            );
            continue;
          }

          const deliveryStatus = action === 'FREE_SAMPLE_RECEIVED' ? 'received' : 'not_received';
          const order = await markFreeSampleDeliveryStatus({
            orderId,
            status: deliveryStatus,
            payload: message,
          });

          await sendWhatsAppText(
            message.from,
            formatWebhookWhatsAppMessage([
              '*Project Fit Free Sample*',
              whatsappDivider,
              deliveryStatus === 'received'
                ? 'Thank you for confirming. We have marked your free sample as received.'
                : 'We have marked your free sample as not received.',
              `*Order ID:* ${order?.id ?? orderId}`,
              deliveryStatus === 'received'
                ? 'We hope you enjoy it.'
                : 'The kitchen team will check this and follow up with you.',
            ]),
            user?.id
          );
          continue;
        }

        const checkoutCode = findCheckoutCode(body);
        if (checkoutCode) {
          const result = await convertCheckoutIntentFromWhatsApp({
            code: checkoutCode,
            whatsappFrom: message.from,
            whatsappMessageId: message.id,
          });
          if (!result.order) {
            await sendWhatsAppText(message.from, result.message, user?.id);
            continue;
          }

          if (result.order.order_type === 'free_sample') {
            await sendFreeSampleContactInstructions(result.order);
          } else {
            await sendProgramPaymentInstructions(result.order);
          }
          continue;
        }
      } catch (error) {
        errors.push(
          `Could not process message ${message.id}: ${
            error instanceof Error ? error.message : 'Unknown error'
          }`
        );
      }
    }
  }

  return NextResponse.json({ received: true, errors });
}
