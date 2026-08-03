'use client'

import React, { useState, useMemo } from 'react'
import { 
  Car, 
  Users, 
  Briefcase, 
  Search, 
  ArrowRight, 
  Info, 
  MessageSquare, 
  ShieldCheck, 
  Clock, 
  Sparkles,
  Plane,
  Train,
  MapPin,
  HelpCircle,
  TrendingUp
} from 'lucide-react'

// Define interfaces
interface Route {
  from: string
  to: string
  basePrice: number // SR
  isAirportPickup: boolean
  isTrainStation: boolean
}

interface Vehicle {
  id: string
  name: string
  passengers: number
  luggage: string
  details: string
  imageSrc: string
  imageAlt: string
  icon: React.ReactNode
  bgClass: string
  routes: Route[]
}

export default function TransportasiClient() {
  // Exchange rate state (default: 4950 IDR per 1 SAR)
  const [exchangeRate, setExchangeRate] = useState<number>(4950)
  // Admin selector state
  const [selectedAdmin, setSelectedAdmin] = useState<'nurul' | 'bayu'>('nurul')
  // Search query
  const [searchQuery, setSearchQuery] = useState<string>('')
  // Active vehicle type tab
  const [activeVehicleId, setActiveVehicleId] = useState<string>('sedan')

  const admins = useMemo(() => ({
    nurul: { name: 'Nurul', phone: '6285161134844' },
    bayu: { name: 'Bayu', phone: '6285172117757' }
  }), [])

  // Static Data for Iqbal / SSU Tour & Travel Transportation
  const vehicles: Vehicle[] = useMemo(() => [
    {
      id: 'sedan',
      name: 'Sedan',
      passengers: 3,
      luggage: '2 Koper + 2 Tas Kecil',
      details: 'Ideal untuk keluarga kecil atau perjalanan bisnis pribadi.',
      imageSrc: '/transportasi/vehicles/sedan.webp',
      imageAlt: 'Sedan hitam untuk layanan transportasi bandara',
      bgClass: 'from-pink-500/10 to-transparent',
      icon: <Car className="w-6 h-6 text-pink-400" />,
      routes: [
        { from: 'Jeddah Airport', to: 'Makkah', basePrice: 250, isAirportPickup: true, isTrainStation: false },
        { from: 'Jeddah Airport', to: 'Madinah', basePrice: 450, isAirportPickup: true, isTrainStation: false },
        { from: 'Makkah', to: 'Jeddah Airport', basePrice: 200, isAirportPickup: false, isTrainStation: false },
        { from: 'Madinah', to: 'Jeddah Airport', basePrice: 450, isAirportPickup: false, isTrainStation: false },
        { from: 'Madinah Airport', to: 'Madinah Hotel', basePrice: 120, isAirportPickup: true, isTrainStation: false },
        { from: 'Madinah Hotel', to: 'Madinah Airport', basePrice: 120, isAirportPickup: false, isTrainStation: false },
        { from: 'Makkah', to: 'Madinah', basePrice: 450, isAirportPickup: false, isTrainStation: false },
        { from: 'Makkah', to: 'Ziyarat Tours', basePrice: 200, isAirportPickup: false, isTrainStation: false },
        { from: 'Madinah', to: 'Ziyarat Tours', basePrice: 200, isAirportPickup: false, isTrainStation: false },
        { from: 'Makkah', to: 'Taif Ziyarat', basePrice: 500, isAirportPickup: false, isTrainStation: false },
        { from: 'Madinah Train Station', to: 'Madinah Hotel', basePrice: 120, isAirportPickup: false, isTrainStation: true },
        { from: 'Makkah Train Station', to: 'Makkah Hotel', basePrice: 120, isAirportPickup: false, isTrainStation: true }
      ]
    },
    {
      id: '7-seater',
      name: 'Hyundai Staria (7 Seater)',
      passengers: 7,
      luggage: '10 Koper',
      details: 'Sangat cocok untuk rombongan keluarga sedang dengan bagasi banyak.',
      imageSrc: '/transportasi/vehicles/7-seater-minivan.webp',
      imageAlt: 'Hyundai Staria tujuh penumpang untuk layanan transportasi keluarga',
      bgClass: 'from-amber-500/10 to-transparent',
      icon: <Car className="w-6 h-6 text-amber-400" />,
      routes: [
        { from: 'Jeddah Airport', to: 'Makkah', basePrice: 300, isAirportPickup: true, isTrainStation: false },
        { from: 'Jeddah Airport', to: 'Madinah', basePrice: 550, isAirportPickup: true, isTrainStation: false },
        { from: 'Makkah', to: 'Jeddah Airport', basePrice: 250, isAirportPickup: false, isTrainStation: false },
        { from: 'Madinah', to: 'Jeddah Airport', basePrice: 500, isAirportPickup: false, isTrainStation: false },
        { from: 'Madinah Airport', to: 'Madinah Hotel', basePrice: 150, isAirportPickup: true, isTrainStation: false },
        { from: 'Madinah Hotel', to: 'Madinah Airport', basePrice: 150, isAirportPickup: false, isTrainStation: false },
        { from: 'Makkah', to: 'Madinah', basePrice: 500, isAirportPickup: false, isTrainStation: false },
        { from: 'Makkah', to: 'Ziyarat Tours', basePrice: 250, isAirportPickup: false, isTrainStation: false },
        { from: 'Madinah', to: 'Ziyarat Tours', basePrice: 250, isAirportPickup: false, isTrainStation: false },
        { from: 'Makkah', to: 'Taif Ziyarat', basePrice: 550, isAirportPickup: false, isTrainStation: false },
        { from: 'Madinah Train Station', to: 'Madinah Hotel', basePrice: 150, isAirportPickup: false, isTrainStation: true },
        { from: 'Makkah Train Station', to: 'Makkah Hotel', basePrice: 150, isAirportPickup: false, isTrainStation: true }
      ]
    },
    {
      id: '12-seater',
      name: '12 Seater (HiAce)',
      passengers: 12,
      luggage: '15 Koper Besar',
      details: 'Luas, nyaman, armada andalan untuk rombongan umroh mandiri.',
      imageSrc: '/transportasi/vehicles/hiace-12-seater.webp',
      imageAlt: 'Van penumpang dua belas kursi untuk rombongan umroh',
      bgClass: 'from-emerald-500/10 to-transparent',
      icon: <Car className="w-6 h-6 text-emerald-400" />,
      routes: [
        { from: 'Jeddah Airport', to: 'Makkah', basePrice: 350, isAirportPickup: true, isTrainStation: false },
        { from: 'Jeddah Airport', to: 'Madinah', basePrice: 650, isAirportPickup: true, isTrainStation: false },
        { from: 'Makkah', to: 'Jeddah Airport', basePrice: 300, isAirportPickup: false, isTrainStation: false },
        { from: 'Madinah', to: 'Jeddah Airport', basePrice: 600, isAirportPickup: false, isTrainStation: false },
        { from: 'Madinah Airport', to: 'Madinah Hotel', basePrice: 250, isAirportPickup: true, isTrainStation: false },
        { from: 'Madinah Hotel', to: 'Madinah Airport', basePrice: 200, isAirportPickup: false, isTrainStation: false },
        { from: 'Makkah', to: 'Madinah', basePrice: 600, isAirportPickup: false, isTrainStation: false },
        { from: 'Makkah', to: 'Ziyarat Tours', basePrice: 300, isAirportPickup: false, isTrainStation: false },
        { from: 'Madinah', to: 'Ziyarat Tours', basePrice: 300, isAirportPickup: false, isTrainStation: false },
        { from: 'Makkah', to: 'Taif Ziyarat', basePrice: 650, isAirportPickup: false, isTrainStation: false },
        { from: 'Madinah Train Station', to: 'Madinah Hotel', basePrice: 200, isAirportPickup: false, isTrainStation: true },
        { from: 'Makkah Train Station', to: 'Makkah Hotel', basePrice: 200, isAirportPickup: false, isTrainStation: true }
      ]
    },
    {
      id: 'yukon',
      name: 'GMC Yukon (Premium)',
      passengers: 6,
      luggage: '6 Koper Besar',
      details: 'SUV Premium Amerika berkapasitas besar untuk kenyamanan berkelas tinggi.',
      imageSrc: '/transportasi/vehicles/gmc-yukon.webp',
      imageAlt: 'SUV premium hitam untuk transportasi eksklusif',
      bgClass: 'from-blue-500/10 to-transparent',
      icon: <Car className="w-6 h-6 text-blue-400" />,
      routes: [
        { from: 'Jeddah Airport', to: 'Makkah', basePrice: 400, isAirportPickup: true, isTrainStation: false },
        { from: 'Jeddah Airport', to: 'Madinah', basePrice: 850, isAirportPickup: true, isTrainStation: false },
        { from: 'Makkah', to: 'Jeddah Airport', basePrice: 350, isAirportPickup: false, isTrainStation: false },
        { from: 'Madinah', to: 'Jeddah Airport', basePrice: 850, isAirportPickup: false, isTrainStation: false },
        { from: 'Madinah Airport', to: 'Madinah Hotel', basePrice: 300, isAirportPickup: true, isTrainStation: false },
        { from: 'Madinah Hotel', to: 'Madinah Airport', basePrice: 250, isAirportPickup: false, isTrainStation: false },
        { from: 'Makkah', to: 'Madinah', basePrice: 850, isAirportPickup: false, isTrainStation: false },
        { from: 'Makkah', to: 'Ziyarat Tours', basePrice: 350, isAirportPickup: false, isTrainStation: false },
        { from: 'Madinah', to: 'Ziyarat Tours', basePrice: 350, isAirportPickup: false, isTrainStation: false },
        { from: 'Makkah', to: 'Taif Ziyarat', basePrice: 850, isAirportPickup: false, isTrainStation: false },
        { from: 'Madinah Train Station', to: 'Madinah Hotel', basePrice: 250, isAirportPickup: false, isTrainStation: true },
        { from: 'Makkah Train Station', to: 'Makkah Hotel', basePrice: 250, isAirportPickup: false, isTrainStation: true }
      ]
    }
  ], [])

  // Find active vehicle
  const activeVehicle = useMemo(() => {
    return vehicles.find(v => v.id === activeVehicleId) || vehicles[0]
  }, [vehicles, activeVehicleId])

  // Calculation helpers
  const calculatePriceSAR = (base: number, isAirportPickup: boolean) => {
    // 1. Base + 50 SAR (30 SAR original SSU fee + 20 SAR addition)
    let price = base + 50
    // 2. Extra + 50 SAR if Airport Pickup
    if (isAirportPickup) {
      price += 50
    }
    return price
  }

  // Format Rupiah helper
  const formatRupiah = (value: number) => {
    return new Intl.NumberFormat('id-ID', {
      style: 'currency',
      currency: 'IDR',
      minimumFractionDigits: 0,
      maximumFractionDigits: 0
    }).format(value)
  }

  // Filter routes based on search query
  const filteredRoutes = useMemo(() => {
    if (!searchQuery.trim()) return activeVehicle.routes

    const query = searchQuery.toLowerCase()
    return activeVehicle.routes.filter(
      route => 
        route.from.toLowerCase().includes(query) || 
        route.to.toLowerCase().includes(query)
    )
  }, [activeVehicle, searchQuery])

  // Get WhatsApp Link
  const getWhatsAppLink = (vehicleName: string, routeFrom: string, routeTo: string, originalPrice: number, isAirportPickup: boolean) => {
    const finalPriceSAR = calculatePriceSAR(originalPrice, isAirportPickup)
    const finalPriceIDR = finalPriceSAR * exchangeRate
    const admin = admins[selectedAdmin]
    const message = `Halo Admin ${admin.name} SSU Tour, saya ingin memesan layanan transportasi *${vehicleName}* untuk rute *${routeFrom} → ${routeTo}* dengan rincian berikut:

• Armada: ${vehicleName}
• Rute: ${routeFrom} ke ${routeTo}
• Tarif: ${finalPriceSAR} SAR (Estimasi ${formatRupiah(finalPriceIDR)})
${isAirportPickup ? '• Catatan: Penjemputan di Bandara (Sudah termasuk Airport Fee)' : ''}

Mohon diinfo ketersediaan dan proses pemesanan lebih lanjut. Terima kasih!`

    return `https://wa.me/${admin.phone}?text=${encodeURIComponent(message)}`
  }

  return (
    <div className="mx-auto max-w-6xl py-8 md:py-12 px-2">
      
      {/* Hero Header Section */}
      <section className="text-center mb-12 max-w-3xl mx-auto">
        <div className="inline-flex items-center gap-1.5 mb-4 px-3 py-1.5 rounded-full border border-[var(--color-border)] bg-[var(--color-surface)] text-xs font-semibold tracking-wider text-[var(--color-gold)] uppercase">
          <Sparkles className="w-3.5 h-3.5" />
          <span>Layanan Transportasi Premium 🇸🇦</span>
        </div>
        <h1
          className="text-4xl md:text-5xl font-extrabold mb-4 tracking-tight leading-tight"
          style={{ fontFamily: 'var(--font-heading)', color: 'var(--color-gold)' }}
        >
          Tarif Transportasi SSU Tour
        </h1>
        <p className="text-sm md:text-base leading-relaxed" style={{ color: 'var(--color-text-muted)' }}>
          Kami menyediakan armada ber-AC terbaik dengan driver profesional & berpengalaman di Arab Saudi. Melayani penjemputan bandara, antar jemput hotel, ziarah Makkah-Madinah, hingga ziarah kota Taif.
        </p>

        {/* Feature quick info */}
        <div className="grid grid-cols-3 gap-3 mt-8">
          <div className="flex flex-col items-center p-3 rounded-lg border border-[var(--color-border)] bg-[var(--color-surface)]">
            <ShieldCheck className="w-5 h-5 text-[var(--color-gold)] mb-1.5" />
            <span className="text-xs font-bold block">Aman & Nyaman</span>
            <span className="text-[10px] text-[var(--color-text-muted)] text-center hidden sm:inline">Armada bersih & AC dingin</span>
          </div>
          <div className="flex flex-col items-center p-3 rounded-lg border border-[var(--color-border)] bg-[var(--color-surface)]">
            <Clock className="w-5 h-5 text-[var(--color-gold)] mb-1.5" />
            <span className="text-xs font-bold block">Tepat Waktu</span>
            <span className="text-[10px] text-[var(--color-text-muted)] text-center hidden sm:inline">Driver standby sebelum kedatangan</span>
          </div>
          <div className="flex flex-col items-center p-3 rounded-lg border border-[var(--color-border)] bg-[var(--color-surface)]">
            <Users className="w-5 h-5 text-[var(--color-gold)] mb-1.5" />
            <span className="text-xs font-bold block">Sopir Handal</span>
            <span className="text-[10px] text-[var(--color-text-muted)] text-center hidden sm:inline">Familiar rute ziarah & ramah</span>
          </div>
        </div>
      </section>

      {/* Dynamic Rates & Controls Banner */}
      <section className="mb-10 p-6 rounded-xl border border-[var(--color-border)] bg-gradient-to-br from-emerald-950/20 via-black/20 to-transparent">
        <div className="grid grid-cols-1 md:grid-cols-12 gap-6 items-center">
          
          {/* Rules info */}
          <div className="md:col-span-7 space-y-3">
            <h3 className="text-lg font-bold flex items-center gap-2 text-[var(--color-gold)]">
              <Info className="w-5 h-5 shrink-0" />
              Ketentuan Penyesuaian Tarif SSU Tour
            </h3>
            <ul className="text-xs md:text-sm space-y-2 text-[var(--color-text-muted)] pl-5 list-disc">
              <li>Semua tarif dasar pada daftar di bawah merupakan **harga final (nett)** untuk satu armada kendaraan.</li>
              <li>Untuk rute <strong className="text-[var(--color-gold)]">Penjemputan di Bandara</strong> (Jeddah Airport & Madinah Airport), tarif sudah otomatis termasuk **Airport Pickup Fee / Tip (+50 SAR)**.</li>
              <li>Estimasi Rupiah (IDR) disesuaikan secara real-time berdasarkan nilai kurs yang Anda masukkan di kalkulator.</li>
            </ul>
          </div>

          {/* Interactive Calculator */}
          <div className="md:col-span-5 p-4 rounded-lg bg-black/40 border border-[var(--color-border)] space-y-4">
            
            {/* Currency Input */}
            <div className="space-y-3">
              <div className="flex items-center justify-between">
                <span className="text-xs font-semibold text-[var(--color-gold)] flex items-center gap-1.5">
                  <TrendingUp className="w-4 h-4" />
                  Kalkulator Kurs SAR Ke IDR
                </span>
                <span className="text-[10px] text-[var(--color-text-muted)] bg-[var(--color-border)] px-2 py-0.5 rounded-full font-semibold">
                  Interactive
                </span>
              </div>
              
              <div className="space-y-1.5">
                <label htmlFor="rate-input" className="text-xs text-[var(--color-text-muted)] block">
                  Estimasi Kurs (Rupiah per 1 SAR):
                </label>
                <div className="relative rounded-md shadow-sm">
                  <div className="pointer-events-none absolute inset-y-0 left-0 flex items-center pl-3">
                    <span className="text-xs text-[var(--color-text-muted)]">Rp</span>
                  </div>
                  <input
                    id="rate-input"
                    type="number"
                    value={exchangeRate}
                    onChange={(e) => {
                      const val = parseInt(e.target.value)
                      setExchangeRate(isNaN(val) ? 0 : val)
                    }}
                    className="block w-full rounded-md border-0 bg-neutral-900/80 py-2.5 pl-8 pr-12 text-sm text-[var(--color-text)] ring-1 ring-inset ring-[var(--color-border)] placeholder-neutral-500 focus:outline-none focus:ring-2 focus:ring-[var(--color-gold)] font-mono"
                    placeholder="4850"
                  />
                  <div className="pointer-events-none absolute inset-y-0 right-0 flex items-center pr-3">
                    <span className="text-xs text-[var(--color-text-muted)]">/ SAR</span>
                  </div>
                </div>
              </div>
            </div>

            {/* Admin Selector Toggle */}
            <div className="border-t border-[var(--color-border)] pt-3.5 space-y-2">
              <label className="text-xs text-[var(--color-text-muted)] block font-semibold">
                Pilih Kontak Admin WhatsApp:
              </label>
              <div className="grid grid-cols-2 gap-2">
                <button
                  type="button"
                  id="admin-btn-nurul"
                  onClick={() => setSelectedAdmin('nurul')}
                  className={`py-2 px-3 rounded text-xs font-bold transition-all border ${
                    selectedAdmin === 'nurul'
                      ? 'bg-emerald-700 border-emerald-500 text-white shadow-sm shadow-emerald-950/50'
                      : 'bg-neutral-900/50 border-[var(--color-border)] text-[var(--color-text-muted)] hover:bg-neutral-800'
                  }`}
                >
                  Admin Nurul
                </button>
                <button
                  type="button"
                  id="admin-btn-bayu"
                  onClick={() => setSelectedAdmin('bayu')}
                  className={`py-2 px-3 rounded text-xs font-bold transition-all border ${
                    selectedAdmin === 'bayu'
                      ? 'bg-emerald-700 border-emerald-500 text-white shadow-sm shadow-emerald-950/50'
                      : 'bg-neutral-900/50 border-[var(--color-border)] text-[var(--color-text-muted)] hover:bg-neutral-800'
                  }`}
                >
                  Admin Bayu
                </button>
              </div>
            </div>

          </div>
          
        </div>
      </section>

      {/* Tabs and Filters Section */}
      <section className="mb-6 space-y-4">
        
        {/* Search bar */}
        <div className="relative max-w-md">
          <div className="pointer-events-none absolute inset-y-0 left-0 flex items-center pl-3">
            <Search className="w-4 h-4 text-[var(--color-text-muted)]" />
          </div>
          <input
            type="text"
            id="search-input"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="block w-full rounded-md border-0 bg-[var(--color-surface)] py-2 pl-10 pr-4 text-sm text-[var(--color-text)] ring-1 ring-inset ring-[var(--color-border)] placeholder-neutral-500 focus:outline-none focus:ring-2 focus:ring-[var(--color-gold)]"
            placeholder="Cari rute (cth: Makkah, Jeddah, Madinah)..."
          />
        </div>

        {/* Vehicle Selection Tabs */}
        <div>
          <label className="text-xs font-semibold text-[var(--color-text-muted)] uppercase tracking-wider mb-2 block">
            Pilih Tipe Armada:
          </label>
          <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
            {vehicles.map((v) => (
              <button
                type="button"
                key={v.id}
                id={`btn-tab-${v.id}`}
                onClick={() => {
                  setActiveVehicleId(v.id)
                  // Optional: clear search query on tab switch for broader discovery
                }}
                className={`flex flex-col items-start p-4 rounded-xl text-left border transition-all duration-300 relative overflow-hidden ${
                  activeVehicleId === v.id
                    ? 'border-[var(--color-gold)] bg-[var(--color-surface)] shadow-lg shadow-[rgba(201,168,76,0.08)]'
                    : 'border-[var(--color-border)] bg-transparent hover:bg-[var(--color-surface)]/50'
                }`}
              >
                {/* Highlight top bar for active tab */}
                {activeVehicleId === v.id && (
                  <div className="absolute top-0 right-0 left-0 h-[3px] bg-gradient-to-r from-[var(--color-gold)] to-emerald-500" />
                )}
                <div className="mb-3 aspect-[4/3] w-full overflow-hidden rounded-lg border border-[var(--color-border)] bg-black/30">
                  <img
                    src={v.imageSrc}
                    alt={v.imageAlt}
                    width={720}
                    height={540}
                    loading="lazy"
                    decoding="async"
                    className="h-full w-full object-contain p-2"
                  />
                </div>
                <div className="flex items-center gap-2 mb-2">
                  {v.icon}
                  <span className="font-bold text-sm md:text-base text-[var(--color-text)]">{v.name}</span>
                </div>
                <div className="space-y-1">
                  <span className="text-xs text-[var(--color-text-muted)] block flex items-center gap-1">
                    <Users className="w-3 h-3 shrink-0 text-[var(--color-gold)]" /> {v.passengers} Penumpang
                  </span>
                  <span className="text-[10px] text-[var(--color-text-muted)] block flex items-center gap-1">
                    <Briefcase className="w-3 h-3 shrink-0 text-[var(--color-gold)]" /> {v.luggage}
                  </span>
                </div>
              </button>
            ))}
          </div>
        </div>

        {/* Selected Vehicle Specs Panel */}
        <div className="p-4 rounded-lg bg-[var(--color-surface)] border border-[var(--color-border)] flex flex-col sm:flex-row justify-between items-start sm:items-center gap-3">
          <div>
            <h4 className="text-sm font-bold text-[var(--color-gold)]">
              Kapasitas {activeVehicle.name}
            </h4>
            <p className="text-xs text-[var(--color-text-muted)]">
              {activeVehicle.details}
            </p>
          </div>
          <div className="flex gap-2">
            <span className="text-xs px-2.5 py-1 rounded bg-black/40 border border-[var(--color-border)]">
              👥 Max {activeVehicle.passengers} Orang
            </span>
            <span className="text-xs px-2.5 py-1 rounded bg-black/40 border border-[var(--color-border)]">
              🧳 {activeVehicle.luggage}
            </span>
          </div>
        </div>

      </section>

      {/* Price Grid Section */}
      <section className="mb-12">
        {filteredRoutes.length === 0 ? (
          <div className="text-center py-12 border border-dashed border-[var(--color-border)] rounded-xl">
            <HelpCircle className="w-12 h-12 text-[var(--color-text-muted)] mx-auto mb-3 opacity-60" />
            <h3 className="text-sm font-bold text-[var(--color-text)] mb-1">Rute Tidak Ditemukan</h3>
            <p className="text-xs text-[var(--color-text-muted)]">
              Tidak ada rute yang cocok dengan kata pencarian "{searchQuery}" pada armada ini.
            </p>
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {filteredRoutes.map((route, idx) => {
              const finalPriceSAR = calculatePriceSAR(route.basePrice, route.isAirportPickup)
              const finalPriceIDR = finalPriceSAR * exchangeRate
              
              return (
                <div 
                  key={idx}
                  id={`route-card-${activeVehicle.id}-${idx}`}
                  className="flex flex-col justify-between p-5 rounded-xl border border-[var(--color-border)] bg-[var(--color-surface)] relative overflow-hidden transition-all duration-300 hover:border-[var(--color-gold-muted)] group hover:shadow-md"
                >
                  {/* Highlight for Airport Pickup */}
                  {route.isAirportPickup && (
                    <div className="absolute top-0 right-0 bg-emerald-700/80 text-[10px] text-white px-3 py-1 rounded-bl-lg font-medium tracking-wide flex items-center gap-1">
                      <Plane className="w-3 h-3" /> Pickup Bandara
                    </div>
                  )}

                  {/* Highlight for Train Station */}
                  {route.isTrainStation && (
                    <div className="absolute top-0 right-0 bg-amber-700/80 text-[10px] text-white px-3 py-1 rounded-bl-lg font-medium tracking-wide flex items-center gap-1">
                      <Train className="w-3 h-3" /> Stasiun Kereta
                    </div>
                  )}

                  <div className="space-y-4">
                    {/* Route display */}
                    <div className="flex items-center gap-2 flex-wrap">
                      <div className="flex items-center gap-1 bg-black/35 py-1 px-2.5 rounded text-xs border border-white/5">
                        <MapPin className="w-3 h-3 text-red-400 shrink-0" />
                        <span className="font-semibold">{route.from}</span>
                      </div>
                      <ArrowRight className="w-3.5 h-3.5 text-[var(--color-gold)] shrink-0" />
                      <div className="flex items-center gap-1 bg-black/35 py-1 px-2.5 rounded text-xs border border-white/5">
                        <MapPin className="w-3 h-3 text-emerald-400 shrink-0" />
                        <span className="font-semibold">{route.to}</span>
                      </div>
                    </div>

                    {/* Cost Breakdown */}
                    <div className="space-y-1 px-1 text-xs">
                      {route.isAirportPickup ? (
                        <div className="flex justify-between text-emerald-400 font-medium">
                          <span>Airport Pickup Fee / Tip:</span>
                          <span>+50 SAR (Sudah Termasuk)</span>
                        </div>
                      ) : (
                        <div className="h-4" />
                      )}
                    </div>

                    {/* Price Tag Box */}
                    <div className="flex justify-between items-end bg-black/30 p-3 rounded-lg border border-[var(--color-border)]">
                      <div>
                        <span className="text-[10px] text-[var(--color-text-muted)] block uppercase tracking-wider font-semibold">Total Tarif SAR:</span>
                        <span className="text-2xl font-black text-[var(--color-gold)] font-mono">{finalPriceSAR} SAR</span>
                      </div>
                      <div className="text-right">
                        <span className="text-[10px] text-[var(--color-text-muted)] block uppercase tracking-wider font-semibold">Estimasi IDR:</span>
                        <span className="text-lg font-bold text-emerald-400 font-mono">{formatRupiah(finalPriceIDR)}</span>
                      </div>
                    </div>
                  </div>

                  {/* CTA Button */}
                  <div className="mt-5 pt-3 border-t border-[var(--color-border)]/50">
                    <a
                      href={getWhatsAppLink(activeVehicle.name, route.from, route.to, route.basePrice, route.isAirportPickup)}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="w-full flex items-center justify-center gap-2 py-2 px-4 rounded bg-emerald-600 hover:bg-emerald-500 active:bg-emerald-700 text-white font-bold text-xs uppercase tracking-wider transition-all duration-200 hover:shadow-md"
                    >
                      <MessageSquare className="w-4 h-4 text-white" />
                      <span>Pesan via WhatsApp</span>
                    </a>
                  </div>
                </div>
              )
            })}
          </div>
        )}
      </section>

      {/* Siskopatuh & Extra notes */}
      <section className="mb-12 p-6 rounded-lg border border-[var(--color-border)] bg-black/25">
        <h3 className="text-lg font-bold mb-4 flex items-center gap-2 text-[var(--color-gold)]" style={{ fontFamily: 'var(--font-heading)' }}>
          <Info className="w-5 h-5 text-[var(--color-gold)]" /> Catatan Penting Mengenai Layanan
        </h3>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6 text-xs md:text-sm">
          <div className="space-y-3">
            <div>
              <h5 className="font-bold text-[var(--color-text)] mb-1">Penjemputan Bandara (Airport Pickup)</h5>
              <p style={{ color: 'var(--color-text-muted)' }}>
                Driver kami akan memantau status penerbangan Anda secara berkala. Driver akan menunggu Anda di dekat area pintu keluar kedatangan dengan membawa papan nama/identitas yang disepakati untuk kemudahan pertemuan.
              </p>
            </div>
            <div>
              <h5 className="font-bold text-[var(--color-text)] mb-1">Kapasitas Bagasi & Penumpang</h5>
              <p style={{ color: 'var(--color-text-muted)' }}>
                Demi keselamatan dan kenyamanan berkendara, mohon pastikan barang bawaan (koper) dan jumlah personel Anda tidak melebihi kapasitas maksimal yang tertera pada masing-masing tipe kendaraan.
              </p>
            </div>
          </div>
          <div className="space-y-3">
            <div>
              <h5 className="font-bold text-[var(--color-text)] mb-1">Rute Khusus & Ziarah Tambahan</h5>
              <p style={{ color: 'var(--color-text-muted)' }}>
                Apabila Anda membutuhkan rute kustom atau ziarah tambahan yang belum tercantum di brosur tarif, silakan konsultasikan secara langsung dengan admin untuk mendapatkan penawaran harga terbaik.
              </p>
            </div>
            <div>
              <h5 className="font-bold text-[var(--color-text)] mb-1">Konfirmasi Pembayaran</h5>
              <p style={{ color: 'var(--color-text-muted)' }}>
                Semua booking yang dilakukan melalui tombol WhatsApp akan diproses secara manual oleh admin SSU Tour. Anda akan menerima bukti pemesanan formal setelah detail rute dan jam penjemputan terkonfirmasi.
              </p>
            </div>
          </div>
        </div>
      </section>

      {/* Bottom CTA Block */}
      <section className="text-center py-8 px-4 rounded-xl border border-[var(--color-gold-muted)] bg-gradient-to-b from-[rgba(201,168,76,0.05)] to-transparent max-w-3xl mx-auto">
        <h3 className="text-2xl font-bold mb-3 text-[var(--color-gold)]" style={{ fontFamily: 'var(--font-heading)' }}>
          Butuh Kendaraan Kustom / Konsultasi Rute?
        </h3>
        <p className="text-xs md:text-sm max-w-xl mx-auto mb-6" style={{ color: 'var(--color-text-muted)' }}>
          Hubungi admin kami di WhatsApp untuk memesan rute kustom, grup besar (bus), atau koordinasi kedatangan rombongan umroh mandiri Anda.
        </p>
        <div className="flex flex-col sm:flex-row gap-4 justify-center items-center">
          <a 
            href={`https://wa.me/${admins[selectedAdmin].phone}?text=${encodeURIComponent(`Halo Admin ${admins[selectedAdmin].name} SSU Tour, saya ingin berkonsultasi mengenai sewa transportasi di Saudi.`)}`} 
            target="_blank" 
            rel="noopener noreferrer" 
            className="w-full sm:w-auto"
          >
            <button className="w-full sm:w-auto px-6 py-3 rounded bg-emerald-600 hover:bg-emerald-500 font-bold text-sm uppercase tracking-wider text-white flex items-center justify-center gap-2 transition-all">
              <MessageSquare className="w-4 h-4 text-white" />
              <span>Tanya Admin {admins[selectedAdmin].name} SSU Tour</span>
            </button>
          </a>
        </div>
      </section>

    </div>
  )
}
