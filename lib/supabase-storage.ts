import { getSupabaseUrl } from '@/lib/supabase-rest';

const serviceRoleKey =
  process.env.SUPABASE_SERVICE_ROLE_KEY ||
  process.env.SUPABASE_SECRET_KEY ||
  process.env.PROJECTFIT_SERVICE_ROLE_KEY;

function requireServiceRoleKey() {
  const key = serviceRoleKey?.trim().replace(/^['"]|['"]$/g, '');
  if (!key) {
    throw new Error('Missing Supabase service role key for storage uploads.');
  }
  return key;
}

function getStorageHeaders(contentType?: string) {
  const key = requireServiceRoleKey();
  return {
    apikey: key,
    Authorization: `Bearer ${key}`,
    ...(contentType ? { 'Content-Type': contentType } : {}),
  };
}

export function getPublicStorageUrl(bucket: string, path: string) {
  return `${getSupabaseUrl()}/storage/v1/object/public/${bucket}/${path}`;
}

export async function uploadPublicStorageFile({
  bucket,
  path,
  file,
}: {
  bucket: string;
  path: string;
  file: File;
}) {
  const response = await fetch(
    `${getSupabaseUrl()}/storage/v1/object/${bucket}/${encodeURI(path)}`,
    {
      method: 'POST',
      headers: {
        ...getStorageHeaders(file.type || 'application/octet-stream'),
        'x-upsert': 'true',
      },
      body: file,
    }
  );

  if (!response.ok) {
    const message = await response.text().catch(() => '');
    throw new Error(message || `Storage upload failed with ${response.status}`);
  }

  return getPublicStorageUrl(bucket, path);
}

export async function deletePublicStorageFiles(bucket: string, paths: Array<string | null | undefined>) {
  const cleanPaths = paths.filter((path): path is string => Boolean(path));
  if (cleanPaths.length === 0) return;

  const response = await fetch(`${getSupabaseUrl()}/storage/v1/object/${bucket}`, {
    method: 'DELETE',
    headers: getStorageHeaders('application/json'),
    body: JSON.stringify({ prefixes: cleanPaths }),
  });

  if (!response.ok) {
    const message = await response.text().catch(() => '');
    throw new Error(message || `Storage delete failed with ${response.status}`);
  }
}
