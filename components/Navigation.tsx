'use client';

import { useState } from 'react';
import Link from 'next/link';
import { usePathname } from 'next/navigation';

export default function Navigation() {
  const pathname = usePathname();
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  
  const navLinks = [
    { 
      href: '/students', 
      label: 'Studenten', 
      icon: (
        <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4.354a4 4 0 110 5.292M15 21H3v-1a6 6 0 0112 0v1zm0 0h6v-1a6 6 0 00-9-5.197M13 7a4 4 0 11-8 0 4 4 0 018 0z" />
        </svg>
      )
    },
    { 
      href: '/daily', 
      label: 'Dagelijks', 
      icon: (
        <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z" />
        </svg>
      )
    },
    { 
      href: '/weekly', 
      label: 'Weekoverzicht', 
      icon: (
        <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z" />
        </svg>
      )
    },
    { 
      href: '/stats', 
      label: 'Statistieken', 
      icon: (
        <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z" />
        </svg>
      )
    },
    { 
      href: '/import', 
      label: 'Rapporten', 
      icon: (
        <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z" />
        </svg>
      )
    },
    { 
      href: '/audit', 
      label: 'Audit Log', 
      icon: (
        <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
        </svg>
      )
    },
  ];

  return (
    <nav className="bg-brand-gray shadow-md border-b border-brand-gray/30 sticky top-0 z-50 backdrop-blur-lg bg-opacity-95">
      <div className="container mx-auto px-4">
        <div className="flex items-center justify-between h-18">
          {/* Logo */}
          <Link href="/" className="flex items-center space-x-3 group flex-shrink-0">
            <div className="relative">
              <div className="absolute inset-0 bg-brand-blue rounded-xl blur opacity-50 group-hover:opacity-75 transition-opacity"></div>
              <div className="relative bg-brand-blue rounded-xl p-2.5 group-hover:scale-110 transition-transform shadow-lg">
                <svg className="w-7 h-7 text-brand-black" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
                </svg>
              </div>
            </div>
            <div className="hidden sm:block">
              <span className="text-title font-rounded text-brand-black tracking-tight" suppressHydrationWarning>
                Chill-outs
              </span>
              <div className="text-xs font-semibold text-brand-gray tracking-wider">BEHEER</div>
            </div>
            <span className="text-title font-rounded text-brand-black sm:hidden" suppressHydrationWarning>
              CO
            </span>
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
                      ? 'bg-brand-blue text-brand-black shadow-lg scale-105'
                      : 'text-brand-black/70 hover:text-brand-black hover:bg-brand-blue/30'
                  }`}
                >
                  {isActive && (
                    <div className="absolute inset-0 bg-brand-blue/20"></div>
                  )}
                  <span className={`relative z-10 ${isActive ? 'text-brand-black' : 'text-brand-black/70 group-hover:text-brand-black'}`}>
                    {link.icon}
                  </span>
                  <span className="relative z-10 text-body">{link.label}</span>
                  {!isActive && (
                    <div className="absolute bottom-0 left-0 right-0 h-0.5 bg-brand-blue transform scale-x-0 group-hover:scale-x-100 transition-transform origin-left"></div>
                  )}
                </Link>
              );
            })}
          </div>

          {/* Mobile Menu Button */}
          <button
            onClick={() => setMobileMenuOpen(!mobileMenuOpen)}
            className="md:hidden p-2.5 rounded-xl text-brand-black/70 hover:bg-brand-blue/30 hover:text-brand-black transition-all duration-200"
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
          <div className="md:hidden border-t border-brand-gray/30 py-3 bg-brand-gray/95 backdrop-blur-lg">
            {navLinks.map((link) => {
              const isActive = pathname === link.href || (link.href !== '/' && pathname?.startsWith(link.href));
              return (
                <Link
                  key={link.href}
                  href={link.href}
                  onClick={() => setMobileMenuOpen(false)}
                  className={`flex items-center gap-3 px-4 py-3.5 rounded-xl font-semibold transition-all duration-200 mx-2 mb-1 ${
                    isActive
                      ? 'bg-brand-blue text-brand-black shadow-lg'
                      : 'text-brand-black/70 hover:bg-brand-blue/30 hover:text-brand-black'
                  }`}
                >
                  <span className={`${isActive ? 'text-brand-black' : 'text-brand-black/70'}`}>
                    {link.icon}
                  </span>
                  <span className="text-body">{link.label}</span>
                </Link>
              );
            })}
          </div>
        )}
      </div>
    </nav>
  );
}

