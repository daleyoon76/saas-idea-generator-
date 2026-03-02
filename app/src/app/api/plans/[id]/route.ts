import { NextRequest, NextResponse } from 'next/server';
import { auth } from '@/lib/auth';
import { deleteBusinessPlan } from '@/lib/db';

// DELETE /api/plans/[id] — 개별 기획서 삭제
export async function DELETE(
  _req: NextRequest,
  { params }: { params: Promise<{ id: string }> },
) {
  const session = await auth();
  if (!session?.user?.id) {
    return NextResponse.json({ error: '로그인이 필요합니다.' }, { status: 401 });
  }

  const { id } = await params;
  const deleted = await deleteBusinessPlan(session.user.id, id);
  if (!deleted) {
    return NextResponse.json({ error: '기획서를 찾을 수 없습니다.' }, { status: 404 });
  }

  return NextResponse.json({ success: true });
}
