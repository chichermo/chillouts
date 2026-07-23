import type { User, UserPermissions } from './users';
import { hasPermission } from './users';

export type PortalId = 'chillouts' | 'detentions' | 'o2';

export type PortalDef = {
  id: PortalId;
  permission: keyof UserPermissions;
  title: string;
  subtitle: string;
  href: string;
  external?: boolean;
  comingSoon?: boolean;
  accent: string;
};

export const DETENTIONS_APP_URL =
  process.env.NEXT_PUBLIC_DETENTIONS_URL || 'https://detentions.vercel.app';

export const PORTALS: PortalDef[] = [
  {
    id: 'chillouts',
    permission: 'portal_chillouts',
    title: 'Chill-outs',
    subtitle: 'Dagelijkse chill-outs, roosters, rapporten en statistieken.',
    href: '/dashboard',
    accent: '#ACE1AF',
  },
  {
    id: 'detentions',
    permission: 'portal_detentions',
    title: 'Detentions',
    subtitle: 'Nablijven plannen, opvolgen en statistieken.',
    href: DETENTIONS_APP_URL,
    external: true,
    accent: '#FFDFB9',
  },
  {
    id: 'o2',
    permission: 'portal_o2',
    title: 'O2',
    subtitle: 'Incidenten met impact — binnenkort beschikbaar.',
    href: '/o2',
    comingSoon: true,
    accent: '#C2E0FC',
  },
];

export function getVisiblePortals(user: User | null): PortalDef[] {
  return PORTALS.filter((portal) => hasPermission(user, portal.permission));
}
