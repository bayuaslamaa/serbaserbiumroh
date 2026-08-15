'use client';

import { useEffect, useState } from 'react';
import { X, Info, CheckCircle, ExternalLink, MessageCircle } from 'lucide-react';

const STORAGE_KEY = 'hotel_nusuk_disclaimer_seen_at';
const EXPIRY_MS = 24 * 60 * 60 * 1000;

export const HotelNusukDisclaimerPopup = () => {
  const [visible, setVisible] = useState(false);
  const [animating, setAnimating] = useState(false);

  useEffect(() => {
    try {
      const raw = localStorage.getItem(STORAGE_KEY);
      if (raw) {
        const seenAt = parseInt(raw, 10);
        if (!isNaN(seenAt) && Date.now() - seenAt < EXPIRY_MS) {
          return;
        }
      }
    } catch {}
    const t = setTimeout(() => {
      setVisible(true);
      requestAnimationFrame(() => setAnimating(true));
    }, 400);
    return () => clearTimeout(t);
  }, []);

  const dismiss = () => {
    setAnimating(false);
    setTimeout(() => {
      setVisible(false);
      try {
        localStorage.setItem(STORAGE_KEY, String(Date.now()));
      } catch {}
    }, 250);
  };

  if (!visible) return null;

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center p-4"
      style={{
        backgroundColor: animating ? 'rgba(0,0,0,0.65)' : 'rgba(0,0,0,0)',
        backdropFilter: animating ? 'blur(4px)' : 'blur(0px)',
        transition: 'background-color 0.25s ease, backdrop-filter 0.25s ease',
      }}
      onClick={(e) => {
        if (e.target === e.currentTarget) dismiss();
      }}
    >
      <div
        role="dialog"
        aria-modal="true"
        aria-labelledby="disclaimer-title"
        className="relative w-full max-w-md rounded-2xl shadow-2xl overflow-hidden"
        style={{
          backgroundColor: 'var(--color-surface, #0d1f14)',
          border: '1px solid rgba(201,168,76,0.35)',
          transform: animating ? 'translateY(0) scale(1)' : 'translateY(16px) scale(0.97)',
          opacity: animating ? 1 : 0,
          transition: 'transform 0.3s cubic-bezier(0.34,1.56,0.64,1), opacity 0.25s ease',
          boxShadow: '0 0 40px rgba(201,168,76,0.12), 0 20px 60px rgba(0,0,0,0.5)',
        }}
      >
        <div
          className="h-1 w-full"
          style={{
            background:
              'linear-gradient(90deg, var(--color-gold,#c9a84c), #f0d080, var(--color-gold,#c9a84c))',
          }}
        />

        <button
          onClick={dismiss}
          aria-label="Tutup"
          className="absolute top-4 right-4 rounded-full p-1.5 transition-colors"
          style={{ color: 'var(--color-text-muted)', backgroundColor: 'rgba(255,255,255,0.05)' }}
          onMouseEnter={(e) => (e.currentTarget.style.backgroundColor = 'rgba(255,255,255,0.12)')}
          onMouseLeave={(e) => (e.currentTarget.style.backgroundColor = 'rgba(255,255,255,0.05)')}
        >
          <X className="h-4 w-4" />
        </button>

        <div className="p-6">
          <div className="flex items-start gap-3 mb-5">
            <div
              className="flex-shrink-0 rounded-xl p-2.5"
              style={{
                backgroundColor: 'rgba(201,168,76,0.12)',
                border: '1px solid rgba(201,168,76,0.25)',
              }}
            >
              <Info className="h-5 w-5" style={{ color: 'var(--color-gold,#c9a84c)' }} />
            </div>
            <div>
              <h2
                id="disclaimer-title"
                className="font-bold text-base leading-snug"
                style={{ color: 'var(--color-gold,#c9a84c)', fontFamily: 'var(--font-heading)' }}
              >
                Sebelum Melihat Daftar Hotel
              </h2>
              <p className="text-xs mt-0.5" style={{ color: 'var(--color-text-muted)' }}>
                Mohon baca informasi penting berikut
              </p>
            </div>
          </div>

          <ul className="space-y-3.5 mb-6">
            {[
              {
                icon: (
                  <Info className="h-4 w-4 flex-shrink-0 mt-0.5" style={{ color: '#f0d080' }} />
                ),
                text: (
                  <>
                    <span className="font-semibold" style={{ color: 'var(--color-text)' }}>
                      Harga di sini adalah estimasi
                    </span>{' '}
                    <span style={{ color: 'var(--color-text-muted)' }}>
                      untuk keperluan <em>planning</em> perjalanan umroh, bukan harga resmi atau
                      jaminan ketersediaan kamar.
                    </span>
                  </>
                ),
              },
              {
                icon: (
                  <CheckCircle
                    className="h-4 w-4 flex-shrink-0 mt-0.5"
                    style={{ color: '#4caf85' }}
                  />
                ),
                text: (
                  <>
                    <span className="font-semibold" style={{ color: 'var(--color-text)' }}>
                      Hotel-hotel di sini terdaftar di Nusuk
                    </span>{' '}
                    <span style={{ color: 'var(--color-text-muted)' }}>
                      dan sesuai rekomendasi kami — sehingga proses approval untuk travel agent
                      lebih mudah dan lancar.
                    </span>
                  </>
                ),
              },
              {
                icon: (
                  <ExternalLink
                    className="h-4 w-4 flex-shrink-0 mt-0.5"
                    style={{ color: '#6b9de8' }}
                  />
                ),
                text: (
                  <>
                    <span className="font-semibold" style={{ color: 'var(--color-text)' }}>
                      Untuk harga aktual
                    </span>
                    <span style={{ color: 'var(--color-text-muted)' }}>
                      , silakan cek langsung di{' '}
                      <span className="font-medium" style={{ color: '#93c5fd' }}>
                        Booking.com, Agoda
                      </span>
                      , atau aplikasi OTA lainnya.
                    </span>
                  </>
                ),
              },
              {
                icon: (
                  <MessageCircle
                    className="h-4 w-4 flex-shrink-0 mt-0.5"
                    style={{ color: '#a78bfa' }}
                  />
                ),
                text: (
                  <span style={{ color: 'var(--color-text-muted)' }}>
                    Butuh bantuan atau ingin penawaran spesial?{' '}
                    <span className="font-semibold" style={{ color: 'var(--color-text)' }}>
                      Tanya langsung ke admin kami.
                    </span>
                  </span>
                ),
              },
            ].map((item, i) => (
              <li key={i} className="flex items-start gap-3 text-sm leading-relaxed">
                {item.icon}
                <span>{item.text}</span>
              </li>
            ))}
          </ul>

          <button
            id="disclaimer-confirm-btn"
            onClick={dismiss}
            className="w-full py-3 rounded-xl font-semibold text-sm transition-all duration-200"
            style={{
              background: 'linear-gradient(135deg, var(--color-gold,#c9a84c), #f0d080)',
              color: '#1a1a0e',
            }}
            onMouseEnter={(e) => (e.currentTarget.style.opacity = '0.9')}
            onMouseLeave={(e) => (e.currentTarget.style.opacity = '1')}
          >
            Mengerti, Lanjutkan
          </button>

          <p className="text-center text-[10px] mt-3" style={{ color: 'var(--color-text-muted)' }}>
            Pesan ini akan muncul kembali setelah 24 jam
          </p>
        </div>
      </div>
    </div>
  );
};
