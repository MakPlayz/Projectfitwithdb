import { NextResponse } from 'next/server';
import { requireAdminUser } from '@/lib/admin-auth';
import { downloadWhatsAppMedia } from '@/lib/whatsapp';

export async function GET(
  request: Request,
  context: { params: Promise<{ mediaId: string }> }
) {
  const admin = await requireAdminUser(request);
  if (admin.error) {
    return NextResponse.json({ error: admin.error }, { status: admin.status });
  }

  const { mediaId } = await context.params;

  try {
    const media = await downloadWhatsAppMedia(mediaId);
    return new Response(media.bytes, {
      headers: {
        'Content-Type': media.contentType,
        'Cache-Control': 'private, max-age=300',
      },
    });
  } catch (error) {
    return NextResponse.json(
      { error: error instanceof Error ? error.message : 'Could not load WhatsApp media.' },
      { status: 502 }
    );
  }
}
