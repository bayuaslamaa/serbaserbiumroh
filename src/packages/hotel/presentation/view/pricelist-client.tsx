'use client';

import { useId, useMemo, useState } from 'react';
import Link from 'next/link';
import { ChevronDown, ChevronRight, Search } from 'lucide-react';

import { Input } from '@/components/atoms/input';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/molecules/select';
import { ROOM_TYPES } from '@/packages/estimate/domain/room-types';
import {
  CITY_ORDER,
  SOURCE_LABEL_NOT_RECORDED,
  TIER_ORDER,
  type PricelistHotel,
} from '@/packages/hotel/domain/pricelist-types';
import { MONTH_NAMES_FULL, formatImportDate, formatSar } from '@/packages/hotel/domain/pricing';
import type { RoomType } from '@/shared/types';

interface PricelistClientProps {
  hotels: PricelistHotel[];
}

const CITIES = CITY_ORDER;
const TIERS = TIER_ORDER;

const ALL = 'Semua';

const TABLE_STYLE = {
  borderColor: 'var(--color-border)',
  background: 'var(--color-surface)',
};

const TH = 'px-3 py-2 text-left text-xs font-semibold uppercase tracking-wider whitespace-nowrap';
const TD = 'px-3 py-2 text-sm whitespace-nowrap';

const SOURCE_LABEL_GLOSSARY: Record<string, string> = {
  'Katalog 1448H (AZKA + Maysan/MIG)':
    'Tarif kamar per malam yang dikutip langsung dari katalog supplier 1448H.',
  'Katalog 1448H (forecast per-bed)':
    'Turunan per-bed dari katalog yang sama, disusun untuk tipe kamar selain quad. Perkiraan, bukan kutipan supplier.',
  [SOURCE_LABEL_NOT_RECORDED]:
    'Baris ini diimpor sebelum kolom sumber ada, jadi asal angkanya tidak tercatat.',
};

const DEFAULT_GLOSS =
  'Label batch impor, ditampilkan apa adanya. Tanyakan admin bila maksudnya belum jelas.';

const roomTypesOf = (hotel: PricelistHotel): RoomType[] => {
  return ROOM_TYPES.filter((roomType) =>
    Object.values(hotel.rates).some((byRoomType) => byRoomType?.[roomType]),
  );
};

const roomTypesAcross = (hotels: PricelistHotel[], month: number): RoomType[] => {
  const inMonth = ROOM_TYPES.filter((roomType) =>
    hotels.some((hotel) => hotel.rates[month]?.[roomType]),
  );
  if (inMonth.length > 0) return inMonth;

  return ROOM_TYPES.filter((roomType) =>
    hotels.some((hotel) => roomTypesOf(hotel).includes(roomType)),
  );
};

const sourceMarker = (labels: string[], sourceLabel: string): number | null => {
  if (labels.length <= 1) return null;

  const index = labels.indexOf(sourceLabel);
  return index === -1 ? null : index + 1;
};

const EmptyRateCell = () => {
  return (
    <td className={`${TD} text-right`}>
      <span aria-hidden="true" style={{ color: 'var(--color-text-muted)' }}>
        ·
      </span>
      <span className="sr-only">Tarif tidak tersedia</span>
    </td>
  );
};

const RateCell = ({
  sarPerNight,
  sourceLabel,
  marker,
}: {
  sarPerNight: number;
  sourceLabel: string;
  marker: number | null;
}) => {
  return (
    <td className={`${TD} text-right tabular-nums`}>
      {formatSar(sarPerNight)}
      {marker !== null && (
        <sup aria-hidden="true" className="ml-0.5" style={{ color: 'var(--color-text-muted)' }}>
          {marker}
        </sup>
      )}
      <span className="sr-only"> (sumber: {sourceLabel})</span>
    </td>
  );
};

const HotelMeta = ({ hotel }: { hotel: PricelistHotel }) => {
  return (
    <p className="text-xs" style={{ color: 'var(--color-text-muted)' }}>
      {hotel.city} · {hotel.tier}
      {hotel.sublabel ? ` · ${hotel.sublabel}` : ''}
      {hotel.distance ? ` · ${hotel.distance}` : ''}
    </p>
  );
};

const HotelName = ({ hotel }: { hotel: PricelistHotel }) => {
  if (!hotel.slug) return <>{hotel.label}</>;

  return (
    <Link href={`/hotel-nusuk/${hotel.slug}`} className="hover:underline">
      {hotel.label}
    </Link>
  );
};

const SourceFooter = ({
  hotel,
  markerLabels,
}: {
  hotel: PricelistHotel;
  markerLabels: string[];
}) => {
  return (
    <p className="mt-2 text-xs" style={{ color: 'var(--color-text-muted)' }}>
      Sumber:{' '}
      {hotel.sourceLabels
        .map((label) => {
          const marker = sourceMarker(markerLabels, label);
          return marker === null ? label : `${marker}. ${label}`;
        })
        .join(' · ')}
      {' · '}Diperbarui {formatImportDate(hotel.updatedAt)}
    </p>
  );
};

const MonthTable = ({ hotel, markerLabels }: { hotel: PricelistHotel; markerLabels: string[] }) => {
  const roomTypes = roomTypesOf(hotel);

  return (
    <div className="overflow-x-auto">
      <table className="w-full min-w-[320px] border-collapse rounded-md border" style={TABLE_STYLE}>
        <caption className="sr-only">
          Tarif katalog {hotel.label} per malam untuk setiap bulan, dalam SAR
        </caption>
        <thead>
          <tr className="border-b" style={{ borderColor: 'var(--color-border)' }}>
            <th scope="col" className={TH}>
              Bulan
            </th>
            {roomTypes.map((roomType) => (
              <th key={roomType} scope="col" className={`${TH} text-right`}>
                {roomType}
              </th>
            ))}
          </tr>
        </thead>
        <tbody>
          {MONTH_NAMES_FULL.map((monthName, index) => {
            const month = index + 1;

            return (
              <tr key={month} className="border-b" style={{ borderColor: 'var(--color-border)' }}>
                <th scope="row" className={`${TD} font-normal`}>
                  {monthName}
                </th>
                {roomTypes.map((roomType) => {
                  const rate = hotel.rates[month]?.[roomType];
                  if (!rate) return <EmptyRateCell key={roomType} />;

                  return (
                    <RateCell
                      key={roomType}
                      sarPerNight={rate.sarPerNight}
                      sourceLabel={rate.sourceLabel}
                      marker={sourceMarker(markerLabels, rate.sourceLabel)}
                    />
                  );
                })}
              </tr>
            );
          })}
        </tbody>
      </table>
    </div>
  );
};

const MonthComparisonTable = ({
  hotels,
  month,
  labels,
}: {
  hotels: PricelistHotel[];
  month: number;
  labels: string[];
}) => {
  const roomTypes = roomTypesAcross(hotels, month);
  const monthName = MONTH_NAMES_FULL[month - 1];

  return (
    <div className="overflow-x-auto">
      <table className="w-full min-w-[520px] border-collapse rounded-md border" style={TABLE_STYLE}>
        <caption className="sr-only">
          Tarif katalog per malam bulan {monthName} untuk setiap hotel, dalam SAR
        </caption>
        <thead>
          <tr className="border-b" style={{ borderColor: 'var(--color-border)' }}>
            <th scope="col" className={TH}>
              Hotel
            </th>
            <th scope="col" className={TH}>
              Kota
            </th>
            <th scope="col" className={TH}>
              Tier
            </th>
            {roomTypes.map((roomType) => (
              <th key={roomType} scope="col" className={`${TH} text-right`}>
                {roomType}
              </th>
            ))}
          </tr>
        </thead>
        <tbody>
          {hotels.map((hotel) => (
            <tr
              key={hotel.hotelPriceId}
              className="border-b"
              style={{ borderColor: 'var(--color-border)' }}
            >
              <th scope="row" className={`${TD} font-normal`}>
                <HotelName hotel={hotel} />
              </th>
              <td className={TD} style={{ color: 'var(--color-text-muted)' }}>
                {hotel.city}
              </td>
              <td className={TD} style={{ color: 'var(--color-text-muted)' }}>
                {hotel.tier}
              </td>
              {roomTypes.map((roomType) => {
                const rate = hotel.rates[month]?.[roomType];
                if (!rate) return <EmptyRateCell key={roomType} />;

                return (
                  <RateCell
                    key={roomType}
                    sarPerNight={rate.sarPerNight}
                    sourceLabel={rate.sourceLabel}
                    marker={sourceMarker(labels, rate.sourceLabel)}
                  />
                );
              })}
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
};

const HotelSection = ({
  hotel,
  markerLabels,
}: {
  hotel: PricelistHotel;
  markerLabels: string[];
}) => {
  const [expanded, setExpanded] = useState(false);
  const headingId = useId();
  const panelId = useId();

  return (
    <section
      aria-labelledby={headingId}
      className="rounded-lg border p-4"
      style={{ borderColor: 'var(--color-border)', backgroundColor: 'rgba(255,255,255,0.03)' }}
    >
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div>
          <h3 id={headingId} className="text-sm font-bold" style={{ color: 'var(--color-gold)' }}>
            <HotelName hotel={hotel} />
          </h3>
          <HotelMeta hotel={hotel} />
        </div>

        <button
          type="button"
          aria-expanded={expanded}
          aria-controls={panelId}
          aria-label={`Tarif bulanan ${hotel.label}`}
          onClick={() => setExpanded((value) => !value)}
          className="inline-flex items-center gap-1 rounded border px-2.5 py-1 text-xs font-medium"
          style={{ borderColor: 'var(--color-border)', color: 'var(--color-text-muted)' }}
        >
          {expanded ? (
            <ChevronDown className="h-3.5 w-3.5" />
          ) : (
            <ChevronRight className="h-3.5 w-3.5" />
          )}
          12 bulan
        </button>
      </div>

      {expanded && (
        <div id={panelId} className="mt-3">
          <MonthTable hotel={hotel} markerLabels={markerLabels} />
          <SourceFooter hotel={hotel} markerLabels={markerLabels} />
        </div>
      )}
    </section>
  );
};

const SourceLegend = ({ labels }: { labels: string[] }) => {
  const headingId = useId();

  return (
    <section
      aria-labelledby={headingId}
      className="rounded-lg border p-4"
      style={{ borderColor: 'var(--color-border)', backgroundColor: 'var(--color-surface)' }}
    >
      <h2 id={headingId} className="text-sm font-semibold" style={{ color: 'var(--color-gold)' }}>
        Keterangan sumber
      </h2>
      <dl className="mt-2 space-y-1.5 text-xs">
        {labels.map((label) => (
          <div key={label}>
            <dt className="font-medium" style={{ color: 'var(--color-text)' }}>
              {[sourceMarker(labels, label), label].filter(Boolean).join('. ')}
            </dt>
            <dd style={{ color: 'var(--color-text-muted)' }}>
              {SOURCE_LABEL_GLOSSARY[label] ?? DEFAULT_GLOSS}
            </dd>
          </div>
        ))}
      </dl>
    </section>
  );
};

export const PricelistClient = ({ hotels }: PricelistClientProps) => {
  const [city, setCity] = useState<string>(ALL);
  const [tier, setTier] = useState<string>(ALL);
  const [searchQuery, setSearchQuery] = useState<string>('');
  const [month, setMonth] = useState<string>(ALL);

  const filtered = hotels.filter((hotel) => {
    if (city !== ALL && hotel.city !== city) return false;
    if (tier !== ALL && hotel.tier !== tier) return false;
    if (
      searchQuery.trim() !== '' &&
      !hotel.label.toLowerCase().includes(searchQuery.trim().toLowerCase())
    ) {
      return false;
    }
    return true;
  });

  const legendLabels = useMemo(() => {
    const labels = new Set<string>();
    for (const hotel of hotels) for (const label of hotel.sourceLabels) labels.add(label);
    return [...labels].sort((a, b) => a.localeCompare(b, 'id-ID'));
  }, [hotels]);

  const selectedMonth = month === ALL ? null : Number(month);

  return (
    <div className="space-y-6">
      <div
        className="flex flex-col gap-4 rounded-lg border p-4 md:flex-row"
        style={{ borderColor: 'var(--color-border)', backgroundColor: 'var(--color-surface)' }}
      >
        <div className="relative flex-grow">
          <Search
            className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2"
            style={{ color: 'var(--color-text-muted)' }}
          />
          <Input
            placeholder="Cari nama hotel..."
            aria-label="Cari nama hotel"
            value={searchQuery}
            onChange={(event) => setSearchQuery(event.target.value)}
            className="pl-9"
          />
        </div>

        <div className="flex flex-wrap gap-3">
          <Select value={city} onValueChange={setCity}>
            <SelectTrigger className="w-36" aria-label="Kota">
              <SelectValue placeholder="Kota" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value={ALL}>Semua Kota</SelectItem>
              {CITIES.map((option) => (
                <SelectItem key={option} value={option}>
                  {option}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>

          <Select value={tier} onValueChange={setTier}>
            <SelectTrigger className="w-36" aria-label="Tier">
              <SelectValue placeholder="Tier" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value={ALL}>Semua Tier</SelectItem>
              {TIERS.map((option) => (
                <SelectItem key={option} value={option}>
                  {option}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>

          <Select value={month} onValueChange={setMonth}>
            <SelectTrigger className="w-40" aria-label="Bulan">
              <SelectValue placeholder="Bulan" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value={ALL}>Semua Bulan</SelectItem>
              {MONTH_NAMES_FULL.map((monthName, index) => (
                <SelectItem key={monthName} value={String(index + 1)}>
                  {monthName}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
      </div>

      <div
        className="flex flex-wrap justify-between gap-2 px-1 text-xs"
        style={{ color: 'var(--color-text-muted)' }}
      >
        <span>
          Menampilkan {filtered.length} dari {hotels.length} hotel
        </span>
        <span>
          {selectedMonth
            ? `Tarif katalog bulan ${MONTH_NAMES_FULL[selectedMonth - 1]}, satu baris per hotel`
            : 'Semua tarif dalam SAR, apa adanya dari katalog'}
        </span>
      </div>

      {filtered.length === 0 ? (
        <div
          className="rounded-lg border py-12 text-center text-sm"
          style={{
            borderColor: 'var(--color-border)',
            backgroundColor: 'var(--color-surface)',
            color: 'var(--color-text-muted)',
          }}
        >
          Tidak ada hotel yang cocok dengan pencarian dan filter Anda.
        </div>
      ) : selectedMonth ? (
        <MonthComparisonTable hotels={filtered} month={selectedMonth} labels={legendLabels} />
      ) : (
        <div className="space-y-3">
          {filtered.map((hotel) => (
            <HotelSection key={hotel.hotelPriceId} hotel={hotel} markerLabels={legendLabels} />
          ))}
        </div>
      )}

      {legendLabels.length > 0 && <SourceLegend labels={legendLabels} />}
    </div>
  );
};
