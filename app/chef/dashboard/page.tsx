'use client';

import { ChangeEvent, FormEvent, useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { useRouter } from 'next/navigation';
import {
  CalendarCheck,
  CheckCircle2,
  ChevronRight,
  ClipboardList,
  Image as ImageIcon,
  LogOut,
  MessageSquareText,
  Pencil,
  RefreshCw,
  Search,
  Send,
  ShieldCheck,
  Soup,
  Trash2,
  UsersRound,
  WalletCards,
} from 'lucide-react';
import { dietCategories } from '@/data/diets';
import type { ApiOrder, ApiOrderStatus, CustomerFeedback, CustomerProfile, HomepageAd, HomepageAdSettings, MealPlan, MenuItem, PaymentStatus, PlanPauseRequest, ProjectFitUser, WhatsAppMessageLog } from '@/lib/backend-types';
import type { ProgramPlanOverride } from '@/lib/program-plan-overrides';
import { clearChefSession, getChefAuthHeaders, getChefSession } from '@/lib/auth-client';
import { getOrderServiceDaysRemaining } from '@/lib/plan-duration';
import { addCalendarDays, formatDateKey, getPlanCategoryLabel, isSundayDateKey } from '@/lib/plan-pauses';
import { getMealSlotsLabel } from '@/lib/meal-slots';
import styles from './page.module.css';

type AdminOverview = {
  users: ProjectFitUser[];
  profiles: CustomerProfile[];
  orders: ApiOrder[];
  feedback: CustomerFeedback[];
  menuItems: MenuItem[];
  mealPlans: MealPlan[];
  programOverrides: ProgramPlanOverride[];
  whatsappMessages: WhatsAppMessageLog[];
  planPauseRequests: PlanPauseRequest[];
  homepageAds: HomepageAd[];
  homepageAdSettings: Pick<HomepageAdSettings, 'enabled'>;
  warnings?: string[];
};

type Tab =
  | 'pending'
  | 'samples'
  | 'approved-samples'
  | 'sample-status'
  | 'chats'
  | 'delivery-calendar'
  | 'half-payments'
  | 'active'
  | 'completed'
  | 'plan-history'
  | 'users'
  | 'feedback'
  | 'ads'
  | 'menu'
  | 'pricing';

const emptyOverview: AdminOverview = {
  users: [],
  profiles: [],
  orders: [],
  feedback: [],
  menuItems: [],
  mealPlans: [],
  programOverrides: [],
  whatsappMessages: [],
  planPauseRequests: [],
  homepageAds: [],
  homepageAdSettings: { enabled: false },
  warnings: [],
};

const tabs: { id: Tab; label: string; icon: typeof ClipboardList }[] = [
  { id: 'pending', label: 'Pending orders', icon: ClipboardList },
  { id: 'samples', label: 'Sample requests', icon: Soup },
  { id: 'approved-samples', label: 'Approved samples', icon: CheckCircle2 },
  { id: 'sample-status', label: 'Sample status', icon: CheckCircle2 },
  { id: 'chats', label: 'WhatsApp chats', icon: MessageSquareText },
  { id: 'delivery-calendar', label: 'Delivery calendar', icon: CalendarCheck },
  { id: 'half-payments', label: 'Half payments', icon: WalletCards },
  { id: 'active', label: 'Active plans', icon: CalendarCheck },
  { id: 'completed', label: 'Completed orders', icon: CheckCircle2 },
  { id: 'plan-history', label: 'Plan history', icon: ClipboardList },
  { id: 'users', label: 'Users', icon: UsersRound },
  { id: 'feedback', label: 'Feedback', icon: MessageSquareText },
  { id: 'ads', label: 'Ads', icon: ImageIcon },
  { id: 'menu', label: 'Menus', icon: Soup },
  { id: 'pricing', label: 'Pricing', icon: WalletCards },
];
const tabIds = new Set<Tab>(tabs.map((tab) => tab.id));
const activeTabStorageKey = 'projectfit.chef.activeTab';
const overviewRefreshMs = 15_000;

function formatDate(value: string | null | undefined) {
  if (!value) return 'Not set';
  return new Intl.DateTimeFormat('en-IN', {
    day: '2-digit',
    month: 'short',
    year: 'numeric',
  }).format(new Date(value));
}

function formatDateKeyForDisplay(dateKey: string) {
  return new Intl.DateTimeFormat('en-IN', {
    day: '2-digit',
    month: 'short',
    year: 'numeric',
  }).format(new Date(`${dateKey}T00:00:00`));
}

function getDateKeyFromIso(value: string | null | undefined) {
  return value ? formatDateKey(new Date(value)) : null;
}

function isOrderDeliveredOnDate(order: ApiOrder, dateKey: string, pauses: PlanPauseRequest[]) {
  if (order.order_type === 'free_sample') return false;
  if (!['confirmed', 'preparing', 'ready'].includes(order.status)) return false;
  if (!['paid_full', 'half_paid'].includes(order.payment_stage)) return false;
  if (isSundayDateKey(dateKey)) return false;

  const startDate = getDateKeyFromIso(order.plan_activated_at);
  const endDate = getDateKeyFromIso(order.plan_expires_at);
  if (!startDate || !endDate) return false;
  if (dateKey < startDate || dateKey >= endDate) return false;

  return !pauses.some(
    (pause) =>
      pause.order_id === order.id &&
      pause.status === 'approved' &&
      pause.skipped_dates.includes(dateKey)
  );
}

function getDeliveryCalendarDates(days = 30) {
  const today = formatDateKey(new Date());
  return Array.from({ length: days }, (_, index) => addCalendarDays(today, index)).filter(
    (dateKey): dateKey is string => Boolean(dateKey)
  );
}

function groupDeliveryOrders(orders: ApiOrder[]) {
  return {
    day: orders.filter((order) => getPlanCategoryLabel(order) === 'Day plan'),
    week: orders.filter((order) => getPlanCategoryLabel(order) === 'Week plan'),
    month: orders.filter((order) => getPlanCategoryLabel(order) === 'Month plan'),
  };
}

function formatDateTime(value: string | null | undefined) {
  if (!value) return 'Not set';
  return new Intl.DateTimeFormat('en-IN', {
    day: '2-digit',
    month: 'short',
    hour: '2-digit',
    minute: '2-digit',
  }).format(new Date(value));
}

function getPrimaryPlan(order: ApiOrder) {
  return order.items[0]?.name ?? 'Meal plan';
}

function getOrderMealSlotsText(order: ApiOrder) {
  return order.items
    .map((item) => getMealSlotsLabel(item))
    .filter(Boolean)
    .join(' | ');
}

function getFreeSampleStatusText(order: ApiOrder) {
  if (order.status === 'new') return 'Pending chef approval';
  if (order.status === 'cancelled') {
    const reason = getChefCancellationReason(order.cancellation_reason);
    return reason ? `Cancelled: ${reason}` : 'Cancelled by chef';
  }
  if (order.customer_delivery_status === 'received') return 'Customer marked received';
  if (order.customer_delivery_status === 'not_received') return 'Customer marked not received';
  return 'Approved, waiting for customer delivery confirmation';
}

function getPlanLifecycleText(order: ApiOrder) {
  if (order.status === 'cancelled') {
    const reason = getChefCancellationReason(order.cancellation_reason);
    return reason
      ? `Cancelled by chef: ${reason}`
      : 'Cancelled by chef';
  }

  if (order.payment_stage === 'half_paid') {
    return 'Half payment received. Remaining payment is pending.';
  }

  if (order.payment_stage === 'stopped_midway' || order.status === 'completed') {
    return order.completion_reason ?? 'Completed';
  }

  if (order.status === 'new' || order.payment_status === 'pending') {
    return 'Pending chef confirmation';
  }

  if (order.plan_expires_at && new Date(order.plan_expires_at) < new Date()) {
    return 'Completed';
  }

  if (['confirmed', 'preparing', 'ready'].includes(order.status) && order.payment_status === 'paid') {
    return 'Active';
  }

  return `${order.status} / ${order.payment_status}`;
}

function getChefCancellationReason(reason: string | null | undefined) {
  const cleaned = reason?.trim();
  if (!cleaned || cleaned.toLowerCase() === 'active plan cancelled by chef.') return null;
  return cleaned;
}

type WhatsAppMedia = {
  id: string;
  type: 'image' | 'document';
  caption?: string;
  filename?: string;
  mimeType?: string;
};

type WhatsAppConversation = {
  phone: string;
  user: ProjectFitUser | null;
  messages: WhatsAppMessageLog[];
  lastMessage: WhatsAppMessageLog;
  lastIncomingAt: string | null;
  unreadCount: number;
};

const whatsappReplyWindowMs = 24 * 60 * 60 * 1000;

function getPhoneKey(phone: string | null | undefined) {
  return String(phone ?? '').replace(/\D/g, '');
}

function getPhoneVariants(phone: string | null | undefined) {
  const digits = getPhoneKey(phone);
  if (!digits) return [];
  return Array.from(new Set([digits, digits.startsWith('91') ? digits.slice(2) : `91${digits}`]));
}

function getPayloadRecord(payload: unknown) {
  return payload && typeof payload === 'object' ? payload as Record<string, unknown> : {};
}

function getNestedRecord(parent: Record<string, unknown>, key: string) {
  const value = parent[key];
  return value && typeof value === 'object' ? value as Record<string, unknown> : null;
}

function getWhatsAppMedia(message: WhatsAppMessageLog): WhatsAppMedia | null {
  const payload = getPayloadRecord(message.payload);
  const image = getNestedRecord(payload, 'image');
  const document = getNestedRecord(payload, 'document');

  if (image?.id && typeof image.id === 'string') {
    return {
      id: image.id,
      type: 'image',
      caption: typeof image.caption === 'string' ? image.caption : undefined,
      mimeType: typeof image.mime_type === 'string' ? image.mime_type : undefined,
    };
  }

  if (document?.id && typeof document.id === 'string') {
    return {
      id: document.id,
      type: 'document',
      caption: typeof document.caption === 'string' ? document.caption : undefined,
      filename: typeof document.filename === 'string' ? document.filename : undefined,
      mimeType: typeof document.mime_type === 'string' ? document.mime_type : undefined,
    };
  }

  return null;
}

function getWhatsAppMessageText(message: WhatsAppMessageLog) {
  const media = getWhatsAppMedia(message);
  return message.message_body || media?.caption || media?.filename || (media ? `${media.type} message` : message.message_type);
}

function isReplyWindowOpen(lastIncomingAt: string | null) {
  if (!lastIncomingAt) return false;
  return Date.now() - new Date(lastIncomingAt).getTime() <= whatsappReplyWindowMs;
}

function getReplyWindowLabel(lastIncomingAt: string | null) {
  if (!lastIncomingAt) return 'No customer message yet';
  const remainingMs = whatsappReplyWindowMs - (Date.now() - new Date(lastIncomingAt).getTime());
  if (remainingMs <= 0) return '24-hour reply window closed';
  const hours = Math.floor(remainingMs / 3_600_000);
  const minutes = Math.max(0, Math.floor((remainingMs % 3_600_000) / 60_000));
  return hours > 0 ? `${hours}h ${minutes}m left to reply` : `${minutes}m left to reply`;
}

function getWhatsAppDeliveryLabel(message: WhatsAppMessageLog) {
  if (message.direction === 'incoming') return message.status === 'read' ? 'Seen' : 'Unread';
  if (message.status === 'read') return 'Read';
  if (message.status === 'delivered') return 'Delivered';
  if (message.status === 'sent') return 'Sent';
  return message.status;
}

export default function ChefDashboard() {
  const router = useRouter();
  const [data, setData] = useState<AdminOverview>(emptyOverview);
  const [activeTab, setActiveTab] = useState<Tab>('pending');
  const [query, setQuery] = useState('');
  const [error, setError] = useState('');
  const [status, setStatus] = useState('');
  const [isLoading, setIsLoading] = useState(true);
  const [isAuthorized, setIsAuthorized] = useState(false);
  const [selectedUserId, setSelectedUserId] = useState<string | null>(null);
  const [selectedChatPhone, setSelectedChatPhone] = useState<string | null>(null);
  const [chatDraft, setChatDraft] = useState('');
  const [isSendingChat, setIsSendingChat] = useState(false);
  const messageThreadRef = useRef<HTMLDivElement | null>(null);
  const [menuProgram, setMenuProgram] = useState('main');
  const [menuMode, setMenuMode] = useState<'menu' | 'free_sample'>('menu');

  useEffect(() => {
    const storedTab = localStorage.getItem(activeTabStorageKey) as Tab | null;
    if (storedTab && tabIds.has(storedTab)) {
      setActiveTab(storedTab);
    }
  }, []);

  useEffect(() => {
    localStorage.setItem(activeTabStorageKey, activeTab);
  }, [activeTab]);

  useEffect(() => {
    let cancelled = false;

    async function verifyAdmin() {
      const session = getChefSession();

      if (!session) {
        router.replace('/chef');
        return;
      }

      const response = await fetch('/api/admin/me', {
        cache: 'no-store',
        headers: await getChefAuthHeaders(),
      });

      if (cancelled) return;

      if (!response.ok) {
        setIsAuthorized(false);
        setIsLoading(false);
        router.replace('/chef');
        return;
      }

      setIsAuthorized(true);
    }

    verifyAdmin().catch(() => {
      if (!cancelled) {
        setIsAuthorized(false);
        setIsLoading(false);
        router.replace('/chef');
      }
    });

    return () => {
      cancelled = true;
    };
  }, [router]);

  const loadOverview = useCallback(async () => {
    try {
      const response = await fetch('/api/admin/overview', {
        cache: 'no-store',
        headers: await getChefAuthHeaders(),
      });
      const nextData = (await response.json()) as AdminOverview & { error?: string };

      if (!response.ok) {
        throw new Error(nextData.error ?? 'Could not load chef portal.');
      }

      setData({ ...emptyOverview, ...nextData });
      setError('');
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Could not load chef portal.');
    } finally {
      setIsLoading(false);
    }
  }, []);

  useEffect(() => {
    if (!isAuthorized) return;
    loadOverview();
    const interval = window.setInterval(() => {
      if (!document.hidden) {
        void loadOverview();
      }
    }, overviewRefreshMs);

    return () => window.clearInterval(interval);
  }, [isAuthorized, loadOverview]);

  useEffect(() => {
    if (menuMode === 'free_sample' && menuProgram === 'main') {
      setMenuProgram(dietCategories[0]?.slug ?? 'weight-loss');
    }
  }, [menuMode, menuProgram]);

  const profilesByUserId = useMemo(
    () => new Map(data.profiles.map((profile) => [profile.user_id, profile])),
    [data.profiles]
  );
  const usersById = useMemo(
    () => new Map(data.users.map((user) => [user.id, user])),
    [data.users]
  );
  const usersByPhone = useMemo(() => {
    const phoneMap = new Map<string, ProjectFitUser>();
    for (const user of data.users) {
      for (const variant of getPhoneVariants(user.phone)) {
        phoneMap.set(variant, user);
      }
    }
    return phoneMap;
  }, [data.users]);
  const overridesByPlanId = useMemo(
    () => new Map(data.programOverrides.map((override) => [override.plan_id, override])),
    [data.programOverrides]
  );
  const normalizedQuery = query.trim().toLowerCase();

  const pendingOrders = data.orders.filter(
    (order) => order.order_type !== 'free_sample' && order.status === 'new' && order.payment_stage !== 'half_paid'
  );
  const sampleOrders = data.orders.filter((order) => order.order_type === 'free_sample');
  const sampleRequests = sampleOrders.filter((order) => order.status === 'new');
  const approvedSampleOrders = sampleOrders.filter((order) => ['confirmed', 'preparing', 'ready'].includes(order.status));
  const sampleStatusOrders = sampleOrders;
  const activePlans = data.orders.filter(
    (order) =>
      order.order_type !== 'free_sample' &&
      ['confirmed', 'preparing', 'ready'].includes(order.status) &&
      order.payment_status === 'paid' &&
      order.payment_stage === 'paid_full' &&
      order.plan_expires_at &&
      new Date(order.plan_expires_at) >= new Date()
  );
  const halfPaymentOrders = data.orders.filter(
    (order) => order.order_type !== 'free_sample' && order.payment_option === 'half' && order.payment_stage === 'half_paid'
  );
  const deliveryCalendar = useMemo(
    () =>
      getDeliveryCalendarDates().map((dateKey) => {
        const ordersForDay = data.orders.filter((order) =>
          isOrderDeliveredOnDate(order, dateKey, data.planPauseRequests)
        );
        return {
          dateKey,
          isSunday: isSundayDateKey(dateKey),
          orders: ordersForDay,
          groups: groupDeliveryOrders(ordersForDay),
        };
      }),
    [data.orders, data.planPauseRequests]
  );
  const completedOrders = data.orders.filter(
    (order) =>
      order.order_type !== 'free_sample' &&
      (order.status === 'completed' ||
        order.payment_stage === 'completed' ||
        order.payment_stage === 'stopped_midway' ||
        Boolean(order.plan_expires_at && new Date(order.plan_expires_at) < new Date()))
  );
  const planHistoryOrders = data.orders.filter((order) => order.order_type !== 'free_sample');
  const selectedUser = data.users.find((user) => user.id === selectedUserId) ?? data.users[0] ?? null;
  const selectedProfile = selectedUser ? profilesByUserId.get(selectedUser.id) ?? null : null;
  const selectedUserOrders = selectedUser ? data.orders.filter((order) => order.user_id === selectedUser.id) : [];
  const selectedUserFeedback = selectedUser ? data.feedback.filter((item) => item.user_id === selectedUser.id) : [];

  const filteredUsers = data.users.filter((user) => {
    if (!normalizedQuery) return true;
    const profile = profilesByUserId.get(user.id);
    return [user.id, user.name, user.email, user.phone, profile?.health_notes, profile?.medical_report_file_name].some((value) =>
      String(value ?? '').toLowerCase().includes(normalizedQuery)
    );
  });

  const filteredOrders = pendingOrders.filter((order) => {
    if (!normalizedQuery) return true;
    return [
      order.id,
      order.user_id,
      order.customer_name,
      order.delivery_address?.phone,
      order.delivery_address?.pincode,
      ...order.items.map((item) => item.name),
    ].some((value) => String(value ?? '').toLowerCase().includes(normalizedQuery));
  });
  const filteredSampleOrders = sampleRequests.filter((order) => {
    if (!normalizedQuery) return true;
    return [
      order.id,
      order.user_id,
      order.customer_name,
      order.delivery_address?.phone,
      order.delivery_address?.pincode,
      order.customer_delivery_status,
      ...order.items.map((item) => item.name),
    ].some((value) => String(value ?? '').toLowerCase().includes(normalizedQuery));
  });
  const filteredApprovedSampleOrders = approvedSampleOrders.filter((order) => {
    if (!normalizedQuery) return true;
    return [
      order.id,
      order.user_id,
      order.customer_name,
      order.delivery_address?.phone,
      order.delivery_address?.pincode,
      order.customer_delivery_status,
      ...order.items.map((item) => item.name),
    ].some((value) => String(value ?? '').toLowerCase().includes(normalizedQuery));
  });
  const filteredSampleStatusOrders = sampleStatusOrders.filter((order) => {
    if (!normalizedQuery) return true;
    return [
      order.id,
      order.user_id,
      order.customer_name,
      order.delivery_address?.phone,
      order.delivery_address?.pincode,
      order.status,
      order.customer_delivery_status,
      ...order.items.map((item) => item.name),
    ].some((value) => String(value ?? '').toLowerCase().includes(normalizedQuery));
  });
  const filteredPlanHistoryOrders = planHistoryOrders.filter((order) => {
    if (!normalizedQuery) return true;
    return [
      order.id,
      order.user_id,
      order.customer_name,
      order.delivery_address?.phone,
      order.delivery_address?.pincode,
      order.status,
      order.payment_status,
      order.cancellation_reason,
      ...order.items.map((item) => item.name),
    ].some((value) => String(value ?? '').toLowerCase().includes(normalizedQuery));
  });
  const filteredHalfPaymentOrders = halfPaymentOrders.filter((order) => {
    if (!normalizedQuery) return true;
    return [
      order.id,
      order.user_id,
      order.customer_name,
      order.delivery_address?.phone,
      order.remaining_payment_amount,
      ...order.items.map((item) => item.name),
    ].some((value) => String(value ?? '').toLowerCase().includes(normalizedQuery));
  });
  const filteredCompletedOrders = completedOrders.filter((order) => {
    if (!normalizedQuery) return true;
    return [
      order.id,
      order.user_id,
      order.customer_name,
      order.delivery_address?.phone,
      order.completion_reason,
      ...order.items.map((item) => item.name),
    ].some((value) => String(value ?? '').toLowerCase().includes(normalizedQuery));
  });

  const whatsappConversations = useMemo(() => {
    const groups = new Map<string, WhatsAppMessageLog[]>();

    for (const message of data.whatsappMessages) {
      const key = getPhoneKey(message.phone);
      if (!key) continue;
      groups.set(key, [...(groups.get(key) ?? []), message]);
    }

    return Array.from(groups.entries())
      .map(([phone, messages]): WhatsAppConversation => {
        const sortedMessages = [...messages].sort(
          (a, b) => new Date(a.created_at).getTime() - new Date(b.created_at).getTime()
        );
        const lastMessage = sortedMessages[sortedMessages.length - 1];
        const lastIncoming = [...sortedMessages]
          .reverse()
          .find((message) => message.direction === 'incoming');
        const user = getPhoneVariants(phone).map((variant) => usersByPhone.get(variant)).find(Boolean) ?? null;

        return {
          phone,
          user,
          messages: sortedMessages,
          lastMessage,
          lastIncomingAt: lastIncoming?.created_at ?? null,
          unreadCount: sortedMessages.filter((message) => message.direction === 'incoming' && message.status === 'received').length,
        };
      })
      .filter((conversation) => Boolean(conversation.lastMessage))
      .sort((a, b) => new Date(b.lastMessage.created_at).getTime() - new Date(a.lastMessage.created_at).getTime());
  }, [data.whatsappMessages, usersByPhone]);

  const filteredWhatsappConversations = whatsappConversations.filter((conversation) => {
    if (!normalizedQuery) return true;
    return [
      conversation.phone,
      conversation.user?.name,
      conversation.user?.email,
      getWhatsAppMessageText(conversation.lastMessage),
    ].some((value) => String(value ?? '').toLowerCase().includes(normalizedQuery));
  });
  const selectedConversation =
    whatsappConversations.find((conversation) => conversation.phone === selectedChatPhone) ??
    filteredWhatsappConversations[0] ??
    whatsappConversations[0] ??
    null;

  useEffect(() => {
    if (!selectedChatPhone && whatsappConversations[0]) {
      setSelectedChatPhone(whatsappConversations[0].phone);
    }
  }, [selectedChatPhone, whatsappConversations]);

  useEffect(() => {
    const thread = messageThreadRef.current;
    if (!thread) return;
    thread.scrollTop = thread.scrollHeight;
  }, [selectedConversation?.phone, selectedConversation?.messages.length]);

  useEffect(() => {
    if (activeTab !== 'chats' || !selectedConversation || selectedConversation.unreadCount === 0) return;
    let cancelled = false;

    async function markConversationRead() {
      await fetch('/api/admin/whatsapp/read', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          ...(await getChefAuthHeaders()),
        },
        body: JSON.stringify({ phone: selectedConversation?.phone }),
      }).catch(() => undefined);

      if (cancelled || !selectedConversation) return;
      setData((current) => ({
        ...current,
        whatsappMessages: current.whatsappMessages.map((message) =>
          getPhoneKey(message.phone) === selectedConversation.phone &&
          message.direction === 'incoming' &&
          message.status === 'received'
            ? { ...message, status: 'read' }
            : message
        ),
      }));
    }

    void markConversationRead();

    return () => {
      cancelled = true;
    };
  }, [activeTab, selectedConversation]);

  const visibleMenuItems = data.menuItems.filter(
    (item) =>
      (item.program_slug || 'main') === menuProgram &&
      Boolean(item.is_free_sample) === (menuMode === 'free_sample')
  );

  async function patchOrder(
    orderId: string,
    payload: {
      status?: ApiOrderStatus;
      payment_status?: PaymentStatus;
      action?: 'confirm' | 'cancel' | 'complete_payment' | 'send_payment_reminder' | 'stop_midway';
      confirmation_order_id?: string;
      confirmation_user_id?: string;
      payment_transaction_id?: string;
      cancellation_reason?: string;
      cancel_confirmation?: string;
    }
  ) {
    setStatus('');
    setError('');
    const response = await fetch(`/api/orders/${orderId}/status`, {
      method: 'PATCH',
      headers: {
        'Content-Type': 'application/json',
        ...(await getChefAuthHeaders()),
      },
      body: JSON.stringify(payload),
    });
    const result = await response.json() as {
      order?: ApiOrder;
      error?: string;
      whatsappWarning?: string | null;
      emailWarning?: string | null;
    };

    if (!response.ok) {
      setError(result.error ?? 'Could not update order.');
      return;
    }

    if (result.order) {
      setData((current) => ({
        ...current,
        orders: current.orders.map((order) => (order.id === orderId ? result.order as ApiOrder : order)),
      }));
    }

    const successMessage =
      payload.action === 'confirm'
        ? 'Order confirmed and plan dates were set.'
        : payload.action === 'complete_payment'
          ? 'Remaining payment confirmed. Plan moved to active plans.'
          : payload.action === 'send_payment_reminder'
            ? 'Remaining payment reminder template sent.'
            : payload.action === 'stop_midway'
              ? 'Half-payment plan closed and moved to completed orders.'
              : 'Order updated.';

    const warnings = [result.whatsappWarning, result.emailWarning].filter(Boolean).join(' ');
    setStatus(warnings ? `${successMessage} ${warnings}` : successMessage);
  }

  async function sendChatReply(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (!selectedConversation) return;

    setStatus('');
    setError('');
    setIsSendingChat(true);

    try {
      const response = await fetch('/api/admin/whatsapp/reply', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          ...(await getChefAuthHeaders()),
        },
        body: JSON.stringify({
          phone: selectedConversation.phone,
          user_id: selectedConversation.user?.id ?? null,
          message: chatDraft,
        }),
      });
      const result = await response.json();

      if (!response.ok) {
        throw new Error(result.error ?? 'Could not send WhatsApp reply.');
      }

      setChatDraft('');
      setStatus('WhatsApp reply sent.');
      await loadOverview();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Could not send WhatsApp reply.');
    } finally {
      setIsSendingChat(false);
    }
  }

  async function resetFreeSampleLimit(userId: string | null | undefined) {
    if (!userId) {
      setError('This order does not have a user ID to reset.');
      return;
    }

    setStatus('');
    setError('');
    const response = await fetch('/api/admin/free-sample-reset', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        ...(await getChefAuthHeaders()),
      },
      body: JSON.stringify({ user_id: userId }),
    });
    const result = await response.json();

    if (!response.ok) {
      setError(result.error ?? 'Could not reset free sample limit.');
      return;
    }

    setStatus(`Free sample limit reset for user. ${result.resetCount ?? 0} active claim(s) cleared.`);
  }

  async function submitJson(path: string, method: 'POST' | 'PATCH', payload: Record<string, unknown>) {
    setStatus('');
    setError('');
    const response = await fetch(path, {
      method,
      headers: {
        'Content-Type': 'application/json',
        ...(await getChefAuthHeaders()),
      },
      body: JSON.stringify(payload),
    });
    const result = await response.json();

    if (!response.ok) {
      setError(result.error ?? 'Save failed.');
      return false;
    }

    setStatus('Saved.');
    await loadOverview();
    return true;
  }

  async function deleteMenuItem(id: string) {
    setStatus('');
    setError('');
    const response = await fetch(`/api/admin/menu-items?id=${encodeURIComponent(id)}`, {
      method: 'DELETE',
      headers: await getChefAuthHeaders(),
    });
    const result = await response.json();

    if (!response.ok) {
      setError(result.error ?? 'Could not delete menu item.');
      return;
    }

    setStatus('Menu item deleted.');
    await loadOverview();
  }

  async function submitAdForm(event: FormEvent<HTMLFormElement>, id?: string) {
    event.preventDefault();
    setStatus('');
    setError('');

    const form = new FormData(event.currentTarget);
    if (id) form.set('id', id);
    form.set('active', form.get('active') === 'on' ? 'on' : 'false');

    const response = await fetch('/api/admin/homepage-ads', {
      method: id ? 'PATCH' : 'POST',
      headers: await getChefAuthHeaders(),
      body: form,
    });
    const result = await response.json();

    if (!response.ok) {
      setError(result.error ?? 'Could not save homepage ad.');
      return;
    }

    setStatus(id ? 'Homepage ad updated.' : 'Homepage ad uploaded.');
    event.currentTarget.reset();
    await loadOverview();
  }

  async function deleteHomepageAd(id: string) {
    setStatus('');
    setError('');
    const response = await fetch(`/api/admin/homepage-ads?id=${encodeURIComponent(id)}`, {
      method: 'DELETE',
      headers: await getChefAuthHeaders(),
    });
    const result = await response.json();

    if (!response.ok) {
      setError(result.error ?? 'Could not delete homepage ad.');
      return;
    }

    setStatus('Homepage ad deleted and media files removed.');
    await loadOverview();
  }

  async function setHomepageAdsEnabled(enabled: boolean) {
    setStatus('');
    setError('');
    const response = await fetch('/api/admin/homepage-ad-settings', {
      method: 'PATCH',
      headers: {
        'Content-Type': 'application/json',
        ...(await getChefAuthHeaders()),
      },
      body: JSON.stringify({ enabled }),
    });
    const result = await response.json();

    if (!response.ok) {
      setError(result.error ?? 'Could not update homepage ads setting.');
      return;
    }

    setStatus(enabled ? 'Homepage ads enabled.' : 'Homepage ads hidden.');
    await loadOverview();
  }

  function handleMenuSubmit(event: FormEvent<HTMLFormElement>, id?: string) {
    event.preventDefault();
    const form = new FormData(event.currentTarget);
    void submitJson('/api/admin/menu-items', id ? 'PATCH' : 'POST', {
      id,
      name: form.get('name'),
      description: form.get('description'),
      price: 0,
      category: form.get('category'),
      program_slug: form.get('program_slug') || menuProgram,
      photo_url: form.get('photo_url'),
      servings: Number(form.get('servings') ?? 1),
      protein_grams: form.get('protein_grams') ? Number(form.get('protein_grams')) : null,
      ingredients: String(form.get('ingredients') ?? ''),
      is_free_sample: form.get('is_free_sample') === 'on',
      active: form.get('active') === 'on',
    });
  }

  function handleMealPlanSubmit(event: FormEvent<HTMLFormElement>, id?: string) {
    event.preventDefault();
    const form = new FormData(event.currentTarget);
    void submitJson('/api/admin/meal-plans', id ? 'PATCH' : 'POST', {
      id,
      name: form.get('name'),
      description: form.get('description'),
      price: Number(form.get('price') ?? 0),
      duration: form.get('duration'),
      active: form.get('active') === 'on',
    });
  }

  function handleProgramSubmit(event: FormEvent<HTMLFormElement>, planId: string, hasCustomPrices: boolean) {
    event.preventDefault();
    const form = new FormData(event.currentTarget);
    void submitJson('/api/admin/program-plans', 'PATCH', {
      plan_id: planId,
      name: form.get('name'),
      duration: form.get('duration'),
      price: Number(form.get('price') ?? 0),
      highlight: form.get('highlight'),
      active: form.get('active') === 'on',
      custom_prices: hasCustomPrices
        ? {
            breakfast: Number(form.get('breakfast_price') ?? 0),
            lunch: Number(form.get('lunch_price') ?? 0),
            dinner: Number(form.get('dinner_price') ?? 0),
          }
        : undefined,
    });
  }

  async function handleLogout() {
    await fetch('/api/admin/session', { method: 'DELETE' }).catch(() => undefined);
    clearChefSession();
    router.push('/chef');
  }

  if (!isAuthorized) return null;

  return (
    <main className={styles.dashboard}>
      <section className={styles.shell}>
        <aside className={styles.sideRail}>
          <div className={styles.brandBlock}>
            <span>PF</span>
            <div>
              <strong>Chef Portal</strong>
              <small>Kitchen command</small>
            </div>
          </div>

          <nav className={styles.railNav} aria-label="Chef workspace">
            {tabs.map((tab) => {
              const Icon = tab.icon;
              return (
                <button
                  key={tab.id}
                  type="button"
                  className={activeTab === tab.id ? styles.railActive : styles.railButton}
                  onClick={() => setActiveTab(tab.id)}
                >
                  <Icon size={18} />
                  <span>{tab.label}</span>
                </button>
              );
            })}
          </nav>

          <div className={styles.railCard}>
            <span>Today</span>
            <strong>{pendingOrders.length + sampleRequests.length}</strong>
            <small>orders and samples need action</small>
          </div>
        </aside>

        <section className={styles.workspace}>
          <header className={styles.header}>
            <div>
              <p className={styles.eyebrow}>Project Fit Vizag</p>
              <h1>Chef operations</h1>
              <p>Confirm paid plans, inspect customer details, and keep menus and pricing current.</p>
            </div>
            <div className={styles.headerActions}>
              <button type="button" className={styles.secondaryBtn} onClick={loadOverview}>
                <RefreshCw size={16} />
                Refresh
              </button>
              <button type="button" className={styles.secondaryBtn} onClick={handleLogout}>
                <LogOut size={16} />
                Sign out
              </button>
            </div>
          </header>

          <section className={styles.stats}>
            <Metric label="Registered users" value={data.users.length} />
            <Metric label="Active plans" value={activePlans.length} />
            <Metric label="Pending confirmation" value={pendingOrders.length} />
            <Metric label="Sample requests" value={sampleRequests.length} />
          </section>

          <section className={styles.toolbar}>
            <div className={styles.mobileTabs}>
              {tabs.map((tab) => (
                <button
                  key={tab.id}
                  type="button"
                  className={activeTab === tab.id ? styles.tabActive : styles.tab}
                  onClick={() => setActiveTab(tab.id)}
                >
                  {tab.label}
                </button>
              ))}
            </div>
            <label className={styles.search}>
              <Search size={16} />
              <input value={query} onChange={(event) => setQuery(event.target.value)} placeholder="Search user, order, phone, pincode" />
            </label>
          </section>

          {data.warnings?.map((warning) => (
            <p key={warning} className={styles.warning}>{warning}</p>
          ))}
          {error && <p className={styles.error}>{error}</p>}
          {status && <p className={styles.status}>{status}</p>}

          {isLoading ? (
            <LoadingState />
          ) : (
            <>
              {activeTab === 'pending' && (
                <section className={styles.orderBoard}>
                  <div className={styles.sectionHead}>
                    <div>
                      <h2>Pending orders</h2>
                      <p>Confirm only after matching WhatsApp payment screenshot, order ID, user ID, and amount.</p>
                    </div>
                    <span>{filteredOrders.length} waiting</span>
                  </div>

                  {filteredOrders.length === 0 ? (
                    <EmptyState title="No pending orders" text="New manual payment orders will appear here after checkout." />
                  ) : (
                    <div className={styles.orderGrid}>
                      {filteredOrders.map((order) => (
                        <OrderCard
                          key={order.id}
                          order={order}
                          onPatch={patchOrder}
                          onResetFreeSampleLimit={resetFreeSampleLimit}
                        />
                      ))}
                    </div>
                  )}
                </section>
              )}

              {activeTab === 'samples' && (
                <section className={styles.orderBoard}>
                  <div className={styles.sectionHead}>
                    <div>
                      <h2>Free sample requests</h2>
                      <p>These requests were created only after the customer sent the WhatsApp checkout message.</p>
                    </div>
                    <span>{filteredSampleOrders.length} pending</span>
                  </div>

                  {filteredSampleOrders.length === 0 ? (
                    <EmptyState title="No pending free sample requests" text="Requests appear here after the customer sends the WhatsApp checkout message." />
                  ) : (
                    <div className={styles.orderGrid}>
                      {filteredSampleOrders.map((order) => (
                        <OrderCard
                          key={order.id}
                          order={order}
                          onPatch={patchOrder}
                          onResetFreeSampleLimit={resetFreeSampleLimit}
                        />
                      ))}
                    </div>
                  )}
                </section>
              )}

              {activeTab === 'approved-samples' && (
                <section className={styles.orderBoard}>
                  <div className={styles.sectionHead}>
                    <div>
                      <h2>Approved free samples</h2>
                      <p>Track samples after chef approval and customer delivery confirmation.</p>
                    </div>
                    <span>{filteredApprovedSampleOrders.length} approved</span>
                  </div>

                  {filteredApprovedSampleOrders.length === 0 ? (
                    <EmptyState title="No approved free samples" text="Accepted free sample requests will move here." />
                  ) : (
                    <div className={styles.orderGrid}>
                      {filteredApprovedSampleOrders.map((order) => (
                        <OrderCard
                          key={order.id}
                          order={order}
                          onPatch={patchOrder}
                          onResetFreeSampleLimit={resetFreeSampleLimit}
                        />
                      ))}
                    </div>
                  )}
                </section>
              )}

              {activeTab === 'sample-status' && (
                <section className={styles.orderBoard}>
                  <div className={styles.sectionHead}>
                    <div>
                      <h2>Free sample status</h2>
                      <p>See every free sample request and whether the customer marked it pending, received, or not received.</p>
                    </div>
                    <span>{filteredSampleStatusOrders.length} samples</span>
                  </div>

                  <section className={styles.stats}>
                    <Metric label="Pending response" value={sampleStatusOrders.filter((order) => order.customer_delivery_status === 'pending').length} />
                    <Metric label="Received" value={sampleStatusOrders.filter((order) => order.customer_delivery_status === 'received').length} />
                    <Metric label="Not received" value={sampleStatusOrders.filter((order) => order.customer_delivery_status === 'not_received').length} />
                    <Metric label="Cancelled" value={sampleStatusOrders.filter((order) => order.status === 'cancelled').length} />
                  </section>

                  {filteredSampleStatusOrders.length === 0 ? (
                    <EmptyState title="No free sample history" text="Free sample requests will appear here after WhatsApp checkout." />
                  ) : (
                    <div className={styles.orderGrid}>
                      {filteredSampleStatusOrders.map((order) => (
                        <OrderCard
                          key={order.id}
                          order={order}
                          onPatch={patchOrder}
                          onResetFreeSampleLimit={resetFreeSampleLimit}
                        />
                      ))}
                    </div>
                  )}
                </section>
              )}

              {activeTab === 'chats' && (
                <section className={styles.chatShell}>
                  <aside className={styles.chatList}>
                    <div className={styles.sectionHead}>
                      <div>
                        <h2>WhatsApp chats</h2>
                        <p>Customer messages received on the Project Fit WhatsApp number.</p>
                      </div>
                      <span>{filteredWhatsappConversations.length} chats</span>
                    </div>

                    {filteredWhatsappConversations.length === 0 ? (
                      <EmptyState title="No WhatsApp chats" text="Incoming customer messages will appear here after webhook delivery." />
                    ) : (
                      filteredWhatsappConversations.map((conversation) => (
                        <button
                          key={conversation.phone}
                          type="button"
                          className={selectedConversation?.phone === conversation.phone ? styles.chatRowActive : styles.chatRow}
                          onClick={() => setSelectedChatPhone(conversation.phone)}
                        >
                          <span className={styles.chatAvatar}>
                            {(conversation.user?.name ?? conversation.phone).slice(0, 1).toUpperCase()}
                          </span>
                          <span>
                            <strong>{conversation.user?.name ?? `+${conversation.phone}`}</strong>
                            <small>{getWhatsAppMessageText(conversation.lastMessage)}</small>
                          </span>
                          <em>
                            {conversation.unreadCount > 0 && <b className={styles.unreadBadge}>{conversation.unreadCount}</b>}
                            {formatDateTime(conversation.lastMessage.created_at)}
                          </em>
                        </button>
                      ))
                    )}
                  </aside>

                  <section className={styles.chatPanel}>
                    {!selectedConversation ? (
                      <EmptyState title="No chat selected" text="Select a WhatsApp conversation to read messages." />
                    ) : (
                      <>
                        <header className={styles.chatHeader}>
                          <div>
                            <h2>{selectedConversation.user?.name ?? `+${selectedConversation.phone}`}</h2>
                            <p>
                              +{selectedConversation.phone}
                              {selectedConversation.user?.email ? ` | ${selectedConversation.user.email}` : ''}
                            </p>
                          </div>
                          <span className={isReplyWindowOpen(selectedConversation.lastIncomingAt) ? styles.windowOpen : styles.windowClosed}>
                            {getReplyWindowLabel(selectedConversation.lastIncomingAt)}
                          </span>
                        </header>

                        <div className={styles.messageThread} ref={messageThreadRef}>
                          {selectedConversation.messages.map((message) => (
                            <WhatsAppBubble key={message.id} message={message} />
                          ))}
                        </div>

                        <form className={styles.chatComposer} onSubmit={sendChatReply}>
                          <textarea
                            value={chatDraft}
                            onChange={(event) => setChatDraft(event.target.value)}
                            placeholder={
                              isReplyWindowOpen(selectedConversation.lastIncomingAt)
                                ? 'Reply to customer on WhatsApp'
                                : 'Customer must message again before you can reply'
                            }
                            rows={3}
                            disabled={!isReplyWindowOpen(selectedConversation.lastIncomingAt) || isSendingChat}
                          />
                          <button
                            type="submit"
                            disabled={!chatDraft.trim() || !isReplyWindowOpen(selectedConversation.lastIncomingAt) || isSendingChat}
                          >
                            <Send size={16} />
                            Send reply
                          </button>
                        </form>
                      </>
                    )}
                  </section>
                </section>
              )}

              {activeTab === 'delivery-calendar' && (
                <section className={styles.orderBoard}>
                  <div className={styles.sectionHead}>
                    <div>
                      <h2>Delivery calendar</h2>
                      <p>Rolling next-month view of active plan deliveries. Paused dates and Sundays are excluded.</p>
                    </div>
                    <span>{deliveryCalendar.reduce((count, day) => count + day.orders.length, 0)} scheduled meals</span>
                  </div>

                  <div className={styles.deliveryCalendar}>
                    {deliveryCalendar.map((day) => (
                      <article key={day.dateKey} className={styles.deliveryDay}>
                        <header>
                          <div>
                            <strong>{formatDateKeyForDisplay(day.dateKey)}</strong>
                            <span>{new Date(`${day.dateKey}T00:00:00`).toLocaleDateString('en-IN', { weekday: 'long' })}</span>
                          </div>
                          <em>{day.isSunday ? 'Kitchen off' : `${day.orders.length} order${day.orders.length === 1 ? '' : 's'}`}</em>
                        </header>

                        {day.isSunday ? (
                          <p className={styles.deliveryOff}>No regular deliveries on Sunday.</p>
                        ) : day.orders.length === 0 ? (
                          <p className={styles.deliveryOff}>No active plan deliveries.</p>
                        ) : (
                          <div className={styles.deliveryGroups}>
                            {([
                              ['day', 'Day plans'],
                              ['week', 'Week plans'],
                              ['month', 'Month plans'],
                            ] as const).map(([groupKey, label]) => {
                              const groupOrders = day.groups[groupKey];
                              if (groupOrders.length === 0) return null;

                              return (
                                <section key={groupKey} className={styles.deliveryGroup}>
                                  <h3>{label}</h3>
                                  {groupOrders.map((order) => {
                                    const user = order.user_id ? usersById.get(order.user_id) : null;
                                    return (
                                      <div key={order.id} className={styles.deliveryOrder}>
                                        <strong>{order.customer_name || user?.name || 'Customer'}</strong>
                                        <span>{order.items.map((item) => item.name).join(', ')}</span>
                                        {getOrderMealSlotsText(order) && <small>{getOrderMealSlotsText(order)}</small>}
                                        <small>
                                          {order.id} | {order.delivery_address.phone}
                                        </small>
                                      </div>
                                    );
                                  })}
                                </section>
                              );
                            })}
                          </div>
                        )}
                      </article>
                    ))}
                  </div>
                </section>
              )}

              {activeTab === 'half-payments' && (
                <section className={styles.orderBoard}>
                  <div className={styles.sectionHead}>
                    <div>
                      <h2>Half payment plans</h2>
                      <p>These customers paid the first half. Confirm the remaining payment to move them into active plans.</p>
                    </div>
                    <span>{filteredHalfPaymentOrders.length} pending balance</span>
                  </div>

                  {filteredHalfPaymentOrders.length === 0 ? (
                    <EmptyState title="No half-payment plans" text="Monthly plans with first-half payment confirmed will appear here." />
                  ) : (
                    <div className={styles.orderGrid}>
                      {filteredHalfPaymentOrders.map((order) => (
                        <OrderCard
                          key={order.id}
                          order={order}
                          onPatch={patchOrder}
                          onResetFreeSampleLimit={resetFreeSampleLimit}
                        />
                      ))}
                    </div>
                  )}
                </section>
              )}

              {activeTab === 'active' && (
                <section className={styles.orderBoard}>
                  <div className={styles.sectionHead}>
                    <div>
                      <h2>Active plans</h2>
                      <p>Monthly plans run for 30 calendar days with 26 service days. Sundays do not consume a service day.</p>
                    </div>
                    <span>{activePlans.length} active</span>
                  </div>

                  {activePlans.length === 0 ? (
                    <EmptyState title="No active plans" text="Confirmed orders with plan dates will appear here." />
                  ) : (
                    <div className={styles.orderGrid}>
                      {activePlans.map((order) => (
                        <OrderCard
                          key={order.id}
                          order={order}
                          onPatch={patchOrder}
                          onResetFreeSampleLimit={resetFreeSampleLimit}
                        />
                      ))}
                    </div>
                  )}
                </section>
              )}

              {activeTab === 'completed' && (
                <section className={styles.orderBoard}>
                  <div className={styles.sectionHead}>
                    <div>
                      <h2>Completed orders</h2>
                      <p>Plans that naturally ended or were closed midway after the first half payment.</p>
                    </div>
                    <span>{filteredCompletedOrders.length} completed</span>
                  </div>

                  {filteredCompletedOrders.length === 0 ? (
                    <EmptyState title="No completed orders" text="Expired or midway-stopped plans will appear here." />
                  ) : (
                    <div className={styles.orderGrid}>
                      {filteredCompletedOrders.map((order) => (
                        <OrderCard
                          key={order.id}
                          order={order}
                          onPatch={patchOrder}
                          onResetFreeSampleLimit={resetFreeSampleLimit}
                        />
                      ))}
                    </div>
                  )}
                </section>
              )}

              {activeTab === 'plan-history' && (
                <section className={styles.orderBoard}>
                  <div className={styles.sectionHead}>
                    <div>
                      <h2>Plan history</h2>
                      <p>All paid plan orders, including pending, active, cancelled, and expired/completed plans.</p>
                    </div>
                    <span>{filteredPlanHistoryOrders.length} plans</span>
                  </div>

                  <section className={styles.stats}>
                    <Metric label="Pending" value={planHistoryOrders.filter((order) => order.status === 'new' || order.payment_status === 'pending').length} />
                    <Metric label="Active" value={activePlans.length} />
                    <Metric label="Cancelled" value={planHistoryOrders.filter((order) => order.status === 'cancelled').length} />
                    <Metric label="Expired" value={planHistoryOrders.filter((order) => order.plan_expires_at && new Date(order.plan_expires_at) < new Date()).length} />
                  </section>

                  {filteredPlanHistoryOrders.length === 0 ? (
                    <EmptyState title="No plan history" text="Paid plan orders will appear here after checkout." />
                  ) : (
                    <div className={styles.orderGrid}>
                      {filteredPlanHistoryOrders.map((order) => (
                        <OrderCard
                          key={order.id}
                          order={order}
                          onPatch={patchOrder}
                          onResetFreeSampleLimit={resetFreeSampleLimit}
                        />
                      ))}
                    </div>
                  )}
                </section>
              )}

              {activeTab === 'users' && (
                <section className={styles.userLayout}>
                  <div className={styles.userList}>
                    <div className={styles.sectionHead}>
                      <div>
                        <h2>Users</h2>
                        <p>Click a user ID to inspect signup and profile details.</p>
                      </div>
                    </div>
                    {filteredUsers.map((user) => (
                      <button
                        key={user.id}
                        type="button"
                        className={selectedUser?.id === user.id ? styles.userRowActive : styles.userRow}
                        onClick={() => setSelectedUserId(user.id)}
                      >
                        <span className={styles.mono}>{user.id}</span>
                        <strong>{user.name}</strong>
                        <small>{user.phone || user.email}</small>
                        <ChevronRight size={16} />
                      </button>
                    ))}
                  </div>
                  <UserDetail user={selectedUser} profile={selectedProfile} orders={selectedUserOrders} feedback={selectedUserFeedback} />
                </section>
              )}

              {activeTab === 'feedback' && (
                <section className={styles.orderBoard}>
                  <div className={styles.sectionHead}>
                    <div>
                      <h2>Customer feedback</h2>
                      <p>All feedback submitted from customer profiles, newest first.</p>
                    </div>
                    <span>{data.feedback.length} total</span>
                  </div>

                  {data.feedback.length === 0 ? (
                    <EmptyState title="No feedback yet" text="Customer feedback submitted from profile pages will appear here." />
                  ) : (
                    <div className={styles.feedbackGrid}>
                      {data.feedback.map((item) => (
                        <article key={item.id} className={styles.feedbackCard}>
                          <div>
                            <strong>{item.customer_name ?? 'Project Fit customer'}</strong>
                            <span>{item.customer_email ?? item.user_id}</span>
                          </div>
                          <p>{item.message}</p>
                          <small>{formatDateTime(item.created_at)}</small>
                        </article>
                      ))}
                    </div>
                  )}
                </section>
              )}

              {activeTab === 'ads' && (
                <section className={styles.adsStudio}>
                  <div className={styles.sectionHead}>
                    <div>
                      <h2>Homepage ads</h2>
                      <p>Upload image or video promotions for the homepage board. Active ads show by priority inside their date range.</p>
                    </div>
                    <button
                      type="button"
                      className={data.homepageAdSettings.enabled ? styles.switchActive : styles.switchButton}
                      onClick={() => setHomepageAdsEnabled(!data.homepageAdSettings.enabled)}
                    >
                      {data.homepageAdSettings.enabled ? 'Homepage ads visible' : 'Homepage ads hidden'}
                    </button>
                  </div>

                  <section className={styles.editorGrid}>
                    <HomepageAdEditor
                      title="Upload new ad"
                      onSubmit={submitAdForm}
                    />
                    {data.homepageAds.map((ad) => (
                      <HomepageAdEditor
                        key={ad.id}
                        title={`Priority ${ad.priority}: ${ad.caption}`}
                        ad={ad}
                        onSubmit={(event) => submitAdForm(event, ad.id)}
                        onDelete={() => deleteHomepageAd(ad.id)}
                      />
                    ))}
                  </section>
                </section>
              )}

              {activeTab === 'menu' && (
                <section className={styles.menuStudio}>
                  <div className={styles.sectionHead}>
                    <div>
                      <h2>Menu management</h2>
                      <p>Edit the main menu or program-specific menus for all six programs.</p>
                    </div>
                  </div>
                  <div className={styles.programSwitch}>
                    {menuMode === 'menu' && (
                      <button type="button" className={menuProgram === 'main' ? styles.switchActive : styles.switchButton} onClick={() => setMenuProgram('main')}>
                        Main menu
                      </button>
                    )}
                    {dietCategories.map((diet) => (
                      <button key={diet.slug} type="button" className={menuProgram === diet.slug ? styles.switchActive : styles.switchButton} onClick={() => setMenuProgram(diet.slug)}>
                        {diet.shortTitle}
                      </button>
                    ))}
                  </div>
                  <div className={styles.programSwitch}>
                    <button type="button" className={menuMode === 'menu' ? styles.switchActive : styles.switchButton} onClick={() => setMenuMode('menu')}>
                      Plan menu
                    </button>
                    <button type="button" className={menuMode === 'free_sample' ? styles.switchActive : styles.switchButton} onClick={() => setMenuMode('free_sample')}>
                      Free samples
                    </button>
                  </div>
                  <section className={styles.editorGrid}>
                    <MenuEditor
                      title={`Add ${menuMode === 'free_sample' ? 'free sample' : 'item'} to ${menuProgram === 'main' ? 'main menu' : menuProgram}`}
                      programSlug={menuProgram}
                      isFreeSample={menuMode === 'free_sample'}
                      onSubmit={handleMenuSubmit}
                    />
                    {visibleMenuItems.map((item) => (
                      <MenuEditor
                        key={item.id}
                        title={item.name}
                        item={item}
                        programSlug={menuProgram}
                        isFreeSample={menuMode === 'free_sample'}
                        onSubmit={(event) => handleMenuSubmit(event, item.id)}
                        onDelete={() => deleteMenuItem(item.id)}
                      />
                    ))}
                  </section>
                </section>
              )}

              {activeTab === 'pricing' && (
                <section className={styles.pricingGrid}>
                  {dietCategories.map((diet) => (
                    <article key={diet.slug} className={styles.programCard}>
                      <div className={styles.programTitle}>
                        <h2>{diet.shortTitle}</h2>
                        <span>{diet.plans.length} plan entries</span>
                      </div>
                      <div className={styles.programPlans}>
                        {diet.plans.map((plan) => {
                          const override = overridesByPlanId.get(plan.id);
                          const item = {
                            name: override?.name || plan.name,
                            duration: override?.duration || plan.duration,
                            price: override?.price ?? plan.price,
                            highlight: override?.highlight || plan.highlight,
                            active: override?.active ?? true,
                            customPrices: plan.customPrices
                              ? { ...plan.customPrices, ...(override?.custom_prices ?? {}) }
                              : undefined,
                          };

                          return (
                            <ProgramPlanEditor
                              key={plan.id}
                              title={plan.name}
                              item={item}
                              onSubmit={(event) => handleProgramSubmit(event, plan.id, Boolean(plan.customPrices))}
                            />
                          );
                        })}
                      </div>
                    </article>
                  ))}
                </section>
              )}

              {activeTab === 'pricing' && data.mealPlans.length > 0 && (
                <section className={styles.legacyPlans}>
                  <h2>General meal plans</h2>
                  <div className={styles.editorGrid}>
                    <MealPlanEditor title="Add general plan" onSubmit={handleMealPlanSubmit} />
                    {data.mealPlans.map((plan) => (
                      <MealPlanEditor key={plan.id} title={plan.name} item={plan} onSubmit={(event) => handleMealPlanSubmit(event, plan.id)} />
                    ))}
                  </div>
                </section>
              )}
            </>
          )}
        </section>
      </section>
    </main>
  );
}

function Metric({ label, value }: { label: string; value: number }) {
  return (
    <div className={styles.metric}>
      <span>{label}</span>
      <strong>{value}</strong>
    </div>
  );
}

function WhatsAppBubble({ message }: { message: WhatsAppMessageLog }) {
  const media = getWhatsAppMedia(message);
  const isIncoming = message.direction === 'incoming';

  return (
    <article className={isIncoming ? styles.messageIncoming : styles.messageOutgoing}>
      {media && <WhatsAppMediaPreview media={media} />}
      <p>{getWhatsAppMessageText(message)}</p>
      <footer>
        <span>{formatDateTime(message.created_at)}</span>
        <span className={message.direction === 'outgoing' && message.status === 'read' ? styles.readReceipt : undefined}>
          {getWhatsAppDeliveryLabel(message)}
        </span>
        {message.error_message && <span>{message.error_message}</span>}
      </footer>
    </article>
  );
}

function WhatsAppMediaPreview({ media }: { media: WhatsAppMedia }) {
  const [src, setSrc] = useState('');
  const [error, setError] = useState('');

  useEffect(() => {
    let cancelled = false;
    let objectUrl = '';

    async function loadMedia() {
      if (media.type !== 'image') return;

      try {
        const response = await fetch(`/api/admin/whatsapp/media/${encodeURIComponent(media.id)}`, {
          cache: 'no-store',
          headers: await getChefAuthHeaders(),
        });

        if (!response.ok) {
          const data = await response.json().catch(() => ({}));
          throw new Error(data.error ?? 'Could not load image.');
        }

        const blob = await response.blob();
        objectUrl = URL.createObjectURL(blob);
        if (!cancelled) setSrc(objectUrl);
      } catch (err) {
        if (!cancelled) setError(err instanceof Error ? err.message : 'Could not load image.');
      }
    }

    void loadMedia();

    return () => {
      cancelled = true;
      if (objectUrl) URL.revokeObjectURL(objectUrl);
    };
  }, [media.id, media.type]);

  if (media.type !== 'image') {
    return (
      <div className={styles.mediaDocument}>
        <strong>{media.filename ?? 'WhatsApp document'}</strong>
        <span>{media.mimeType ?? 'Document'}</span>
      </div>
    );
  }

  if (error) {
    return <div className={styles.mediaError}>{error}</div>;
  }

  if (!src) {
    return <div className={styles.mediaLoading}>Loading image...</div>;
  }

  return (
    // eslint-disable-next-line @next/next/no-img-element
    <img className={styles.chatImage} src={src} alt={media.caption || 'WhatsApp image'} />
  );
}

function OrderCard({
  order,
  onPatch,
  onResetFreeSampleLimit,
}: {
  order: ApiOrder;
  onPatch: (
    orderId: string,
    payload: {
      status?: ApiOrderStatus;
      payment_status?: PaymentStatus;
      action?: 'confirm' | 'cancel' | 'complete_payment' | 'send_payment_reminder' | 'stop_midway';
      confirmation_order_id?: string;
      confirmation_user_id?: string;
      payment_transaction_id?: string;
      cancellation_reason?: string;
      cancel_confirmation?: string;
    }
  ) => void;
  onResetFreeSampleLimit: (userId: string | null | undefined) => void;
}) {
  const [sampleCancelReason, setSampleCancelReason] = useState('');
  const [activeCancelConfirm, setActiveCancelConfirm] = useState('');
  const [activeCancelReason, setActiveCancelReason] = useState('');
  const [midwayReason, setMidwayReason] = useState('');
  const isActivePaidPlan =
    order.order_type !== 'free_sample' &&
    ['confirmed', 'preparing', 'ready'].includes(order.status) &&
    order.payment_status === 'paid';
  const serviceDaysRemaining = getOrderServiceDaysRemaining(order);

  function handleConfirm(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const form = new FormData(event.currentTarget);
    onPatch(order.id, {
      action: 'confirm',
      confirmation_order_id: String(form.get('confirmation_order_id') ?? ''),
      confirmation_user_id: String(form.get('confirmation_user_id') ?? ''),
      payment_transaction_id: String(form.get('payment_transaction_id') ?? ''),
    });
  }

  function handleCancelSample() {
    onPatch(order.id, {
      action: 'cancel',
      cancellation_reason: sampleCancelReason.trim(),
    });
    setSampleCancelReason('');
  }

  function handleCancelActivePlan() {
    onPatch(order.id, {
      action: 'cancel',
      cancel_confirmation: activeCancelConfirm.trim(),
      cancellation_reason: activeCancelReason.trim(),
    });
    setActiveCancelConfirm('');
    setActiveCancelReason('');
  }

  function handleCompleteRemainingPayment(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const form = new FormData(event.currentTarget);
    onPatch(order.id, {
      action: 'complete_payment',
      confirmation_order_id: String(form.get('confirmation_order_id') ?? ''),
      confirmation_user_id: String(form.get('confirmation_user_id') ?? ''),
      payment_transaction_id: String(form.get('payment_transaction_id') ?? ''),
    });
  }

  function handleSendRemainingPaymentReminder() {
    onPatch(order.id, { action: 'send_payment_reminder' });
  }

  function handleStopMidway() {
    onPatch(order.id, {
      action: 'stop_midway',
      cancellation_reason: midwayReason.trim(),
    });
    setMidwayReason('');
  }

  return (
    <article className={styles.orderCard}>
      <div className={styles.cardHeader}>
        <div>
          <span className={styles.mono}>{order.id}</span>
          <h3>{order.customer_name ?? 'Project Fit customer'}</h3>
          <p>{formatDateTime(order.created_at)}</p>
        </div>
      <div className={styles.badges}>
        <span>{order.order_type === 'free_sample' ? 'free sample' : 'paid plan'}</span>
        <span>{order.status}</span>
        <span className={order.payment_status === 'paid' ? styles.paid : styles.pending}>{order.payment_status}</span>
        {order.order_type === 'free_sample' && (
          <span className={order.customer_delivery_status === 'not_received' ? styles.pending : order.customer_delivery_status === 'received' ? styles.paid : ''}>
            {order.customer_delivery_status === 'pending'
              ? order.status === 'new'
                ? 'approval pending'
                : 'delivery pending'
              : order.customer_delivery_status.replace('_', ' ')}
          </span>
        )}
      </div>
      </div>
      <div className={styles.orderPlan}>
        <strong>{getPrimaryPlan(order)}</strong>
        <span>Rs {order.total.toLocaleString('en-IN')}</span>
      </div>
      {getOrderMealSlotsText(order) && (
        <div className={styles.detailBlock}>
          <p>{getOrderMealSlotsText(order)}</p>
        </div>
      )}
      <div className={styles.detailBlock}>
        <p>{order.delivery_address.phone} | {order.delivery_address.city} | {order.delivery_address.pincode}</p>
        <p>{order.delivery_address.addressLine1}{order.delivery_address.addressLine2 ? `, ${order.delivery_address.addressLine2}` : ''}</p>
        <p>Requested start: {formatDate(order.requested_start_date)}</p>
        {order.order_type !== 'free_sample' && (
          <p>Plan lifecycle: {getPlanLifecycleText(order)}</p>
        )}
        {order.order_type !== 'free_sample' && (
          <>
            <p>Payment choice: {order.payment_option === 'half' ? 'Half payment' : 'Full payment'}</p>
            <p>Initial payment: Rs {order.initial_payment_amount.toLocaleString('en-IN')}</p>
            {order.remaining_payment_amount > 0 && (
              <p>Remaining payment: Rs {order.remaining_payment_amount.toLocaleString('en-IN')} due {formatDate(order.remaining_payment_due_at)}</p>
            )}
          </>
        )}
        {isActivePaidPlan && (
          <>
            <p>Program start: {formatDate(order.plan_activated_at)}</p>
            <p>Program end: {formatDate(order.plan_expires_at)}</p>
            <p>Service days left: {serviceDaysRemaining ?? 'Not set'}</p>
          </>
        )}
        {order.order_type === 'free_sample' && (
          <>
            <p>Created after WhatsApp: {order.whatsapp_checkout_intent_id ? 'Yes' : 'Legacy/direct order'}</p>
            <p>Final sample status: {getFreeSampleStatusText(order)}</p>
            <p>
              Delivery confirmation:{' '}
              {order.customer_delivery_status === 'pending'
                ? 'Pending from customer'
                : order.customer_delivery_status === 'received'
                  ? 'Customer marked received'
                  : 'Customer marked not received'}
            </p>
            <p>Customer response time: {formatDateTime(order.customer_delivery_confirmed_at)}</p>
          </>
        )}
      </div>
      <div className={styles.items}>
        {order.items.map((item) => (
          <p key={`${order.id}-${item.id}`}>
            {item.quantity}x {item.name} | Rs {item.totalPrice.toLocaleString('en-IN')}
            {getMealSlotsLabel(item) ? ` | ${getMealSlotsLabel(item)}` : ''}
          </p>
        ))}
      </div>
      {order.status === 'new' && order.order_type !== 'free_sample' && (
        <form className={styles.confirmBox} onSubmit={handleConfirm}>
          <Field name="confirmation_order_id" label="Enter order ID" defaultValue="" required />
          <Field name="confirmation_user_id" label="Enter user ID" defaultValue="" required />
          <Field name="payment_transaction_id" label="Transaction ID" defaultValue="" required />
          <button type="submit">
            <ShieldCheck size={15} />
            Confirm order
          </button>
        </form>
      )}
      {order.payment_stage === 'half_paid' && (
        <>
          <div className={styles.actions}>
            <button type="button" onClick={handleSendRemainingPaymentReminder}>
              <MessageSquareText size={15} />
              Send payment reminder
            </button>
          </div>
          <form className={styles.confirmBox} onSubmit={handleCompleteRemainingPayment}>
            <Field name="confirmation_order_id" label="Re-enter order ID" defaultValue="" required />
            <Field name="confirmation_user_id" label="Re-enter user ID" defaultValue="" required />
            <Field name="payment_transaction_id" label="Remaining payment transaction ID" defaultValue="" required />
            <button type="submit">
              <ShieldCheck size={15} />
              Confirm remaining payment
            </button>
          </form>
        </>
      )}
      <div className={styles.actions}>
        {order.status === 'new' && order.order_type === 'free_sample' && (
          <button type="button" onClick={() => onPatch(order.id, { action: 'confirm' })}>
            <ShieldCheck size={15} />
            Approve and send buttons
          </button>
        )}
        {order.status === 'new' && order.order_type !== 'free_sample' && (
          <button type="button" className={styles.dangerBtn} onClick={() => onPatch(order.id, { action: 'cancel' })}>
            Cancel order
          </button>
        )}
        {order.order_type === 'free_sample' && (
          <button type="button" className={styles.secondaryBtn} onClick={() => onResetFreeSampleLimit(order.user_id)}>
            Reset sample limit
          </button>
        )}
      </div>
      {order.status === 'new' && order.order_type === 'free_sample' && (
        <div className={styles.confirmBox}>
          <label>
            <span>Cancel reason</span>
            <input
              value={sampleCancelReason}
              onChange={(event) => setSampleCancelReason(event.target.value)}
              placeholder="Optional reason shown to user"
            />
          </label>
          <button type="button" className={styles.dangerBtn} onClick={handleCancelSample}>
            Cancel free sample
          </button>
        </div>
      )}
      {isActivePaidPlan && (
        <div className={`${styles.confirmBox} ${styles.dangerBox}`}>
          <label>
            <span>Type confirm to cancel active plan</span>
            <input
              value={activeCancelConfirm}
              onChange={(event) => setActiveCancelConfirm(event.target.value)}
              placeholder="confirm"
            />
          </label>
          <label>
            <span>Cancellation reason</span>
            <input
              value={activeCancelReason}
              onChange={(event) => setActiveCancelReason(event.target.value)}
              placeholder="Shown in order history"
            />
          </label>
          <button
            type="button"
            className={styles.dangerBtn}
            disabled={activeCancelConfirm.trim().toLowerCase() !== 'confirm'}
            onClick={handleCancelActivePlan}
          >
            Cancel active plan
          </button>
        </div>
      )}
      {order.payment_stage === 'half_paid' && (
        <div className={`${styles.confirmBox} ${styles.dangerBox}`}>
          <label>
            <span>Close midway reason</span>
            <input
              value={midwayReason}
              onChange={(event) => setMidwayReason(event.target.value)}
              placeholder="Customer chose to stop after the first half"
            />
          </label>
          <button type="button" className={styles.dangerBtn} onClick={handleStopMidway}>
            Move to completed
          </button>
        </div>
      )}
      {order.status === 'cancelled' && getChefCancellationReason(order.cancellation_reason) && (
        <div className={styles.detailBlock}>
          <p>Cancel reason: {getChefCancellationReason(order.cancellation_reason)}</p>
        </div>
      )}
    </article>
  );
}

function UserDetail({
  user,
  profile,
  orders,
  feedback,
}: {
  user: ProjectFitUser | null;
  profile: CustomerProfile | null;
  orders: ApiOrder[];
  feedback: CustomerFeedback[];
}) {
  if (!user) {
    return <EmptyState title="No user selected" text="Registered users will appear here." />;
  }

  return (
    <aside className={styles.userDetail}>
      <div className={styles.detailHero}>
        <span className={styles.avatar}>{user.name.slice(0, 1).toUpperCase()}</span>
        <div>
          <h2>{user.name}</h2>
          <p>{user.email}</p>
          <span className={styles.mono}>{user.id}</span>
        </div>
      </div>
      <dl className={styles.detailGrid}>
        <div><dt>Phone</dt><dd>{user.phone || 'Not provided'}</dd></div>
        <div><dt>Joined</dt><dd>{formatDate(user.created_at)}</dd></div>
        <div><dt>Profile</dt><dd>{profile?.is_profile_complete ? 'Complete' : 'Incomplete'}</dd></div>
        <div><dt>Age</dt><dd>{profile?.age ?? 'Not set'}</dd></div>
        <div><dt>Gender</dt><dd>{profile?.gender ?? 'Not set'}</dd></div>
        <div><dt>Height</dt><dd>{profile ? `${profile.height_cm} cm` : 'Not set'}</dd></div>
        <div><dt>Weight</dt><dd>{profile ? `${profile.weight_kg} kg` : 'Not set'}</dd></div>
      </dl>
      <div className={styles.notesBox}>
        <strong>Health report</strong>
        {profile?.medical_report_file_data ? (
          <a
            className={styles.reportLink}
            href={profile.medical_report_file_data}
            target="_blank"
            rel="noreferrer"
            download={profile.medical_report_file_name ?? 'project-fit-health-report'}
          >
            View {profile.medical_report_file_name ?? 'uploaded report'}
          </a>
        ) : (
          <p>No report uploaded.</p>
        )}
      </div>
      <div className={styles.notesBox}>
        <strong>Notes</strong>
        <p>{profile?.health_notes || profile?.recommendation_summary || 'No profile notes yet.'}</p>
      </div>
      <div className={styles.orderHistory}>
        <strong>Orders</strong>
        {orders.length === 0 ? (
          <p>No orders yet.</p>
        ) : (
          orders.map((order) => (
            <div key={order.id}>
              <span className={styles.mono}>{order.id}</span>
              <small>{getPrimaryPlan(order)} | {order.status} | Rs {order.total.toLocaleString('en-IN')}</small>
            </div>
          ))
        )}
      </div>
      <div className={styles.orderHistory}>
        <strong>Feedback</strong>
        {feedback.length === 0 ? (
          <p>No feedback yet.</p>
        ) : (
          feedback.map((item) => (
            <div key={item.id}>
              <span>{item.message}</span>
              <small>{formatDateTime(item.created_at)}</small>
            </div>
          ))
        )}
      </div>
    </aside>
  );
}

function HomepageAdEditor({
  title,
  ad,
  onSubmit,
  onDelete,
}: {
  title: string;
  ad?: HomepageAd;
  onSubmit: (event: FormEvent<HTMLFormElement>) => void;
  onDelete?: () => void;
}) {
  const [desktopPreview, setDesktopPreview] = useState(ad?.media_url ?? '');
  const [desktopPreviewType, setDesktopPreviewType] = useState(ad?.media_type ?? 'image');
  const [mobilePreview, setMobilePreview] = useState(ad?.mobile_media_url ?? '');
  const [mobilePreviewType, setMobilePreviewType] = useState(ad?.mobile_media_type ?? 'image');
  const [posterPreview, setPosterPreview] = useState(ad?.poster_url ?? '');
  const [removeMobile, setRemoveMobile] = useState(false);
  const [removePoster, setRemovePoster] = useState(false);
  const [mediaError, setMediaError] = useState('');

  function isUnsupportedVideoPreview(src: string, path?: string | null) {
    const source = path || src;
    const cleanSrc = source.split('?')[0]?.toLowerCase() ?? '';
    return cleanSrc.endsWith('.mov') || cleanSrc.endsWith('.qt');
  }

  function getPlayableVideoPreview(src: string) {
    return src;
  }

  function getPreviewVideoType(src: string, path?: string | null) {
    const source = (path || src).split('?')[0]?.toLowerCase() ?? '';
    return source.endsWith('.webm') ? 'video/webm' : 'video/mp4';
  }

  function setPreviewFromFile(
    event: ChangeEvent<HTMLInputElement>,
    setPreview: (value: string) => void,
    setType?: (value: 'image' | 'video') => void,
    imagesOnly = false
  ) {
    const file = event.target.files?.[0];
    if (!file) return;

    if (imagesOnly && !file.type.startsWith('image/')) {
      setMediaError('Poster must be an image.');
      event.target.value = '';
      return;
    }

    if (!imagesOnly && !file.type.startsWith('image/') && !file.type.startsWith('video/')) {
      setMediaError('Upload an image, MP4 video, or WebM video file.');
      event.target.value = '';
      return;
    }

    if (!imagesOnly && file.type.startsWith('video/') && !['video/mp4', 'video/webm'].includes(file.type)) {
      setMediaError('This video format will not play in browsers. Convert it to MP4 or WebM before uploading.');
      event.target.value = '';
      return;
    }

    setMediaError('');
    setPreview(URL.createObjectURL(file));
    if (setType) setType(file.type.startsWith('video/') ? 'video' : 'image');
  }

  function renderPreview(src: string, type: 'image' | 'video' | null | undefined, label: string, path?: string | null) {
    if (!src) return null;
    return (
      <div className={styles.adPreview}>
        <span>{label}</span>
        {type === 'video' && !isUnsupportedVideoPreview(src, path) ? (
          <video muted controls playsInline preload="metadata">
            <source src={getPlayableVideoPreview(src)} type={getPreviewVideoType(src, path)} />
          </video>
        ) : type === 'video' ? (
          <div className={styles.adVideoFallback}>
            Convert this video to MP4 or WebM and upload it again.
          </div>
        ) : (
          // eslint-disable-next-line @next/next/no-img-element
          <img src={src} alt={`${title} ${label}`} />
        )}
      </div>
    );
  }

  return (
    <form className={styles.editorCard} onSubmit={onSubmit}>
      <div className={styles.editorTitle}>
        <ImageIcon size={16} />
        <h3>{title}</h3>
      </div>

      {ad?.id && <input type="hidden" name="id" value={ad.id} />}
      <input type="hidden" name="remove_mobile_media" value={removeMobile ? 'true' : 'false'} />
      <input type="hidden" name="remove_poster" value={removePoster ? 'true' : 'false'} />

      {renderPreview(
        desktopPreview,
        desktopPreviewType,
        'Desktop media',
        desktopPreview === ad?.media_url ? ad?.media_path : null
      )}
      <label>
        <span>Desktop image or video</span>
        <input
          name="media"
          type="file"
          accept="image/jpeg,image/png,image/webp,image/gif,video/mp4,video/webm"
          required={!ad}
          onChange={(event) => setPreviewFromFile(event, setDesktopPreview, setDesktopPreviewType)}
        />
      </label>

      {renderPreview(
        !removeMobile ? mobilePreview : '',
        mobilePreviewType,
        'Mobile media',
        mobilePreview === ad?.mobile_media_url ? ad?.mobile_media_path : null
      )}
      <label>
        <span>Mobile image or video</span>
        <input
          name="mobile_media"
          type="file"
          accept="image/jpeg,image/png,image/webp,image/gif,video/mp4,video/webm"
          onChange={(event) => {
            setRemoveMobile(false);
            setPreviewFromFile(event, setMobilePreview, setMobilePreviewType);
          }}
        />
      </label>
      {ad?.mobile_media_url && (
        <label className={styles.checkRow}>
          <input
            type="checkbox"
            checked={removeMobile}
            onChange={(event) => setRemoveMobile(event.target.checked)}
          />
          Remove mobile media
        </label>
      )}

      {renderPreview(!removePoster ? posterPreview : '', 'image', 'Video poster')}
      <label>
        <span>Video poster image</span>
        <input
          name="poster"
          type="file"
          accept="image/jpeg,image/png,image/webp,image/gif"
          onChange={(event) => {
            setRemovePoster(false);
            setPreviewFromFile(event, setPosterPreview, undefined, true);
          }}
        />
      </label>
      {ad?.poster_url && (
        <label className={styles.checkRow}>
          <input
            type="checkbox"
            checked={removePoster}
            onChange={(event) => setRemovePoster(event.target.checked)}
          />
          Remove poster
        </label>
      )}

      {mediaError && <p className={styles.formError}>{mediaError}</p>}
      <label>
        <span>Short caption</span>
        <textarea name="caption" rows={3} defaultValue={ad?.caption ?? ''} required />
      </label>
      <Field name="priority" label="Priority order" type="number" defaultValue={ad?.priority ?? 0} required />
      <Field name="start_date" label="Start date" type="date" defaultValue={ad?.start_date ?? ''} />
      <Field name="end_date" label="End date" type="date" defaultValue={ad?.end_date ?? ''} />
      <Field name="cta_label" label="CTA label" defaultValue={ad?.cta_label ?? ''} />
      <Field name="cta_href" label="CTA link" type="url" defaultValue={ad?.cta_href ?? ''} />
      <label className={styles.checkRow}>
        <input name="active" type="checkbox" defaultChecked={ad?.active !== false} />
        Active
      </label>
      <div className={styles.formActions}>
        <button type="submit">Save ad</button>
        {onDelete && (
          <button type="button" className={styles.deleteBtn} onClick={onDelete}>
            <Trash2 size={15} />
            Delete ad
          </button>
        )}
      </div>
    </form>
  );
}

function MenuEditor({
  title,
  programSlug,
  isFreeSample,
  item,
  onSubmit,
  onDelete,
}: {
  title: string;
  programSlug: string;
  isFreeSample: boolean;
  item?: MenuItem;
  onSubmit: (event: FormEvent<HTMLFormElement>) => void;
  onDelete?: () => void;
}) {
  const [photoValue, setPhotoValue] = useState(item?.photo_url ?? '');
  const [photoError, setPhotoError] = useState('');

  function handlePhotoUpload(event: ChangeEvent<HTMLInputElement>) {
    const file = event.target.files?.[0];
    if (!file) return;

    if (!file.type.startsWith('image/')) {
      setPhotoError('Upload an image file.');
      event.target.value = '';
      return;
    }

    if (file.size > 1_500_000) {
      setPhotoError('Photo must be below 1.5 MB.');
      event.target.value = '';
      return;
    }

    const reader = new FileReader();
    reader.onload = () => {
      setPhotoValue(String(reader.result ?? ''));
      setPhotoError('');
    };
    reader.onerror = () => setPhotoError('Could not read this photo.');
    reader.readAsDataURL(file);
  }

  return (
    <form className={styles.editorCard} onSubmit={onSubmit}>
      <div className={styles.editorTitle}>
        <Pencil size={16} />
        <h3>{title}</h3>
      </div>
      <input type="hidden" name="program_slug" value={item?.program_slug ?? programSlug} />
      <input type="hidden" name="photo_url" value={photoValue} />
      <input type="hidden" name="is_free_sample" value={isFreeSample ? 'on' : ''} />
      <Field name="name" label="Item name" defaultValue={item?.name} required />
      <label>
        <span>Item photo</span>
        <input name="photo_file" type="file" accept="image/*" onChange={handlePhotoUpload} />
      </label>
      {photoValue && (
        <div className={styles.photoPreview}>
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img src={photoValue} alt={`${title} preview`} />
          <button type="button" className={styles.deleteBtn} onClick={() => setPhotoValue('')}>
            Remove photo
          </button>
        </div>
      )}
      {photoError && <p className={styles.formError}>{photoError}</p>}
      <Field name="category" label="Category" defaultValue={item?.category} required />
      <Field name="servings" label="Servings or portions" type="number" defaultValue={item?.servings ?? 1} required />
      <Field name="protein_grams" label="Protein grams" type="number" defaultValue={item?.protein_grams ?? ''} />
      <Field name="ingredients" label="Ingredients, comma separated" defaultValue={item?.ingredients?.join(', ') ?? ''} />
      <label>
        <span>Description</span>
        <textarea name="description" defaultValue={item?.description ?? ''} rows={3} />
      </label>
      <label className={styles.checkRow}>
        <input name="active" type="checkbox" defaultChecked={item?.active !== false} />
        Active
      </label>
      <div className={styles.formActions}>
        <button type="submit">Save menu item</button>
        {onDelete && (
          <button type="button" className={styles.deleteBtn} onClick={onDelete}>
            <Trash2 size={15} />
            Delete
          </button>
        )}
      </div>
    </form>
  );
}

function MealPlanEditor({
  title,
  item,
  onSubmit,
}: {
  title: string;
  item?: MealPlan;
  onSubmit: (event: FormEvent<HTMLFormElement>) => void;
}) {
  return (
    <form className={styles.editorCard} onSubmit={onSubmit}>
      <div className={styles.editorTitle}>
        <Pencil size={16} />
        <h3>{title}</h3>
      </div>
      <Field name="name" label="Name" defaultValue={item?.name} required />
      <Field name="duration" label="Duration" defaultValue={item?.duration} required />
      <Field name="price" label="Price" type="number" defaultValue={item?.price ?? 0} required />
      <label>
        <span>Description</span>
        <textarea name="description" defaultValue={item?.description ?? ''} rows={3} />
      </label>
      <label className={styles.checkRow}>
        <input name="active" type="checkbox" defaultChecked={item?.active !== false} />
        Active
      </label>
      <button type="submit">Save plan</button>
    </form>
  );
}

function ProgramPlanEditor({
  title,
  item,
  onSubmit,
}: {
  title: string;
  item: {
    name: string;
    duration: string;
    price: number;
    highlight: string;
    active: boolean;
    customPrices?: Partial<Record<'breakfast' | 'lunch' | 'dinner', number>>;
  };
  onSubmit: (event: FormEvent<HTMLFormElement>) => void;
}) {
  const hasCustomPrices = Boolean(item.customPrices);

  return (
    <form className={styles.compactEditor} onSubmit={onSubmit}>
      <h3>{title}</h3>
      <div className={styles.compactFields}>
        <Field name="name" label="Name" defaultValue={item.name} required />
        <Field name="duration" label="Duration" defaultValue={item.duration} required />
        {hasCustomPrices ? (
          <>
            <Field
              name="breakfast_price"
              label="Breakfast (monthly)"
              type="number"
              defaultValue={item.customPrices?.breakfast ?? 0}
              required
            />
            <Field
              name="lunch_price"
              label="Lunch (monthly)"
              type="number"
              defaultValue={item.customPrices?.lunch ?? 0}
              required
            />
            <Field
              name="dinner_price"
              label="Dinner (monthly)"
              type="number"
              defaultValue={item.customPrices?.dinner ?? 0}
              required
            />
          </>
        ) : (
          <Field name="price" label="Price" type="number" defaultValue={item.price} required />
        )}
        <Field name="highlight" label="Highlight" defaultValue={item.highlight} />
      </div>
      {hasCustomPrices && (
        <small className={styles.customPriceHint}>
          Customer picks 1 or 2 of these meal times per day — the price charged is the sum of whichever they pick.
        </small>
      )}
      <label className={styles.checkRow}>
        <input name="active" type="checkbox" defaultChecked={item.active} />
        Active
      </label>
      <button type="submit">Save</button>
    </form>
  );
}

function Field({
  name,
  label,
  type = 'text',
  defaultValue = '',
  required = false,
}: {
  name: string;
  label: string;
  type?: string;
  defaultValue?: string | number;
  required?: boolean;
}) {
  return (
    <label>
      <span>{label}</span>
      <input name={name} type={type} min={type === 'number' ? 0 : undefined} defaultValue={defaultValue} required={required} />
    </label>
  );
}

function EmptyState({ title, text }: { title: string; text: string }) {
  return (
    <section className={styles.empty}>
      <strong>{title}</strong>
      <p>{text}</p>
    </section>
  );
}

function LoadingState() {
  return (
    <section className={styles.loadingGrid}>
      <div />
      <div />
      <div />
    </section>
  );
}
