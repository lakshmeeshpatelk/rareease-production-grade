import { NextRequest, NextResponse } from 'next/server';
import { requireAdmin } from '@/lib/adminAuth';
import { createAdminClient } from '@/lib/supabaseAdmin';

const BUCKET = 'brand-videos';
const SETTINGS_KEY = 'brand_promo_video';

/* ── GET — return current video URL ─────────────────────────────── */
export async function GET(req: NextRequest) {
  const auth = await requireAdmin(req);
  if (auth) return auth;

  const admin = createAdminClient();
  const { data } = await admin
    .from('site_settings')
    .select('value')
    .eq('key', SETTINGS_KEY)
    .single();

  const url = data?.value ? JSON.parse(data.value as string) : null;
  return NextResponse.json({ url });
}

/* ── POST — upload a new video and save URL ─────────────────────── */
export async function POST(req: NextRequest) {
  const auth = await requireAdmin(req);
  if (auth) return auth;

  try {
    const formData = await req.formData();
    const file = formData.get('file') as File | null;

    if (!file) {
      return NextResponse.json({ error: 'No file provided' }, { status: 400 });
    }

    // Validate: video only, ≤ 50 MB
    if (!file.type.startsWith('video/')) {
      return NextResponse.json({ error: 'Only video files are accepted' }, { status: 400 });
    }
    if (file.size > 50 * 1024 * 1024) {
      return NextResponse.json({ error: 'Video must be under 50 MB' }, { status: 400 });
    }

    const ext = file.name.split('.').pop()?.toLowerCase() ?? 'mp4';
    const filePath = `promo-${Date.now()}.${ext}`;

    const arrayBuffer = await file.arrayBuffer();
    const buffer = Buffer.from(arrayBuffer);

    const admin = createAdminClient();

    // Ensure bucket exists (public)
    const { data: buckets } = await admin.storage.listBuckets();
    if (!buckets?.some(b => b.id === BUCKET)) {
      await admin.storage.createBucket(BUCKET, { public: true });
    }

    // Remove old video file(s) to keep storage clean
    const { data: existing } = await admin.storage.from(BUCKET).list();
    if (existing?.length) {
      await admin.storage.from(BUCKET).remove(existing.map(f => f.name));
    }

    // Upload new video
    const { error: uploadError } = await admin.storage
      .from(BUCKET)
      .upload(filePath, buffer, {
        contentType: file.type || 'video/mp4',
        upsert: true,
      });

    if (uploadError) {
      return NextResponse.json({ error: uploadError.message }, { status: 500 });
    }

    const { data: urlData } = admin.storage.from(BUCKET).getPublicUrl(filePath);
    const publicUrl = urlData.publicUrl;

    // Save URL in site_settings
    await admin
      .from('site_settings')
      .upsert({ key: SETTINGS_KEY, value: JSON.stringify(publicUrl) }, { onConflict: 'key' });

    return NextResponse.json({ url: publicUrl });
  } catch (err) {
    return NextResponse.json(
      { error: err instanceof Error ? err.message : 'Upload failed' },
      { status: 500 },
    );
  }
}

/* ── DELETE — remove video ──────────────────────────────────────── */
export async function DELETE(req: NextRequest) {
  const auth = await requireAdmin(req);
  if (auth) return auth;

  const admin = createAdminClient();

  // Remove all files in bucket
  const { data: files } = await admin.storage.from(BUCKET).list();
  if (files?.length) {
    await admin.storage.from(BUCKET).remove(files.map(f => f.name));
  }

  // Clear setting
  await admin
    .from('site_settings')
    .upsert({ key: SETTINGS_KEY, value: JSON.stringify(null) }, { onConflict: 'key' });

  return NextResponse.json({ ok: true });
}