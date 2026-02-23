import { NextRequest, NextResponse } from 'next/server';
// eslint-disable-next-line @typescript-eslint/no-require-imports
const mammoth = require('mammoth');

export async function POST(request: NextRequest) {
  try {
    const formData = await request.formData();
    const file = formData.get('file') as File | null;

    if (!file) {
      return NextResponse.json({ error: '파일이 없습니다.' }, { status: 400 });
    }

    if (file.size > 10 * 1024 * 1024) {
      return NextResponse.json({ error: '파일 크기가 10MB를 초과합니다.' }, { status: 400 });
    }

    const buffer = Buffer.from(await file.arrayBuffer());
    const result = await mammoth.convertToMarkdown({ buffer });

    return NextResponse.json({ text: result.value });
  } catch (error) {
    console.error('parse-docx error:', error);
    return NextResponse.json(
      { error: error instanceof Error ? error.message : 'DOCX 파싱 실패' },
      { status: 500 }
    );
  }
}
