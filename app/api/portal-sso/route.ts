import { NextResponse } from 'next/server';
import { createPortalSsoToken, mapChillRoleToDetentionRole } from '@/lib/portal-sso';
import { DETENTIONS_APP_URL } from '@/lib/portals';
import type { User } from '@/lib/users';

export async function POST(request: Request) {
  try {
    const body = await request.json();
    const username = String(body?.username || '').trim();
    const role = body?.role as User['role'] | undefined;
    const target = String(body?.target || 'detentions');

    if (!username || !role) {
      return NextResponse.json({ error: 'Gebruiker ontbreekt' }, { status: 400 });
    }

    if (target !== 'detentions') {
      return NextResponse.json({ error: 'Onbekend portaal' }, { status: 400 });
    }

    const token = await createPortalSsoToken({ username, role });
    const detentionRole = mapChillRoleToDetentionRole(role);
    const url = new URL('/portal-entry', DETENTIONS_APP_URL);
    url.searchParams.set('token', token);
    url.searchParams.set('role', detentionRole);
    url.searchParams.set('user', username);

    return NextResponse.json({ url: url.toString() });
  } catch (error) {
    console.error('portal-sso error', error);
    return NextResponse.json({ error: 'SSO mislukt' }, { status: 500 });
  }
}
