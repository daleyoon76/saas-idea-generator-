'use client';

import ReactMarkdown from 'react-markdown';
import remarkGfm from 'remark-gfm';
import { CANYON as C } from '@/lib/colors';
import ChartRenderer from '@/components/ChartRenderer';
import MermaidDiagram from '@/components/MermaidDiagram';
import SourceLink from '@/components/SourceLink';
import type { LinkStatus } from '@/lib/source-credibility';

interface Props {
  content: string;
  linkStatusMap?: Map<string, LinkStatus>;
}

export default function MarkdownRenderer({ content, linkStatusMap }: Props) {
  return (
    <ReactMarkdown
      remarkPlugins={[remarkGfm]}
      components={{
        h2: ({ children }) => (
          <div className="px-4 py-2 rounded-lg font-bold text-base mt-8 mb-3" style={{ backgroundColor: C.textDark, color: C.cream }}>
            {children}
          </div>
        ),
        h3: ({ children }) => (
          <div className="px-4 py-2 font-semibold text-sm mt-5 mb-2 border-l-4" style={{ backgroundColor: C.selectedBg, color: C.accent, borderColor: C.accent }}>
            {children}
          </div>
        ),
        h4: ({ children }) => (
          <div className="pl-3 font-semibold text-sm mt-4 mb-1 border-l-4" style={{ borderColor: C.border, color: C.textMid }}>
            {children}
          </div>
        ),
        p: ({ children }) => <p className="text-sm leading-7 my-2" style={{ color: C.textDark }}>{children}</p>,
        ul: ({ children }) => <ul className="ml-5 my-2 space-y-1 list-disc">{children}</ul>,
        ol: ({ children }) => <ol className="ml-5 my-2 space-y-1 list-decimal">{children}</ol>,
        li: ({ children }) => <li className="text-sm leading-7" style={{ color: C.textDark }}>{children}</li>,
        strong: ({ children }) => <strong className="font-bold" style={{ color: C.textDark }}>{children}</strong>,
        table: ({ children }) => <div className="overflow-x-auto my-4"><table className="w-full border-collapse text-sm">{children}</table></div>,
        thead: ({ children }) => <thead style={{ backgroundColor: '#F0D5C0' }}>{children}</thead>,
        tbody: ({ children }) => <tbody className="divide-y" style={{ borderColor: C.border }}>{children}</tbody>,
        tr: ({ children }) => <tr>{children}</tr>,
        th: ({ children }) => <th className="px-3 py-2 text-left text-sm font-semibold" style={{ border: `1px solid ${C.border}`, color: C.textDark }}>{children}</th>,
        td: ({ children }) => <td className="px-3 py-2 text-sm leading-6" style={{ border: `1px solid ${C.border}`, color: C.textMid }}>{children}</td>,
        a: ({ href, children }) => <SourceLink href={href} linkStatus={href ? linkStatusMap?.get(href) : undefined}>{children}</SourceLink>,
        img: ({ src, alt }) => src ? <img src={src} alt={alt || ''} className="max-w-full h-auto my-2 rounded" /> : null,
        hr: () => <hr className="my-6" style={{ borderColor: C.border }} />,
        blockquote: ({ children }) => <blockquote className="my-4 px-4 py-3 rounded-lg border-l-4 text-sm" style={{ backgroundColor: '#FEF9E7', borderColor: '#F5901E', color: C.textDark }}>{children}</blockquote>,
        pre: ({ children }) => <pre className="whitespace-pre overflow-x-auto my-4 p-4 rounded-xl text-xs leading-5" style={{ backgroundColor: '#F5EDE6', color: C.textDark, fontFamily: 'var(--font-mono), monospace' }}>{children}</pre>,
        code: ({ className, children }: { className?: string; children?: React.ReactNode }) => {
          const raw = String(children).replace(/\n$/, '');
          if (/language-chart/.test(className || ''))
            return <ChartRenderer json={raw} />;
          if (/language-mermaid/.test(className || ''))
            return <MermaidDiagram chart={raw} />;
          return <code style={{ fontFamily: 'var(--font-mono), monospace' }}>{children}</code>;
        },
      }}
    >
      {content}
    </ReactMarkdown>
  );
}
