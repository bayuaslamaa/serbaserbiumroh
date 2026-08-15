'use client';

import { useState, useTransition } from 'react';
import { useRouter } from 'next/navigation';

type ItineraryDay = {
  dayNumber: number;
  label: string;
  description: string;
};

type PackingItem = {
  category: string;
  itemName: string;
  sortOrder: number;
};

type StoryFormProps = {
  initialData?: {
    id: string;
    slug: string;
    authorName: string;
    departureCity: string;
    travelMonth: number | null;
    travelYear: number | null;
    pax: number;
    hotelTier: string;
    airlineTier: string | null;
    makkahNights: number;
    madinahNights: number;
    totalBudgetIdr: number;
    narrative: string;
    isPublished: boolean;
    isFeatured: boolean;
    itineraryDays: ItineraryDay[];
    packingItems: PackingItem[];
  };
};

const HOTEL_TIERS = [
  { value: 'ECONOMY', label: 'Economy' },
  { value: 'STANDARD', label: 'Standard' },
  { value: 'PELATARAN', label: 'Pelataran' },
  { value: 'PREMIUM', label: 'Premium' },
];

const AIRLINE_TIERS = [
  { value: '', label: '— Tidak Disebutkan —' },
  { value: 'BUDGET', label: 'Budget' },
  { value: 'STANDARD', label: 'Standard' },
  { value: 'GARUDA', label: 'Garuda' },
  { value: 'BUSINESS', label: 'Business' },
];

const MONTHS = [
  { value: '', label: '— Pilih Bulan —' },
  { value: '1', label: 'Januari' },
  { value: '2', label: 'Februari' },
  { value: '3', label: 'Maret' },
  { value: '4', label: 'April' },
  { value: '5', label: 'Mei' },
  { value: '6', label: 'Juni' },
  { value: '7', label: 'Juli' },
  { value: '8', label: 'Agustus' },
  { value: '9', label: 'September' },
  { value: '10', label: 'Oktober' },
  { value: '11', label: 'November' },
  { value: '12', label: 'Desember' },
];

const generateSlug = (name: string): string => {
  return name
    .toLowerCase()
    .replace(/\s+/g, '-')
    .replace(/[^a-z0-9-]/g, '');
};

export const StoryForm = ({ initialData }: StoryFormProps) => {
  const isEdit = !!initialData;
  const router = useRouter();
  const [isPending, startTransition] = useTransition();

  const [authorName, setAuthorName] = useState(initialData?.authorName ?? '');
  const [slug, setSlug] = useState(initialData?.slug ?? '');
  const [slugTouched, setSlugTouched] = useState(isEdit);
  const [departureCity, setDepartureCity] = useState(initialData?.departureCity ?? '');
  const [travelMonth, setTravelMonth] = useState(initialData?.travelMonth?.toString() ?? '');
  const [travelYear, setTravelYear] = useState(initialData?.travelYear?.toString() ?? '');
  const [pax, setPax] = useState(initialData?.pax?.toString() ?? '1');
  const [hotelTier, setHotelTier] = useState(initialData?.hotelTier ?? 'STANDARD');
  const [airlineTier, setAirlineTier] = useState(initialData?.airlineTier ?? '');
  const [makkahNights, setMakkahNights] = useState(initialData?.makkahNights?.toString() ?? '0');
  const [madinahNights, setMadinahNights] = useState(initialData?.madinahNights?.toString() ?? '0');
  const [totalBudgetIdr, setTotalBudgetIdr] = useState(
    initialData?.totalBudgetIdr?.toString() ?? '0',
  );
  const [narrative, setNarrative] = useState(initialData?.narrative ?? '');
  const [isPublished, setIsPublished] = useState(initialData?.isPublished ?? false);
  const [isFeatured, setIsFeatured] = useState(initialData?.isFeatured ?? false);

  const [itineraryDays, setItineraryDays] = useState<ItineraryDay[]>(
    initialData?.itineraryDays ?? [],
  );
  const [packingItems, setPackingItems] = useState<PackingItem[]>(initialData?.packingItems ?? []);

  const [error, setError] = useState<string | null>(null);

  const handleAuthorNameChange = (value: string) => {
    setAuthorName(value);
    if (!slugTouched) {
      setSlug(generateSlug(value));
    }
  };

  const handleSlugChange = (value: string) => {
    setSlugTouched(true);
    setSlug(value);
  };

  const addDay = () => {
    setItineraryDays((prev) => [
      ...prev,
      {
        dayNumber: prev.length + 1,
        label: `Hari ${prev.length + 1}`,
        description: '',
      },
    ]);
  };

  const removeDay = (index: number) => {
    setItineraryDays((prev) =>
      prev.filter((_, i) => i !== index).map((d, i) => ({ ...d, dayNumber: i + 1 })),
    );
  };

  const updateDay = (index: number, field: keyof ItineraryDay, value: string | number) => {
    setItineraryDays((prev) => prev.map((d, i) => (i === index ? { ...d, [field]: value } : d)));
  };

  const addItem = () => {
    setPackingItems((prev) => [...prev, { category: '', itemName: '', sortOrder: prev.length }]);
  };

  const removeItem = (index: number) => {
    setPackingItems((prev) =>
      prev.filter((_, i) => i !== index).map((p, i) => ({ ...p, sortOrder: i })),
    );
  };

  const updateItem = (index: number, field: keyof PackingItem, value: string | number) => {
    setPackingItems((prev) => prev.map((p, i) => (i === index ? { ...p, [field]: value } : p)));
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);

    const payload = {
      slug,
      authorName,
      departureCity,
      travelMonth: travelMonth ? parseInt(travelMonth) : null,
      travelYear: travelYear ? parseInt(travelYear) : null,
      pax: parseInt(pax),
      hotelTier,
      airlineTier: airlineTier || null,
      makkahNights: parseInt(makkahNights),
      madinahNights: parseInt(madinahNights),
      totalBudgetIdr: parseInt(totalBudgetIdr),
      narrative,
      isPublished,
      isFeatured,
      itineraryDays,
      packingItems,
    };

    startTransition(async () => {
      try {
        const url = isEdit ? `/api/admin/stories/${initialData!.id}` : '/api/admin/stories';
        const method = isEdit ? 'PUT' : 'POST';

        const res = await fetch(url, {
          method,
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(payload),
        });

        if (!res.ok) {
          const data = await res.json();
          setError(data.error ?? 'Terjadi kesalahan.');
          return;
        }

        router.push('/admin/content/stories');
        router.refresh();
      } catch {
        setError('Terjadi kesalahan jaringan.');
      }
    });
  };

  const inputClass = 'w-full px-3 py-2 rounded-md border text-sm focus:outline-none focus:ring-2';
  const inputStyle = {
    borderColor: 'var(--color-border)',
    background: 'var(--color-surface)',
    color: 'var(--color-text)',
  };
  const labelClass = 'block text-xs font-semibold uppercase tracking-wide mb-1';
  const labelStyle = { color: 'var(--color-text-muted)' };

  return (
    <form onSubmit={handleSubmit} className="space-y-8 max-w-3xl">
      {error && (
        <div
          className="px-4 py-3 rounded-md text-sm"
          style={{
            background: 'rgba(239,68,68,0.1)',
            color: '#ef4444',
            border: '1px solid rgba(239,68,68,0.3)',
          }}
        >
          {error}
        </div>
      )}

      <section
        className="rounded-lg border p-6 space-y-4"
        style={{ borderColor: 'var(--color-border)', background: 'var(--color-surface)' }}
      >
        <h2 className="text-base font-semibold" style={{ color: 'var(--color-gold)' }}>
          Informasi Dasar
        </h2>

        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          <div>
            <label className={labelClass} style={labelStyle}>
              Nama Penulis *
            </label>
            <input
              type="text"
              className={inputClass}
              style={inputStyle}
              value={authorName}
              onChange={(e) => handleAuthorNameChange(e.target.value)}
              required
              placeholder="contoh: Bayu Aslama"
            />
          </div>

          <div>
            <label className={labelClass} style={labelStyle}>
              Slug *
            </label>
            <input
              type="text"
              className={inputClass}
              style={inputStyle}
              value={slug}
              onChange={(e) => handleSlugChange(e.target.value)}
              required
              placeholder="bayu-aslama"
            />
          </div>

          <div>
            <label className={labelClass} style={labelStyle}>
              Kota Keberangkatan *
            </label>
            <input
              type="text"
              className={inputClass}
              style={inputStyle}
              value={departureCity}
              onChange={(e) => setDepartureCity(e.target.value)}
              required
              placeholder="contoh: Jakarta"
            />
          </div>

          <div>
            <label className={labelClass} style={labelStyle}>
              Jumlah Jamaah (Pax) *
            </label>
            <input
              type="number"
              className={inputClass}
              style={inputStyle}
              value={pax}
              onChange={(e) => setPax(e.target.value)}
              min={1}
              required
            />
          </div>

          <div>
            <label className={labelClass} style={labelStyle}>
              Bulan Perjalanan
            </label>
            <select
              className={inputClass}
              style={inputStyle}
              value={travelMonth}
              onChange={(e) => setTravelMonth(e.target.value)}
            >
              {MONTHS.map((m) => (
                <option key={m.value} value={m.value}>
                  {m.label}
                </option>
              ))}
            </select>
          </div>

          <div>
            <label className={labelClass} style={labelStyle}>
              Tahun Perjalanan
            </label>
            <input
              type="number"
              className={inputClass}
              style={inputStyle}
              value={travelYear}
              onChange={(e) => setTravelYear(e.target.value)}
              placeholder="2024"
              min={2000}
              max={2100}
            />
          </div>
        </div>
      </section>

      <section
        className="rounded-lg border p-6 space-y-4"
        style={{ borderColor: 'var(--color-border)', background: 'var(--color-surface)' }}
      >
        <h2 className="text-base font-semibold" style={{ color: 'var(--color-gold)' }}>
          Paket Perjalanan
        </h2>

        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          <div>
            <label className={labelClass} style={labelStyle}>
              Tier Hotel *
            </label>
            <select
              className={inputClass}
              style={inputStyle}
              value={hotelTier}
              onChange={(e) => setHotelTier(e.target.value)}
              required
            >
              {HOTEL_TIERS.map((t) => (
                <option key={t.value} value={t.value}>
                  {t.label}
                </option>
              ))}
            </select>
          </div>

          <div>
            <label className={labelClass} style={labelStyle}>
              Tier Maskapai
            </label>
            <select
              className={inputClass}
              style={inputStyle}
              value={airlineTier}
              onChange={(e) => setAirlineTier(e.target.value)}
            >
              {AIRLINE_TIERS.map((t) => (
                <option key={t.value} value={t.value}>
                  {t.label}
                </option>
              ))}
            </select>
          </div>

          <div>
            <label className={labelClass} style={labelStyle}>
              Malam di Makkah
            </label>
            <input
              type="number"
              className={inputClass}
              style={inputStyle}
              value={makkahNights}
              onChange={(e) => setMakkahNights(e.target.value)}
              min={0}
            />
          </div>

          <div>
            <label className={labelClass} style={labelStyle}>
              Malam di Madinah
            </label>
            <input
              type="number"
              className={inputClass}
              style={inputStyle}
              value={madinahNights}
              onChange={(e) => setMadinahNights(e.target.value)}
              min={0}
            />
          </div>

          <div className="sm:col-span-2">
            <label className={labelClass} style={labelStyle}>
              Total Budget (IDR) *
            </label>
            <input
              type="number"
              className={inputClass}
              style={inputStyle}
              value={totalBudgetIdr}
              onChange={(e) => setTotalBudgetIdr(e.target.value)}
              min={0}
              required
            />
          </div>
        </div>
      </section>

      <section
        className="rounded-lg border p-6 space-y-4"
        style={{ borderColor: 'var(--color-border)', background: 'var(--color-surface)' }}
      >
        <h2 className="text-base font-semibold" style={{ color: 'var(--color-gold)' }}>
          Narasi Cerita
        </h2>

        <div>
          <label className={labelClass} style={labelStyle}>
            Isi Cerita (Markdown)
          </label>
          <textarea
            className={inputClass}
            style={{ ...inputStyle, minHeight: 200, resize: 'vertical' }}
            value={narrative}
            onChange={(e) => setNarrative(e.target.value)}
            placeholder="Tulis cerita perjalanan umroh di sini..."
          />
        </div>
      </section>

      <section
        className="rounded-lg border p-6 space-y-4"
        style={{ borderColor: 'var(--color-border)', background: 'var(--color-surface)' }}
      >
        <div className="flex items-center justify-between">
          <h2 className="text-base font-semibold" style={{ color: 'var(--color-gold)' }}>
            Itinerary Harian
          </h2>
          <button
            type="button"
            onClick={addDay}
            className="text-sm px-3 py-1.5 rounded-md border font-medium transition-colors hover:opacity-80"
            style={{
              borderColor: 'var(--color-gold)',
              color: 'var(--color-gold)',
              background: 'transparent',
            }}
          >
            + Tambah Hari
          </button>
        </div>

        {itineraryDays.length === 0 && (
          <p className="text-sm italic" style={{ color: 'var(--color-text-muted)' }}>
            Belum ada hari ditambahkan.
          </p>
        )}

        {itineraryDays.map((day, i) => (
          <div
            key={i}
            className="rounded-md border p-4 space-y-3"
            style={{ borderColor: 'var(--color-border)' }}
          >
            <div className="flex items-center justify-between">
              <span className="text-sm font-medium" style={{ color: 'var(--color-text)' }}>
                Hari {day.dayNumber}
              </span>
              <button
                type="button"
                onClick={() => removeDay(i)}
                className="text-xs px-2 py-1 rounded hover:opacity-80"
                style={{ color: '#ef4444' }}
              >
                Hapus
              </button>
            </div>

            <div>
              <label className={labelClass} style={labelStyle}>
                Label Hari
              </label>
              <input
                type="text"
                className={inputClass}
                style={inputStyle}
                value={day.label}
                onChange={(e) => updateDay(i, 'label', e.target.value)}
                placeholder="contoh: Tiba di Madinah"
              />
            </div>

            <div>
              <label className={labelClass} style={labelStyle}>
                Deskripsi (Markdown)
              </label>
              <textarea
                className={inputClass}
                style={{ ...inputStyle, minHeight: 80, resize: 'vertical' }}
                value={day.description}
                onChange={(e) => updateDay(i, 'description', e.target.value)}
                placeholder="Kegiatan hari ini..."
              />
            </div>
          </div>
        ))}
      </section>

      <section
        className="rounded-lg border p-6 space-y-4"
        style={{ borderColor: 'var(--color-border)', background: 'var(--color-surface)' }}
      >
        <div className="flex items-center justify-between">
          <h2 className="text-base font-semibold" style={{ color: 'var(--color-gold)' }}>
            Packing List
          </h2>
          <button
            type="button"
            onClick={addItem}
            className="text-sm px-3 py-1.5 rounded-md border font-medium transition-colors hover:opacity-80"
            style={{
              borderColor: 'var(--color-gold)',
              color: 'var(--color-gold)',
              background: 'transparent',
            }}
          >
            + Tambah Item
          </button>
        </div>

        {packingItems.length === 0 && (
          <p className="text-sm italic" style={{ color: 'var(--color-text-muted)' }}>
            Belum ada item packing ditambahkan.
          </p>
        )}

        {packingItems.map((item, i) => (
          <div
            key={i}
            className="rounded-md border p-4"
            style={{ borderColor: 'var(--color-border)' }}
          >
            <div className="flex items-start gap-3">
              <div className="flex-1 grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div>
                  <label className={labelClass} style={labelStyle}>
                    Kategori
                  </label>
                  <input
                    type="text"
                    className={inputClass}
                    style={inputStyle}
                    value={item.category}
                    onChange={(e) => updateItem(i, 'category', e.target.value)}
                    placeholder="contoh: Pakaian"
                  />
                </div>
                <div>
                  <label className={labelClass} style={labelStyle}>
                    Nama Item
                  </label>
                  <input
                    type="text"
                    className={inputClass}
                    style={inputStyle}
                    value={item.itemName}
                    onChange={(e) => updateItem(i, 'itemName', e.target.value)}
                    placeholder="contoh: Ihram"
                  />
                </div>
              </div>
              <button
                type="button"
                onClick={() => removeItem(i)}
                className="mt-5 text-xs px-2 py-1 rounded hover:opacity-80"
                style={{ color: '#ef4444' }}
              >
                Hapus
              </button>
            </div>
          </div>
        ))}
      </section>

      <section
        className="rounded-lg border p-6 space-y-4"
        style={{ borderColor: 'var(--color-border)', background: 'var(--color-surface)' }}
      >
        <h2 className="text-base font-semibold" style={{ color: 'var(--color-gold)' }}>
          Pengaturan Publikasi
        </h2>

        <div className="space-y-3">
          <label className="flex items-center gap-3 cursor-pointer">
            <input
              type="checkbox"
              checked={isPublished}
              onChange={(e) => setIsPublished(e.target.checked)}
              className="w-4 h-4 rounded"
            />
            <span className="text-sm" style={{ color: 'var(--color-text)' }}>
              Publikasikan cerita (tampil di halaman publik)
            </span>
          </label>

          <label className="flex items-center gap-3 cursor-pointer">
            <input
              type="checkbox"
              checked={isFeatured}
              onChange={(e) => setIsFeatured(e.target.checked)}
              className="w-4 h-4 rounded"
            />
            <span className="text-sm" style={{ color: 'var(--color-text)' }}>
              Tampilkan sebagai cerita unggulan
            </span>
          </label>
        </div>
      </section>

      <div className="flex items-center gap-4 pb-8">
        <button
          type="submit"
          disabled={isPending}
          className="px-6 py-2.5 rounded-md text-sm font-semibold transition-opacity hover:opacity-90 disabled:opacity-50"
          style={{ background: 'var(--color-gold)', color: '#1a1206' }}
        >
          {isPending ? 'Menyimpan...' : isEdit ? 'Simpan Perubahan' : 'Buat Cerita'}
        </button>

        <button
          type="button"
          onClick={() => router.push('/admin/content/stories')}
          className="px-4 py-2.5 rounded-md text-sm transition-opacity hover:opacity-80"
          style={{ color: 'var(--color-text-muted)' }}
        >
          Batal
        </button>
      </div>
    </form>
  );
};
