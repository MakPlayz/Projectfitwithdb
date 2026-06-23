import { NextResponse } from 'next/server';
import { requireAdminUser } from '@/lib/admin-auth';
import type { HomepageAd, HomepageAdMediaType } from '@/lib/backend-types';
import { supabaseRestFetch } from '@/lib/supabase-rest';
import { deletePublicStorageFiles, uploadPublicStorageFile } from '@/lib/supabase-storage';

const bucket = 'homepage-ads';
const maxImageSize = 6 * 1024 * 1024;
const maxVideoSize = 50 * 1024 * 1024;
const allowedImageTypes = new Set(['image/jpeg', 'image/png', 'image/webp', 'image/gif']);
const allowedVideoTypes = new Set(['video/mp4', 'video/webm', 'video/quicktime']);

function getMediaType(file: File): HomepageAdMediaType | null {
  if (allowedImageTypes.has(file.type)) return 'image';
  if (allowedVideoTypes.has(file.type)) return 'video';
  return null;
}

function getExtension(file: File) {
  const fromName = file.name.split('.').pop()?.toLowerCase().replace(/[^a-z0-9]/g, '');
  if (fromName) return fromName;
  if (file.type === 'image/jpeg') return 'jpg';
  if (file.type === 'image/png') return 'png';
  if (file.type === 'image/webp') return 'webp';
  if (file.type === 'image/gif') return 'gif';
  if (file.type === 'video/webm') return 'webm';
  if (file.type === 'video/quicktime') return 'mov';
  return 'mp4';
}

function validateMedia(file: File, label: string) {
  const mediaType = getMediaType(file);
  if (!mediaType) {
    throw new Error(`${label} must be JPG, PNG, WebP, GIF, MP4, WebM, or MOV.`);
  }

  const limit = mediaType === 'image' ? maxImageSize : maxVideoSize;
  if (file.size > limit) {
    throw new Error(`${label} is too large. Images must be below 6 MB and videos below 50 MB.`);
  }

  return mediaType;
}

function validatePoster(file: File) {
  if (!allowedImageTypes.has(file.type)) {
    throw new Error('Poster must be JPG, PNG, WebP, or GIF.');
  }
  if (file.size > maxImageSize) {
    throw new Error('Poster must be below 6 MB.');
  }
}

function getString(form: FormData, key: string) {
  const value = form.get(key);
  return typeof value === 'string' ? value.trim() : '';
}

function getOptionalDate(form: FormData, key: string) {
  const value = getString(form, key);
  return value || null;
}

function getOptionalUrl(form: FormData, key: string) {
  const value = getString(form, key);
  if (!value) return null;
  try {
    const url = new URL(value);
    return url.href;
  } catch {
    throw new Error(`${key} must be a valid URL.`);
  }
}

function getOptionalFile(form: FormData, key: string) {
  const value = form.get(key);
  if (!(value instanceof File) || value.size === 0) return null;
  return value;
}

async function uploadAdFile(file: File, folder: string, slot: string) {
  const mediaType = validateMedia(file, slot);
  const path = `${folder}/${slot}-${crypto.randomUUID()}.${getExtension(file)}`;
  const url = await uploadPublicStorageFile({ bucket, path, file });
  return { mediaType, path, url };
}

async function uploadPosterFile(file: File, folder: string) {
  validatePoster(file);
  const path = `${folder}/poster-${crypto.randomUUID()}.${getExtension(file)}`;
  const url = await uploadPublicStorageFile({ bucket, path, file });
  return { path, url };
}

function normalizeBasePayload(form: FormData) {
  const caption = getString(form, 'caption');
  const startDate = getOptionalDate(form, 'start_date');
  const endDate = getOptionalDate(form, 'end_date');
  const priority = Number(getString(form, 'priority') || 0);

  if (!caption || caption.length < 3) {
    throw new Error('Short caption is required.');
  }

  if (!Number.isFinite(priority)) {
    throw new Error('Priority must be a number.');
  }

  if (startDate && endDate && endDate < startDate) {
    throw new Error('End date must be on or after start date.');
  }

  return {
    caption,
    start_date: startDate,
    end_date: endDate,
    priority,
    active: getString(form, 'active') === 'on' || getString(form, 'active') === 'true',
    cta_label: getString(form, 'cta_label') || null,
    cta_href: getOptionalUrl(form, 'cta_href'),
  };
}

async function getExistingAd(id: string) {
  const result = await supabaseRestFetch<HomepageAd[]>(
    `/homepage_ads?id=eq.${encodeURIComponent(id)}&select=*&limit=1`
  );
  if (result.error) throw new Error(result.error);
  return result.data?.[0] ?? null;
}

export async function POST(request: Request) {
  const admin = await requireAdminUser(request);
  if (admin.error) return NextResponse.json({ error: admin.error }, { status: admin.status });

  try {
    const form = await request.formData();
    const payload = normalizeBasePayload(form);
    const media = getOptionalFile(form, 'media');
    if (!media) return NextResponse.json({ error: 'Upload an image or video.' }, { status: 400 });

    const folder = `ads/${new Date().toISOString().slice(0, 10)}-${crypto.randomUUID()}`;
    const uploadedMedia = await uploadAdFile(media, folder, 'desktop');
    const mobileFile = getOptionalFile(form, 'mobile_media');
    const uploadedMobile = mobileFile ? await uploadAdFile(mobileFile, folder, 'mobile') : null;
    const posterFile = getOptionalFile(form, 'poster');
    const uploadedPoster = posterFile ? await uploadPosterFile(posterFile, folder) : null;

    const result = await supabaseRestFetch<HomepageAd[]>('/homepage_ads', {
      method: 'POST',
      body: JSON.stringify({
        ...payload,
        media_type: uploadedMedia.mediaType,
        media_url: uploadedMedia.url,
        media_path: uploadedMedia.path,
        mobile_media_type: uploadedMobile?.mediaType ?? null,
        mobile_media_url: uploadedMobile?.url ?? null,
        mobile_media_path: uploadedMobile?.path ?? null,
        poster_url: uploadedPoster?.url ?? null,
        poster_path: uploadedPoster?.path ?? null,
      }),
    });

    if (result.error) throw new Error(result.error);
    return NextResponse.json({ ad: result.data?.[0] ?? null }, { status: 201 });
  } catch (error) {
    return NextResponse.json(
      { error: error instanceof Error ? error.message : 'Could not save ad.' },
      { status: 400 }
    );
  }
}

export async function PATCH(request: Request) {
  const admin = await requireAdminUser(request);
  if (admin.error) return NextResponse.json({ error: admin.error }, { status: admin.status });

  try {
    const form = await request.formData();
    const id = getString(form, 'id');
    if (!id) return NextResponse.json({ error: 'Ad id is required.' }, { status: 400 });

    const existing = await getExistingAd(id);
    if (!existing) return NextResponse.json({ error: 'Ad not found.' }, { status: 404 });

    const payload = normalizeBasePayload(form);
    const folder = existing.media_path.split('/').slice(0, -1).join('/') || `ads/${id}`;
    const mediaFile = getOptionalFile(form, 'media');
    const mobileFile = getOptionalFile(form, 'mobile_media');
    const posterFile = getOptionalFile(form, 'poster');

    const uploadedMedia = mediaFile ? await uploadAdFile(mediaFile, folder, 'desktop') : null;
    const uploadedMobile = mobileFile ? await uploadAdFile(mobileFile, folder, 'mobile') : null;
    const uploadedPoster = posterFile ? await uploadPosterFile(posterFile, folder) : null;
    const removeMobile = getString(form, 'remove_mobile_media') === 'true';
    const removePoster = getString(form, 'remove_poster') === 'true';

    const updatePayload = {
      ...payload,
      media_type: uploadedMedia?.mediaType ?? existing.media_type,
      media_url: uploadedMedia?.url ?? existing.media_url,
      media_path: uploadedMedia?.path ?? existing.media_path,
      mobile_media_type: uploadedMobile?.mediaType ?? (removeMobile ? null : existing.mobile_media_type),
      mobile_media_url: uploadedMobile?.url ?? (removeMobile ? null : existing.mobile_media_url),
      mobile_media_path: uploadedMobile?.path ?? (removeMobile ? null : existing.mobile_media_path),
      poster_url: uploadedPoster?.url ?? (removePoster ? null : existing.poster_url),
      poster_path: uploadedPoster?.path ?? (removePoster ? null : existing.poster_path),
    };

    const result = await supabaseRestFetch<HomepageAd[]>(
      `/homepage_ads?id=eq.${encodeURIComponent(id)}`,
      {
        method: 'PATCH',
        body: JSON.stringify(updatePayload),
      }
    );

    if (result.error) throw new Error(result.error);

    await deletePublicStorageFiles(bucket, [
      uploadedMedia ? existing.media_path : null,
      uploadedMobile || removeMobile ? existing.mobile_media_path : null,
      uploadedPoster || removePoster ? existing.poster_path : null,
    ]);

    return NextResponse.json({ ad: result.data?.[0] ?? null });
  } catch (error) {
    return NextResponse.json(
      { error: error instanceof Error ? error.message : 'Could not update ad.' },
      { status: 400 }
    );
  }
}

export async function DELETE(request: Request) {
  const admin = await requireAdminUser(request);
  if (admin.error) return NextResponse.json({ error: admin.error }, { status: admin.status });

  try {
    const { searchParams } = new URL(request.url);
    const id = searchParams.get('id')?.trim();
    if (!id) return NextResponse.json({ error: 'Ad id is required.' }, { status: 400 });

    const existing = await getExistingAd(id);
    if (!existing) return NextResponse.json({ error: 'Ad not found.' }, { status: 404 });

    const result = await supabaseRestFetch<HomepageAd[]>(
      `/homepage_ads?id=eq.${encodeURIComponent(id)}`,
      { method: 'DELETE' }
    );
    if (result.error) throw new Error(result.error);

    await deletePublicStorageFiles(bucket, [
      existing.media_path,
      existing.mobile_media_path,
      existing.poster_path,
    ]);

    return NextResponse.json({ deleted: true });
  } catch (error) {
    return NextResponse.json(
      { error: error instanceof Error ? error.message : 'Could not delete ad.' },
      { status: 400 }
    );
  }
}
