import { NextRequest, NextResponse } from 'next/server';
import { auth } from '@/shared/auth/next-auth';
import { db } from '@/shared/db';
import { pilgrimStories, storyItineraryDays, storyPackingItems } from '@/shared/db/schema';
import { eq } from 'drizzle-orm';

const requireAdmin = async () => {
  const session = await auth();
  if (!session?.user) return { error: 'Unauthorized', status: 401 } as const;
  if (session.user.role !== 'ADMIN') return { error: 'Forbidden', status: 403 } as const;
  return { session };
};

type RouteCtx = { params: Promise<{ id: string }> };

export const GET = async (_req: NextRequest, ctx: RouteCtx) => {
  const guard = await requireAdmin();
  if ('error' in guard) return NextResponse.json({ error: guard.error }, { status: guard.status });

  const { id } = await ctx.params;

  const [story] = await db.select().from(pilgrimStories).where(eq(pilgrimStories.id, id)).limit(1);

  if (!story) return NextResponse.json({ error: 'Story not found' }, { status: 404 });

  const [days, items] = await Promise.all([
    db.select().from(storyItineraryDays).where(eq(storyItineraryDays.storyId, id)),
    db.select().from(storyPackingItems).where(eq(storyPackingItems.storyId, id)),
  ]);

  return NextResponse.json({ story, itineraryDays: days, packingItems: items });
};

export const PUT = async (req: NextRequest, ctx: RouteCtx) => {
  const guard = await requireAdmin();
  if ('error' in guard) return NextResponse.json({ error: guard.error }, { status: guard.status });

  const { id } = await ctx.params;

  let body: Record<string, unknown>;
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ error: 'Invalid JSON body' }, { status: 400 });
  }

  const {
    slug,
    authorName,
    departureCity,
    travelMonth,
    travelYear,
    pax,
    hotelTier,
    airlineTier,
    makkahNights,
    madinahNights,
    totalBudgetIdr,
    narrative,
    isPublished,
    isFeatured,
    itineraryDays,
    packingItems,
  } = body;

  const HOTEL_TIERS = ['ECONOMY', 'STANDARD', 'PELATARAN', 'PREMIUM'];
  if (hotelTier !== undefined && !HOTEL_TIERS.includes(hotelTier as string)) {
    return NextResponse.json({ error: 'invalid hotelTier' }, { status: 400 });
  }

  const storyData: Partial<typeof pilgrimStories.$inferInsert> & { updatedAt: Date } = {
    updatedAt: new Date(),
  };

  if (typeof slug === 'string') storyData.slug = slug.trim();
  if (typeof authorName === 'string') storyData.authorName = authorName.trim();
  if (typeof departureCity === 'string') storyData.departureCity = departureCity.trim();
  if (typeof travelMonth === 'number') storyData.travelMonth = travelMonth;
  if (travelMonth === null) storyData.travelMonth = null;
  if (typeof travelYear === 'number') storyData.travelYear = travelYear;
  if (travelYear === null) storyData.travelYear = null;
  if (typeof pax === 'number') storyData.pax = pax;
  if (typeof hotelTier === 'string')
    storyData.hotelTier = hotelTier as 'ECONOMY' | 'STANDARD' | 'PELATARAN' | 'PREMIUM';
  if (airlineTier !== undefined)
    storyData.airlineTier = airlineTier as 'BUDGET' | 'STANDARD' | 'GARUDA' | 'BUSINESS' | null;
  if (typeof makkahNights === 'number') storyData.makkahNights = makkahNights;
  if (typeof madinahNights === 'number') storyData.madinahNights = madinahNights;
  if (typeof totalBudgetIdr === 'number') storyData.totalBudgetIdr = totalBudgetIdr;
  if (typeof narrative === 'string') storyData.narrative = narrative;
  if (typeof isPublished === 'boolean') storyData.isPublished = isPublished;
  if (typeof isFeatured === 'boolean') storyData.isFeatured = isFeatured;

  const days = Array.isArray(itineraryDays)
    ? (itineraryDays as Array<Record<string, unknown>>)
    : null;
  const items = Array.isArray(packingItems)
    ? (packingItems as Array<Record<string, unknown>>)
    : null;

  let updatedStory: typeof pilgrimStories.$inferSelect;

  await db.transaction(async (tx) => {
    const [updated] = await tx
      .update(pilgrimStories)
      .set(storyData)
      .where(eq(pilgrimStories.id, id))
      .returning();

    if (!updated) throw new Error('not_found');
    updatedStory = updated;

    if (days !== null) {
      await tx.delete(storyItineraryDays).where(eq(storyItineraryDays.storyId, id));
      if (days.length > 0) {
        await tx.insert(storyItineraryDays).values(
          days.map((d, i) => ({
            storyId: id,
            dayNumber: typeof d.dayNumber === 'number' ? d.dayNumber : i + 1,
            label: typeof d.label === 'string' ? d.label : '',
            description: typeof d.description === 'string' ? d.description : '',
          })),
        );
      }
    }

    if (items !== null) {
      await tx.delete(storyPackingItems).where(eq(storyPackingItems.storyId, id));
      if (items.length > 0) {
        await tx.insert(storyPackingItems).values(
          items.map((p, i) => ({
            storyId: id,
            category: typeof p.category === 'string' ? p.category : '',
            itemName: typeof p.itemName === 'string' ? p.itemName : '',
            sortOrder: typeof p.sortOrder === 'number' ? p.sortOrder : i,
          })),
        );
      }
    }
  });

  return NextResponse.json({ story: updatedStory! });
};

export const DELETE = async (_req: NextRequest, ctx: RouteCtx) => {
  const guard = await requireAdmin();
  if ('error' in guard) return NextResponse.json({ error: guard.error }, { status: guard.status });

  const { id } = await ctx.params;

  const [deleted] = await db.delete(pilgrimStories).where(eq(pilgrimStories.id, id)).returning();

  if (!deleted) return NextResponse.json({ error: 'Story not found' }, { status: 404 });

  return NextResponse.json({ success: true });
};
