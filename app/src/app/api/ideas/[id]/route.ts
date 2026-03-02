import { NextRequest, NextResponse } from 'next/server';
import { auth } from '@/lib/auth';
import { getIdeaWithRelations, deleteIdea, updateIdeaName } from '@/lib/db';

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

// PATCH /api/ideas/[id] — 아이디어 이름 변경
export async function PATCH(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> },
) {
  const session = await auth();
  if (!session?.user?.id) {
    return NextResponse.json({ error: '로그인이 필요합니다.' }, { status: 401 });
  }

  const { id } = await params;
  const body = await req.json();
  const name = typeof body?.name === 'string' ? body.name.trim() : '';
  if (!name) {
    return NextResponse.json({ error: '이름을 입력해주세요.' }, { status: 400 });
  }

  const updated = await updateIdeaName(session.user.id, id, name);
  if (!updated) {
    return NextResponse.json({ error: '아이디어를 찾을 수 없습니다.' }, { status: 404 });
  }

  return NextResponse.json(updated);
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
