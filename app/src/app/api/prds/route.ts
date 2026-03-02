import { NextRequest, NextResponse } from 'next/server';
import { auth } from '@/lib/auth';
import { savePRD, findIdeaByLocalId, saveIdea } from '@/lib/db';

// POST /api/prds — PRD 저장
export async function POST(req: NextRequest) {
  const session = await auth();
  if (!session?.user?.id) {
    return NextResponse.json({ error: '로그인이 필요합니다.' }, { status: 401 });
  }

  try {
    const body = await req.json();
    const { prd, idea, keyword, preset, dbIdeaId } = body;

    if (!prd?.content || !prd?.ideaName) {
      return NextResponse.json(
        { error: 'prd.content와 prd.ideaName이 필요합니다.' },
        { status: 400 },
      );
    }

    if (typeof prd.content !== 'string' || prd.content.length > 500_000) {
      return NextResponse.json({ error: 'content가 너무 깁니다.' }, { status: 400 });
    }

    // DB에서 부모 아이디어 찾기 또는 자동 생성
    let resolvedIdeaId = dbIdeaId as string | undefined;

    if (!resolvedIdeaId && idea) {
      const existing = await findIdeaByLocalId(session.user.id, idea.id, keyword);
      if (existing) {
        resolvedIdeaId = existing.id;
      } else {
        resolvedIdeaId = await saveIdea(session.user.id, idea, keyword, preset);
      }
    }

    if (!resolvedIdeaId) {
      return NextResponse.json({ error: 'idea 정보가 필요합니다.' }, { status: 400 });
    }

    const saved = await savePRD(session.user.id, resolvedIdeaId, prd);
    return NextResponse.json({ success: true, id: saved.id, dbIdeaId: resolvedIdeaId });
  } catch (err) {
    console.error('POST /api/prds error:', err);
    return NextResponse.json(
      { error: err instanceof Error ? err.message : 'Failed to save PRD' },
      { status: 500 },
    );
  }
}
