import type { ApiOrder, OrderInvoice, ProjectFitUser } from '@/lib/backend-types';
import { getSupabaseUrl, supabaseRestFetch } from '@/lib/supabase-rest';

type OrderEmailMode = 'confirmation' | 'invoice';

interface OrderEmailResult {
  confirmationSent: boolean;
  invoiceSent: boolean;
  invoice: OrderInvoice | null;
  warning: string | null;
}

interface ResendFunctionResponse {
  ok?: boolean;
  id?: string | null;
  error?: unknown;
}

function normalizeEnv(value: string | undefined) {
  return value?.trim().replace(/^['"]|['"]$/g, '') || undefined;
}

function getServiceRoleKey() {
  return normalizeEnv(process.env.PROJECTFIT_SERVICE_ROLE_KEY) ||
    normalizeEnv(process.env.SUPABASE_SERVICE_ROLE_KEY) ||
    normalizeEnv(process.env.SUPABASE_SECRET_KEY);
}

function getPaidAmount(order: ApiOrder) {
  if (order.payment_stage === 'half_paid') {
    return Math.max(0, order.initial_payment_amount || order.total - order.remaining_payment_amount);
  }

  if (order.payment_stage === 'paid_full' || order.payment_status === 'paid') {
    return order.total;
  }

  return Math.max(0, order.initial_payment_amount || order.total - order.remaining_payment_amount);
}

function buildInvoiceNumber(order: ApiOrder) {
  const year = new Date().getFullYear();
  const cleanOrderId = order.id.replace(/[^a-z0-9]/gi, '').toUpperCase();
  return `PF-INV-${year}-${cleanOrderId}`;
}

function buildInvoicePayload(order: ApiOrder) {
  return {
    orderId: order.id,
    items: order.items,
    deliveryAddress: order.delivery_address,
    requestedStartDate: order.requested_start_date,
    planActivatedAt: order.plan_activated_at,
    planExpiresAt: order.plan_expires_at,
    remainingPaymentDueAt: order.remaining_payment_due_at,
    paymentTransactionId: order.payment_transaction_id,
  };
}

async function getOrderUser(order: ApiOrder) {
  if (!order.user_id) return null;

  const result = await supabaseRestFetch<ProjectFitUser[]>(
    `/users?id=eq.${encodeURIComponent(order.user_id)}&select=*`
  );

  if (result.error) {
    throw new Error(result.error);
  }

  return result.data?.[0] ?? null;
}

async function getExistingInvoice(orderId: string) {
  const result = await supabaseRestFetch<OrderInvoice[]>(
    `/order_invoices?order_id=eq.${encodeURIComponent(orderId)}&select=*&limit=1`
  );

  if (result.error && result.status !== 404) {
    throw new Error(result.error);
  }

  return result.data?.[0] ?? null;
}

async function createInvoice(order: ApiOrder, user: ProjectFitUser) {
  const amountPaid = getPaidAmount(order);
  const balanceDue = Math.max(0, order.total - amountPaid);
  const invoiceNumber = buildInvoiceNumber(order);
  const pdfFilename = `${invoiceNumber}.pdf`;

  const result = await supabaseRestFetch<OrderInvoice[]>('/order_invoices', {
    method: 'POST',
    body: JSON.stringify({
      order_id: order.id,
      user_id: order.user_id,
      invoice_number: invoiceNumber,
      customer_email: user.email,
      customer_name: order.customer_name || user.name,
      subtotal: order.subtotal,
      tax: order.tax,
      total: order.total,
      amount_paid: amountPaid,
      balance_due: balanceDue,
      payment_option: order.payment_option,
      payment_stage: order.payment_stage,
      status: 'issued',
      pdf_filename: pdfFilename,
      payload: buildInvoicePayload(order),
    }),
  });

  if (result.error) {
    const existing = await getExistingInvoice(order.id);
    if (existing) return existing;
    throw new Error(result.error);
  }

  return result.data?.[0] ?? null;
}

async function getOrCreateInvoice(order: ApiOrder, user: ProjectFitUser) {
  const existing = await getExistingInvoice(order.id);
  if (existing) return existing;
  return createInvoice(order, user);
}

async function callOrderEmailFunction({
  mode,
  order,
  user,
  invoice,
}: {
  mode: OrderEmailMode;
  order: ApiOrder;
  user: ProjectFitUser;
  invoice?: OrderInvoice | null;
}) {
  const key = getServiceRoleKey();
  if (!key) {
    throw new Error('Supabase service role key is required to send order emails.');
  }

  const response = await fetch(`${getSupabaseUrl()}/functions/v1/send-order-email`, {
    method: 'POST',
    headers: {
      Authorization: `Bearer ${key}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      mode,
      email: user.email,
      customerName: order.customer_name || user.name,
      order,
      invoice: invoice
        ? {
            invoice_number: invoice.invoice_number,
            amount_paid: invoice.amount_paid,
            balance_due: invoice.balance_due,
            issued_at: invoice.issued_at,
            pdf_filename: invoice.pdf_filename,
          }
        : undefined,
    }),
  });

  const data = (await response.json().catch(() => null)) as ResendFunctionResponse | null;
  if (!response.ok) {
    const message = typeof data?.error === 'string' ? data.error : `Order email function failed with ${response.status}`;
    throw new Error(message);
  }

  return data?.id ?? null;
}

async function markInvoiceSent(invoice: OrderInvoice, providerMessageId: string | null) {
  const result = await supabaseRestFetch<OrderInvoice[]>(
    `/order_invoices?id=eq.${encodeURIComponent(invoice.id)}`,
    {
      method: 'PATCH',
      body: JSON.stringify({
        email_sent_at: new Date().toISOString(),
        provider_message_id: providerMessageId,
      }),
    }
  );

  if (result.error) {
    throw new Error(result.error);
  }

  return result.data?.[0] ?? invoice;
}

export async function sendPaidOrderConfirmationAndInvoice(order: ApiOrder): Promise<OrderEmailResult> {
  if (order.order_type === 'free_sample') {
    return {
      confirmationSent: false,
      invoiceSent: false,
      invoice: null,
      warning: null,
    };
  }

  try {
    const user = await getOrderUser(order);
    if (!user?.email) {
      return {
        confirmationSent: false,
        invoiceSent: false,
        invoice: null,
        warning: 'Order updated, but email could not be sent because the customer email was not found.',
      };
    }

    await callOrderEmailFunction({ mode: 'confirmation', order, user });

    const invoice = await getOrCreateInvoice(order, user);
    if (!invoice) {
      throw new Error('Could not create invoice record.');
    }

    if (invoice.email_sent_at) {
      return {
        confirmationSent: true,
        invoiceSent: false,
        invoice,
        warning: null,
      };
    }

    const providerMessageId = await callOrderEmailFunction({
      mode: 'invoice',
      order,
      user,
      invoice,
    });
    const sentInvoice = await markInvoiceSent(invoice, providerMessageId);

    return {
      confirmationSent: true,
      invoiceSent: true,
      invoice: sentInvoice,
      warning: null,
    };
  } catch (error) {
    return {
      confirmationSent: false,
      invoiceSent: false,
      invoice: null,
      warning: error instanceof Error
        ? `Order updated, but email/invoice could not be sent: ${error.message}`
        : 'Order updated, but email/invoice could not be sent.',
    };
  }
}
