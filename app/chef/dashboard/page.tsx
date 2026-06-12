'use client';

import { FormEvent, useCallback, useEffect, useMemo, useState } from 'react';
import { useRouter } from 'next/navigation';
import { CheckCircle2, Clock, LogOut, Pencil, RefreshCw, Search, ShieldCheck } from 'lucide-react';
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
};

type Tab = 'orders' | 'users' | 'menu' | 'plans' | 'programs';

const emptyOverview: AdminOverview = {
  users: [],
  profiles: [],
  orders: [],
  menuItems: [],
  mealPlans: [],
  programOverrides: [],
};

export default function ChefDashboard() {
  const router = useRouter();
  const [data, setData] = useState<AdminOverview>(emptyOverview);
  const [activeTab, setActiveTab] = useState<Tab>('orders');
  const [query, setQuery] = useState('');
  const [error, setError] = useState('');
  const [status, setStatus] = useState('');
  const [isLoading, setIsLoading] = useState(true);
  const [isAuthorized, setIsAuthorized] = useState(false);

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
      const nextData = await response.json();

      if (!response.ok) {
        throw new Error(nextData.error ?? 'Could not load chef portal.');
      }

      setData(nextData);
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

  const filteredOrders = data.orders.filter((order) => {
    if (!normalizedQuery) return true;
    return [
      order.id,
      order.customer_name,
      order.delivery_address?.phone,
      order.delivery_address?.pincode,
      ...order.items.map((item) => item.name),
    ].some((value) => String(value ?? '').toLowerCase().includes(normalizedQuery));
  });

  const filteredUsers = data.users.filter((user) => {
    if (!normalizedQuery) return true;
    const profile = profilesByUserId.get(user.id);
    return [user.name, user.email, user.phone, profile?.primary_goal, profile?.health_focus].some((value) =>
      String(value ?? '').toLowerCase().includes(normalizedQuery)
    );
  });

  async function patchOrder(orderId: string, payload: { status?: ApiOrderStatus; payment_status?: PaymentStatus }) {
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
    setStatus('Order updated.');
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

  function handleMenuSubmit(event: FormEvent<HTMLFormElement>, id?: string) {
    event.preventDefault();
    const form = new FormData(event.currentTarget);
    void submitJson('/api/admin/menu-items', id ? 'PATCH' : 'POST', {
      id,
      name: form.get('name'),
      description: form.get('description'),
      price: Number(form.get('price') ?? 0),
      category: form.get('category'),
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
      <header className={styles.header}>
        <div>
          <p className={styles.eyebrow}>Chef Portal</p>
          <h1>Project Fit Admin</h1>
          <p>Manage orders, customers, menus, meal plans, and program pricing.</p>
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
        <div><span>Orders</span><strong>{data.orders.length}</strong></div>
        <div><span>Pending Pay</span><strong>{data.orders.filter((order) => order.payment_status === 'pending').length}</strong></div>
        <div><span>Paid</span><strong>{data.orders.filter((order) => order.payment_status === 'paid').length}</strong></div>
        <div><span>Users</span><strong>{data.users.length}</strong></div>
        <div><span>Profiles</span><strong>{data.profiles.filter((profile) => profile.is_profile_complete).length}</strong></div>
      </section>

      <section className={styles.toolbar}>
        <div className={styles.tabs}>
          {(['orders', 'users', 'menu', 'plans', 'programs'] as Tab[]).map((tab) => (
            <button
              key={tab}
              type="button"
              className={activeTab === tab ? styles.tabActive : styles.tab}
              onClick={() => setActiveTab(tab)}
            >
              {tab}
            </button>
          ))}
        </div>
        <label className={styles.search}>
          <Search size={16} />
          <input value={query} onChange={(event) => setQuery(event.target.value)} placeholder="Search orders or users" />
        </label>
      </section>

      {error && <p className={styles.error}>{error}</p>}
      {status && <p className={styles.status}>{status}</p>}

      {isLoading ? (
        <section className={styles.empty}>Loading chef portal...</section>
      ) : (
        <>
          {activeTab === 'orders' && (
            <section className={styles.cardGrid}>
              {filteredOrders.map((order) => (
                <article key={order.id} className={styles.orderCard}>
                  <div className={styles.cardHeader}>
                    <div>
                      <h2>{order.id}</h2>
                      <span>{new Date(order.created_at).toLocaleString()}</span>
                    </div>
                    <div className={styles.badges}>
                      <span>{order.status}</span>
                      <span className={order.payment_status === 'paid' ? styles.paid : styles.pending}>
                        {order.payment_status}
                      </span>
                    </div>
                  </div>
                  <div className={styles.detailBlock}>
                    <strong>{order.customer_name ?? 'Customer'}</strong>
                    <p>{order.delivery_address.phone} · {order.delivery_address.city} · {order.delivery_address.pincode}</p>
                    <p>{order.delivery_address.addressLine1}{order.delivery_address.addressLine2 ? `, ${order.delivery_address.addressLine2}` : ''}</p>
                  </div>
                  <div className={styles.items}>
                    {order.items.map((item) => (
                      <p key={`${order.id}-${item.id}`}>{item.quantity}x {item.name} · Rs {item.totalPrice.toLocaleString('en-IN')}</p>
                    ))}
                  </div>
                  <div className={styles.total}>Total Rs {order.total.toLocaleString('en-IN')}</div>
                  {order.customer_profile && (
                    <div className={styles.profileMini}>
                      <span>{order.customer_profile.primary_goal}</span>
                      <span>{order.customer_profile.health_focus}</span>
                      <span>{order.customer_profile.diet_preference}</span>
                    </div>
                  )}
                  <div className={styles.actions}>
                    {order.payment_status !== 'paid' && (
                      <button type="button" onClick={() => patchOrder(order.id, { payment_status: 'paid' })}>
                        <ShieldCheck size={15} />
                        Confirm payment
                      </button>
                    )}
                    {order.status === 'new' && (
                      <button type="button" onClick={() => patchOrder(order.id, { status: 'preparing' })}>
                        <Clock size={15} />
                        Preparing
                      </button>
                    )}
                    {order.status === 'preparing' && (
                      <button type="button" onClick={() => patchOrder(order.id, { status: 'ready' })}>
                        <CheckCircle2 size={15} />
                        Ready
                      </button>
                    )}
                  </div>
                </article>
              ))}
            </section>
          )}

          {activeTab === 'users' && (
            <section className={styles.tableWrap}>
              <table>
                <thead><tr><th>User</th><th>Phone</th><th>Profile</th><th>Goal</th><th>Notes</th></tr></thead>
                <tbody>
                  {filteredUsers.map((user) => {
                    const profile = profilesByUserId.get(user.id);
                    return (
                      <tr key={user.id}>
                        <td><strong>{user.name}</strong><span>{user.email}</span><span className={styles.mono}>{user.id}</span></td>
                        <td>{user.phone}</td>
                        <td>{profile?.is_profile_complete ? 'Complete' : 'Incomplete'}</td>
                        <td>{profile ? `${profile.primary_goal} / ${profile.health_focus}` : '-'}</td>
                        <td>{profile?.health_notes || profile?.recommendation_summary || '-'}</td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </section>
          )}

          {activeTab === 'menu' && (
            <section className={styles.editorGrid}>
              <EditorPanel title="Add menu item" onSubmit={handleMenuSubmit} fields={['name', 'description', 'category', 'price']} />
              {data.menuItems.map((item) => (
                <EditorPanel key={item.id} title={item.name} onSubmit={(event) => handleMenuSubmit(event, item.id)} item={{ ...item }} fields={['name', 'description', 'category', 'price']} />
              ))}
            </section>
          )}

          {activeTab === 'plans' && (
            <section className={styles.editorGrid}>
              <EditorPanel title="Add meal plan" onSubmit={handleMealPlanSubmit} fields={['name', 'description', 'duration', 'price']} />
              {data.mealPlans.map((plan) => (
                <EditorPanel key={plan.id} title={plan.name} onSubmit={(event) => handleMealPlanSubmit(event, plan.id)} item={{ ...plan }} fields={['name', 'description', 'duration', 'price']} />
              ))}
            </section>
          )}

          {activeTab === 'programs' && (
            <section className={styles.editorGrid}>
              {dietCategories.flatMap((diet) =>
                diet.plans.map((plan) => {
                  const override = overridesByPlanId.get(plan.id);
                  const item = {
                    name: override?.name || plan.name,
                    duration: override?.duration || plan.duration,
                    price: override?.price ?? plan.price,
                    highlight: override?.highlight || plan.highlight,
                    active: override?.active ?? true,
                  };
                  return (
                    <EditorPanel
                      key={plan.id}
                      title={`${diet.shortTitle} · ${plan.name}`}
                      onSubmit={(event) => handleProgramSubmit(event, plan.id)}
                      item={item}
                      fields={['name', 'duration', 'highlight', 'price']}
                    />
                  );
                })
              )}
            </section>
          )}
        </>
      )}
    </main>
  );
}

type EditorPanelProps = {
  title: string;
  fields: string[];
  item?: Record<string, unknown>;
  onSubmit: (event: FormEvent<HTMLFormElement>) => void;
};

function EditorPanel({ title, fields, item, onSubmit }: EditorPanelProps) {
  return (
    <form className={styles.editorCard} onSubmit={onSubmit}>
      <div className={styles.editorTitle}>
        <Pencil size={16} />
        <h3>{title}</h3>
      </div>
      {fields.map((field) => (
        <label key={field}>
          <span>{field}</span>
          <input
            name={field}
            type={field === 'price' ? 'number' : 'text'}
            min={field === 'price' ? 0 : undefined}
            defaultValue={String(item?.[field] ?? '')}
            required={field === 'name' || field === 'duration' || field === 'category'}
          />
        </label>
      ))}
      <label className={styles.checkRow}>
        <input name="active" type="checkbox" defaultChecked={item?.active !== false} />
        Active
      </label>
      <button type="submit">Save</button>
    </form>
  );
}
