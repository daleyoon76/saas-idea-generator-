'use client';

import React from 'react';
import { classifyUrl, LinkStatus } from '@/lib/source-credibility';
import { CANYON } from '@/lib/colors';

const C = CANYON;

interface SourceLinkProps {
  href?: string;
  children?: React.ReactNode;
  linkStatus?: LinkStatus;
}

/** 링크 상태 아이콘 */
function StatusIcon({ status }: { status: LinkStatus }) {
  const common = 'inline-flex items-center justify-center w-3.5 h-3.5 text-[9px] font-bold rounded-full flex-shrink-0';

  switch (status) {
    case 'alive':
      return (
        <span className={common} style={{ color: '#3D8B37' }} title="링크 정상">
          ✓
        </span>
      );
    case 'dead':
      return (
        <span className={common} style={{ color: '#DC2626' }} title="깨진 링크">
          ✗
        </span>
      );
    case 'unknown':
      return (
        <span className={common} style={{ color: C.textLight }} title="확인 불가">
          ?
        </span>
      );
    case 'checking':
    default:
      return (
        <span className={common + ' animate-pulse'} style={{ color: C.textLight }} title="확인 중...">
          ···
        </span>
      );
  }
}

/**
 * ReactMarkdown `a` 태그 대체 컴포넌트.
 * 기존 링크 렌더링을 유지하면서 신뢰도 뱃지와 링크 상태 아이콘을 추가한다.
 */
export default function SourceLink({ href, children, linkStatus }: SourceLinkProps) {
  if (!href) {
    return <span>{children}</span>;
  }

  const isExternal = /^https?:\/\//.test(href);
  const cred = isExternal ? classifyUrl(href) : null;

  return (
    <span className="inline-flex items-center gap-1 flex-wrap">
      <a
        href={href}
        target={isExternal ? '_blank' : undefined}
        rel={isExternal ? 'noopener noreferrer' : undefined}
        className="underline text-sm"
        style={{ color: C.accent }}
      >
        {children}
      </a>
      {cred && (
        <span
          className="inline-flex items-center gap-0.5 px-1.5 py-0 rounded text-[10px] font-medium leading-4 whitespace-nowrap"
          style={{
            backgroundColor: cred.bgColor,
            color: cred.color,
            border: `1px solid ${cred.color}20`,
          }}
          title={`${cred.label} (Tier ${cred.tier})`}
        >
          <span style={{ fontSize: '8px' }}>●</span>
          {cred.labelShort}
        </span>
      )}
      {isExternal && linkStatus && (
        <StatusIcon status={linkStatus} />
      )}
    </span>
  );
}
