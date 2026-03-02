'use client';

import { useMemo } from 'react';
import { diffLines } from 'diff';
import { CANYON as C } from '@/lib/colors';

interface Props {
  oldContent: string;
  newContent: string;
  oldLabel: string;
  newLabel: string;
}

export default function DiffViewer({ oldContent, newContent, oldLabel, newLabel }: Props) {
  const changes = useMemo(() => diffLines(oldContent, newContent), [oldContent, newContent]);

  return (
    <div className="rounded-xl overflow-hidden" style={{ border: `1px solid ${C.border}` }}>
      <div className="flex text-xs font-medium" style={{ backgroundColor: C.cream }}>
        <div className="flex-1 px-4 py-2" style={{ color: '#991B1B', borderRight: `1px solid ${C.border}` }}>
          {oldLabel}
        </div>
        <div className="flex-1 px-4 py-2" style={{ color: '#166534' }}>
          {newLabel}
        </div>
      </div>
      <div className="overflow-x-auto max-h-[600px] overflow-y-auto">
        <pre className="text-xs leading-5 p-0 m-0" style={{ fontFamily: 'var(--font-mono), monospace' }}>
          {changes.map((part, idx) => {
            let bgColor = 'transparent';
            let textColor = C.textDark;
            let prefix = ' ';

            if (part.added) {
              bgColor = '#DCFCE7';
              textColor = '#166534';
              prefix = '+';
            } else if (part.removed) {
              bgColor = '#FEE2E2';
              textColor = '#991B1B';
              prefix = '-';
            }

            const lines = part.value.replace(/\n$/, '').split('\n');
            return lines.map((line, lineIdx) => (
              <div
                key={`${idx}-${lineIdx}`}
                className="px-4 py-0"
                style={{
                  backgroundColor: bgColor,
                  color: textColor,
                  textDecoration: part.removed ? 'line-through' : 'none',
                  opacity: part.removed ? 0.7 : 1,
                }}
              >
                <span className="inline-block w-4 select-none opacity-50">{prefix}</span>
                {line}
              </div>
            ));
          })}
        </pre>
      </div>
    </div>
  );
}
