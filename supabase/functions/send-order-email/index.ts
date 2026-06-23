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

function pdfText(value: string | number | null | undefined) {
  return sanitizePdfText(value);
}

function moneyPdf(value: number | null | undefined) {
  return pdfText(formatRupees(value));
}

function getOrderItemRows(items: CartItem[]) {
  if (!Array.isArray(items) || items.length === 0) {
    return [{ description: 'Meal plan', meals: '-', qty: 1, amount: 0 }];
  }

  return items.slice(0, 6).map((item) => {
    const quantity = Number(item.quantity ?? 1) || 1;
    const price = Number(item.price ?? 0) || 0;
    const slots = Array.isArray(item.mealSlots) && item.mealSlots.length > 0
      ? item.mealSlots.map((slot) => slot.charAt(0).toUpperCase() + slot.slice(1)).join(', ')
      : '-';
    return {
      description: item.name || 'Meal plan',
      meals: slots,
      qty: quantity,
      amount: price * quantity,
    };
  });
}

function truncatePdfText(value: string, maxLength: number) {
  const safe = pdfText(value);
  return safe.length > maxLength ? `${safe.slice(0, maxLength - 3)}...` : safe;
}

function buildProfessionalPdfBase64(body: OrderEmailRequest) {
  const order = body.order!;
  const invoice = body.invoice!;
  const address = order.delivery_address ?? {};
  const delivery = [address.addressLine1, address.addressLine2, address.city, address.pincode].filter(Boolean).join(', ') || '-';
  const itemRows = getOrderItemRows(order.items);
  const paymentLabel = order.payment_option === 'half' ? 'Half payment' : 'Full payment';
  const planDates = `${formatDate(order.plan_activated_at)} to ${formatDate(order.plan_expires_at)}`;
  const issuedOn = formatDate(invoice.issued_at);
  const balanceLabel = invoice.balance_due > 0 ? moneyPdf(invoice.balance_due) : 'Paid in full';

  const commands: string[] = [
    '0.96 0.98 0.94 rg 0 0 612 842 re f',
    '0.07 0.28 0.18 rg 0 742 612 100 re f',
    '0.02 0.46 0.32 rg 0 732 612 10 re f',
    '1 1 1 rg 42 770 44 44 re f',
    '0.02 0.46 0.32 rg 53 780 22 22 re f',
    '1 1 1 rg 60 787 8 8 re f',
    '0.92 0.97 0.88 rg 42 742 528 1 re f',
    '0.02 0.46 0.32 rg 42 76 528 3 re f',
  ];

  function rect(x: number, y: number, width: number, height: number, color = '1 1 1') {
    commands.push(`${color} rg ${x} ${y} ${width} ${height} re f`);
  }

  function strokeRect(x: number, y: number, width: number, height: number, color = '0.82 0.86 0.80') {
    commands.push(`${color} RG ${x} ${y} ${width} ${height} re S`);
  }

  function line(x1: number, y1: number, x2: number, y2: number, color = '0.82 0.86 0.80') {
    commands.push(`${color} RG ${x1} ${y1} m ${x2} ${y2} l S`);
  }

  function text(value: string, x: number, y: number, size = 10, font = 'F1', color = '0.10 0.14 0.10') {
    commands.push(`BT /${font} ${size} Tf ${color} rg 1 0 0 1 ${x} ${y} Tm (${pdfText(value)}) Tj ET`);
  }

  function rightText(value: string, x: number, y: number, size = 10, font = 'F1', color = '0.10 0.14 0.10') {
    const safe = pdfText(value);
    const approxWidth = safe.length * size * 0.52;
    text(safe, x - approxWidth, y, size, font, color);
  }

  text('PROJECT FIT', 98, 794, 22, 'F2', '1 1 1');
  text('Clean nutrition plans delivered with care', 100, 776, 9, 'F1', '0.82 0.91 0.78');
  rightText('INVOICE', 570, 794, 26, 'F2', '1 1 1');
  rightText(invoice.invoice_number, 570, 775, 10, 'F1', '0.82 0.91 0.78');

  rect(42, 628, 252, 86);
  rect(318, 628, 252, 86);
  strokeRect(42, 628, 252, 86);
  strokeRect(318, 628, 252, 86);
  text('BILLED TO', 58, 692, 9, 'F2', '0.02 0.46 0.32');
  text(truncatePdfText(body.customerName || 'Project Fit customer', 36), 58, 672, 13, 'F2');
  text(truncatePdfText(body.email || '-', 42), 58, 654, 9);
  text(truncatePdfText(address.phone || '-', 58), 58, 640, 9);
  text('INVOICE DETAILS', 334, 692, 9, 'F2', '0.02 0.46 0.32');
  text(`Invoice No: ${invoice.invoice_number}`, 334, 672, 9);
  text(`Order ID: ${truncatePdfText(order.id, 28)}`, 334, 657, 9);
  text(`Issued On: ${issuedOn}`, 334, 642, 9);

  rect(42, 566, 528, 40);
  strokeRect(42, 566, 528, 40);
  text('DELIVERY ADDRESS', 58, 588, 9, 'F2', '0.02 0.46 0.32');
  text(truncatePdfText(delivery, 88), 58, 573, 9);

  rect(42, 514, 528, 28, '0.07 0.28 0.18');
  text('Description', 58, 524, 9, 'F2', '1 1 1');
  text('Meal Times', 308, 524, 9, 'F2', '1 1 1');
  rightText('Qty', 438, 524, 9, 'F2', '1 1 1');
  rightText('Amount', 552, 524, 9, 'F2', '1 1 1');
  strokeRect(42, 374, 528, 168);
  line(294, 374, 294, 542);
  line(410, 374, 410, 542);
  line(458, 374, 458, 542);

  let rowY = 492;
  for (const row of itemRows) {
    text(truncatePdfText(row.description, 38), 58, rowY, 9);
    text(truncatePdfText(row.meals, 18), 308, rowY, 9);
    rightText(String(row.qty), 438, rowY, 9);
    rightText(moneyPdf(row.amount), 552, rowY, 9);
    line(42, rowY - 12, 570, rowY - 12, '0.88 0.90 0.86');
    rowY -= 22;
  }

  rect(42, 266, 252, 82);
  strokeRect(42, 266, 252, 82);
  text('PLAN & PAYMENT', 58, 326, 9, 'F2', '0.02 0.46 0.32');
  text(`Plan dates: ${truncatePdfText(planDates, 34)}`, 58, 307, 9);
  text(`Payment option: ${paymentLabel}`, 58, 292, 9);
  text(`Transaction: ${truncatePdfText(order.payment_transaction_id || '-', 30)}`, 58, 277, 9);

  rect(330, 214, 240, 134);
  strokeRect(330, 214, 240, 134);
  text('TOTALS', 346, 326, 9, 'F2', '0.02 0.46 0.32');
  text('Subtotal', 346, 306, 9);
  rightText(moneyPdf(order.subtotal), 552, 306, 9);
  text('Tax', 346, 287, 9);
  rightText(moneyPdf(order.tax), 552, 287, 9);
  line(346, 276, 552, 276);
  text('Full Plan Total', 346, 260, 10, 'F2');
  rightText(moneyPdf(order.total), 552, 260, 10, 'F2');
  text('Amount Paid', 346, 241, 10, 'F2', '0.02 0.46 0.32');
  rightText(moneyPdf(invoice.amount_paid), 552, 241, 10, 'F2', '0.02 0.46 0.32');
  text('Balance Due', 346, 222, 10, 'F2', invoice.balance_due > 0 ? '0.72 0.18 0.10' : '0.02 0.46 0.32');
  rightText(balanceLabel, 552, 222, 10, 'F2', invoice.balance_due > 0 ? '0.72 0.18 0.10' : '0.02 0.46 0.32');

  text('Notes', 42, 176, 10, 'F2', '0.02 0.46 0.32');
  text('No GST charged. Sundays are off days and are not counted as service days.', 42, 158, 9);
  text('Thank you for choosing Project Fit.', 42, 142, 9, 'F2');
  text(`${SUPPORT_EMAIL} | ${SUPPORT_PHONE} | ${SITE_URL}`, 42, 92, 9, 'F1', '0.37 0.43 0.35');

  const stream = commands.join('\n');
  const objects = [
    '1 0 obj << /Type /Catalog /Pages 2 0 R >> endobj',
    '2 0 obj << /Type /Pages /Kids [3 0 R] /Count 1 >> endobj',
    '3 0 obj << /Type /Page /Parent 2 0 R /MediaBox [0 0 612 842] /Resources << /Font << /F1 4 0 R /F2 6 0 R >> >> /Contents 5 0 R >> endobj',
    '4 0 obj << /Type /Font /Subtype /Type1 /BaseFont /Helvetica >> endobj',
    `5 0 obj << /Length ${stream.length} >> stream\n${stream}\nendstream endobj`,
    '6 0 obj << /Type /Font /Subtype /Type1 /BaseFont /Helvetica-Bold >> endobj',
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
        content: buildProfessionalPdfBase64(body),
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
