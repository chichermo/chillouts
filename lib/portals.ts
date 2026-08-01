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

export const O2_APP_URL =
  process.env.NEXT_PUBLIC_O2_URL || 'https://o2-nu-three.vercel.app';

export const PORTALS: PortalDef[] = [
  {
    id: 'chillouts',
    permission: 'portal_chillouts',
    title: 'Chill-outs',
    subtitle: 'Dagelijkse registratie, roosters, rapporten en statistieken.',
    href: '/dashboard',
    accent: '#ACE1AF',
  },
  {
    id: 'detentions',
    permission: 'portal_detentions',
    title: 'Nablijven',
    subtitle: 'Nablijven plannen, opvolgen en statistieken beheren.',
    href: DETENTIONS_APP_URL,
    external: true,
    accent: '#FFDFB9',
  },
  {
    id: 'o2',
    permission: 'portal_o2',
    title: 'O2',
    subtitle: 'Incidenten met impact registreren en opvolgen.',
    href: O2_APP_URL,
    external: true,
    accent: '#C2E0FC',
  },
];

export function getVisiblePortals(user: User | null): PortalDef[] {
  return PORTALS.filter((portal) => {
    // Nablijven: alle ingelogde actieve gebruikers
    if (portal.id === 'detentions') return !!user?.active;
    return hasPermission(user, portal.permission);
  });
}
