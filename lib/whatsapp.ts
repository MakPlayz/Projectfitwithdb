import { createHmac, timingSafeEqual } from 'node:crypto';
import { supabaseRestFetch } from '@/lib/supabase-rest';
import type {
  MealPlan,
  MenuItem,
  ProjectFitUser,
  WhatsAppMessageLog,
  WhatsAppMessageStatus,
} from '@/lib/backend-types';

const welcomeTemplateName = 'welcome_projectfit';

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
  await supabaseRestFetch<WhatsAppMessageLog[]>('/whatsapp_message_logs', {
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
        code: 'en',
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
    return 'Our menu is being updated. Please contact the kitchen for today\'s options.';
  }

  return [
    'ProjectFit Vizag Menu',
    ...items.map((item) => `${item.name}${item.description ? `\n${item.description}` : ''}`),
  ].join('\n\n');
}

export async function buildSpecialsReply() {
  const { data } = await supabaseRestFetch<MenuItem[]>(
    '/menu_items?active=eq.true&category=ilike.*special*&select=*&order=name.asc'
  );
  const items = data ?? [];

  if (items.length === 0) {
    return 'Today\'s specials are coming soon. Reply 1 to view the full menu.';
  }

  return [
    'Today\'s Specials',
    ...items.map((item) => `${item.name}${item.description ? `\n${item.description}` : ''}`),
  ].join('\n\n');
}

export async function buildMealPlansReply() {
  const { data } = await supabaseRestFetch<MealPlan[]>(
    '/meal_plans?active=eq.true&select=*&order=price.asc'
  );
  const plans = data ?? [];

  if (plans.length === 0) {
    return 'Meal plans are being updated. Please reply 4 to contact the kitchen.';
  }

  return [
    'Available Meal Plans',
    ...plans.map((plan) => `${plan.name} (${plan.duration})${plan.description ? `\n${plan.description}` : ''}`),
  ].join('\n\n');
}

export function buildKitchenContactReply() {
  return (
    process.env.WHATSAPP_KITCHEN_CONTACT_MESSAGE?.trim() ||
    'Contact ProjectFit Vizag Kitchen:\nPhone: +91 90000 00000\nHours: 8 AM - 9 PM'
  );
}

export async function buildBotReply(message: string) {
  switch (message.trim()) {
    case '1':
      return buildMenuReply();
    case '2':
      return buildSpecialsReply();
    case '3':
      return buildMealPlansReply();
    case '4':
      return buildKitchenContactReply();
    default:
      return 'Please reply with 1, 2, 3, or 4.';
  }
}
