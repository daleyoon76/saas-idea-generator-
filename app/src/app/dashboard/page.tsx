'use client';

import { useState, useEffect, useMemo } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { CANYON as C } from '@/lib/colors';
import UserMenu from '@/components/UserMenu';
import type { SavedIdeaSummary, HistoryResponse } from '@/lib/types';

export default function DashboardPage() {
  const router = useRouter();
  const [data, setData] = useState<HistoryResponse | null>(null);
  const [loading, setLoading] = useState(true);
  const [page, setPage] = useState(1);
  const [search, setSearch] = useState('');
  const [deleteTarget, setDeleteTarget] = useState<string | null>(null);
  const [deleting, setDeleting] = useState(false);

  useEffect(() => {
    setLoading(true);
    fetch(`/api/ideas?page=${page}&pageSize=20`)
      .then(r => r.json())
      .then((res: HistoryResponse) => { setData(res); setLoading(false); })
      .catch(() => setLoading(false));
  }, [page]);

  const filtered = useMemo(() => {
    if (!data) return [];
    if (!search.trim()) return data.ideas;
    const q = search.trim().toLowerCase();
    return data.ideas.filter(idea =>
      idea.name.toLowerCase().includes(q) ||
      (idea.keyword && idea.keyword.toLowerCase().includes(q)) ||
      idea.category.toLowerCase().includes(q)
    );
  }, [data, search]);

  async function handleDelete() {
    if (!deleteTarget) return;
    setDeleting(true);
    try {
      const res = await fetch(`/api/ideas/${deleteTarget}`, { method: 'DELETE' });
      if (res.ok) {
        setData(prev => prev ? {
          ...prev,
          ideas: prev.ideas.filter(i => i.id !== deleteTarget),
          total: prev.total - 1,
        } : prev);
      }
    } finally {
      setDeleting(false);
      setDeleteTarget(null);
    }
  }

  function formatDate(d: string) {
    return new Date(d).toLocaleDateString('ko-KR', { year: 'numeric', month: 'short', day: 'numeric' });
  }

  return (
    <div className="min-h-screen" style={{ backgroundColor: C.bg }}>
      {/* Nav */}
      <nav className="w-full px-6 py-4 flex items-center justify-between max-w-5xl mx-auto">
        <Link href="/" className="text-lg font-bold" style={{ color: C.textDark }}>My CSO</Link>
        <UserMenu />
      </nav>

      <main className="max-w-5xl mx-auto px-6 pb-16">
        {/* Header */}
        <div className="flex items-center justify-between mb-6">
          <h1 className="text-xl font-bold" style={{ color: C.textDark }}>내 기획서</h1>
          <Link
            href="/start"
            className="px-4 py-2 rounded-xl text-sm font-medium transition hover:opacity-80"
            style={{ backgroundColor: C.accent, color: '#fff' }}
          >
            새 기획서 만들기
          </Link>
        </div>

        {/* Search */}
        <div className="mb-6">
          <input
            type="text"
            placeholder="이름, 키워드, 카테고리로 검색..."
            value={search}
            onChange={e => setSearch(e.target.value)}
            className="w-full px-4 py-2.5 rounded-xl text-sm outline-none transition"
            style={{
              backgroundColor: C.cardBg,
              border: `1px solid ${C.border}`,
              color: C.textDark,
            }}
          />
        </div>

        {/* Loading */}
        {loading && (
          <div className="flex justify-center py-20">
            <div className="w-8 h-8 rounded-full border-2 border-t-transparent animate-spin" style={{ borderColor: C.border, borderTopColor: 'transparent' }} />
          </div>
        )}

        {/* Empty state */}
        {!loading && data && data.ideas.length === 0 && (
          <div className="text-center py-20">
            <p className="text-sm mb-4" style={{ color: C.textLight }}>아직 생성한 기획서가 없습니다</p>
            <Link
              href="/start"
              className="inline-block px-6 py-2.5 rounded-xl text-sm font-medium transition hover:opacity-80"
              style={{ backgroundColor: C.accent, color: '#fff' }}
            >
              첫 기획서 만들기
            </Link>
          </div>
        )}

        {/* Search empty */}
        {!loading && filtered.length === 0 && data && data.ideas.length > 0 && (
          <div className="text-center py-12">
            <p className="text-sm" style={{ color: C.textLight }}>검색 결과가 없습니다</p>
          </div>
        )}

        {/* Card grid */}
        {!loading && filtered.length > 0 && (
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {filtered.map(idea => (
              <IdeaCard
                key={idea.id}
                idea={idea}
                formatDate={formatDate}
                onClick={() => router.push(`/dashboard/ideas/${idea.id}`)}
                onDelete={(e) => { e.stopPropagation(); setDeleteTarget(idea.id); }}
              />
            ))}
          </div>
        )}

        {/* Pagination */}
        {data && data.totalPages > 1 && (
          <div className="flex justify-center items-center gap-3 mt-8">
            <button
              disabled={page <= 1}
              onClick={() => setPage(p => p - 1)}
              className="px-3 py-1.5 rounded-lg text-sm transition disabled:opacity-40"
              style={{ border: `1px solid ${C.border}`, color: C.textMid }}
            >
              이전
            </button>
            <span className="text-sm" style={{ color: C.textMid }}>
              {page} / {data.totalPages}
            </span>
            <button
              disabled={page >= data.totalPages}
              onClick={() => setPage(p => p + 1)}
              className="px-3 py-1.5 rounded-lg text-sm transition disabled:opacity-40"
              style={{ border: `1px solid ${C.border}`, color: C.textMid }}
            >
              다음
            </button>
          </div>
        )}
      </main>

      {/* Delete confirmation modal */}
      {deleteTarget && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/30">
          <div className="rounded-2xl p-6 max-w-sm w-full mx-4 shadow-xl" style={{ backgroundColor: C.cardBg }}>
            <h3 className="text-base font-semibold mb-2" style={{ color: C.textDark }}>삭제 확인</h3>
            <p className="text-sm mb-5" style={{ color: C.textMid }}>
              이 아이디어와 관련된 기획서, PRD가 모두 삭제됩니다. 되돌릴 수 없습니다.
            </p>
            <div className="flex justify-end gap-2">
              <button
                onClick={() => setDeleteTarget(null)}
                className="px-4 py-2 rounded-xl text-sm"
                style={{ border: `1px solid ${C.border}`, color: C.textMid }}
              >
                취소
              </button>
              <button
                onClick={handleDelete}
                disabled={deleting}
                className="px-4 py-2 rounded-xl text-sm font-medium text-white transition disabled:opacity-50"
                style={{ backgroundColor: '#DC2626' }}
              >
                {deleting ? '삭제 중...' : '삭제'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

function IdeaCard({ idea, formatDate, onClick, onDelete }: {
  idea: SavedIdeaSummary;
  formatDate: (d: string) => string;
  onClick: () => void;
  onDelete: (e: React.MouseEvent) => void;
}) {
  return (
    <div
      onClick={onClick}
      className="rounded-2xl p-5 cursor-pointer transition hover:shadow-md"
      style={{ backgroundColor: C.cardBg, border: `1px solid ${C.border}` }}
    >
      <div className="flex items-start justify-between mb-3">
        <h3 className="text-sm font-semibold line-clamp-2 flex-1 mr-2" style={{ color: C.textDark }}>
          {idea.name}
        </h3>
        <button
          onClick={onDelete}
          className="p-1 rounded-lg transition hover:bg-red-50 flex-shrink-0"
          title="삭제"
        >
          <svg className="w-4 h-4" style={{ color: C.textLight }} fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
          </svg>
        </button>
      </div>

      <div className="flex flex-wrap gap-1.5 mb-3">
        {idea.keyword && (
          <span className="px-2 py-0.5 rounded-full text-xs" style={{ backgroundColor: C.cream, color: C.accent }}>
            {idea.keyword}
          </span>
        )}
        <span className="px-2 py-0.5 rounded-full text-xs" style={{ backgroundColor: C.selectedBg, color: C.textMid }}>
          {idea.category}
        </span>
        {idea.preset && (
          <span
            className="px-2 py-0.5 rounded-full text-xs font-medium"
            style={idea.preset === 'premium'
              ? { background: `linear-gradient(135deg, ${C.accent}, ${C.amber})`, color: '#fff' }
              : { backgroundColor: C.border, color: C.textMid }
            }
          >
            {idea.preset === 'premium' ? '고품질' : '기본'}
          </span>
        )}
      </div>

      <p className="text-xs mb-3 line-clamp-2" style={{ color: C.textMid }}>{idea.oneLiner}</p>

      <div className="flex items-center justify-between">
        <div className="flex gap-3 text-xs" style={{ color: C.textLight }}>
          <span>기획서 {idea._count.businessPlans}</span>
          <span>PRD {idea._count.prds}</span>
        </div>
        <span className="text-xs" style={{ color: C.textLight }}>
          {formatDate(idea.createdAt)}
        </span>
      </div>
    </div>
  );
}
