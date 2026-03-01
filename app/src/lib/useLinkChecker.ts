'use client';

import { useState, useEffect, useRef, useCallback } from 'react';
import { extractUrlsFromMarkdown, LinkStatus } from './source-credibility';

const BATCH_SIZE = 20;

/**
 * 마크다운 콘텐츠에서 URL을 추출하고 비동기로 dead link 체크를 수행하는 훅.
 * 플랜 렌더링을 차단하지 않으며, 이미 체크한 URL은 재체크하지 않는다.
 */
export function useLinkChecker(markdownContent: string) {
  const [statusMap, setStatusMap] = useState<Map<string, LinkStatus>>(new Map());
  const checkedRef = useRef<Set<string>>(new Set());

  const checkBatch = useCallback(async (urls: string[]) => {
    if (urls.length === 0) return;

    // 진행 중 표시
    setStatusMap(prev => {
      const next = new Map(prev);
      for (const url of urls) next.set(url, 'checking');
      return next;
    });

    try {
      const res = await fetch('/api/check-links', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ urls }),
      });

      if (!res.ok) throw new Error('check-links API error');

      const data: { results: { url: string; alive: boolean; httpStatus: number }[] } =
        await res.json();

      setStatusMap(prev => {
        const next = new Map(prev);
        for (const r of data.results) {
          const status: LinkStatus = r.httpStatus === 0
            ? 'unknown'
            : r.alive ? 'alive' : 'dead';
          next.set(r.url, status);
        }
        return next;
      });
    } catch {
      // API 실패 시 unknown 처리
      setStatusMap(prev => {
        const next = new Map(prev);
        for (const url of urls) next.set(url, 'unknown');
        return next;
      });
    }
  }, []);

  useEffect(() => {
    if (!markdownContent) return;

    const allUrls = extractUrlsFromMarkdown(markdownContent);
    const newUrls = allUrls.filter(u => !checkedRef.current.has(u));
    if (newUrls.length === 0) return;

    // 새 URL을 체크 목록에 추가
    for (const u of newUrls) checkedRef.current.add(u);

    // 배치로 나눠서 호출
    const batches: string[][] = [];
    for (let i = 0; i < newUrls.length; i += BATCH_SIZE) {
      batches.push(newUrls.slice(i, i + BATCH_SIZE));
    }

    for (const batch of batches) {
      checkBatch(batch);
    }
  }, [markdownContent, checkBatch]);

  return statusMap;
}
