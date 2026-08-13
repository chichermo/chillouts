/**
 * Lightweight SSO between Element apps (Chillouts ↔ Detentions / O2).
 * Override with PORTAL_SSO_SECRET on both Vercel projects.
 */
import type { DetentionsAccessScope, User } from './users';

const FALLBACK_SECRET = 'element-portal-sso-v1-school-internal';

export function getPortalSsoSecret(): string {
  return process.env.PORTAL_SSO_SECRET || FALLBACK_SECRET;
}

export type PortalSsoPayload = {
  username: string;
  role: User['role'];
  exp: number;
  detentionsScope?: 'full' | 'limited';
};

function toBase64Url(bytes: ArrayBuffer | Uint8Array): string {
  const arr = bytes instanceof Uint8Array ? bytes : new Uint8Array(bytes);
  let binary = '';
  for (let i = 0; i < arr.length; i++) binary += String.fromCharCode(arr[i]);
  return btoa(binary).replace(/\+/g, '-').replace(/\//g, '_').replace(/=+$/, '');
}

function fromBase64Url(input: string): Uint8Array {
  const padded = input.replace(/-/g, '+').replace(/_/g, '/');
  const pad = padded.length % 4 === 0 ? '' : '='.repeat(4 - (padded.length % 4));
  const binary = atob(padded + pad);
  const out = new Uint8Array(binary.length);
  for (let i = 0; i < binary.length; i++) out[i] = binary.charCodeAt(i);
  return out;
}

async function hmacSign(message: string, secret: string): Promise<string> {
  const enc = new TextEncoder();
  const key = await crypto.subtle.importKey(
    'raw',
    enc.encode(secret),
    { name: 'HMAC', hash: 'SHA-256' },
    false,
    ['sign']
  );
  const sig = await crypto.subtle.sign('HMAC', key, enc.encode(message));
  return toBase64Url(sig);
}

export async function createPortalSsoToken(
  user: Pick<User, 'username' | 'role'> & { detentionsScope?: 'full' | 'limited' },
  ttlSeconds = 120
): Promise<string> {
  const payload: PortalSsoPayload = {
    username: user.username,
    role: user.role,
    exp: Math.floor(Date.now() / 1000) + ttlSeconds,
    ...(user.detentionsScope ? { detentionsScope: user.detentionsScope } : {}),
  };
  const body = toBase64Url(new TextEncoder().encode(JSON.stringify(payload)));
  const sig = await hmacSign(body, getPortalSsoSecret());
  return `${body}.${sig}`;
}

export async function verifyPortalSsoToken(
  token: string
): Promise<PortalSsoPayload | null> {
  const [body, sig] = token.split('.');
  if (!body || !sig) return null;
  const expected = await hmacSign(body, getPortalSsoSecret());
  if (expected !== sig) return null;
  try {
    const json = new TextDecoder().decode(fromBase64Url(body));
    const payload = JSON.parse(json) as PortalSsoPayload;
    if (!payload?.username || !payload?.exp) return null;
    if (payload.exp < Math.floor(Date.now() / 1000)) return null;
    return payload;
  } catch {
    return null;
  }
}

/** Map Chillouts roles → Detentions roles */
export function mapChillRoleToDetentionRole(
  role: User['role']
): 'beheerder' | 'coordinator' | 'leerkracht' | 'directie' {
  if (role === 'admin') return 'beheerder';
  if (role === 'full_access') return 'directie';
  if (role === 'reports_access') return 'coordinator';
  return 'leerkracht';
}

export function toDetentionsSsoScope(
  scope: DetentionsAccessScope
): 'full' | 'limited' | null {
  if (scope === 'full' || scope === 'limited') return scope;
  return null;
}
