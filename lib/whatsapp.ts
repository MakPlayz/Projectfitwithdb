import { createHmac, timingSafeEqual } from 'node:crypto';
import { readFile } from 'node:fs/promises';
import path from 'node:path';
import { supabaseRestFetch } from '@/lib/supabase-rest';
import { getMealSlotsLabel } from '@/lib/meal-slots';
import type {
  ApiOrder,
  MealPlan,
  MenuItem,
  ProjectFitUser,
  WhatsAppMessageLog,
  WhatsAppMessageStatus,
} from '@/lib/backend-types';

const welcomeTemplateName = 'welcome_projectfit';
const remainingPaymentReminderTemplateName = 'remaining_payment_reminder_projectfit';
const projectFitManagerName = 'Lohit';
const projectFitManagerPhone = '+91 77990 66991';
const paymentQrPath = path.join(process.cwd(), 'public', 'payment-qr-scanner.jpeg');
const whatsappDivider = '------------------------------';


type WhatsAppMessageResponse = {
  messages?: Array<{ id: string }>;
  error?: {
    message?: string;
    error_user_msg?: string;
  };
};

function normalizeEnv(value: string | undefined) {
  return value?.trim().replace(/^['"]|['"]$/g, '');
}

function requireEnv(value: string | undefined, name: string) {
  const normalized = normalizeEnv(value);

  if (!normalized) {
    throw new Error(`Missing ${name}. Add it to your Vercel/local environment variables.`);
  }

  return normalized;
}

function getGraphApiVersion() {
  return normalizeEnv(process.env.WHATSAPP_GRAPH_API_VERSION) ?? 'v21.0';
}

function getWhatsAppAccessToken() {
  return requireEnv(process.env.WHATSAPP_ACCESS_TOKEN, 'WHATSAPP_ACCESS_TOKEN');
}

function getPhoneNumberId() {
  return requireEnv(process.env.WHATSAPP_PHONE_NUMBER_ID, 'WHATSAPP_PHONE_NUMBER_ID');
}

function getAppSecret() {
  return requireEnv(process.env.WHATSAPP_APP_SECRET, 'WHATSAPP_APP_SECRET');
}

export function getWhatsAppVerifyToken() {
  return requireEnv(process.env.WHATSAPP_VERIFY_TOKEN, 'WHATSAPP_VERIFY_TOKEN');
}

export function getInternalApiSecret() {
  return requireEnv(process.env.PROJECTFIT_INTERNAL_API_SECRET, 'PROJECTFIT_INTERNAL_API_SECRET');
}

export function getWelcomeTemplateName() {
  return welcomeTemplateName;
}

function getPaymentQrMediaId() {
  return normalizeEnv(process.env.WHATSAPP_PAYMENT_QR_MEDIA_ID);
}

function normalizePhoneForWaLink(value: string | undefined) {
  const digits = normalizeEnv(value)?.replace(/\D/g, '') ?? '';
  if (!digits) return null;
  return digits.startsWith('91') ? digits : `91${digits}`;
}

export async function getWhatsAppBusinessPhoneForLinks() {
  const configured =
    normalizePhoneForWaLink(process.env.WHATSAPP_BUSINESS_PHONE_NUMBER) ||
    normalizePhoneForWaLink(process.env.WHATSAPP_ORDER_PHONE_NUMBER);

  if (configured) {
    return configured;
  }

  const response = await fetch(
    `https://graph.facebook.com/${getGraphApiVersion()}/${getPhoneNumberId()}?fields=display_phone_number`,
    {
      headers: {
        Authorization: `Bearer ${getWhatsAppAccessToken()}`,
      },
      cache: 'no-store',
    }
  );
  const data = (await response.json()) as { display_phone_number?: string };

  if (!response.ok || !data.display_phone_number) {
    return normalizePhoneForWaLink(process.env.MY_NUMBER);
  }

  return normalizePhoneForWaLink(data.display_phone_number);
}

export function formatWhatsAppPhone(phone: string) {
  const trimmed = phone.trim();

  if (trimmed.startsWith('+')) {
    const digits = trimmed.slice(1).replace(/\D/g, '');
    return digits.length >= 10 && digits.length <= 15 ? digits : null;
  }

  const digits = trimmed.replace(/\D/g, '');

  if (/^[6-9]\d{9}$/.test(digits)) {
    return `91${digits}`;
  }

  if (/^91[6-9]\d{9}$/.test(digits)) {
    return digits;
  }

  return null;
}

export function verifyMetaSignature(rawBody: string, signatureHeader: string | null) {
  if (!signatureHeader?.startsWith('sha256=')) {
    return false;
  }

  const provided = signatureHeader.slice('sha256='.length);
  const expected = createHmac('sha256', getAppSecret()).update(rawBody).digest('hex');
  const providedBuffer = Buffer.from(provided, 'hex');
  const expectedBuffer = Buffer.from(expected, 'hex');

  return (
    providedBuffer.length === expectedBuffer.length &&
    timingSafeEqual(providedBuffer, expectedBuffer)
  );
}

async function sendWhatsAppPayload(payload: unknown) {
  const response = await fetch(
    `https://graph.facebook.com/${getGraphApiVersion()}/${getPhoneNumberId()}/messages`,
    {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${getWhatsAppAccessToken()}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(payload),
    }
  );
  const data = (await response.json()) as WhatsAppMessageResponse;

  if (!response.ok) {
    throw new Error(
      data.error?.error_user_msg ||
        data.error?.message ||
        `WhatsApp Cloud API failed with ${response.status}`
    );
  }

  return data.messages?.[0]?.id ?? null;
}

async function uploadWhatsAppMedia(filePath: string, mimeType: string) {
  const file = await readFile(filePath);
  const formData = new FormData();
  formData.append('messaging_product', 'whatsapp');
  formData.append('type', mimeType);
  formData.append('file', new Blob([file], { type: mimeType }), path.basename(filePath));

  const response = await fetch(
    `https://graph.facebook.com/${getGraphApiVersion()}/${getPhoneNumberId()}/media`,
    {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${getWhatsAppAccessToken()}`,
      },
      body: formData,
    }
  );
  const data = (await response.json()) as {
    id?: string;
    error?: {
      message?: string;
      error_user_msg?: string;
    };
  };

  if (!response.ok || !data.id) {
    throw new Error(
      data.error?.error_user_msg ||
        data.error?.message ||
        `WhatsApp media upload failed with ${response.status}`
    );
  }

  return data.id;
}

export async function logWhatsAppMessage(entry: {
  userId?: string | null;
  phone: string;
  direction: 'incoming' | 'outgoing';
  messageType: string;
  templateName?: string | null;
  messageBody?: string | null;
  status: WhatsAppMessageStatus;
  providerMessageId?: string | null;
  errorMessage?: string | null;
  payload?: unknown;
}) {
  const { error, status } = await supabaseRestFetch<WhatsAppMessageLog[]>('/whatsapp_message_logs', {
    method: 'POST',
    body: JSON.stringify({
      user_id: entry.userId ?? null,
      phone: entry.phone,
      direction: entry.direction,
      message_type: entry.messageType,
      template_name: entry.templateName ?? null,
      message_body: entry.messageBody ?? null,
      status: entry.status,
      provider_message_id: entry.providerMessageId ?? null,
      error_message: entry.errorMessage ?? null,
      payload: entry.payload ?? {},
    }),
  });

  if (error && status !== 404) {
    throw new Error(error);
  }
}

export async function sendWelcomeTemplate(user: ProjectFitUser) {
  if (!user.whatsapp_opt_in) {
    return { skipped: true, reason: 'User has not opted in.' };
  }

  const phone = formatWhatsAppPhone(user.phone);

  if (!phone) {
    await logWhatsAppMessage({
      userId: user.id,
      phone: user.phone,
      direction: 'outgoing',
      messageType: 'template',
      templateName: welcomeTemplateName,
      status: 'failed',
      errorMessage: 'Invalid WhatsApp phone number.',
    });
    return { skipped: true, reason: 'Invalid phone number.' };
  }

  const payload = {
    messaging_product: 'whatsapp',
    to: phone,
    type: 'template',
    template: {
      name: welcomeTemplateName,
      language: {
        code: 'en_US',
      },
    },
  };

  try {
    const providerMessageId = await sendWhatsAppPayload(payload);
    await logWhatsAppMessage({
      userId: user.id,
      phone,
      direction: 'outgoing',
      messageType: 'template',
      templateName: welcomeTemplateName,
      status: 'sent',
      providerMessageId,
      payload,
    });
    return { skipped: false, providerMessageId };
  } catch (error) {
    await logWhatsAppMessage({
      userId: user.id,
      phone,
      direction: 'outgoing',
      messageType: 'template',
      templateName: welcomeTemplateName,
      status: 'failed',
      errorMessage: error instanceof Error ? error.message : 'Could not send welcome template.',
      payload,
    });
    throw error;
  }
}

export async function sendWhatsAppText(phone: string, body: string, userId?: string | null) {
  const formattedPhone = formatWhatsAppPhone(phone) ?? phone;
  const payload = {
    messaging_product: 'whatsapp',
    recipient_type: 'individual',
    to: formattedPhone,
    type: 'text',
    text: {
      preview_url: false,
      body,
    },
  };

  try {
    const providerMessageId = await sendWhatsAppPayload(payload);
    await logWhatsAppMessage({
      userId,
      phone: formattedPhone,
      direction: 'outgoing',
      messageType: 'text',
      messageBody: body,
      status: 'sent',
      providerMessageId,
      payload,
    });
    return providerMessageId;
  } catch (error) {
    await logWhatsAppMessage({
      userId,
      phone: formattedPhone,
      direction: 'outgoing',
      messageType: 'text',
      messageBody: body,
      status: 'failed',
      errorMessage: error instanceof Error ? error.message : 'Could not send WhatsApp text.',
      payload,
    });
    throw error;
  }
}

export async function sendWhatsAppImage(
  phone: string,
  mediaId: string,
  caption?: string | null,
  userId?: string | null
) {
  const formattedPhone = formatWhatsAppPhone(phone) ?? phone;
  const payload = {
    messaging_product: 'whatsapp',
    recipient_type: 'individual',
    to: formattedPhone,
    type: 'image',
    image: {
      id: mediaId,
      ...(caption ? { caption } : {}),
    },
  };

  try {
    const providerMessageId = await sendWhatsAppPayload(payload);
    await logWhatsAppMessage({
      userId,
      phone: formattedPhone,
      direction: 'outgoing',
      messageType: 'image',
      messageBody: caption ?? null,
      status: 'sent',
      providerMessageId,
      payload,
    });
    return providerMessageId;
  } catch (error) {
    await logWhatsAppMessage({
      userId,
      phone: formattedPhone,
      direction: 'outgoing',
      messageType: 'image',
      messageBody: caption ?? null,
      status: 'failed',
      errorMessage: error instanceof Error ? error.message : 'Could not send WhatsApp image.',
      payload,
    });
    throw error;
  }
}

export async function downloadWhatsAppMedia(mediaId: string) {
  const metadataResponse = await fetch(
    `https://graph.facebook.com/${getGraphApiVersion()}/${encodeURIComponent(mediaId)}`,
    {
      headers: {
        Authorization: `Bearer ${getWhatsAppAccessToken()}`,
      },
      cache: 'no-store',
    }
  );
  const metadata = (await metadataResponse.json()) as {
    url?: string;
    mime_type?: string;
    error?: {
      message?: string;
      error_user_msg?: string;
    };
  };

  if (!metadataResponse.ok || !metadata.url) {
    throw new Error(
      metadata.error?.error_user_msg ||
        metadata.error?.message ||
        `Could not load WhatsApp media metadata with ${metadataResponse.status}`
    );
  }

  const mediaResponse = await fetch(metadata.url, {
    headers: {
      Authorization: `Bearer ${getWhatsAppAccessToken()}`,
    },
    cache: 'no-store',
  });

  if (!mediaResponse.ok) {
    throw new Error(`Could not download WhatsApp media with ${mediaResponse.status}`);
  }

  return {
    bytes: await mediaResponse.arrayBuffer(),
    contentType: metadata.mime_type || mediaResponse.headers.get('content-type') || 'application/octet-stream',
  };
}

export async function sendWhatsAppReadReceipt(messageId: string) {
  const payload = {
    messaging_product: 'whatsapp',
    status: 'read',
    message_id: messageId,
  };

  await sendWhatsAppPayload(payload);
}

export async function sendFreeSampleApprovalButtons(phone: string, orderId: string, userId?: string | null) {
  const formattedPhone = formatWhatsAppPhone(phone) ?? phone;
  const body = formatWhatsAppMessage([
    '*Project Fit Free Sample*',
    whatsappDivider,
    'Your free sample delivery request has been accepted.',
    '',
    '*Next step*',
    '- Please confirm after the sample reaches you.',
    '- Tap one option below so our delivery record stays accurate.',
    '',
    'We will be here if you need any help.',
  ]);
  const payload = {
    messaging_product: 'whatsapp',
    recipient_type: 'individual',
    to: formattedPhone,
    type: 'interactive',
    interactive: {
      type: 'button',
      body: {
        text: body,
      },
      action: {
        buttons: [
          {
            type: 'reply',
            reply: {
              id: `FREE_SAMPLE_RECEIVED:${orderId}`,
              title: 'Delivery received',
            },
          },
          {
            type: 'reply',
            reply: {
              id: `FREE_SAMPLE_NOT_RECEIVED:${orderId}`,
              title: 'Not received',
            },
          },
        ],
      },
    },
  };

  try {
    const providerMessageId = await sendWhatsAppPayload(payload);
    await logWhatsAppMessage({
      userId,
      phone: formattedPhone,
      direction: 'outgoing',
      messageType: 'interactive',
      messageBody: body,
      status: 'sent',
      providerMessageId,
      payload,
    });
    return providerMessageId;
  } catch (error) {
    await logWhatsAppMessage({
      userId,
      phone: formattedPhone,
      direction: 'outgoing',
      messageType: 'interactive',
      messageBody: body,
      status: 'failed',
      errorMessage: error instanceof Error ? error.message : 'Could not send free sample approval buttons.',
      payload,
    });
    throw error;
  }
}
function formatWhatsAppMessage(lines: Array<string | null | undefined | false>) {
  return lines
    .filter((line): line is string => line !== null && line !== undefined && line !== false)
    .join('\n');
}
function formatMoney(amount: number | null | undefined) {
  return `Rs ${(amount ?? 0).toLocaleString('en-IN')}`;
}

function formatOrderDate(value: string | null | undefined) {
  if (!value) return 'Not selected';
  return new Date(value).toLocaleDateString('en-IN', {
    day: '2-digit',
    month: 'short',
    year: 'numeric',
  });
}

function getPrimaryOrderItem(order: ApiOrder) {
  return order.items[0]?.name ?? 'Project Fit plan';
}

function getOrderMealSlotLine(order: ApiOrder) {
  const slots = order.items.map((item) => getMealSlotsLabel(item)).filter(Boolean).join(' | ');
  return slots ? `Meal timings: ${slots.replace(/^Meal slots:\s*/i, '')}` : null;
}

export async function sendProgramPaymentInstructions(order: ApiOrder) {
  const phone = order.delivery_address.phone;
  const amountDue = order.payment_option === 'half' ? order.initial_payment_amount : order.total;
  const paymentLines =
    order.payment_option === 'half'
      ? [
          `*Amount due now:* ${formatMoney(amountDue)}`,
          `*Remaining payment after plan starts:* ${formatMoney(order.remaining_payment_amount)}`,
        ]
      : [`*Amount due now:* ${formatMoney(amountDue)}`];

  await sendWhatsAppText(
    phone,
    formatWhatsAppMessage([
      '*Project Fit Payment Instructions*',
      whatsappDivider,
      `Thank you for choosing *${getPrimaryOrderItem(order)}*.`,
      'Your order has been created and is ready for payment verification.',
      '',
      `*Order ID:* ${order.id}`,
      ...paymentLines,
      '',
      '*Before you pay*',
      `- Please speak with ${projectFitManagerName}, Project Fit manager, for quick plan activation.`,
      `- Manager phone: ${projectFitManagerPhone}`,
      '- Use the QR scanner sent below.',
      '- After paying, reply here with your name, transaction ID, and payment screenshot.',
      '',
      'We will review it carefully and update you here.',
    ]),
    order.user_id
  );

  const mediaId = getPaymentQrMediaId() ?? await uploadWhatsAppMedia(paymentQrPath, 'image/jpeg');
  await sendWhatsAppImage(
    phone,
    mediaId,
    formatWhatsAppMessage([
      '*Project Fit Payment QR*',
      `*Order ID:* ${order.id}`,
      `*Amount due now:* ${formatMoney(amountDue)}`,
    ]),
    order.user_id
  );
}
export async function sendFreeSampleContactInstructions(order: ApiOrder) {
  return sendWhatsAppText(
    order.delivery_address.phone,
    formatWhatsAppMessage([
      '*Project Fit Free Sample*',
      whatsappDivider,
      'Your free sample request has been created.',
      `*Order ID:* ${order.id}`,
      '',
      '*Next step*',
      `- Please contact ${projectFitManagerName}, Project Fit manager, to confirm your free sample delivery.`,
      `- Manager phone: ${projectFitManagerPhone}`,
      '',
      'The chef team will review the request and update you here.',
    ]),
    order.user_id
  );
}
export async function sendPlanActivatedMessage(order: ApiOrder) {
  const paymentLine =
    order.payment_option === 'half'
      ? `*First payment received:* ${formatMoney(order.initial_payment_amount)}. *Remaining payment:* ${formatMoney(order.remaining_payment_amount)} due on ${formatOrderDate(order.remaining_payment_due_at)}.`
      : `*Payment received:* ${formatMoney(order.total)}.`;

  return sendWhatsAppText(
    order.delivery_address.phone,
    formatWhatsAppMessage([
      '*Project Fit Plan Activated*',
      whatsappDivider,
      'Your meal plan has been activated.',
      '',
      `*Order ID:* ${order.id}`,
      `*Plan:* ${getPrimaryOrderItem(order)}`,
      getOrderMealSlotLine(order),
      `*Start date:* ${formatOrderDate(order.plan_activated_at ?? order.requested_start_date)}`,
      paymentLine,
      '',
      'Your meals are now scheduled. We will keep you updated here.',
    ]),
    order.user_id
  );
}
export async function sendRemainingPaymentConfirmedMessage(order: ApiOrder) {
  return sendWhatsAppText(
    order.delivery_address.phone,
    formatWhatsAppMessage([
      '*Project Fit Payment Confirmed*',
      whatsappDivider,
      'Your remaining payment has been confirmed.',
      '',
      `*Order ID:* ${order.id}`,
      `*Plan:* ${getPrimaryOrderItem(order)}`,
      getOrderMealSlotLine(order),
      '',
      'Your monthly plan is now fully paid. Thank you for completing the payment.',
    ]),
    order.user_id
  );
}
export async function sendPlanStoppedMidwayMessage(order: ApiOrder) {
  return sendWhatsAppText(
    order.delivery_address.phone,
    formatWhatsAppMessage([
      '*Project Fit Plan Update*',
      whatsappDivider,
      'Your monthly plan has been closed.',
      '',
      `*Order ID:* ${order.id}`,
      order.completion_reason || 'The plan was ended after the first half of service days.',
      '',
      'If you need any clarification, reply here and our team will help.',
    ]),
    order.user_id
  );
}
export async function sendOrderCancellationMessage(order: ApiOrder) {
  const reason = order.cancellation_reason?.trim();
  const title = order.order_type === 'free_sample'
    ? 'Your free sample delivery request has been cancelled.'
    : 'Your Project Fit plan request has been cancelled.';

  return sendWhatsAppText(
    order.delivery_address.phone,
    formatWhatsAppMessage([
      '*Project Fit Order Update*',
      whatsappDivider,
      title,
      reason ? `*Reason:* ${reason}` : null,
      '',
      'If this does not look right, reply here and our team will help you.',
    ]),
    order.user_id
  );
}
export async function sendRemainingPaymentReminderTemplate(order: ApiOrder) {
  const formattedPhone = formatWhatsAppPhone(order.delivery_address.phone) ?? order.delivery_address.phone;
  const payload = {
    messaging_product: 'whatsapp',
    to: formattedPhone,
    type: 'template',
    template: {
      name: remainingPaymentReminderTemplateName,
      language: {
        code: 'en_US',
      },
      components: [
        {
          type: 'body',
          parameters: [
            { type: 'text', text: order.customer_name || 'Project Fit customer' },
            { type: 'text', text: String(order.remaining_payment_amount) },
            { type: 'text', text: order.id },
            { type: 'text', text: formatOrderDate(order.remaining_payment_due_at) },
          ],
        },
      ],
    },
  };

  try {
    const providerMessageId = await sendWhatsAppPayload(payload);
    await logWhatsAppMessage({
      userId: order.user_id,
      phone: formattedPhone,
      direction: 'outgoing',
      messageType: 'template',
      templateName: remainingPaymentReminderTemplateName,
      status: 'sent',
      providerMessageId,
      payload,
    });
    return providerMessageId;
  } catch (error) {
    await logWhatsAppMessage({
      userId: order.user_id,
      phone: formattedPhone,
      direction: 'outgoing',
      messageType: 'template',
      templateName: remainingPaymentReminderTemplateName,
      status: 'failed',
      errorMessage: error instanceof Error ? error.message : 'Could not send remaining payment reminder.',
      payload,
    });
    throw error;
  }
}

export async function sendAdminWhatsAppText(phone: string, body: string, userId?: string | null) {
  const message = body.trim();

  if (!message) {
    throw new Error('Message is required.');
  }

  return sendWhatsAppText(phone, message, userId);
}

export async function findUserByPhone(phone: string) {
  const formattedPhone = formatWhatsAppPhone(phone);

  if (!formattedPhone) {
    return null;
  }

  const possiblePhones = [
    formattedPhone,
    `+${formattedPhone}`,
    formattedPhone.startsWith('91') ? formattedPhone.slice(2) : formattedPhone,
  ];
  const { data } = await supabaseRestFetch<ProjectFitUser[]>(
    `/users?phone=in.(${possiblePhones.map(encodeURIComponent).join(',')})&select=*&limit=1`
  );

  return data?.[0] ?? null;
}

export async function buildMenuReply() {
  const { data } = await supabaseRestFetch<MenuItem[]>(
    '/menu_items?active=eq.true&select=*&order=category.asc,name.asc'
  );
  const items = data ?? [];

  if (items.length === 0) {
    return formatWhatsAppMessage([
      '*ProjectFit Vizag Menu*',
      whatsappDivider,
      'Our menu is being updated.',
      'Please contact the kitchen for today\'s options.',
    ]);
  }

  return formatWhatsAppMessage([
    '*ProjectFit Vizag Menu*',
    whatsappDivider,
    ...items.map((item) => `*${item.name}*${item.description ? `\n${item.description}` : ''}`),
  ]);
}
export async function buildSpecialsReply() {
  const { data } = await supabaseRestFetch<MenuItem[]>(
    '/menu_items?active=eq.true&category=ilike.*special*&select=*&order=name.asc'
  );
  const items = data ?? [];

  if (items.length === 0) {
    return formatWhatsAppMessage([
      '*Today\'s Specials*',
      whatsappDivider,
      'Specials are being updated for today.',
      'Reply 1 to view the full menu or contact the kitchen for help.',
    ]);
  }

  return formatWhatsAppMessage([
    '*Today\'s Specials*',
    whatsappDivider,
    ...items.map((item) => `*${item.name}*${item.description ? `\n${item.description}` : ''}`),
  ]);
}
export async function buildMealPlansReply() {
  const { data } = await supabaseRestFetch<MealPlan[]>(
    '/meal_plans?active=eq.true&select=*&order=price.asc'
  );
  const plans = data ?? [];

  if (plans.length === 0) {
    return formatWhatsAppMessage([
      '*Project Fit Meal Plans*',
      whatsappDivider,
      'Meal plans are being updated.',
      'Please reply 4 to contact the kitchen team.',
    ]);
  }

  return formatWhatsAppMessage([
    '*Project Fit Meal Plans*',
    whatsappDivider,
    ...plans.map((plan) => `*${plan.name}* (${plan.duration})${plan.description ? `\n${plan.description}` : ''}`),
  ]);
}
export function buildKitchenContactReply() {
  return (
    process.env.WHATSAPP_KITCHEN_CONTACT_MESSAGE?.trim() ||
    formatWhatsAppMessage([
      '*ProjectFit Vizag Kitchen*',
      whatsappDivider,
      '*Phone:* +91 90000 00000',
      '*Hours:* 8 AM - 9 PM',
      '',
      'Reply here and our team will help you with orders, plans, or delivery questions.',
    ])
  );
}