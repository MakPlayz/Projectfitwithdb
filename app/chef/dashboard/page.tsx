'use client';

import { FormEvent, useCallback, useEffect, useMemo, useState } from 'react';
import { useRouter } from 'next/navigation';
import {
  CalendarCheck,
  CheckCircle2,
  ChevronRight,
  ClipboardList,
  LogOut,
  Pencil,
  RefreshCw,
  Search,
  ShieldCheck,
  Soup,
  Trash2,
  UsersRound,
  WalletCards,
} from 'lucide-react';
import { dietCategories } from '@/data/diets';
import type { ApiOrder, ApiOrderStatus, CustomerProfile, MealPlan, MenuItem, PaymentStatus, ProjectFitUser } from '@/lib/backend-types';
import type { ProgramPlanOverride } from '@/lib/program-plan-overrides';
import { clearSession, getAuthHeaders, getSession } from '@/lib/auth-client';
import styles from './page.module.css';

type AdminOverview = {
  users: ProjectFitUser[];
  profiles: CustomerProfile[];
  orders: ApiOrder[];
  menuItems: MenuItem[];
  mealPlans: MealPlan[];
  programOverrides: ProgramPlanOverride[];
  warnings?: string[];
};

type Tab = 'pending' | 'active' | 'users' | 'menu' | 'pricing';

const emptyOverview: AdminOverview = {
  users: [],
  profiles: [],
  orders: [],
  menuItems: [],
  mealPlans: [],
  programOverrides: [],
  warnings: [],
};

const tabs: { id: Tab; label: string; icon: typeof ClipboardList }[] = [
  { id: 'pending', label: 'Pending orders', icon: ClipboardList },
  { id: 'active', label: 'Active plans', icon: CalendarCheck },
  { id: 'users', label: 'Users', icon: UsersRound },
  { id: 'menu', label: 'Menus', icon: Soup },
  { id: 'pricing', label: 'Pricing', icon: WalletCards },
];

function formatDate(value: string | null | undefined) {
  if (!value) return 'Not set';
  return new Intl.DateTimeFormat('en-IN', {
    day: '2-digit',
    month: 'short',
    year: 'numeric',
  }).format(new Date(value));
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

function daysLeft(value: string | null | undefined) {
  if (!value) return null;
  const diff = new Date(value).getTime() - Date.now();
  return Math.max(0, Math.ceil(diff / 86400000));
}

function getPrimaryPlan(order: ApiOrder) {
  return order.items[0]?.name ?? 'Meal plan';
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
  const [menuProgram, setMenuProgram] = useState('main');

  useEffect(() => {
    let cancelled = false;

    async function verifyAdmin() {
      const session = getSession();

      if (!session) {
        router.replace('/chef');
        return;
      }

      const response = await fetch('/api/admin/me', {
        cache: 'no-store',
        headers: await getAuthHeaders(),
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
        headers: await getAuthHeaders(),
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
  }, [isAuthorized, loadOverview]);

  const profilesByUserId = useMemo(
    () => new Map(data.profiles.map((profile) => [profile.user_id, profile])),
    [data.profiles]
  );
  const overridesByPlanId = useMemo(
    () => new Map(data.programOverrides.map((override) => [override.plan_id, override])),
    [data.programOverrides]
  );
  const normalizedQuery = query.trim().toLowerCase();

  const pendingOrders = data.orders.filter((order) => order.status === 'new' || order.payment_status === 'pending');
  const activePlans = data.orders.filter((order) => order.status === 'confirmed' && order.plan_expires_at && new Date(order.plan_expires_at) >= new Date());
  const selectedUser = data.users.find((user) => user.id === selectedUserId) ?? data.users[0] ?? null;
  const selectedProfile = selectedUser ? profilesByUserId.get(selectedUser.id) ?? null : null;
  const selectedUserOrders = selectedUser ? data.orders.filter((order) => order.user_id === selectedUser.id) : [];

  const filteredUsers = data.users.filter((user) => {
    if (!normalizedQuery) return true;
    const profile = profilesByUserId.get(user.id);
    return [user.id, user.name, user.email, user.phone, profile?.primary_goal, profile?.health_focus].some((value) =>
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

  const visibleMenuItems = data.menuItems.filter((item) => (item.program_slug || 'main') === menuProgram);

  async function patchOrder(
    orderId: string,
    payload: {
      status?: ApiOrderStatus;
      payment_status?: PaymentStatus;
      action?: 'confirm' | 'cancel';
      confirmation_order_id?: string;
      confirmation_user_id?: string;
      payment_transaction_id?: string;
    }
  ) {
    setStatus('');
    setError('');
    const response = await fetch(`/api/orders/${orderId}/status`, {
      method: 'PATCH',
      headers: {
        'Content-Type': 'application/json',
        ...(await getAuthHeaders()),
      },
      body: JSON.stringify(payload),
    });
    const result = await response.json();

    if (!response.ok) {
      setError(result.error ?? 'Could not update order.');
      return;
    }

    setData((current) => ({
      ...current,
      orders: current.orders.map((order) => (order.id === orderId ? result.order : order)),
    }));
    setStatus(payload.action === 'confirm' ? 'Order confirmed and plan dates were set.' : 'Order updated.');
  }

  async function submitJson(path: string, method: 'POST' | 'PATCH', payload: Record<string, unknown>) {
    setStatus('');
    setError('');
    const response = await fetch(path, {
      method,
      headers: {
        'Content-Type': 'application/json',
        ...(await getAuthHeaders()),
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
      headers: await getAuthHeaders(),
    });
    const result = await response.json();

    if (!response.ok) {
      setError(result.error ?? 'Could not delete menu item.');
      return;
    }

    setStatus('Menu item deleted.');
    await loadOverview();
  }

  function handleMenuSubmit(event: FormEvent<HTMLFormElement>, id?: string) {
    event.preventDefault();
    const form = new FormData(event.currentTarget);
    void submitJson('/api/admin/menu-items', id ? 'PATCH' : 'POST', {
      id,
      name: form.get('name'),
      description: form.get('description'),
      price: Number(form.get('price') ?? 0),
      category: form.get('category'),
      program_slug: form.get('program_slug') || menuProgram,
      photo_url: form.get('photo_url'),
      servings: Number(form.get('servings') ?? 1),
      protein_grams: form.get('protein_grams') ? Number(form.get('protein_grams')) : null,
      ingredients: String(form.get('ingredients') ?? ''),
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

  function handleProgramSubmit(event: FormEvent<HTMLFormElement>, planId: string) {
    event.preventDefault();
    const form = new FormData(event.currentTarget);
    void submitJson('/api/admin/program-plans', 'PATCH', {
      plan_id: planId,
      name: form.get('name'),
      duration: form.get('duration'),
      price: Number(form.get('price') ?? 0),
      highlight: form.get('highlight'),
      active: form.get('active') === 'on',
    });
  }

  function handleLogout() {
    clearSession();
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
            <strong>{pendingOrders.length}</strong>
            <small>orders need confirmation</small>
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
            <Metric label="Paid orders" value={data.orders.filter((order) => order.payment_status === 'paid').length} />
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
                        <OrderCard key={order.id} order={order} profile={order.user_id ? profilesByUserId.get(order.user_id) : null} onPatch={patchOrder} />
                      ))}
                    </div>
                  )}
                </section>
              )}

              {activeTab === 'active' && (
                <section className={styles.planGrid}>
                  {activePlans.length === 0 ? (
                    <EmptyState title="No active plans" text="Confirmed orders with plan dates will appear here." />
                  ) : (
                    activePlans.map((order) => (
                      <article key={order.id} className={styles.planCard}>
                        <div>
                          <span className={styles.badgeGreen}>Active</span>
                          <h2>{order.customer_name ?? 'Customer'}</h2>
                          <p>{getPrimaryPlan(order)}</p>
                        </div>
                        <dl className={styles.planMeta}>
                          <div><dt>Order</dt><dd>{order.id}</dd></div>
                          <div><dt>User ID</dt><dd>{order.user_id ?? 'Guest'}</dd></div>
                          <div><dt>Phone</dt><dd>{order.delivery_address.phone}</dd></div>
                          <div><dt>Activated</dt><dd>{formatDate(order.plan_activated_at)}</dd></div>
                          <div><dt>Expiry</dt><dd>{formatDate(order.plan_expires_at)}</dd></div>
                          <div><dt>Days left</dt><dd>{daysLeft(order.plan_expires_at) ?? 'Not set'}</dd></div>
                        </dl>
                      </article>
                    ))
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
                  <UserDetail user={selectedUser} profile={selectedProfile} orders={selectedUserOrders} />
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
                    <button type="button" className={menuProgram === 'main' ? styles.switchActive : styles.switchButton} onClick={() => setMenuProgram('main')}>
                      Main menu
                    </button>
                    {dietCategories.map((diet) => (
                      <button key={diet.slug} type="button" className={menuProgram === diet.slug ? styles.switchActive : styles.switchButton} onClick={() => setMenuProgram(diet.slug)}>
                        {diet.shortTitle}
                      </button>
                    ))}
                  </div>
                  <section className={styles.editorGrid}>
                    <MenuEditor title={`Add item to ${menuProgram === 'main' ? 'main menu' : menuProgram}`} programSlug={menuProgram} onSubmit={handleMenuSubmit} />
                    {visibleMenuItems.map((item) => (
                      <MenuEditor
                        key={item.id}
                        title={item.name}
                        item={item}
                        programSlug={menuProgram}
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
                          };

                          return (
                            <ProgramPlanEditor
                              key={plan.id}
                              title={plan.name}
                              item={item}
                              onSubmit={(event) => handleProgramSubmit(event, plan.id)}
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

function OrderCard({
  order,
  profile,
  onPatch,
}: {
  order: ApiOrder;
  profile?: CustomerProfile | null;
  onPatch: (
    orderId: string,
    payload: {
      status?: ApiOrderStatus;
      payment_status?: PaymentStatus;
      action?: 'confirm' | 'cancel';
      confirmation_order_id?: string;
      confirmation_user_id?: string;
      payment_transaction_id?: string;
    }
  ) => void;
}) {
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

  return (
    <article className={styles.orderCard}>
      <div className={styles.cardHeader}>
        <div>
          <span className={styles.mono}>{order.id}</span>
          <h3>{order.customer_name ?? 'Project Fit customer'}</h3>
          <p>{formatDateTime(order.created_at)}</p>
        </div>
        <div className={styles.badges}>
          <span>{order.status}</span>
          <span className={order.payment_status === 'paid' ? styles.paid : styles.pending}>{order.payment_status}</span>
        </div>
      </div>
      <div className={styles.orderPlan}>
        <strong>{getPrimaryPlan(order)}</strong>
        <span>Rs {order.total.toLocaleString('en-IN')}</span>
      </div>
      <div className={styles.detailBlock}>
        <p>{order.delivery_address.phone} | {order.delivery_address.city} | {order.delivery_address.pincode}</p>
        <p>{order.delivery_address.addressLine1}{order.delivery_address.addressLine2 ? `, ${order.delivery_address.addressLine2}` : ''}</p>
        <p>Requested start: {formatDate(order.requested_start_date)}</p>
      </div>
      <div className={styles.items}>
        {order.items.map((item) => (
          <p key={`${order.id}-${item.id}`}>{item.quantity}x {item.name} | Rs {item.totalPrice.toLocaleString('en-IN')}</p>
        ))}
      </div>
      {profile && (
        <div className={styles.profileMini}>
          <span>{profile.primary_goal}</span>
          <span>{profile.health_focus}</span>
          <span>{profile.diet_preference}</span>
        </div>
      )}
      {order.status === 'new' && (
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
      <div className={styles.actions}>
        {order.status === 'new' && (
          <button type="button" className={styles.dangerBtn} onClick={() => onPatch(order.id, { action: 'cancel' })}>
            Cancel order
          </button>
        )}
        {order.status === 'confirmed' && (
          <button type="button" onClick={() => onPatch(order.id, { status: 'preparing' })}>
            <ClipboardList size={15} />
            Preparing
          </button>
        )}
        {order.status === 'preparing' && (
          <button type="button" onClick={() => onPatch(order.id, { status: 'ready' })}>
            <CheckCircle2 size={15} />
            Ready
          </button>
        )}
      </div>
    </article>
  );
}

function UserDetail({ user, profile, orders }: { user: ProjectFitUser | null; profile: CustomerProfile | null; orders: ApiOrder[] }) {
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
        <div><dt>WhatsApp opt-in</dt><dd>{user.whatsapp_opt_in ? 'Yes' : 'No'}</dd></div>
        <div><dt>Joined</dt><dd>{formatDate(user.created_at)}</dd></div>
        <div><dt>Profile</dt><dd>{profile?.is_profile_complete ? 'Complete' : 'Incomplete'}</dd></div>
        <div><dt>Age</dt><dd>{profile?.age ?? 'Not set'}</dd></div>
        <div><dt>Gender</dt><dd>{profile?.gender ?? 'Not set'}</dd></div>
        <div><dt>Height</dt><dd>{profile ? `${profile.height_cm} cm` : 'Not set'}</dd></div>
        <div><dt>Weight</dt><dd>{profile ? `${profile.weight_kg} kg` : 'Not set'}</dd></div>
        <div><dt>Goal</dt><dd>{profile?.primary_goal ?? 'Not set'}</dd></div>
        <div><dt>Health focus</dt><dd>{profile?.health_focus ?? 'Not set'}</dd></div>
        <div><dt>Diet</dt><dd>{profile?.diet_preference ?? 'Not set'}</dd></div>
        <div><dt>Allergies</dt><dd>{profile?.allergies?.join(', ') || 'None listed'}</dd></div>
      </dl>
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
    </aside>
  );
}

function MenuEditor({
  title,
  programSlug,
  item,
  onSubmit,
  onDelete,
}: {
  title: string;
  programSlug: string;
  item?: MenuItem;
  onSubmit: (event: FormEvent<HTMLFormElement>) => void;
  onDelete?: () => void;
}) {
  return (
    <form className={styles.editorCard} onSubmit={onSubmit}>
      <div className={styles.editorTitle}>
        <Pencil size={16} />
        <h3>{title}</h3>
      </div>
      <input type="hidden" name="program_slug" value={item?.program_slug ?? programSlug} />
      <Field name="name" label="Item name" defaultValue={item?.name} required />
      <Field name="photo_url" label="Item photo URL" defaultValue={item?.photo_url ?? ''} />
      <Field name="category" label="Category" defaultValue={item?.category} required />
      <Field name="servings" label="Servings or portions" type="number" defaultValue={item?.servings ?? 1} required />
      <Field name="protein_grams" label="Protein grams" type="number" defaultValue={item?.protein_grams ?? ''} />
      <Field name="ingredients" label="Ingredients, comma separated" defaultValue={item?.ingredients?.join(', ') ?? ''} />
      <label>
        <span>Description</span>
        <textarea name="description" defaultValue={item?.description ?? ''} rows={3} />
      </label>
      <Field name="price" label="Price" type="number" defaultValue={item?.price ?? 0} required />
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
  item: { name: string; duration: string; price: number; highlight: string; active: boolean };
  onSubmit: (event: FormEvent<HTMLFormElement>) => void;
}) {
  return (
    <form className={styles.compactEditor} onSubmit={onSubmit}>
      <h3>{title}</h3>
      <div className={styles.compactFields}>
        <Field name="name" label="Name" defaultValue={item.name} required />
        <Field name="duration" label="Duration" defaultValue={item.duration} required />
        <Field name="price" label="Price" type="number" defaultValue={item.price} required />
        <Field name="highlight" label="Highlight" defaultValue={item.highlight} />
      </div>
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
