'use client';

import Navigation from '@/components/Navigation';

export default function NablijvenPage() {
  return (
    <div className="min-h-screen relative overflow-hidden">
      {/* Background decorative elements */}
      <div className="absolute inset-0 overflow-hidden pointer-events-none">
        <div className="absolute top-20 left-10 w-72 h-72 bg-brand-pink/20 rounded-full blur-3xl"></div>
        <div className="absolute bottom-20 right-10 w-96 h-96 bg-brand-green/20 rounded-full blur-3xl"></div>
        <div className="absolute top-1/2 left-1/2 transform -translate-x-1/2 -translate-y-1/2 w-96 h-96 bg-brand-orange/20 rounded-full blur-3xl"></div>
      </div>
      
      <Navigation />
      <div className="container mx-auto px-4 py-12 relative z-10">
        {/* Header Section */}
        <div className="text-center mb-12">
          <h1 className="text-4xl md:text-5xl font-black text-white mb-4">
            Nablijven Systeem
          </h1>
          <p className="text-lg text-white/80 font-medium">
            Beheer van nablijven (16:00 - 16:50)
          </p>
        </div>

        {/* Button to access external site */}
        <div className="max-w-2xl mx-auto">
          <div className="glass-effect rounded-2xl p-12 border border-white/20 text-center">
            <div className="mb-8">
              <div className="w-24 h-24 rounded-2xl bg-white/10 flex items-center justify-center shadow-xl shadow-white/20 mx-auto mb-6">
                <svg className="w-12 h-12 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
                </svg>
              </div>
              <h2 className="text-2xl font-bold text-white mb-4">Toegang tot Nablijven Systeem</h2>
              <p className="text-white/70 text-sm mb-8">
                Klik op de knop hieronder om naar het Nablijven beheersysteem te gaan
              </p>
            </div>
            <a
              href="https://detentions.vercel.app/"
              target="_blank"
              rel="noopener noreferrer"
              className="inline-flex items-center gap-3 px-8 py-4 rounded-xl bg-blue-600 text-white font-semibold hover:bg-blue-700 transition-colors border border-blue-500 shadow-lg shadow-blue-500/30 hover:shadow-blue-500/50"
            >
              <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10 6H6a2 2 0 00-2 2v10a2 2 0 002 2h10a2 2 0 002-2v-4M14 4h6m0 0v6m0-6L10 14" />
              </svg>
              Open Nablijven Systeem
            </a>
          </div>
        </div>
      </div>
    </div>
  );
}
