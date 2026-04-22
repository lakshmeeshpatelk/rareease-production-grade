import { NextRequest, NextResponse } from 'next/server';
import { requireAdmin } from '@/lib/adminAuth';
import { createAdminClient } from '@/lib/supabaseAdmin';

const BUCKET = 'hero-images';

export async function POST(req: NextRequest) {
  const auth = await requireAdmin(req);
   if (auth) return auth;

  try {
    const formData = await req.formData();
    const file = formData.get('file') as File | null;
    const slideId = formData.get('slideId') as string | null;

    if (!file || !slideId) {
      return NextResponse.json({ error: 'Missing file or slideId' }, { status: 400 });
    }

    const ext = file.name.split('.').pop()?.toLowerCase() ?? 'jpg';
    const filePath = `slide-${slideId}-${Date.now()}.${ext}`;

    const arrayBuffer = await file.arrayBuffer();
    const buffer = Buffer.from(arrayBuffer);

    const admin = createAdminClient();

    // Ensure bucket exists and is public
    const { data: buckets } = await admin.storage.listBuckets();
    const bucketExists = buckets?.some(b => b.id === BUCKET);
    if (!bucketExists) {
      await admin.storage.createBucket(BUCKET, { public: true });
    }

    const { error: uploadError } = await admin.storage
      .from(BUCKET)
      .upload(filePath, buffer, {
        contentType: file.type || 'image/jpeg',
        upsert: true,
      });

    if (uploadError) {
      return NextResponse.json({ error: uploadError.message }, { status: 500 });
    }

    const { data } = admin.storage.from(BUCKET).getPublicUrl(filePath);
    return NextResponse.json({ url: data.publicUrl });
  } catch (err) {
    return NextResponse.json(
      { error: err instanceof Error ? err.message : 'Upload failed' },
      { status: 500 }
    );
  }
}