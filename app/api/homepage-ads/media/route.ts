import { NextResponse } from 'next/server';
import { getSupabaseUrl } from '@/lib/supabase-rest';

const bucket = 'homepage-ads';

function encodeStoragePath(path: string) {
  return path
    .split('/')
    .map((part) => encodeURIComponent(part))
    .join('/');
}

function isSafeVideoPath(path: string) {
  const normalized = path.trim().toLowerCase();
  return (
    normalized.length > 0 &&
    !normalized.includes('..') &&
    (normalized.endsWith('.mp4') || normalized.endsWith('.webm'))
  );
}

export async function GET(request: Request) {
  const { searchParams } = new URL(request.url);
  const path = searchParams.get('path') ?? '';

  if (!isSafeVideoPath(path)) {
    return NextResponse.json({ error: 'Invalid video path.' }, { status: 400 });
  }

  const upstreamUrl = `${getSupabaseUrl()}/storage/v1/object/public/${bucket}/${encodeStoragePath(path)}`;
  const range = request.headers.get('range');
  const upstream = await fetch(upstreamUrl, {
    headers: range ? { Range: range } : undefined,
  });

  if (!upstream.ok && upstream.status !== 206) {
    return NextResponse.json({ error: 'Video not found.' }, { status: upstream.status || 404 });
  }

  const headers = new Headers();
  headers.set('Content-Type', path.toLowerCase().endsWith('.webm') ? 'video/webm' : 'video/mp4');
  headers.set('Accept-Ranges', upstream.headers.get('accept-ranges') ?? 'bytes');
  headers.set('Cache-Control', 'public, max-age=3600');

  for (const header of ['content-length', 'content-range', 'etag', 'last-modified']) {
    const value = upstream.headers.get(header);
    if (value) headers.set(header, value);
  }

  return new Response(upstream.body, {
    status: upstream.status,
    headers,
  });
}
