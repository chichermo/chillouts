'use client';

import { useState, useEffect } from 'react';
import Link from 'next/link';
import { usePathname, useRouter } from 'next/navigation';
import Logo from './Logo';
import InstallButton from './InstallButton';
import { logout, getUsername, isAdmin, getCurrentUser, hasPermission } from '@/lib/auth';
import type { UserPermissions } from '@/lib/users';

export default function Navigation() {
  const pathname = usePathname();
  const router = useRouter();
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  const [isUserAdmin, setIsUserAdmin] = useState(false);
  const [user, setUser] = useState<any>(null);

  useEffect(() => {
    setIsUserAdmin(isAdmin());
    setUser(getCurrentUser());
  }, [pathname]);

  const handleLogout = () => {
    logout();
    router.push('/login');
  };
  
  // Construir links de navegación basados en permisos del usuario
  const getNavLinks = () => {
    const allLinks = [
      { 
        href: '/', 
        label: 'Dashboard',
        permission: null as keyof UserPermissions | null,
        icon: (
          <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 12l2-2m0 0l7-7 7 7M5 10v10a1 1 0 001 1h3m10-11l2 2m-2-2v10a1 1 0 01-1 1h-3m-6 0a1 1 0 001-1v-4a1 1 0 011-1h2a1 1 0 011 1v4a1 1 0 001 1m-6 0h6" />
          </svg>
        )
      },
      { 
        href: '/students', 
        label: 'Beheer Studenten',
        permission: 'students' as keyof UserPermissions,
        icon: (
          <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4.354a4 4 0 110 5.292M15 21H3v-1a6 6 0 0112 0v1zm0 0h6v-1a6 6 0 00-9-5.197M13 7a4 4 0 11-8 0 4 4 0 018 0z" />
          </svg>
        )
      },
      { 
        href: '/daily', 
        label: 'Dagelijks',
        permission: 'dagelijks' as keyof UserPermissions,
        icon: (
          <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z" />
          </svg>
        )
      },
      { 
        href: '/weekly', 
        label: 'Weekoverzicht',
        permission: 'weekoverzicht' as keyof UserPermissions,
        icon: (
          <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z" />
          </svg>
        )
      },
      { 
        href: '/stats', 
        label: 'Statistieken',
        permission: 'statistieken' as keyof UserPermissions,
        icon: (
          <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z" />
          </svg>
        )
      },
      { 
        href: '/import', 
        label: 'Rapporten',
        permission: 'rapporten' as keyof UserPermissions,
        icon: (
          <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z" />
          </svg>
        )
      },
      { 
        href: '/audit', 
        label: 'Audit Log',
        permission: 'audit' as keyof UserPermissions,
        icon: (
          <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
          </svg>
        )
      },
    ];

    // Agregar link de usuarios solo para admins
    if (isUserAdmin) {
      allLinks.push({
        href: '/users',
        label: 'Gebruikers',
        permission: null,
        icon: (
          <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4.354a4 4 0 110 5.292M15 21H3v-1a6 6 0 0112 0v1zm0 0h6v-1a6 6 0 00-9-5.197M13 7a4 4 0 11-8 0 4 4 0 018 0z" />
          </svg>
        )
      });
    }

    // Filtrar links según permisos del usuario
    return allLinks.filter(link => {
      if (!link.permission) return true; // Dashboard siempre visible
      if (!user) return false;
      return hasPermission(user, link.permission);
    });
  };

  const navLinks = getNavLinks();

  return (
    <nav className="bg-[#2a2a3a] shadow-md border-b border-white/10 sticky top-0 z-50 backdrop-blur-lg bg-opacity-98">
      <div className="container mx-auto px-4">
        <div className="flex items-center justify-between h-18">
          {/* Logo */}
          <Link href="/" className="flex items-center group flex-shrink-0">
            <div className="hidden sm:block">
              <Logo variant="compact" />
            </div>
            <div className="sm:hidden">
              <Logo variant="icon" />
            </div>
          </Link>

          {/* Desktop Navigation */}
          <div className="hidden md:flex items-center gap-2">
            {navLinks.map((link) => {
              const isActive = pathname === link.href || (link.href !== '/' && pathname?.startsWith(link.href));
              return (
                <Link
                  key={link.href}
                  href={link.href}
                  className={`flex items-center gap-2.5 px-5 py-2.5 rounded-xl font-semibold transition-all duration-300 relative group overflow-hidden ${
                    isActive
                      ? 'bg-white/20 text-white shadow-lg scale-105'
                      : 'text-white/70 hover:text-white hover:bg-white/10'
                  }`}
                >
                  {isActive && (
                    <div className="absolute inset-0 bg-white/10"></div>
                  )}
                  <span className={`relative z-10 ${isActive ? 'text-white' : 'text-white/70 group-hover:text-white'}`}>
                    {link.icon}
                  </span>
                  <span className="relative z-10 text-body">{link.label}</span>
                  {!isActive && (
                    <div className="absolute bottom-0 left-0 right-0 h-0.5 bg-white/30 transform scale-x-0 group-hover:scale-x-100 transition-transform origin-left"></div>
                  )}
                </Link>
              );
            })}
            
            {/* Install Button */}
            <InstallButton />
            
            {/* Logout Button */}
            <button
              onClick={handleLogout}
              className="flex items-center gap-2.5 px-5 py-2.5 rounded-xl font-semibold transition-all duration-300 text-white/70 hover:text-white hover:bg-red-500/20 border border-red-500/30"
              title="Uitloggen"
            >
              <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 16l4-4m0 0l-4-4m4 4H7m6 4v1a3 3 0 01-3 3H6a3 3 0 01-3-3V7a3 3 0 013-3h4a3 3 0 013 3v1" />
              </svg>
              <span className="hidden lg:inline">Uitloggen</span>
            </button>
          </div>

          {/* Mobile Menu Button */}
          <button
            onClick={() => setMobileMenuOpen(!mobileMenuOpen)}
            className="md:hidden p-2.5 rounded-xl text-white/70 hover:bg-white/10 hover:text-white transition-all duration-200"
            aria-label="Toggle menu"
          >
            {mobileMenuOpen ? (
              <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M6 18L18 6M6 6l12 12" />
              </svg>
            ) : (
              <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M4 6h16M4 12h16M4 18h16" />
              </svg>
            )}
          </button>
        </div>

        {/* Mobile Navigation */}
        {mobileMenuOpen && (
          <div className="md:hidden border-t border-white/10 py-3 bg-[#2a2a3a]/98 backdrop-blur-lg">
            {navLinks.map((link) => {
              const isActive = pathname === link.href || (link.href !== '/' && pathname?.startsWith(link.href));
              return (
                <Link
                  key={link.href}
                  href={link.href}
                  onClick={() => setMobileMenuOpen(false)}
                  className={`flex items-center gap-3 px-4 py-3.5 rounded-xl font-semibold transition-all duration-200 mx-2 mb-1 ${
                    isActive
                      ? 'bg-white/20 text-white shadow-lg'
                      : 'text-white/70 hover:bg-white/10 hover:text-white'
                  }`}
                >
                  <span className={`${isActive ? 'text-white' : 'text-white/70'}`}>
                    {link.icon}
                  </span>
                  <span className="text-body">{link.label}</span>
                </Link>
              );
            })}
            
            {/* Install Button Mobile */}
            <div className="mx-2 mb-2">
              <InstallButton />
            </div>
            
            {/* Logout Button Mobile */}
            <button
              onClick={() => {
                handleLogout();
                setMobileMenuOpen(false);
              }}
              className="flex items-center gap-3 px-4 py-3.5 rounded-xl font-semibold transition-all duration-200 mx-2 mb-1 text-white/70 hover:bg-red-500/20 hover:text-white border border-red-500/30"
            >
              <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 16l4-4m0 0l-4-4m4 4H7m6 4v1a3 3 0 01-3 3H6a3 3 0 01-3-3V7a3 3 0 013-3h4a3 3 0 013 3v1" />
              </svg>
              <span>Uitloggen</span>
            </button>
          </div>
        )}
      </div>
    </nav>
  );
}

