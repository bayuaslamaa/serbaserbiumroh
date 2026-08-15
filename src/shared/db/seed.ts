import { db } from './index';
import {
  exchangeRates,
  hotelPrices,
  airlinePrices,
  roomMultipliers,
  hotelMonthlyPrices,
  airlineMonthlyPrices,
  faqGroups,
  faqItems,
} from './schema';
import { normalizeHotelPricingImportKey } from '@/packages/admin/domain/hotel-pricing-import';
import { syncRoomMultipliers } from './sync-room-multipliers';
import { syncServiceFees } from './sync-service-fees';
import { normalizeAirlinePricingImportKey } from '@/packages/admin/domain/airline-pricing-import';

const seed = async () => {
  console.log('Seeding database...');

  await db
    .insert(exchangeRates)
    .values([
      { currency: 'SAR', rateToIdr: 4700, updatedBy: 'system' },
      { currency: 'USD', rateToIdr: 17300, updatedBy: 'system' },
    ])
    .onConflictDoNothing();

  console.log('✓ Exchange rates seeded');

  await db
    .insert(hotelPrices)
    .values([
      {
        city: 'MADINAH',
        tier: 'ECONOMY',
        importKey: normalizeHotelPricingImportKey({
          city: 'MADINAH',
          tier: 'ECONOMY',
          label: 'Hotel Ekonomi Madinah',
        }),
        sarPerNight: 450,
        label: 'Hotel Ekonomi Madinah',
        sublabel: '2-3★, ±1km Nabawi',
      },
      {
        city: 'MADINAH',
        tier: 'STANDARD',
        importKey: normalizeHotelPricingImportKey({
          city: 'MADINAH',
          tier: 'STANDARD',
          label: 'Grand Plaza Badr Maqam',
        }),
        sarPerNight: 650,
        label: 'Grand Plaza Badr Maqam',
        sublabel: '4★, dekat Nabawi',
      },
      {
        city: 'MADINAH',
        tier: 'PELATARAN',
        importKey: normalizeHotelPricingImportKey({
          city: 'MADINAH',
          tier: 'PELATARAN',
          label: 'Pelataran Masjid Nabawi',
        }),
        sarPerNight: 2000,
        label: 'Pelataran Masjid Nabawi',
        sublabel: 'Di dalam pelataran',
      },
      {
        city: 'MADINAH',
        tier: 'PREMIUM',
        importKey: normalizeHotelPricingImportKey({
          city: 'MADINAH',
          tier: 'PREMIUM',
          label: 'Hotel Bintang 5 Madinah',
        }),
        sarPerNight: 3500,
        label: 'Hotel Bintang 5 Madinah',
        sublabel: 'Bintang 5 pelataran',
      },
      {
        city: 'MAKKAH',
        tier: 'ECONOMY',
        importKey: normalizeHotelPricingImportKey({
          city: 'MAKKAH',
          tier: 'ECONOMY',
          label: 'Hotel Ekonomi Makkah',
        }),
        sarPerNight: 800,
        label: 'Hotel Ekonomi Makkah',
        sublabel: '2-3★, jauh Haram',
      },
      {
        city: 'MAKKAH',
        tier: 'STANDARD',
        importKey: normalizeHotelPricingImportKey({
          city: 'MAKKAH',
          tier: 'STANDARD',
          label: 'Safwa Tower 3',
        }),
        sarPerNight: 1300,
        label: 'Safwa Tower 3',
        sublabel: '3★, dekat Haram',
      },
      {
        city: 'MAKKAH',
        tier: 'PELATARAN',
        importKey: normalizeHotelPricingImportKey({
          city: 'MAKKAH',
          tier: 'PELATARAN',
          label: 'Pelataran Masjidil Haram',
        }),
        sarPerNight: 3500,
        label: 'Pelataran Masjidil Haram',
        sublabel: 'Di dalam pelataran',
      },
      {
        city: 'MAKKAH',
        tier: 'PREMIUM',
        importKey: normalizeHotelPricingImportKey({
          city: 'MAKKAH',
          tier: 'PREMIUM',
          label: 'Hotel Bintang 5 Makkah',
        }),
        sarPerNight: 6000,
        label: 'Hotel Bintang 5 Makkah',
        sublabel: 'Bintang 5 pelataran',
      },
    ])
    .onConflictDoNothing();

  console.log('✓ Hotel prices seeded');

  await db
    .insert(airlinePrices)
    .values([
      {
        tier: 'BUDGET',
        importKey: normalizeAirlinePricingImportKey({
          tier: 'BUDGET',
          label: 'Lion Air, AirAsia',
        }),
        idr: 12500000,
        label: 'Lion Air, AirAsia',
        sublabel: 'Transit, ~12,5jt',
        isDefault: true,
      },
      {
        tier: 'STANDARD',
        importKey: normalizeAirlinePricingImportKey({
          tier: 'STANDARD',
          label: 'Batik Air, Saudia',
        }),
        idr: 14500000,
        label: 'Batik Air, Saudia',
        sublabel: '~14,5jt',
        isDefault: true,
      },
      {
        tier: 'GARUDA',
        importKey: normalizeAirlinePricingImportKey({
          tier: 'GARUDA',
          label: 'Garuda Indonesia',
        }),
        idr: 17000000,
        label: 'Garuda Indonesia',
        sublabel: 'Penerbangan langsung',
        isDefault: true,
      },
      {
        tier: 'BUSINESS',
        importKey: normalizeAirlinePricingImportKey({
          tier: 'BUSINESS',
          label: 'Business Class',
        }),
        idr: 25000000,
        label: 'Business Class',
        sublabel: 'Semua maskapai',
        isDefault: true,
      },
    ])
    .onConflictDoNothing();

  console.log('✓ Airline prices seeded');

  const serviceFeeSync = await syncServiceFees();

  console.log('✓ Service fees seeded');
  if (serviceFeeSync.removed.length > 0) {
    console.log(`✓ Retired service fees removed: ${serviceFeeSync.removed.join(', ')}`);
  }

  await syncRoomMultipliers();

  console.log('✓ Room multipliers seeded');

  const allHotels = await db.select().from(hotelPrices);
  const monthlyRows = allHotels.flatMap((h) =>
    Array.from({ length: 12 }, (_, i) => ({
      hotelPriceId: h.id,
      month: i + 1,
      sarPerNight: h.sarPerNight,
    })),
  );
  await db.insert(hotelMonthlyPrices).values(monthlyRows).onConflictDoNothing();
  console.log('✓ Hotel monthly prices seeded');

  const allAirlines = await db.select().from(airlinePrices);
  const airlineMonthlyRows = allAirlines.flatMap((a) =>
    Array.from({ length: 12 }, (_, i) => ({
      airlinePriceId: a.id,
      month: i + 1,
      idr: a.idr,
    })),
  );
  await db.insert(airlineMonthlyPrices).values(airlineMonthlyRows).onConflictDoNothing();
  console.log('✓ Airline monthly prices seeded');

  await db
    .insert(faqGroups)
    .values([
      { id: 'faq-group-general', name: 'Umum', sortOrder: 0 },
      { id: 'faq-group-budget', name: 'Estimasi Biaya', sortOrder: 10 },
    ])
    .onConflictDoNothing();

  await db
    .insert(faqItems)
    .values([
      {
        id: 'faq-item-umroh-mandiri-start',
        groupId: 'faq-group-general',
        question: 'Apa yang dibantu oleh Umroh Planner?',
        answer:
          'Umroh Planner membantu membuat estimasi biaya awal berdasarkan hotel, jumlah malam, jumlah jamaah, maskapai, dan layanan tambahan. Hasilnya tetap perlu divalidasi ulang sebelum transaksi.',
        sortOrder: 0,
        isPublished: true,
      },
      {
        id: 'faq-item-price-accuracy',
        groupId: 'faq-group-budget',
        question: 'Apakah estimasi biaya dijamin sama dengan harga final?',
        answer:
          'Tidak. Estimasi mengikuti data harga yang tersedia di sistem. Harga hotel, tiket, visa, dan layanan bisa berubah sewaktu-waktu mengikuti musim, ketersediaan kamar, kurs, dan aturan vendor.',
        sortOrder: 0,
        isPublished: true,
      },
    ])
    .onConflictDoNothing();

  console.log('✓ FAQ seeded');

  console.log('✅ Seeding complete!');
  process.exit(0);
};

seed().catch((err) => {
  console.error('Seed failed:', err);
  process.exit(1);
});
