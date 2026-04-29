import { NextRequest, NextResponse } from 'next/server';
import { createServerClient, type CookieOptions } from '@supabase/ssr';
import { logAdminAction } from '@/lib/auditLog';

/**
 * POST /api/admin/auth
 *
 * Body: { email: string; password: string }
 *
 * Signs the user in via Supabase Auth and sets the session cookie.
 * The session is then verified on every admin API call via requireAdmin().
 */
export async function POST(req: NextRequest) {
  try {
    const { email, password } = await req.json();

    if (typeof email !== 'string' || typeof password !== 'string') {
      return NextResponse.json({ error: 'Bad request' }, { status: 400 });
    }

    const adminEmail = process.env.ADMIN_EMAIL;
    if (!adminEmail) {
      console.error('[admin/auth] ADMIN_EMAIL env var is not set');
      return NextResponse.json({ error: 'Server misconfigured' }, { status: 500 });
    }

    // Guard: only the designated admin email may attempt sign-in here
    if (email.toLowerCase() !== adminEmail.toLowerCase()) {
      await new Promise(r => setTimeout(r, 400));
      logAdminAction('admin.login.failed', { adminEmail: email, meta: { reason: 'wrong_email' }, req });
      return NextResponse.json({ error: 'Incorrect credentials' }, { status: 401 });
    }

    const response = NextResponse.json({ ok: true });

    const supabase = createServerClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
      {
        cookies: {
          getAll() { return req.cookies.getAll(); },
          setAll(cookiesToSet: { name: string; value: string; options?: CookieOptions }[]) {
            cookiesToSet.forEach(({ name, value, options }) =>
              response.cookies.set(name, value, options)
            );
          },
        },
      }
    );

    const { error } = await supabase.auth.signInWithPassword({ email, password });

    if (error) {
      await new Promise(r => setTimeout(r, 400));
      logAdminAction('admin.login.failed', { adminEmail: email, meta: { reason: 'wrong_password' }, req });
      return NextResponse.json({ error: 'Incorrect credentials' }, { status: 401 });
    }

    logAdminAction('admin.login', { adminEmail: email, req });
    return response;
  } catch {
    return NextResponse.json({ error: 'Bad request' }, { status: 400 });
  }
}

/**
 * DELETE /api/admin/auth
 * Signs the admin out and clears the Supabase session cookie.
 */
export async function DELETE(req: NextRequest) {
  const response = NextResponse.json({ ok: true });

  const supabase = createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
      cookies: {
        getAll() { return req.cookies.getAll(); },
        setAll(cookiesToSet: { name: string; value: string; options?: CookieOptions }[]) {
          cookiesToSet.forEach(({ name, value, options }) =>
            response.cookies.set(name, value, options)
          );
        },
      },
    }
  );

  await supabase.auth.signOut();
  logAdminAction('admin.logout', { req });
  return response;
}
