import { NextResponse } from 'next/server';
import {
  createPortalSsoToken,
  mapChillRoleToDetentionRole,
  toDetentionsSsoScope,
} from '@/lib/portal-sso';
import { DETENTIONS_APP_URL, O2_APP_URL } from '@/lib/portals';
import type { DetentionsAccessScope, User } from '@/lib/users';

export async function POST(request: Request) {
  try {
    const body = await request.json();
    const username = String(body?.username || '').trim();
    const role = body?.role as User['role'] | undefined;
    const target = String(body?.target || 'detentions');
    const detentionsScope = (body?.detentionsScope || 'full') as DetentionsAccessScope;

    if (!username || !role) {
      return NextResponse.json({ error: 'Gebruiker ontbreekt' }, { status: 400 });
    }

    if (target !== 'detentions' && target !== 'o2') {
      return NextResponse.json({ error: 'Onbekend portaal' }, { status: 400 });
    }

    if (target === 'detentions' && detentionsScope === 'none') {
      return NextResponse.json({ error: 'Geen toegang tot Nablijven' }, { status: 403 });
    }

    const ssoScope = toDetentionsSsoScope(detentionsScope) || 'full';
    const token = await createPortalSsoToken({
      username,
      role,
      detentionsScope: target === 'detentions' ? ssoScope : undefined,
    });

    if (target === 'o2') {
      const url = new URL('portal-entry.html', O2_APP_URL.endsWith('/') ? O2_APP_URL : `${O2_APP_URL}/`);
      url.searchParams.set('token', token);
      url.searchParams.set('role', role);
      url.searchParams.set('user', username);
      return NextResponse.json({ url: url.toString() });
    }

    const detentionRole = mapChillRoleToDetentionRole(role);
    const url = new URL('/portal-entry', DETENTIONS_APP_URL);
    url.searchParams.set('token', token);
    url.searchParams.set('role', detentionRole);
    url.searchParams.set('user', username);
    url.searchParams.set('scope', ssoScope);

    return NextResponse.json({ url: url.toString() });
  } catch (error) {
    console.error('portal-sso error', error);
    return NextResponse.json({ error: 'SSO mislukt' }, { status: 500 });
  }
}
