import { cookies } from 'next/headers';
import { redirect } from 'next/navigation';
import { adminSessionCookie, verifyAdminSessionCookie } from '@/lib/admin-session';

export default async function ChefDashboardLayout({ children }: { children: React.ReactNode }) {
  const cookieStore = await cookies();
  const session = verifyAdminSessionCookie(cookieStore.get(adminSessionCookie.name)?.value);

  if (!session) {
    redirect('/chef');
  }

  return children;
}
