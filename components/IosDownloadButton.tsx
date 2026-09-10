'use client';

import { useEffect, useState } from 'react';

type IosDownloadButtonProps = {
  variant?: 'banner' | 'header';
};

function isStandaloneApp() {
  if (typeof window === 'undefined') return false;
  const nav = window.navigator as Navigator & { standalone?: boolean };
  return window.matchMedia('(display-mode: standalone)').matches || nav.standalone === true;
}

function detectIosSafari() {
  if (typeof window === 'undefined') return false;
  const ua = window.navigator.userAgent;
  const iPhoneOrIPod = /iPhone|iPod/.test(ua);
  const iPad =
    /iPad/.test(ua) ||
    (navigator.platform === 'MacIntel' && navigator.maxTouchPoints > 1);
  const isIOS = iPhoneOrIPod || iPad;
  const isSafari = /Safari/.test(ua) && !/CriOS|FxiOS|EdgiOS|OPiOS|DuckDuckGo/.test(ua);
  return isIOS && isSafari;
}

export default function IosDownloadButton({ variant = 'banner' }: IosDownloadButtonProps) {
  const [ready, setReady] = useState(false);
  const [installed, setInstalled] = useState(false);
  const [onIosSafari, setOnIosSafari] = useState(false);
  const [open, setOpen] = useState(false);

  useEffect(() => {
    setInstalled(isStandaloneApp());
    setOnIosSafari(detectIosSafari());
    setReady(true);
  }, []);

  useEffect(() => {
    if (!open) return;
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') setOpen(false);
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [open]);

  if (!ready || installed) return null;

  const label = 'Download voor iOS';

  return (
    <>
      {variant === 'header' ? (
        <button
          type="button"
          onClick={() => setOpen(true)}
          className="inline-flex items-center gap-2 rounded-xl border border-white/12 bg-white/[0.04] px-3.5 py-2 text-sm text-white/80 transition hover:border-white/25 hover:bg-white/10 hover:text-white"
          aria-haspopup="dialog"
          aria-expanded={open}
        >
          <AppleIcon className="h-4 w-4" />
          {label}
        </button>
      ) : (
        <button
          type="button"
          onClick={() => setOpen(true)}
          className="inline-flex w-full items-center justify-center gap-2.5 rounded-2xl border border-white/15 bg-white/[0.06] px-4 py-3.5 text-sm font-semibold text-white transition hover:border-white/30 hover:bg-white/10"
          aria-haspopup="dialog"
          aria-expanded={open}
        >
          <AppleIcon className="h-5 w-5" />
          {label}
        </button>
      )}

      {open && (
        <div
          className="fixed inset-0 z-[80] flex items-end justify-center p-4 sm:items-center"
          role="dialog"
          aria-modal="true"
          aria-labelledby="ios-download-title"
        >
          <button
            type="button"
            className="absolute inset-0 bg-black/65 backdrop-blur-sm"
            aria-label="Sluiten"
            onClick={() => setOpen(false)}
          />
          <div className="relative z-10 w-full max-w-md overflow-hidden rounded-3xl border border-white/15 bg-[#1c1c28] shadow-[0_30px_80px_rgba(0,0,0,0.55)]">
            <div className="h-1 bg-gradient-to-r from-[#ACE1AF] via-[#C2E0FC] to-[#FFDFB9]" />
            <div className="p-6">
              <div className="mb-4 flex items-start justify-between gap-3">
                <div>
                  <p className="text-xs font-semibold tracking-[0.18em] text-white/45 uppercase">
                    Element-app
                  </p>
                  <h2 id="ios-download-title" className="mt-1 text-xl font-black text-white">
                    Zet Element op je iPhone
                  </h2>
                </div>
                <button
                  type="button"
                  onClick={() => setOpen(false)}
                  className="rounded-lg px-2 py-1 text-sm text-white/50 hover:bg-white/10 hover:text-white"
                >
                  Sluiten
                </button>
              </div>

              {!onIosSafari ? (
                <p className="mb-5 rounded-2xl border border-[#C2E0FC]/25 bg-[#C2E0FC]/10 px-4 py-3 text-sm leading-relaxed text-white/80">
                  Open deze pagina in <strong className="text-white">Safari</strong> op je iPhone
                  of iPad. Daarna kun je Element op je beginscherm zetten.
                </p>
              ) : (
                <p className="mb-5 text-sm leading-relaxed text-white/65">
                  Apple laat apps niet rechtstreeks downloaden. Zet Element zo op je beginscherm:
                </p>
              )}

              <ol className="space-y-3">
                <Step n={1} title="Tik op Delen">
                  Het vierkant met pijl omhoog, onderaan in Safari.
                </Step>
                <Step n={2} title="Kies Zet op beginscherm">
                  Scroll in het menu tot je dit item ziet.
                </Step>
                <Step n={3} title="Tik op Voeg toe">
                  Element verschijnt als app-icoon op je beginscherm.
                </Step>
              </ol>
            </div>
          </div>
        </div>
      )}
    </>
  );
}

function Step({
  n,
  title,
  children,
}: {
  n: number;
  title: string;
  children: string;
}) {
  return (
    <li className="flex gap-3 rounded-2xl border border-white/10 bg-white/[0.04] px-3.5 py-3">
      <span className="flex h-7 w-7 shrink-0 items-center justify-center rounded-full bg-[#ACE1AF]/20 text-sm font-bold text-[#ACE1AF]">
        {n}
      </span>
      <div>
        <p className="text-sm font-semibold text-white">{title}</p>
        <p className="mt-0.5 text-xs leading-relaxed text-white/55">{children}</p>
      </div>
    </li>
  );
}

function AppleIcon({ className }: { className?: string }) {
  return (
    <svg className={className} viewBox="0 0 24 24" fill="currentColor" aria-hidden>
      <path d="M16.37 12.64c-.03-2.16 1.76-3.2 1.84-3.25-1.01-1.47-2.57-1.67-3.12-1.69-1.32-.14-2.58.78-3.25.78-.68 0-1.72-.76-2.83-.74-1.45.02-2.8.85-3.55 2.15-1.52 2.64-.39 6.54 1.09 8.68.73 1.04 1.59 2.21 2.72 2.17 1.1-.04 1.51-.7 2.84-.7 1.32 0 1.7.7 2.84.68 1.18-.02 1.92-1.06 2.63-2.11.84-1.2 1.18-2.37 1.2-2.43-.03-.01-2.29-.88-2.32-3.54zM14.7 6.48c.6-.73 1-1.75.89-2.77-.86.04-1.9.57-2.52 1.3-.55.64-1.04 1.68-.91 2.67.96.07 1.94-.49 2.54-1.2z" />
    </svg>
  );
}
