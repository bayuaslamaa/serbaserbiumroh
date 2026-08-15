import { NextRequest, NextResponse } from 'next/server';
import { auth } from '@/shared/auth/next-auth';
import { db } from '@/shared/db';
import { fetchPricingConfig } from '@/packages/estimate/domain/budget/calculate';
import { parseEstimate, ParseError } from '@/packages/estimate/repository/parse';
import {
  checkEnhancedParseCap,
  logEnhancedParseBlocked,
  logEnhancedParseUsage,
} from '@/packages/estimate/repository/parse-usage';
import { errorMessage, logActivity } from '@/shared/logging/activity-log';

const enhancedGuard = (user: {
  id?: string;
  role?: string;
}): { error: string; status: number } | { userId: string } => {
  if (user.role !== 'ADMIN' || !user.id) return { error: 'Forbidden', status: 403 };
  return { userId: user.id };
};

export const POST = async (req: NextRequest) => {
  const session = await auth();
  if (!session?.user) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  let body: { input?: unknown; enhanced?: unknown };
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ error: 'Invalid JSON body' }, { status: 400 });
  }

  const { input, enhanced } = body;
  if (typeof input !== 'string' || input.trim().length === 0) {
    return NextResponse.json({ error: 'input is required' }, { status: 400 });
  }
  if (input.length > 5000) {
    return NextResponse.json({ error: 'input must be at most 5000 characters' }, { status: 400 });
  }
  if (enhanced !== undefined && typeof enhanced !== 'boolean') {
    return NextResponse.json({ error: 'enhanced must be a boolean' }, { status: 400 });
  }

  const wantsEnhanced = enhanced === true;
  const guard = wantsEnhanced ? enhancedGuard(session.user) : null;
  if (guard && 'error' in guard) {
    return NextResponse.json({ error: guard.error }, { status: guard.status });
  }

  if (guard && 'userId' in guard) {
    const cap = await checkEnhancedParseCap(db, guard.userId);
    if (!cap.allowed) {
      await logEnhancedParseBlocked(db, {
        userId: guard.userId,
        rawInput: input,
        used: cap.used,
        limit: cap.limit,
      });
      return NextResponse.json(
        {
          error: `Batas harga katalog harian tercapai (${cap.used}/${cap.limit}). Pakai mode biasa atau coba lagi besok.`,
        },
        { status: 429 },
      );
    }
  }

  let pricing;
  try {
    pricing = await fetchPricingConfig(db);
  } catch (err) {
    await logActivity(db, {
      userId: session.user.id,
      flow: 'estimate',
      event: 'ai_parse',
      status: 'ERROR',
      input: { rawInput: input },
      error: errorMessage(err),
      metadata: { stage: 'pricing_config' },
    });
    return NextResponse.json({ error: 'Failed to load pricing config' }, { status: 503 });
  }

  try {
    const { params, notes } = await parseEstimate(input, pricing, { enhanced: wantsEnhanced });
    await logActivity(db, {
      userId: session.user.id,
      flow: 'estimate',
      event: 'ai_parse',
      status: 'SUCCESS',
      input: { rawInput: input },
      output: { params, notes },
      metadata: { source: 'estimate_form', ...(wantsEnhanced ? { enhanced: true } : {}) },
    });
    if (wantsEnhanced) {
      await logEnhancedParseUsage(db, {
        userId: session.user.id,
        rawInput: input,
        status: 'SUCCESS',
        output: { params, notes },
        metadata: { stage: 'parse_success' },
      });
    }
    return NextResponse.json({ params, notes });
  } catch (err) {
    if (err instanceof ParseError) {
      await logActivity(db, {
        userId: session.user.id,
        flow: 'estimate',
        event: 'ai_parse',
        status: 'ERROR',
        input: { rawInput: input },
        error: err.message,
        metadata: { stage: 'parse_validation', ...(wantsEnhanced ? { enhanced: true } : {}) },
      });
      if (wantsEnhanced) {
        await logEnhancedParseUsage(db, {
          userId: session.user.id,
          rawInput: input,
          status: 'ERROR',
          error: err.message,
          metadata: { stage: 'parse_validation' },
        });
      }
      return NextResponse.json({ error: err.message }, { status: 422 });
    }
    console.error('[parse] Anthropic error:', err instanceof Error ? err.message : err);
    await logActivity(db, {
      userId: session.user.id,
      flow: 'estimate',
      event: 'ai_parse',
      status: 'ERROR',
      input: { rawInput: input },
      error: errorMessage(err),
      metadata: { stage: 'ai_service', ...(wantsEnhanced ? { enhanced: true } : {}) },
    });
    if (wantsEnhanced) {
      await logEnhancedParseUsage(db, {
        userId: session.user.id,
        rawInput: input,
        status: 'ERROR',
        error: errorMessage(err),
        metadata: { stage: 'ai_service' },
      });
    }
    return NextResponse.json({ error: 'AI service unavailable' }, { status: 503 });
  }
};
