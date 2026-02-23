import { NextRequest, NextResponse } from 'next/server';
import { marked } from 'marked';
import HTMLToDocx from 'html-to-docx';
import fs from 'fs';
import path from 'path';

export async function POST(req: NextRequest) {
  try {
    const { content, ideaName } = await req.json();

    if (!content || !ideaName) {
      return NextResponse.json({ error: 'content and ideaName are required' }, { status: 400 });
    }

    // Convert markdown to HTML
    const html = await marked(content);

    // Convert HTML to DOCX buffer
    const docxBuffer = await HTMLToDocx(html, undefined, {
      table: { row: { cantSplit: true } },
      footer: false,
      pageNumber: false,
    });

    // Ensure generated plans directory exists
    const outputDir = path.join(process.cwd(), '..', 'generated plans');
    fs.mkdirSync(outputDir, { recursive: true });

    // Build timestamped filename
    const now = new Date();
    const pad = (n: number) => String(n).padStart(2, '0');
    const timestamp =
      `${now.getFullYear()}${pad(now.getMonth() + 1)}${pad(now.getDate())}` +
      `_${pad(now.getHours())}${pad(now.getMinutes())}${pad(now.getSeconds())}`;
    const safeName = ideaName.replace(/[/\\?%*:|"<>]/g, '_');
    const fileName = `사업기획안_${safeName}_${timestamp}.docx`;
    const filePath = path.join(outputDir, fileName);

    // Write file
    fs.writeFileSync(filePath, docxBuffer as Buffer);

    return NextResponse.json({ success: true, fileName });
  } catch (err) {
    console.error('save-plan error:', err);
    return NextResponse.json(
      { error: err instanceof Error ? err.message : 'Failed to save plan' },
      { status: 500 }
    );
  }
}
