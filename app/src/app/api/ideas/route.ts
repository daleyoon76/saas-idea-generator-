import { NextRequest, NextResponse } from 'next/server';
import { auth } from '@/lib/auth';
import { saveIdeas, getUserHistory } from '@/lib/db';

// POST /api/ideas — 아이디어 배치 저장
export async function POST(req: NextRequest) {
  const session = await auth();
  if (!session?.user?.id) {
    return NextResponse.json({ error: '로그인이 필요합니다.' }, { status: 401 });
  }

  try {
    const body = await req.json();
    const { ideas, keyword, preset } = body;

    if (!Array.isArray(ideas) || ideas.length === 0) {
      return NextResponse.json({ error: 'ideas 배열이 필요합니다.' }, { status: 400 });
    }

    for (const idea of ideas) {
      if (!idea.name || typeof idea.name !== 'string') {
        return NextResponse.json({ error: '각 아이디어에 name이 필요합니다.' }, { status: 400 });
      }
      if (typeof idea.id !== 'number') {
        return NextResponse.json({ error: '각 아이디어에 숫자 id가 필요합니다.' }, { status: 400 });
      }
    }

    const result = await saveIdeas(session.user.id, ideas, keyword, preset);
    return NextResponse.json({ success: true, saved: result });
  } catch (err) {
    console.error('POST /api/ideas error:', err);
    return NextResponse.json(
      { error: err instanceof Error ? err.message : 'Failed to save ideas' },
      { status: 500 },
    );
  }
}

// GET /api/ideas — 사용자 아이디어 목록 (페이지네이션)
export async function GET(req: NextRequest) {
  const session = await auth();
  if (!session?.user?.id) {
    return NextResponse.json({ error: '로그인이 필요합니다.' }, { status: 401 });
  }

  const url = new URL(req.url);
  const page = Math.max(1, parseInt(url.searchParams.get('page') || '1'));
  const pageSize = Math.min(50, Math.max(1, parseInt(url.searchParams.get('pageSize') || '20')));

  try {
    const history = await getUserHistory(session.user.id, page, pageSize);
    return NextResponse.json(history);
  } catch (err) {
    console.error('GET /api/ideas error:', err);
    return NextResponse.json({ error: 'Failed to fetch ideas' }, { status: 500 });
  }
}
