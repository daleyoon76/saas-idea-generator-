'use client';

import { useState, useEffect, useRef } from 'react';
import { CANYON } from '@/lib/colors';

/** Normalize common LLM Mermaid syntax variants so the parser can handle them. */
export function sanitizeMermaidSyntax(src: string, level: number = 0): string {
  let result = src
    .replace(/^\uFEFF/, '')
    .replace(/[─━═\u2500\u2501\u2550—–\u2014\u2013]{1,4}>/g, '-->')
    .replace(/[→⟶⟹➜➝➞⟵⟷]/g, '-->')
    .replace(/＞/g, '>')
    .replace(/[\u201C\u201D\u201E\u201F\u2033]/g, '"')
    .replace(/[\u2018\u2019\u201A\u201B\u2032]/g, "'")
    .replace(/^(\s*(?:flowchart|graph|sequenceDiagram|classDiagram|stateDiagram|erDiagram|gantt)\b[^;\n]*);/gm, '$1')
    .replace(/\n{3,}/g, '\n\n');

  const subgraphCount = (result.match(/^\s*subgraph\b/gm) || []).length;
  const endCount = (result.match(/^\s*end\s*$/gm) || []).length;
  if (endCount > subgraphCount) {
    let surplus = endCount - subgraphCount;
    result = result.replace(/^\s*end\s*$/gm, (m) => {
      if (surplus > 0) { surplus--; return ''; }
      return m;
    });
  }

  result = result.replace(/\\n/g, '<br/>');

  result = result.replace(/\[[^\]]*\]/g, (m) =>
    m.replace(/\(/g, '（').replace(/\)/g, '）')
  );
  result = result.replace(/\{[^}]*\}/g, (m) =>
    m.replace(/\(/g, '（').replace(/\)/g, '）')
  );
  result = result.replace(/^(\s*subgraph\s+)(.+)$/gm, (_, prefix, name) =>
    prefix + name.replace(/\(/g, '（').replace(/\)/g, '）')
  );

  if (level >= 1) {
    result = result.replace(/\|[^|]*\|/g, (m) =>
      m.replace(/\(/g, '（').replace(/\)/g, '）')
    );
    result = result.replace(/\(\(([^()]*(?:\([^)]*\))*[^()]*)\)\)/g, (match, inner: string) => {
      return '((' + inner.replace(/\(/g, '（').replace(/\)/g, '）') + '))';
    });
  }

  if (level >= 2) {
    const lines = result.split('\n');
    result = lines.map(line => {
      const trimmed = line.trim();
      if (!trimmed || trimmed.startsWith('%%') ||
          /^\s*(?:flowchart|graph|sequenceDiagram|classDiagram|stateDiagram|erDiagram|gantt)\b/.test(trimmed)) {
        return line;
      }
      return line.replace(/\(/g, '（').replace(/\)/g, '）');
    }).join('\n');
  }

  const MAX_LINE = 13;
  function breakLongSegment(seg: string): string {
    seg = seg.trim();
    if (seg.length <= MAX_LINE) return seg;
    const mid = Math.floor(seg.length / 2);
    let breakIdx = -1;
    for (let d = 0; d <= mid; d++) {
      if (mid + d < seg.length && /[\s,·:;→+]/.test(seg[mid + d])) { breakIdx = mid + d; break; }
      if (mid - d >= 0 && /[\s,·:;→+]/.test(seg[mid - d])) { breakIdx = mid - d; break; }
    }
    if (breakIdx <= 0) return seg;
    const left = seg.slice(0, breakIdx + 1).trimEnd();
    const right = breakLongSegment(seg.slice(breakIdx + 1));
    return left + '<br/>' + right;
  }
  result = result.replace(/(["[\]({])([^"|\]\)}\n]{10,}?)(["|\]\)}])/g, (_, open, body, close) => {
    const segments = body.split('<br/>');
    const broken = segments.map((s: string) => breakLongSegment(s.trim()));
    return `${open}${broken.join('<br/>')}${close}`;
  });

  return result;
}

export default function MermaidDiagram({ chart }: { chart: string }) {
  const mermaidRef = useRef<HTMLDivElement>(null);
  const [svg, setSvg] = useState<string>('');
  const [error, setError] = useState(false);
  const [fit, setFit] = useState(false);

  useEffect(() => {
    let cancelled = false;

    import('mermaid').then(async (m) => {
      m.default.initialize({ startOnLoad: false, securityLevel: 'loose', theme: 'base',
        themeVariables: {
          primaryColor: '#F5EDE6', primaryBorderColor: '#D4A574',
          lineColor: '#8B3520', textColor: '#3D1E10',
      }});

      for (const level of [0, 1, 2]) {
        if (cancelled) return;
        const cleaned = sanitizeMermaidSyntax(chart, level);
        const id = `mermaid-${Math.random().toString(36).slice(2, 9)}`;
        const offscreen = document.createElement('div');
        offscreen.style.position = 'absolute';
        offscreen.style.left = '-99999px';
        offscreen.style.top = '-99999px';
        offscreen.style.width = `${mermaidRef.current?.clientWidth || 800}px`;
        document.body.appendChild(offscreen);
        try {
          const { svg: renderedSvg } = await m.default.render(id, cleaned, offscreen);
          if (!cancelled) setSvg(renderedSvg);
          return;
        } catch (err) {
          if (level < 2) {
            console.warn(`[Mermaid] level ${level} 실패, level ${level + 1} 시도:`, err);
          } else {
            if (!cancelled) { console.warn('[Mermaid] 모든 레벨 실패:', err, '\nInput:', chart); setError(true); }
          }
        } finally {
          offscreen.remove();
        }
      }
    });
    return () => { cancelled = true; };
  }, [chart]);

  useEffect(() => {
    if (!svg || !mermaidRef.current) return;
    const svgEl = mermaidRef.current.querySelector('svg');
    if (!svgEl) return;
    const svgWidth = svgEl.viewBox?.baseVal?.width || svgEl.getBoundingClientRect().width || 0;
    const containerWidth = mermaidRef.current.clientWidth;
    setFit(svgWidth <= containerWidth);
  }, [svg]);

  if (error) return (
    <div className="my-4 px-4 py-3 rounded-lg border-l-4 text-sm"
      style={{ backgroundColor: CANYON.cream, borderColor: CANYON.amber, color: CANYON.textMid }}>
      <p className="mb-0">다이어그램을 표시할 수 없습니다.</p>
      <details className="mt-2">
        <summary className="cursor-pointer text-xs" style={{ color: CANYON.textLight }}>
          원본 다이어그램 코드 보기
        </summary>
        <pre className="mt-2 p-3 rounded-xl text-xs overflow-auto max-h-48 whitespace-pre-wrap"
          style={{ backgroundColor: CANYON.bg, color: CANYON.textDark, fontFamily: 'var(--font-mono), monospace' }}>
          {chart}
        </pre>
      </details>
    </div>
  );
  return <div className={`my-4 overflow-x-auto mermaid-wrap${fit ? ' fit' : ''}`}
    style={{ width: '100%' }}
    ref={mermaidRef}
    dangerouslySetInnerHTML={{ __html: svg }} />;
}
