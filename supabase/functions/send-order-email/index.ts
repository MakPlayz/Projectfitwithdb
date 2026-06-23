declare const Deno: {
  env: {
    get(key: string): string | undefined;
  };
  serve(handler: (req: Request) => Response | Promise<Response>): void;
};

export {};

type CartItem = {
  id?: string;
  name?: string;
  price?: number;
  quantity?: number;
  planId?: string;
  programSlug?: string;
  mealSlots?: string[];
};

type DeliveryAddress = {
  addressLine1?: string;
  addressLine2?: string;
  city?: string;
  pincode?: string;
  phone?: string;
};

type OrderEmailRequest = {
  mode?: 'confirmation' | 'invoice';
  email?: string;
  customerName?: string | null;
  order?: {
    id: string;
    items: CartItem[];
    subtotal: number;
    tax: number;
    total: number;
    payment_option: 'full' | 'half';
    payment_stage: string;
    initial_payment_amount: number;
    remaining_payment_amount: number;
    remaining_payment_due_at: string | null;
    delivery_address: DeliveryAddress;
    requested_start_date: string | null;
    plan_activated_at: string | null;
    plan_expires_at: string | null;
    confirmed_at: string | null;
    payment_transaction_id: string | null;
  };
  invoice?: {
    invoice_number: string;
    amount_paid: number;
    balance_due: number;
    issued_at: string;
    pdf_filename?: string | null;
  };
};

const RESEND_API_KEY = Deno.env.get('RESEND_API_KEY');
const SERVICE_ROLE_KEYS = [
  Deno.env.get('PROJECTFIT_SERVICE_ROLE_KEY'),
  Deno.env.get('SUPABASE_SERVICE_ROLE_KEY'),
].filter((value): value is string => Boolean(value));
const FROM = 'Project Fit Vizag <noreply@projectfitvizag.com>';
const SUPPORT_EMAIL = 'projectfitvizag@gmail.com';
const SUPPORT_PHONE = '7799066991';
const SITE_URL = 'https://www.projectfitvizag.com';
const LOGO_URL = `${SITE_URL}/images/projectfit-logo.png`;

function json(body: unknown, status = 200) {
  return new Response(JSON.stringify(body), {
    status,
    headers: { 'Content-Type': 'application/json' },
  });
}

function escapeHtml(value: string | number | null | undefined) {
  return String(value ?? '')
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#039;');
}

function formatRupees(value: number | null | undefined) {
  const amount = Number.isFinite(value) ? Number(value) : 0;
  return `Rs. ${amount.toLocaleString('en-IN')}`;
}

function formatDate(value: string | null | undefined) {
  if (!value) return 'Not set';
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return value;
  return date.toLocaleDateString('en-IN', {
    day: '2-digit',
    month: 'short',
    year: 'numeric',
  });
}

function getPlainItems(items: CartItem[]) {
  if (!Array.isArray(items) || items.length === 0) return ['Meal plan'];
  return items.map((item) => {
    const quantity = Number(item.quantity ?? 1);
    const price = Number(item.price ?? 0);
    const slots = Array.isArray(item.mealSlots) && item.mealSlots.length > 0
      ? ` (${item.mealSlots.join(', ')})`
      : '';
    return `${item.name || 'Meal plan'}${slots} x ${quantity} - ${formatRupees(price * quantity)}`;
  });
}

function buildShell(title: string, preview: string, body: string) {
  return `<!DOCTYPE html>
<html>
  <body style="margin:0; background:#f3f6ef; font-family:Arial, sans-serif; color:#172016;">
    <div style="display:none; max-height:0; overflow:hidden;">${escapeHtml(preview)}</div>
    <table role="presentation" width="100%" cellspacing="0" cellpadding="0" style="background:#f3f6ef; padding:24px 12px;">
      <tr>
        <td align="center">
          <table role="presentation" width="100%" cellspacing="0" cellpadding="0" style="max-width:680px; background:#ffffff; border:1px solid #dfe8d6; border-radius:18px; overflow:hidden;">
            <tr>
              <td style="padding:26px 30px; background:#15351f;">
                <img src="${LOGO_URL}" alt="Project Fit" width="108" style="display:block; margin-bottom:18px;">
                <h1 style="margin:0; color:#ffffff; font-size:28px; line-height:1.2;">${escapeHtml(title)}</h1>
                <p style="margin:8px 0 0; color:#dbe9ce; font-size:14px;">Project Fit | Eat clean. Live fit. Delivered with care.</p>
              </td>
            </tr>
            <tr>
              <td style="padding:30px;">
                ${body}
              </td>
            </tr>
            <tr>
              <td style="padding:22px 30px; background:#f8faf5; color:#66705f; font-size:13px;">
                Project Fit<br>
                ${SUPPORT_EMAIL} | ${SUPPORT_PHONE}<br>
                <a href="${SITE_URL}" style="color:#2f6f3e;">${SITE_URL}</a>
              </td>
            </tr>
          </table>
        </td>
      </tr>
    </table>
  </body>
</html>`;
}

function buildConfirmation(body: OrderEmailRequest) {
  const order = body.order!;
  const name = body.customerName || 'Project Fit customer';
  const paidNow = order.initial_payment_amount || order.total - order.remaining_payment_amount;
  const htmlBody = `
    <p style="margin:0 0 18px;">Hi ${escapeHtml(name)},</p>
    <p style="margin:0 0 18px;">Your Project Fit order has been confirmed by our chef team. Your plan is now scheduled with the details below.</p>
    <table role="presentation" width="100%" cellspacing="0" cellpadding="0" style="margin:22px 0; border-collapse:collapse;">
      <tr><td style="padding:8px 0; color:#66705f;">Order ID</td><td style="padding:8px 0; text-align:right; font-weight:700;">${escapeHtml(order.id)}</td></tr>
      <tr><td style="padding:8px 0; color:#66705f;">Plan start</td><td style="padding:8px 0; text-align:right;">${formatDate(order.plan_activated_at)}</td></tr>
      <tr><td style="padding:8px 0; color:#66705f;">Plan valid till</td><td style="padding:8px 0; text-align:right;">${formatDate(order.plan_expires_at)}</td></tr>
      <tr><td style="padding:8px 0; color:#66705f;">Amount paid</td><td style="padding:8px 0; text-align:right;">${formatRupees(paidNow)}</td></tr>
      <tr><td style="padding:8px 0; color:#66705f;">Balance due</td><td style="padding:8px 0; text-align:right;">${formatRupees(order.remaining_payment_amount)}</td></tr>
    </table>
    <p style="margin:0 0 18px;">We will use your saved delivery address for the plan. Sundays are treated as off days and are not counted as service days.</p>
    <p style="margin:0;">For any changes, contact us on WhatsApp before the delivery schedule is prepared.</p>`;

  const text = [
    `Hi ${name},`,
    '',
    'Your Project Fit order has been confirmed by our chef team.',
    `Order ID: ${order.id}`,
    `Plan start: ${formatDate(order.plan_activated_at)}`,
    `Plan valid till: ${formatDate(order.plan_expires_at)}`,
    `Amount paid: ${formatRupees(paidNow)}`,
    `Balance due: ${formatRupees(order.remaining_payment_amount)}`,
    '',
    'Sundays are off days and are not counted as service days.',
    '',
    `Project Fit | ${SUPPORT_EMAIL} | ${SUPPORT_PHONE}`,
  ].join('\n');

  return {
    subject: `Project Fit order confirmed - ${order.id}`,
    html: buildShell('Your order is confirmed', `Order ${order.id} is confirmed.`, htmlBody),
    text,
  };
}

function buildInvoice(body: OrderEmailRequest) {
  const order = body.order!;
  const invoice = body.invoice!;
  const name = body.customerName || 'Project Fit customer';
  const dueText = invoice.balance_due > 0 && order.remaining_payment_due_at
    ? ` Remaining payment due date: ${formatDate(order.remaining_payment_due_at)}.`
    : '';
  const htmlBody = `
    <p style="margin:0 0 18px;">Hi ${escapeHtml(name)},</p>
    <p style="margin:0 0 18px;">Your Project Fit invoice is attached as a PDF. The invoice shows the full plan amount, amount paid, and balance due.</p>
    <table role="presentation" width="100%" cellspacing="0" cellpadding="0" style="margin:22px 0; border-collapse:collapse;">
      <tr><td style="padding:8px 0; color:#66705f;">Invoice</td><td style="padding:8px 0; text-align:right; font-weight:700;">${escapeHtml(invoice.invoice_number)}</td></tr>
      <tr><td style="padding:8px 0; color:#66705f;">Order ID</td><td style="padding:8px 0; text-align:right;">${escapeHtml(order.id)}</td></tr>
      <tr><td style="padding:8px 0; color:#66705f;">Full plan total</td><td style="padding:8px 0; text-align:right;">${formatRupees(order.total)}</td></tr>
      <tr><td style="padding:8px 0; color:#66705f;">Amount paid</td><td style="padding:8px 0; text-align:right;">${formatRupees(invoice.amount_paid)}</td></tr>
      <tr><td style="padding:8px 0; color:#66705f;">Balance due</td><td style="padding:8px 0; text-align:right;">${formatRupees(invoice.balance_due)}</td></tr>
    </table>
    <p style="margin:0;">${escapeHtml(dueText || 'Thank you for choosing Project Fit.')}</p>`;

  const text = [
    `Hi ${name},`,
    '',
    'Your Project Fit invoice is attached as a PDF.',
    `Invoice: ${invoice.invoice_number}`,
    `Order ID: ${order.id}`,
    `Full plan total: ${formatRupees(order.total)}`,
    `Amount paid: ${formatRupees(invoice.amount_paid)}`,
    `Balance due: ${formatRupees(invoice.balance_due)}`,
    dueText.trim(),
    '',
    `Project Fit | ${SUPPORT_EMAIL} | ${SUPPORT_PHONE}`,
  ].filter(Boolean).join('\n');

  return {
    subject: `Project Fit invoice ${invoice.invoice_number}`,
    html: buildShell('Your invoice is ready', `Invoice ${invoice.invoice_number} is attached.`, htmlBody),
    text,
  };
}

function sanitizePdfText(value: string | number | null | undefined) {
  return String(value ?? '').replace(/[()\\]/g, '\\$&').replace(/[^\x20-\x7E]/g, '');
}

function buildPdfTextLines(body: OrderEmailRequest) {
  const order = body.order!;
  const invoice = body.invoice!;
  const address = order.delivery_address ?? {};
  const lines = [
    'PROJECT FIT',
    'Invoice / Receipt',
    '',
    `Invoice Number: ${invoice.invoice_number}`,
    `Order ID: ${order.id}`,
    `Issued On: ${formatDate(invoice.issued_at)}`,
    '',
    `Customer: ${body.customerName || 'Project Fit customer'}`,
    `Email: ${body.email}`,
    `Phone: ${address.phone || '-'}`,
    `Delivery: ${[address.addressLine1, address.addressLine2, address.city, address.pincode].filter(Boolean).join(', ') || '-'}`,
    '',
    'Plan Items:',
    ...getPlainItems(order.items).map((item) => `- ${item}`),
    '',
    `Subtotal: ${formatRupees(order.subtotal)}`,
    `Tax: ${formatRupees(order.tax)}`,
    `Full Plan Total: ${formatRupees(order.total)}`,
    `Amount Paid: ${formatRupees(invoice.amount_paid)}`,
    `Balance Due: ${formatRupees(invoice.balance_due)}`,
    `Payment Option: ${order.payment_option === 'half' ? 'Half payment' : 'Full payment'}`,
    `Payment Transaction ID: ${order.payment_transaction_id || '-'}`,
    '',
    `Plan Start: ${formatDate(order.plan_activated_at)}`,
    `Plan Valid Till: ${formatDate(order.plan_expires_at)}`,
    `Remaining Payment Due: ${formatDate(order.remaining_payment_due_at)}`,
    '',
    'No GST charged. This is a Project Fit invoice/receipt for the selected meal plan.',
    `${SUPPORT_EMAIL} | ${SUPPORT_PHONE}`,
  ];

  return lines.map(sanitizePdfText);
}

function buildSimplePdfBase64(body: OrderEmailRequest) {
  const lines = buildPdfTextLines(body);
  const escapedLines = lines.map((line, index) => {
    const y = 790 - index * 16;
    return `1 0 0 1 48 ${y} Tm (${line}) Tj`;
  }).join('\n');
  const stream = `BT
/F1 11 Tf
14 TL
${escapedLines}
ET`;
  const objects = [
    '1 0 obj << /Type /Catalog /Pages 2 0 R >> endobj',
    '2 0 obj << /Type /Pages /Kids [3 0 R] /Count 1 >> endobj',
    '3 0 obj << /Type /Page /Parent 2 0 R /MediaBox [0 0 612 842] /Resources << /Font << /F1 4 0 R >> >> /Contents 5 0 R >> endobj',
    '4 0 obj << /Type /Font /Subtype /Type1 /BaseFont /Helvetica >> endobj',
    `5 0 obj << /Length ${stream.length} >> stream\n${stream}\nendstream endobj`,
  ];
  let pdf = '%PDF-1.4\n';
  const offsets = [0];
  for (const object of objects) {
    offsets.push(pdf.length);
    pdf += `${object}\n`;
  }
  const xrefOffset = pdf.length;
  pdf += `xref\n0 ${objects.length + 1}\n0000000000 65535 f \n`;
  for (let index = 1; index <= objects.length; index += 1) {
    pdf += `${String(offsets[index]).padStart(10, '0')} 00000 n \n`;
  }
  pdf += `trailer << /Size ${objects.length + 1} /Root 1 0 R >>\nstartxref\n${xrefOffset}\n%%EOF`;

  const bytes = new TextEncoder().encode(pdf);
  let binary = '';
  for (const byte of bytes) binary += String.fromCharCode(byte);
  return btoa(binary);
}

Deno.serve(async (req) => {
  if (req.method !== 'POST') {
    return json({ error: 'Method not allowed' }, 405);
  }

  if (!RESEND_API_KEY) {
    return json({ error: 'RESEND_API_KEY not configured' }, 500);
  }

  if (SERVICE_ROLE_KEYS.length > 0) {
    const token = req.headers.get('authorization')?.replace(/^Bearer\s+/i, '');
    if (!token || !SERVICE_ROLE_KEYS.includes(token)) {
      return json({ error: 'Unauthorized' }, 401);
    }
  }

  let body: OrderEmailRequest;
  try {
    body = await req.json();
  } catch {
    return json({ error: 'Invalid JSON' }, 400);
  }

  const email = body.email?.trim();
  if (!email || !body.order?.id || !body.mode) {
    return json({ error: 'mode, email, and order are required' }, 400);
  }

  const emailContent = body.mode === 'invoice' ? buildInvoice(body) : buildConfirmation(body);
  const payload: Record<string, unknown> = {
    from: FROM,
    to: [email],
    subject: emailContent.subject,
    html: emailContent.html,
    text: emailContent.text,
  };

  if (body.mode === 'invoice') {
    if (!body.invoice?.invoice_number) {
      return json({ error: 'invoice is required for invoice emails' }, 400);
    }
    payload.attachments = [
      {
        filename: body.invoice.pdf_filename || `${body.invoice.invoice_number}.pdf`,
        content: buildSimplePdfBase64(body),
      },
    ];
  }

  const resendResponse = await fetch('https://api.resend.com/emails', {
    method: 'POST',
    headers: {
      Authorization: `Bearer ${RESEND_API_KEY}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify(payload),
  });

  const data = await resendResponse.json().catch(() => null);
  if (!resendResponse.ok) {
    console.error('Resend error', data);
    return json({ error: data ?? 'Resend request failed' }, 502);
  }

  return json({ ok: true, id: data?.id ?? null });
});
