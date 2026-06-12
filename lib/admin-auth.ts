import { getUserFromAccessToken } from './supabase-rest';

export async function requireAdminUser(request: Request) {
  const authHeader = request.headers.get('authorization');
  const accessToken = authHeader?.replace(/^Bearer\s+/i, '');

  if (!accessToken) {
    return { user: null, error: 'Authentication required. Please log in.', status: 401 };
  }

  const userResult = await getUserFromAccessToken(accessToken);
  if (userResult.error || !userResult.data) {
    return {
      user: null,
      error: userResult.error ?? 'Invalid login session.',
      status: userResult.status || 401,
    };
  }

  const email = userResult.data.email?.toLowerCase() ?? '';
  const configuredAdmins = (process.env.ADMIN_EMAILS ?? '')
    .split(',')
    .map((value) => value.trim().toLowerCase())
    .filter(Boolean);

  if (configuredAdmins.length === 0) {
    return { user: null, error: 'Admin access is not configured. Add ADMIN_EMAILS to environment variables.', status: 500 };
  }

  if (!configuredAdmins.includes(email)) {
    return { user: null, error: 'Access denied. Admin account required.', status: 403 };
  }

  return { user: userResult.data, error: null, status: 200 };
}
