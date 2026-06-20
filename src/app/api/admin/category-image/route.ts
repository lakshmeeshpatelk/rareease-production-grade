import { NextRequest, NextResponse } from 'next/server';
import { requireAdmin } from '@/lib/adminAuth';
import { createAdminClient } from '@/lib/supabaseAdmin';

const BUCKET = 'category-images';

export async function POST(req: NextRequest) {
  const auth = await requireAdmin(req);
  if (auth) return auth;

  try {
    const formData = await req.formData();
    const file   = formData.get('file')   as File   | null;
    const catId  = formData.get('catId')  as string | null;

    if (!file || !catId) {
      return NextResponse.json({ error: 'Missing file or catId' }, { status: 400 });
    }

    const ext      = file.name.split('.').pop()?.toLowerCase() ?? 'jpg';
    const filePath = `${catId}-${Date.now()}.${ext}`;

    const arrayBuffer = await file.arrayBuffer();
    const buffer      = Buffer.from(arrayBuffer);

    const admin = createAdminClient();

    // Auto-create bucket if it doesn't exist
    const { data: buckets } = await admin.storage.listBuckets();
    if (!buckets?.some(b => b.id === BUCKET)) {
      await admin.storage.createBucket(BUCKET, { public: true });
    }

    const { error: uploadError } = await admin.storage
      .from(BUCKET)
      .upload(filePath, buffer, { contentType: file.type || 'image/jpeg', upsert: true });

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