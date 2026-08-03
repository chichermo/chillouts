'use client';

import { useState, useEffect } from 'react';
import Link from 'next/link';
import { usePathname, useRouter } from 'next/navigation';
import ChilloutsBrand from './ChilloutsBrand';
import InstallButton from './InstallButton';
import { logout, isAdmin, getCurrentUser, hasPermission } from '@/lib/auth';
import type { UserPermissions } from '@/lib/users';

export default function Navigation() {
  const pathname = usePathname();
  const router = useRouter();
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  const [isUserAdmin, setIsUserAdmin] = useState(false);
  const [user, setUser] = useState<ReturnType<typeof getCurrentUser>>(null);

  useEffect(() => {
    setIsUserAdmin(isAdmin());
    setUser(getCurrentUser());
  }, [pathname]);

  const handleLogout = () => {
    logout();
    router.push('/login');
  };

  const getNavLinks = () => {
    const allLinks = [
      {
        href: '/portals',
        label: 'Portalen',
        permission: null as keyof UserPermissions | null,
        icon: (
          <svg className="h-3.5 w-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 6a2 2 0 012-2h2a2 2 0 012 2v2a2 2 0 01-2 2H6a2 2 0 01-2-2V6zM14 6a2 2 0 012-2h2a2 2 0 012 2v2a2 2 0 01-2 2h-2a2 2 0 01-2-2V6zM4 16a2 2 0 012-2h2a2 2 0 012 2v2a2 2 0 01-2 2H6a2 2 0 01-2-2v-2zM14 16a2 2 0 012-2h2a2 2 0 012 2v2a2 2 0 01-2 2h-2a2 2 0 01-2-2v-2z" />
          </svg>
        ),
      },
      {
        href: '/dashboard',
        label: 'Dashboard',
        permission: null as keyof UserPermissions | null,
        icon: (
          <svg className="h-3.5 w-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 12l2-2m0 0l7-7 7 7M5 10v10a1 1 0 001 1h3m10-11l2 2m-2-2v10a1 1 0 01-1 1h-3m-6 0a1 1 0 001-1v-4a1 1 0 011-1h2a1 1 0 011 1v4a1 1 0 001 1m-6 0h6" />
          </svg>
        ),
      },
      {
        href: '/students',
        label: 'Studenten',
        permission: 'students' as keyof UserPermissions,
        icon: (
          <svg className="h-3.5 w-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4.354a4 4 0 110 5.292M15 21H3v-1a6 6 0 0112 0v1zm0 0h6v-1a6 6 0 00-9-5.197M13 7a4 4 0 11-8 0 4 4 0 018 0z" />
          </svg>
        ),
      },
      {
        href: '/daily',
        label: 'Dagelijks',
        permission: 'dagelijks' as keyof UserPermissions,
        icon: (
          <svg className="h-3.5 w-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z" />
          </svg>
        ),
      },
      {
        href: '/weekly',
        label: 'Weekoverzicht',
        permission: 'weekoverzicht' as keyof UserPermissions,
        icon: (
          <svg className="h-3.5 w-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z" />
          </svg>
        ),
      },
      {
        href: '/stats',
        label: 'Statistieken',
        permission: 'statistieken' as keyof UserPermissions,
        icon: (
          <svg className="h-3.5 w-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z" />
          </svg>
        ),
      },
      {
        href: '/import',
        label: 'Rapporten',
        permission: 'rapporten' as keyof UserPermissions,
        icon: (
          <svg className="h-3.5 w-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
          </svg>
        ),
      },
      {
        href: '/backup',
        label: 'Backup',
        permission: 'backup' as keyof UserPermissions,
        icon: (
          <svg className="h-3.5 w-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 8h14M5 8a2 2 0 110-4h14a2 2 0 110 4M5 8v10a2 2 0 002 2h10a2 2 0 002-2V8m-9 4h4" />
          </svg>
        ),
      },
      {
        href: '/audit',
        label: 'Audit',
        permission: 'audit' as keyof UserPermissions,
        icon: (
          <svg className="h-3.5 w-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
          </svg>
        ),
      },
    ];

    if (isUserAdmin) {
      allLinks.push({
        href: '/users',
        label: 'Gebruikers',
        permission: null,
        icon: (
          <svg className="h-3.5 w-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4.354a4 4 0 110 5.292M15 21H3v-1a6 6 0 0112 0v1zm0 0h6v-1a6 6 0 00-9-5.197M13 7a4 4 0 11-8 0 4 4 0 018 0z" />
          </svg>
        ),
      });
      allLinks.push({
        href: '/timetables',
        label: 'Roosters',
        permission: null,
        icon: (
          <svg className="h-3.5 w-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z" />
          </svg>
        ),
      });
    }

    return allLinks.filter((link) => {
      if (!link.permission) return true;
      if (!user) return false;
      return hasPermission(user, link.permission);
    });
  };

  const navLinks = getNavLinks();

  const linkClass = (isActive: boolean) =>
    `inline-flex items-center gap-1 rounded-lg px-2 py-1 text-[11px] font-medium tracking-wide transition-colors ${
      isActive
        ? 'bg-[#E85A5A]/18 text-[#E85A5A] ring-1 ring-[#E85A5A]/35'
        : 'text-white/65 hover:bg-white/[0.06] hover:text-white'
    }`;

  return (
    <nav className="sticky top-0 z-50 border-b border-white/8 bg-[#141427]/92 backdrop-blur-xl">
      <div className="container mx-auto px-3 sm:px-4">
        <div className="flex h-12 items-center gap-2 sm:gap-3">
          <Link href="/dashboard" className="shrink-0" title="Chill-outs">
            <span className="hidden sm:inline-flex">
              <ChilloutsBrand size="sm" />
            </span>
            <span className="sm:hidden">
              <ChilloutsBrand size="sm" showLabel={false} />
            </span>
          </Link>

          <div className="hidden min-w-0 flex-1 items-center gap-0.5 overflow-x-auto scrollbar-hide md:flex">
            {navLinks.map((link) => {
              const isActive =
                pathname === link.href ||
                (link.href !== '/' &&
                  link.href !== '/portals' &&
                  pathname?.startsWith(link.href));
              return (
                <Link key={link.href} href={link.href} className={linkClass(!!isActive)}>
                  <span className={isActive ? 'text-[#E85A5A]' : 'text-white/45'}>{link.icon}</span>
                  <span>{link.label}</span>
                </Link>
              );
            })}
          </div>

          <div className="ml-auto hidden items-center gap-1 border-l border-white/10 pl-2 md:flex">
            <InstallButton />
            <Link
              href="/profile"
              className={linkClass(pathname === '/profile')}
              title="Mijn Profiel"
            >
              <svg className="h-3.5 w-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z" />
              </svg>
              <span className="hidden xl:inline">Profiel</span>
            </Link>
            <button
              type="button"
              onClick={handleLogout}
              className="inline-flex items-center gap-1 rounded-lg px-2 py-1 text-[11px] font-medium text-red-300/80 transition-colors hover:bg-red-500/10 hover:text-red-200"
              title="Uitloggen"
            >
              <svg className="h-3.5 w-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 16l4-4m0 0l-4-4m4 4H7m6 4v1a3 3 0 01-3 3H6a3 3 0 01-3-3V7a3 3 0 013-3h4a3 3 0 013 3v1" />
              </svg>
              <span className="hidden xl:inline">Uitloggen</span>
            </button>
          </div>

          <button
            type="button"
            onClick={() => setMobileMenuOpen(!mobileMenuOpen)}
            className="ml-auto rounded-lg p-2 text-white/70 transition-colors hover:bg-white/8 hover:text-white md:hidden"
            aria-label="Menu"
          >
            {mobileMenuOpen ? (
              <svg className="h-5 w-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
              </svg>
            ) : (
              <svg className="h-5 w-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 6h16M4 12h16M4 18h16" />
              </svg>
            )}
          </button>
        </div>

        {mobileMenuOpen && (
          <div className="border-t border-white/8 py-2 md:hidden">
            {navLinks.map((link) => {
              const isActive =
                pathname === link.href ||
                (link.href !== '/' &&
                  link.href !== '/portals' &&
                  pathname?.startsWith(link.href));
              return (
                <Link
                  key={link.href}
                  href={link.href}
                  onClick={() => setMobileMenuOpen(false)}
                  className={`mx-1 mb-0.5 flex items-center gap-2 rounded-lg px-3 py-2 text-sm font-medium ${
                    isActive
                      ? 'bg-[#E85A5A]/15 text-[#E85A5A]'
                      : 'text-white/70 hover:bg-white/[0.05] hover:text-white'
                  }`}
                >
                  {link.icon}
                  <span>{link.label}</span>
                </Link>
              );
            })}
            <div className="mx-2 my-2 border-t border-white/8" />
            <div className="mx-1 mb-1 px-1">
              <InstallButton />
            </div>
            <Link
              href="/profile"
              onClick={() => setMobileMenuOpen(false)}
              className={`mx-1 mb-0.5 flex items-center gap-2 rounded-lg px-3 py-2 text-sm font-medium ${
                pathname === '/profile'
                  ? 'bg-[#E85A5A]/15 text-[#E85A5A]'
                  : 'text-white/70 hover:bg-white/[0.05]'
              }`}
            >
              Profiel
            </Link>
            <button
              type="button"
              onClick={() => {
                handleLogout();
                setMobileMenuOpen(false);
              }}
              className="mx-1 mb-1 flex w-[calc(100%-0.5rem)] items-center gap-2 rounded-lg px-3 py-2 text-left text-sm font-medium text-red-300/90 hover:bg-red-500/10"
            >
              Uitloggen
            </button>
          </div>
        )}
      </div>
    </nav>
  );
}
