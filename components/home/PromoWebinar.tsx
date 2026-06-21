'use client'

import { useEffect, useState } from 'react'
import Link from 'next/link'
import { Button } from '@/components/ui/button'
import { Calendar, Clock, ArrowRight, User, Phone, CheckCircle, Video } from 'lucide-react'

// Client-only Countdown Timer Component to prevent Hydration Mismatch
function CountdownTimer() {
  const [timeLeft, setTimeLeft] = useState<{
    days: number
    hours: number
    minutes: number
    seconds: number
  } | null>(null)

  useEffect(() => {
    // Target Date: 21 June 2026 at 13:00 WIB (UTC+7)
    const targetDate = new Date('2026-06-21T13:00:00+07:00').getTime()

    const updateTimer = () => {
      const now = new Date().getTime()
      const difference = targetDate - now

      if (difference <= 0) {
        setTimeLeft({ days: 0, hours: 0, minutes: 0, seconds: 0 })
        return
      }

      const days = Math.floor(difference / (1000 * 60 * 60 * 24))
      const hours = Math.floor((difference % (1000 * 60 * 60 * 24)) / (1000 * 60 * 60))
      const minutes = Math.floor((difference % (1000 * 60 * 60)) / (1000 * 60))
      const seconds = Math.floor((difference % (1000 * 60)) / 1000)

      setTimeLeft({ days, hours, minutes, seconds })
    }

    updateTimer()
    const interval = setInterval(updateTimer, 1000)
    return () => clearInterval(interval)
  }, [])

  if (!timeLeft) {
    return (
      <div className="flex gap-3 justify-start py-2">
        {[1, 2, 3, 4].map((i) => (
          <div key={i} className="flex flex-col items-center">
            <div className="w-12 h-12 bg-white/5 border border-white/10 rounded-lg flex items-center justify-center">
              <span className="text-xl font-bold text-gray-500">--</span>
            </div>
            <span className="text-[10px] uppercase mt-1 tracking-wider text-[var(--color-text-muted)]">...</span>
          </div>
        ))}
      </div>
    )
  }

  return (
    <div className="flex gap-3 justify-start py-2">
      {[
        { label: 'Hari', value: timeLeft.days },
        { label: 'Jam', value: timeLeft.hours },
        { label: 'Menit', value: timeLeft.minutes },
        { label: 'Detik', value: timeLeft.seconds },
      ].map((item, idx) => (
        <div key={idx} className="flex flex-col items-center">
          <div 
            className="w-12 h-12 md:w-14 md:h-14 bg-white/5 border rounded-lg flex items-center justify-center transition-all duration-300 hover:scale-105 hover:bg-white/10"
            style={{ borderColor: 'var(--color-border)' }}
          >
            <span className="text-xl md:text-2xl font-bold text-[var(--color-gold)] font-mono">
              {String(item.value).padStart(2, '0')}
            </span>
          </div>
          <span className="text-[9px] md:text-[10px] uppercase mt-1 tracking-wider text-[var(--color-text-muted)] font-semibold">
            {item.label}
          </span>
        </div>
      ))}
    </div>
  )
}

export function PromoWebinar() {
  return (
    <section className="py-10">
      <div className="relative overflow-hidden rounded-2xl border bg-gradient-to-br from-[#0e271a] via-[#0b1c12] to-[#122e1d] p-6 md:p-10 shadow-2xl transition-all duration-500 hover:shadow-[0_0_40px_rgba(201,168,76,0.15)] group" style={{ borderColor: 'var(--color-border)' }}>
        
        {/* Glow effect */}
        <div className="absolute -right-24 -top-24 w-96 h-96 bg-[var(--color-gold)] opacity-[0.03] rounded-full blur-3xl pointer-events-none group-hover:opacity-[0.06] transition-opacity duration-700" />
        <div className="absolute -left-24 -bottom-24 w-96 h-96 bg-[var(--color-green)] opacity-[0.05] rounded-full blur-3xl pointer-events-none group-hover:opacity-[0.08] transition-opacity duration-700" />

        <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 items-center relative z-10">
          {/* Main Info */}
          <div className="lg:col-span-7 space-y-6">
            <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full text-xs font-semibold bg-[var(--color-gold)]/10 text-[var(--color-gold)] border border-[var(--color-gold)]/30 animate-pulse">
              <span className="w-2 h-2 rounded-full bg-red-500" />
              MANASIK ONLINE GRATIS
            </div>
            
            <h2 className="text-3xl md:text-4xl font-extrabold leading-tight tracking-wide font-serif" style={{ color: 'var(--color-gold)' }}>
              Manasik Online:<br />
              <span className="text-white">Tata Cara & Panduan Praktis Ibadah Umroh</span>
            </h2>
            
            <p className="text-sm md:text-base leading-relaxed" style={{ color: 'var(--color-text-muted)' }}>
              Pelajari tata cara ibadah umroh yang benar sesuai sunnah, persiapan ruhani, serta tips praktis selama di tanah suci bersama Ustadz Muhammad Singgih Pamungkas.
            </p>

            <div className="space-y-3 pt-2">
              <p className="text-xs uppercase tracking-wider font-bold" style={{ color: 'var(--color-gold)' }}>Manasik Dimulai Dalam:</p>
              <CountdownTimer />
            </div>

            <div className="flex flex-wrap gap-x-6 gap-y-2 text-xs md:text-sm pt-2" style={{ color: 'var(--color-text-muted)' }}>
              <div className="flex items-center gap-2">
                <CheckCircle className="w-4 h-4 text-[var(--color-gold)]" />
                <span>GRATIS & Terbuka untuk Umum</span>
              </div>
              <div className="flex items-center gap-2">
                <CheckCircle className="w-4 h-4 text-[var(--color-gold)]" />
                <span>Live Q&A Session</span>
              </div>
              <div className="flex items-center gap-2">
                <CheckCircle className="w-4 h-4 text-[var(--color-gold)]" />
                <span>Materi & Rekaman Manasik</span>
              </div>
            </div>
          </div>

          {/* Details & CTA Card */}
          <div className="lg:col-span-5">
            <div className="relative border bg-[#0b1c12]/80 backdrop-blur-md rounded-xl p-6 flex flex-col justify-between h-full hover:border-[var(--color-gold)]/40 transition-all duration-300 shadow-lg" style={{ borderColor: 'var(--color-border)' }}>
              
              <div className="space-y-4">
                <div className="flex items-center justify-between pb-3 border-b border-[var(--color-border)]/50">
                  <span className="text-xs font-semibold tracking-widest uppercase text-[var(--color-text-muted)]">Detail Acara</span>
                  <div className="flex items-center gap-1.5 px-2.5 py-0.5 rounded-full text-[11px] font-bold bg-[#1b432a] text-[#a6e6bd] border border-[#2c6b42]/30">
                    <Video className="w-3.5 h-3.5" />
                    Live Zoom
                  </div>
                </div>

                <div className="space-y-3">
                  <div className="flex items-start gap-3">
                    <Calendar className="w-5 h-5 mt-0.5 flex-shrink-0 text-[var(--color-gold)]" />
                    <div>
                      <p className="text-xs text-[var(--color-text-muted)] font-medium">Tanggal</p>
                      <p className="text-sm font-semibold text-white">Ahad, 21 Juni 2026</p>
                    </div>
                  </div>

                  <div className="flex items-start gap-3">
                    <Clock className="w-5 h-5 mt-0.5 flex-shrink-0 text-[var(--color-gold)]" />
                    <div>
                      <p className="text-xs text-[var(--color-text-muted)] font-medium">Waktu</p>
                      <p className="text-sm font-semibold text-white">13.00 WIB - Selesai</p>
                    </div>
                  </div>

                  <div className="flex items-start gap-3 pb-2">
                    <User className="w-5 h-5 mt-0.5 flex-shrink-0 text-[var(--color-gold)]" />
                    <div>
                      <p className="text-xs text-[var(--color-text-muted)] font-medium">Narasumber</p>
                      <p className="text-sm font-semibold text-white">Ustadz Muhammad Singgih Pamungkas</p>
                      <p className="text-[11px] text-[var(--color-text-muted)]">S3 Universitas Islam Madinah</p>
                    </div>
                  </div>
                </div>
              </div>

              <div className="mt-6 pt-4 border-t border-[var(--color-border)]/50 space-y-4">
                <Link 
                  href="https://us06web.zoom.us/j/86026784002?pwd=dVK3pz6hGnRdNl3HjwahZ9aNiXLZIU.1" 
                  target="_blank" 
                  rel="noopener noreferrer"
                  className="block w-full"
                >
                  <Button className="w-full py-6 text-sm md:text-base font-bold text-[#0b1c12] bg-[var(--color-gold)] hover:bg-[#b0923d] transition-all duration-300 shadow-[0_0_20px_rgba(201,168,76,0.2)] hover:scale-[1.02] active:scale-[0.98] flex items-center justify-center gap-2 font-semibold">
                    Gabung Zoom Sekarang
                    <ArrowRight className="w-4 h-4 md:w-5 md:h-5 transition-transform group-hover:translate-x-1" />
                  </Button>
                </Link>

                <div className="flex items-center justify-between text-[11px] text-[var(--color-text-muted)]">
                  <div className="flex items-center gap-1">
                    <Phone className="w-3 h-3" />
                    <span>+62 851-6113-4844</span>
                  </div>
                  <span>serbaserbiumroh.id</span>
                </div>
              </div>
              
            </div>
          </div>
        </div>

      </div>
    </section>
  )
}
