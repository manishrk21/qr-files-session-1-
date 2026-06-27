// middleware.ts
// Runs on Edge Runtime. Guards /admin/* and /r/* routes.
import { NextRequest, NextResponse } from 'next/server';
import { createServerClient } from '@supabase/ssr';
import { verifyCustomerSession } from '@/lib/crypto';

export const config = {
  matcher: ['/r/:path*', '/admin/:path*'],
};

export async function middleware(request: NextRequest) {
  const { pathname } = request.nextUrl;

  // ── Admin routes ────────────────────────────────────────────────────────────
  if (pathname.startsWith('/admin')) {
    // Allow login page through
    if (pathname === '/admin/login') return NextResponse.next();

    let response = NextResponse.next({
      request: { headers: new Headers(request.headers) },
    });

    const supabase = createServerClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
      {
        cookies: {
          getAll() { return request.cookies.getAll(); },
          setAll(cookiesToSet) {
            cookiesToSet.forEach(({ name, value }) => request.cookies.set(name, value));
            response = NextResponse.next({ request: { headers: new Headers(request.headers) } });
            cookiesToSet.forEach(({ name, value, options }) =>
              response.cookies.set(name, value, options),
            );
          },
        },
      },
    );

    const { data: { session } } = await supabase.auth.getSession();
    if (!session) {
      return NextResponse.redirect(new URL('/admin/login', request.url));
    }

    // Fetch tenant membership to get restaurant_id and role
    const { data: member } = await supabase
      .from('tenant_members')
      .select('restaurant_id, role')
      .eq('user_id', session.user.id)
      .eq('is_active', true)
      .single();

    if (!member) {
      return NextResponse.redirect(new URL('/admin/login?error=no_access', request.url));
    }

    // Check if admin is on the correct restaurant slug
    const slugMatch = pathname.match(/^\/admin\/([^/]+)/);
    if (slugMatch) {
      // Validate slug belongs to member's restaurant (done in layout server component)
      response.headers.set('x-admin-restaurant-id', member.restaurant_id);
      response.headers.set('x-admin-role', member.role);
      response.headers.set('x-admin-user-id', session.user.id);
    }

    return response;
  }

  // ── Customer routes ──────────────────────────────────────────────────────────
  if (pathname.startsWith('/r/')) {
    const segments = pathname.split('/').filter(Boolean); // ['r', slug, ...rest]
    const slug = segments[1];
    const isEntryPage = segments.length === 2; // /r/{slug} — the auth gate

    const sessionToken = request.cookies.get('mf-customer-session')?.value;

    // Entry page is accessible without a session
    if (isEntryPage && !sessionToken) {
      return NextResponse.next();
    }

    if (!sessionToken) {
      return NextResponse.redirect(new URL(`/r/${slug}`, request.url));
    }

    const payload = verifyCustomerSession(sessionToken);
    if (!payload) {
      const response = NextResponse.redirect(new URL(`/r/${slug}`, request.url));
      response.cookies.delete('mf-customer-session');
      return response;
    }

    const response = NextResponse.next();
    response.headers.set('x-customer-id', payload.cid);
    response.headers.set('x-restaurant-id', payload.rid);
    response.headers.set('x-table-id', payload.tid ?? '');
    return response;
  }

  return NextResponse.next();
}
