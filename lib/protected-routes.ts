export const protectedProgramPaths = [
  '/weight-loss',
  '/mass-gain',
  '/diabetes',
  '/pcos-pcod',
  '/pregnancy',
  '/kids',
];

export function isProtectedPath(pathname: string | null | undefined) {
  if (!pathname) return false;

  return pathname === '/menu' || pathname === '/chef/dashboard' || protectedProgramPaths.includes(pathname);
}

export function buildAuthRedirect(pathname: string | null | undefined, target = '/signup') {
  const safePath = pathname && pathname.startsWith('/') && !pathname.startsWith('//') ? pathname : '/';

  if (safePath === '/') {
    return target;
  }

  const separator = target.includes('?') ? '&' : '?';
  return `${target}${separator}next=${encodeURIComponent(safePath)}`;
}
