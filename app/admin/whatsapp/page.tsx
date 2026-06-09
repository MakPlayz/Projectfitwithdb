import type { MealPlan, MenuItem, ProjectFitUser, WhatsAppMessageLog } from '@/lib/backend-types';
import { supabaseRestFetch } from '@/lib/supabase-rest';
import { saveMealPlan, saveMenuItem } from './actions';
import styles from './page.module.css';

type SearchParams = Promise<{ token?: string }>;

async function loadAdminData() {
  const [usersResult, logsResult, failedResult, menuResult, plansResult] = await Promise.all([
    supabaseRestFetch<ProjectFitUser[]>('/users?select=*&order=created_at.desc&limit=100'),
    supabaseRestFetch<WhatsAppMessageLog[]>('/whatsapp_message_logs?select=*&order=created_at.desc&limit=100'),
    supabaseRestFetch<WhatsAppMessageLog[]>('/whatsapp_message_logs?status=eq.failed&select=*&order=created_at.desc&limit=50'),
    supabaseRestFetch<MenuItem[]>('/menu_items?select=*&order=category.asc,name.asc'),
    supabaseRestFetch<MealPlan[]>('/meal_plans?select=*&order=price.asc'),
  ]);

  return {
    users: usersResult.data ?? [],
    logs: logsResult.data ?? [],
    failed: failedResult.data ?? [],
    menuItems: menuResult.data ?? [],
    mealPlans: plansResult.data ?? [],
  };
}

export default async function WhatsAppAdminPage({
  searchParams,
}: {
  searchParams: SearchParams;
}) {
  const params = await searchParams;
  const adminToken = params.token ?? '';
  const isAuthorized = Boolean(process.env.WHATSAPP_ADMIN_TOKEN && adminToken === process.env.WHATSAPP_ADMIN_TOKEN);
  const data = isAuthorized
    ? await loadAdminData()
    : { users: [], logs: [], failed: [], menuItems: [], mealPlans: [] };
  const optIns = data.users.filter((user) => user.whatsapp_opt_in).length;

  return (
    <main className={styles.page}>
      <div className={styles.shell}>
        <header className={styles.header}>
          <div>
            <h1>WhatsApp Admin</h1>
            <p>ProjectFitVizag welcome automation, opt-ins, logs, menu, and meal plans.</p>
          </div>
          <form className={styles.tokenForm}>
            <input type="password" name="token" placeholder="Admin token" defaultValue={adminToken} />
            <button className="btn-primary" type="submit">Open</button>
          </form>
        </header>

        {!isAuthorized ? (
          <section className={styles.panel}>
            <h2>Admin token required</h2>
            <p>Add `WHATSAPP_ADMIN_TOKEN` in Vercel, then open this page with that token.</p>
          </section>
        ) : (
          <>
            <section className={styles.grid}>
              <div className={styles.stat}><span>Users</span><strong>{data.users.length}</strong></div>
              <div className={styles.stat}><span>WhatsApp opt-ins</span><strong>{optIns}</strong></div>
              <div className={styles.stat}><span>Message logs</span><strong>{data.logs.length}</strong></div>
              <div className={styles.stat}><span>Failed deliveries</span><strong>{data.failed.length}</strong></div>
            </section>

            <section className={styles.sections}>
              <div className={`${styles.panel} ${styles.panelWide}`}>
                <h2>Users</h2>
                <div className={styles.tableWrap}>
                  <table className={styles.table}>
                    <thead><tr><th>Name</th><th>Email</th><th>Phone</th><th>WhatsApp</th><th>Joined</th></tr></thead>
                    <tbody>
                      {data.users.map((user) => (
                        <tr key={user.id}>
                          <td>{user.name}</td>
                          <td>{user.email}</td>
                          <td>{user.phone}</td>
                          <td>{user.whatsapp_opt_in ? <span className={styles.badge}>Opted in</span> : 'No'}</td>
                          <td>{new Date(user.created_at).toLocaleDateString()}</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </div>

              <div className={styles.panel}>
                <h2>Manage Menu Items</h2>
                <form action={saveMenuItem} className={styles.form}>
                  <input type="hidden" name="adminToken" value={adminToken} />
                  <input name="name" placeholder="Item name" required />
                  <textarea name="description" placeholder="Description" />
                  <div className={styles.formRow}>
                    <input name="category" placeholder="Category" required />
                    <input type="hidden" name="price" value="0" />
                  </div>
                  <label className={styles.check}><input type="checkbox" name="active" defaultChecked /> Active</label>
                  <button className="btn-primary" type="submit">Add Menu Item</button>
                </form>
                <div className={styles.smallList}>
                  {data.menuItems.map((item) => (
                    <form key={item.id} action={saveMenuItem} className={styles.smallItem}>
                      <input type="hidden" name="adminToken" value={adminToken} />
                      <input type="hidden" name="id" value={item.id} />
                      <input name="name" defaultValue={item.name} aria-label="Item name" />
                      <textarea name="description" defaultValue={item.description ?? ''} aria-label="Description" />
                      <div className={styles.formRow}>
                        <input name="category" defaultValue={item.category} aria-label="Category" />
                        <input type="hidden" name="price" value="0" />
                      </div>
                      <label className={styles.check}><input type="checkbox" name="active" defaultChecked={item.active} /> Active</label>
                      <button className="btn-secondary" type="submit">Save</button>
                    </form>
                  ))}
                </div>
              </div>

              <div className={styles.panel}>
                <h2>Manage Meal Plans</h2>
                <form action={saveMealPlan} className={styles.form}>
                  <input type="hidden" name="adminToken" value={adminToken} />
                  <input name="name" placeholder="Plan name" required />
                  <textarea name="description" placeholder="Description" />
                  <div className={styles.formRow}>
                    <input name="duration" placeholder="Duration" required />
                    <input type="hidden" name="price" value="0" />
                  </div>
                  <label className={styles.check}><input type="checkbox" name="active" defaultChecked /> Active</label>
                  <button className="btn-primary" type="submit">Add Meal Plan</button>
                </form>
                <div className={styles.smallList}>
                  {data.mealPlans.map((plan) => (
                    <form key={plan.id} action={saveMealPlan} className={styles.smallItem}>
                      <input type="hidden" name="adminToken" value={adminToken} />
                      <input type="hidden" name="id" value={plan.id} />
                      <input name="name" defaultValue={plan.name} aria-label="Plan name" />
                      <textarea name="description" defaultValue={plan.description ?? ''} aria-label="Description" />
                      <div className={styles.formRow}>
                        <input name="duration" defaultValue={plan.duration} aria-label="Duration" />
                        <input type="hidden" name="price" value="0" />
                      </div>
                      <label className={styles.check}><input type="checkbox" name="active" defaultChecked={plan.active} /> Active</label>
                      <button className="btn-secondary" type="submit">Save</button>
                    </form>
                  ))}
                </div>
              </div>

              <div className={`${styles.panel} ${styles.panelWide}`}>
                <h2>Message Logs</h2>
                <div className={styles.tableWrap}>
                  <table className={styles.table}>
                    <thead><tr><th>Time</th><th>Phone</th><th>Direction</th><th>Type</th><th>Status</th><th>Message/Error</th></tr></thead>
                    <tbody>
                      {data.logs.map((log) => (
                        <tr key={log.id}>
                          <td>{new Date(log.created_at).toLocaleString()}</td>
                          <td>{log.phone}</td>
                          <td>{log.direction}</td>
                          <td>{log.template_name ?? log.message_type}</td>
                          <td>
                            <span className={`${styles.badge} ${log.status === 'failed' ? styles.failed : ''}`}>
                              {log.status}
                            </span>
                          </td>
                          <td>{log.error_message ?? log.message_body ?? '-'}</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </div>
            </section>
          </>
        )}
      </div>
    </main>
  );
}
