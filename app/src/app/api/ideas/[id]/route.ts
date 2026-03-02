import { NextRequest, NextResponse } from 'next/server';
import { auth } from '@/lib/auth';
import { getIdeaWithRelations, deleteIdea } from '@/lib/db';

// GET /api/ideas/[id] — 아이디어 상세 (기획서 + PRD 포함)
export async function GET(
  _req: NextRequest,
  { params }: { params: Promise<{ id: string }> },
) {
  const session = await auth();
  if (!session?.user?.id) {
    return NextResponse.json({ error: '로그인이 필요합니다.' }, { status: 401 });
  }

  const { id } = await params;
  const idea = await getIdeaWithRelations(session.user.id, id);
  if (!idea) {
    return NextResponse.json({ error: '아이디어를 찾을 수 없습니다.' }, { status: 404 });
  }

  return NextResponse.json(idea);
}

// DELETE /api/ideas/[id] — 아이디어 삭제 (cascade)
export async function DELETE(
  _req: NextRequest,
  { params }: { params: Promise<{ id: string }> },
) {
  const session = await auth();
  if (!session?.user?.id) {
    return NextResponse.json({ error: '로그인이 필요합니다.' }, { status: 401 });
  }

  const { id } = await params;
  const deleted = await deleteIdea(session.user.id, id);
  if (!deleted) {
    return NextResponse.json({ error: '아이디어를 찾을 수 없습니다.' }, { status: 404 });
  }

  return NextResponse.json({ success: true });
}
