import { NextResponse } from 'next/server';
import { auth } from '@/shared/auth/next-auth';
import { PILGRIM_STORY_IMPORT_TEMPLATE } from '@/packages/admin/domain/pilgrim-story-import';

export const GET = async () => {
  const session = await auth();
  if (!session?.user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  if (session.user.role !== 'ADMIN')
    return NextResponse.json({ error: 'Forbidden' }, { status: 403 });

  return new NextResponse(PILGRIM_STORY_IMPORT_TEMPLATE, {
    headers: {
      'Content-Type': 'text/csv; charset=utf-8',
      'Content-Disposition': 'attachment; filename="pilgrim-story-import-template.csv"',
    },
  });
};
