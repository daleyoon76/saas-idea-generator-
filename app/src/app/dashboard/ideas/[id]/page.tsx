'use client';

import { useState, useEffect, use } from 'react';
import Link from 'next/link';
import { CANYON as C } from '@/lib/colors';
import UserMenu from '@/components/UserMenu';
import MarkdownRenderer from '@/components/MarkdownRenderer';
import DiffViewer from '@/components/DiffViewer';
import type { SavedIdeaDetail, SavedBusinessPlan, SavedPRD } from '@/lib/types';

export default function IdeaDetailPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = use(params);
  const [idea, setIdea] = useState<SavedIdeaDetail | null>(null);
  const [loading, setLoading] = useState(true);
  const [tab, setTab] = useState<'plans' | 'prds'>('plans');
  const [expandedPlan, setExpandedPlan] = useState<string | null>(null);
  const [expandedPrd, setExpandedPrd] = useState<string | null>(null);
  const [editingName, setEditingName] = useState(false);
  const [nameInput, setNameInput] = useState('');
  const [deleteTarget, setDeleteTarget] = useState<{ type: 'plan' | 'prd'; id: string } | null>(null);
  const [deleting, setDeleting] = useState(false);
  const [diffSelection, setDiffSelection] = useState<string[]>([]);
  const [showDiff, setShowDiff] = useState(false);

  useEffect(() => {
    fetch(`/api/ideas/${id}`)
      .then(r => { if (!r.ok) throw new Error(); return r.json(); })
      .then((data: SavedIdeaDetail) => { setIdea(data); setNameInput(data.name); setLoading(false); })
      .catch(() => setLoading(false));
  }, [id]);

  async function handleNameSave() {
    if (!idea || !nameInput.trim() || nameInput.trim() === idea.name) {
      setEditingName(false);
      return;
    }
    const res = await fetch(`/api/ideas/${id}`, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ name: nameInput.trim() }),
    });
    if (res.ok) {
      setIdea(prev => prev ? { ...prev, name: nameInput.trim() } : prev);
    }
    setEditingName(false);
  }

  async function handleDelete() {
    if (!deleteTarget) return;
    setDeleting(true);
    const url = deleteTarget.type === 'plan'
      ? `/api/plans/${deleteTarget.id}`
      : `/api/prds/${deleteTarget.id}`;
    try {
      const res = await fetch(url, { method: 'DELETE' });
      if (res.ok && idea) {
        if (deleteTarget.type === 'plan') {
          setIdea({ ...idea, businessPlans: idea.businessPlans.filter(p => p.id !== deleteTarget.id) });
        } else {
          setIdea({ ...idea, prds: idea.prds.filter(p => p.id !== deleteTarget.id) });
        }
      }
    } finally {
      setDeleting(false);
      setDeleteTarget(null);
    }
  }

  function downloadMd(content: string, filename: string) {
    const blob = new Blob([content], { type: 'text/markdown;charset=utf-8' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = filename;
    a.click();
    URL.revokeObjectURL(url);
  }

  function formatDate(d: string) {
    return new Date(d).toLocaleDateString('ko-KR', { year: 'numeric', month: 'short', day: 'numeric', hour: '2-digit', minute: '2-digit' });
  }

  function toggleDiffSelection(planId: string) {
    setDiffSelection(prev => {
      if (prev.includes(planId)) return prev.filter(id => id !== planId);
      if (prev.length >= 2) return [prev[1], planId];
      return [...prev, planId];
    });
    setShowDiff(false);
  }

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center" style={{ backgroundColor: C.bg }}>
        <div className="w-8 h-8 rounded-full border-2 border-t-transparent animate-spin" style={{ borderColor: C.border, borderTopColor: 'transparent' }} />
      </div>
    );
  }

  if (!idea) {
    return (
      <div className="min-h-screen flex flex-col items-center justify-center gap-4" style={{ backgroundColor: C.bg }}>
        <p className="text-sm" style={{ color: C.textMid }}>아이디어를 찾을 수 없습니다</p>
        <Link href="/dashboard" className="text-sm underline" style={{ color: C.accent }}>목록으로 돌아가기</Link>
      </div>
    );
  }

  const diffPlans = diffSelection.length === 2
    ? [
        idea.businessPlans.find(p => p.id === diffSelection[0]),
        idea.businessPlans.find(p => p.id === diffSelection[1]),
      ].filter(Boolean) as SavedBusinessPlan[]
    : [];

  return (
    <div className="min-h-screen" style={{ backgroundColor: C.bg }}>
      <nav className="w-full px-6 py-4 flex items-center justify-between max-w-5xl mx-auto">
        <Link href="/" className="text-lg font-bold" style={{ color: C.textDark }}>My CSO</Link>
        <UserMenu />
      </nav>

      <main className="max-w-5xl mx-auto px-6 pb-16">
        {/* Back link */}
        <Link href="/dashboard" className="inline-flex items-center gap-1 text-sm mb-6 transition hover:opacity-70" style={{ color: C.textMid }}>
          <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
          </svg>
          목록으로
        </Link>

        {/* Idea info card */}
        <div className="rounded-2xl p-6 mb-6" style={{ backgroundColor: C.cardBg, border: `1px solid ${C.border}` }}>
          {/* Name (inline edit) */}
          <div className="mb-4">
            {editingName ? (
              <div className="flex items-center gap-2">
                <input
                  autoFocus
                  value={nameInput}
                  onChange={e => setNameInput(e.target.value)}
                  onKeyDown={e => { if (e.key === 'Enter') handleNameSave(); if (e.key === 'Escape') { setEditingName(false); setNameInput(idea.name); } }}
                  className="flex-1 px-3 py-1.5 rounded-lg text-base font-semibold outline-none"
                  style={{ border: `1px solid ${C.accent}`, color: C.textDark }}
                />
                <button onClick={handleNameSave} className="px-3 py-1.5 rounded-lg text-xs font-medium text-white" style={{ backgroundColor: C.accent }}>저장</button>
                <button onClick={() => { setEditingName(false); setNameInput(idea.name); }} className="px-3 py-1.5 rounded-lg text-xs" style={{ color: C.textMid }}>취소</button>
              </div>
            ) : (
              <div className="flex items-center gap-2">
                <h1 className="text-lg font-bold" style={{ color: C.textDark }}>{idea.name}</h1>
                <button onClick={() => setEditingName(true)} className="p-1 rounded transition hover:bg-black/5" title="이름 수정">
                  <svg className="w-3.5 h-3.5" style={{ color: C.textLight }} fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15.232 5.232l3.536 3.536m-2.036-5.036a2.5 2.5 0 113.536 3.536L6.5 21.036H3v-3.572L16.732 3.732z" />
                  </svg>
                </button>
              </div>
            )}
          </div>

          {/* Category, badges */}
          <div className="flex flex-wrap gap-1.5 mb-4">
            <span className="px-2 py-0.5 rounded-full text-xs" style={{ backgroundColor: C.selectedBg, color: C.textMid }}>{idea.category}</span>
            {idea.keyword && (
              <span className="px-2 py-0.5 rounded-full text-xs" style={{ backgroundColor: C.cream, color: C.accent }}>{idea.keyword}</span>
            )}
            {idea.preset && (
              <span
                className="px-2 py-0.5 rounded-full text-xs font-medium"
                style={idea.preset === 'premium'
                  ? { background: `linear-gradient(135deg, ${C.accent}, ${C.amber})`, color: '#fff' }
                  : { backgroundColor: C.border, color: C.textMid }}
              >
                {idea.preset === 'premium' ? '고품질' : '기본'}
              </span>
            )}
            <span className="px-2 py-0.5 rounded-full text-xs" style={{ backgroundColor: C.border, color: C.textMid }}>
              {formatDate(idea.createdAt)}
            </span>
          </div>

          {/* Details */}
          <p className="text-sm mb-3" style={{ color: C.textDark }}>{idea.oneLiner}</p>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 text-xs" style={{ color: C.textMid }}>
            <div><span className="font-semibold" style={{ color: C.textDark }}>타겟:</span> {idea.target}</div>
            <div><span className="font-semibold" style={{ color: C.textDark }}>문제:</span> {idea.problem}</div>
            <div><span className="font-semibold" style={{ color: C.textDark }}>차별화:</span> {idea.differentiation}</div>
            <div><span className="font-semibold" style={{ color: C.textDark }}>수익모델:</span> {idea.revenueModel}</div>
            <div><span className="font-semibold" style={{ color: C.textDark }}>MVP 난이도:</span> {idea.mvpDifficulty}</div>
          </div>

          {idea.features.length > 0 && (
            <div className="mt-3 flex flex-wrap gap-1">
              {idea.features.map((f, i) => (
                <span key={i} className="px-2 py-0.5 rounded-full text-xs" style={{ backgroundColor: C.cream, color: C.textMid }}>
                  {f}
                </span>
              ))}
            </div>
          )}
        </div>

        {/* Action buttons */}
        <div className="flex flex-wrap gap-3 mb-6">
          <Link
            href={`/workflow?ideaId=${id}&action=reopen`}
            className="px-5 py-2.5 rounded-xl text-sm font-medium transition hover:opacity-80"
            style={{ backgroundColor: C.textDark, color: C.cream }}
          >
            다시 열기
          </Link>
          <Link
            href={`/workflow?ideaId=${id}&action=regenerate`}
            className="px-5 py-2.5 rounded-xl text-sm font-medium transition hover:opacity-80"
            style={{ border: `1px solid ${C.accent}`, color: C.accent }}
          >
            재생성
          </Link>
        </div>

        {/* Tabs */}
        <div className="flex gap-1 mb-6 p-1 rounded-xl" style={{ backgroundColor: C.border }}>
          <button
            onClick={() => setTab('plans')}
            className="flex-1 px-4 py-2 rounded-lg text-sm font-medium transition"
            style={tab === 'plans' ? { backgroundColor: C.cardBg, color: C.textDark } : { color: C.textMid }}
          >
            기획서 ({idea.businessPlans.length})
          </button>
          <button
            onClick={() => setTab('prds')}
            className="flex-1 px-4 py-2 rounded-lg text-sm font-medium transition"
            style={tab === 'prds' ? { backgroundColor: C.cardBg, color: C.textDark } : { color: C.textMid }}
          >
            PRD ({idea.prds.length})
          </button>
        </div>

        {/* Plans tab */}
        {tab === 'plans' && (
          <div className="space-y-3">
            {idea.businessPlans.length === 0 && (
              <p className="text-center py-8 text-sm" style={{ color: C.textLight }}>생성된 기획서가 없습니다</p>
            )}

            {/* Diff compare button */}
            {idea.businessPlans.length >= 2 && (
              <div className="flex items-center gap-2 mb-3">
                <span className="text-xs" style={{ color: C.textLight }}>
                  비교할 기획서 2개를 선택하세요 ({diffSelection.length}/2)
                </span>
                {diffSelection.length === 2 && (
                  <button
                    onClick={() => setShowDiff(!showDiff)}
                    className="px-3 py-1 rounded-lg text-xs font-medium transition hover:opacity-80"
                    style={{ backgroundColor: C.accent, color: '#fff' }}
                  >
                    {showDiff ? '비교 닫기' : '비교하기'}
                  </button>
                )}
                {diffSelection.length > 0 && (
                  <button
                    onClick={() => { setDiffSelection([]); setShowDiff(false); }}
                    className="text-xs underline"
                    style={{ color: C.textLight }}
                  >
                    선택 해제
                  </button>
                )}
              </div>
            )}

            {/* Diff viewer */}
            {showDiff && diffPlans.length === 2 && (
              <div className="mb-4">
                <DiffViewer
                  oldContent={diffPlans[0].content}
                  newContent={diffPlans[1].content}
                  oldLabel={`${versionLabel(diffPlans[0].version)} (${formatDate(diffPlans[0].createdAt)})`}
                  newLabel={`${versionLabel(diffPlans[1].version)} (${formatDate(diffPlans[1].createdAt)})`}
                />
              </div>
            )}

            {idea.businessPlans.map(plan => (
              <PlanItem
                key={plan.id}
                plan={plan}
                expanded={expandedPlan === plan.id}
                onToggle={() => setExpandedPlan(expandedPlan === plan.id ? null : plan.id)}
                onDelete={() => setDeleteTarget({ type: 'plan', id: plan.id })}
                onDownload={() => downloadMd(plan.content, `${idea.name}_${plan.version}.md`)}
                onReopen={() => window.location.href = `/workflow?ideaId=${id}&action=reopen`}
                formatDate={formatDate}
                diffSelected={diffSelection.includes(plan.id)}
                onDiffToggle={() => toggleDiffSelection(plan.id)}
                showDiffCheckbox={idea.businessPlans.length >= 2}
              />
            ))}
          </div>
        )}

        {/* PRDs tab */}
        {tab === 'prds' && (
          <div className="space-y-3">
            {idea.prds.length === 0 && (
              <p className="text-center py-8 text-sm" style={{ color: C.textLight }}>생성된 PRD가 없습니다</p>
            )}
            {idea.prds.map(prd => (
              <PrdItem
                key={prd.id}
                prd={prd}
                expanded={expandedPrd === prd.id}
                onToggle={() => setExpandedPrd(expandedPrd === prd.id ? null : prd.id)}
                onDelete={() => setDeleteTarget({ type: 'prd', id: prd.id })}
                onDownload={() => downloadMd(prd.content, `${idea.name}_PRD.md`)}
                formatDate={formatDate}
              />
            ))}
          </div>
        )}
      </main>

      {/* Delete modal */}
      {deleteTarget && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/30">
          <div className="rounded-2xl p-6 max-w-sm w-full mx-4 shadow-xl" style={{ backgroundColor: C.cardBg }}>
            <h3 className="text-base font-semibold mb-2" style={{ color: C.textDark }}>삭제 확인</h3>
            <p className="text-sm mb-5" style={{ color: C.textMid }}>
              {deleteTarget.type === 'plan' ? '이 기획서를' : '이 PRD를'} 삭제하시겠습니까? 되돌릴 수 없습니다.
            </p>
            <div className="flex justify-end gap-2">
              <button onClick={() => setDeleteTarget(null)} className="px-4 py-2 rounded-xl text-sm" style={{ border: `1px solid ${C.border}`, color: C.textMid }}>취소</button>
              <button onClick={handleDelete} disabled={deleting} className="px-4 py-2 rounded-xl text-sm font-medium text-white disabled:opacity-50" style={{ backgroundColor: '#DC2626' }}>
                {deleting ? '삭제 중...' : '삭제'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

function versionLabel(version: string): string {
  if (version === 'draft') return '초안';
  if (version === 'full') return '풀버전';
  return version;
}

function PlanItem({ plan, expanded, onToggle, onDelete, onDownload, onReopen, formatDate, diffSelected, onDiffToggle, showDiffCheckbox }: {
  plan: SavedBusinessPlan;
  expanded: boolean;
  onToggle: () => void;
  onDelete: () => void;
  onDownload: () => void;
  onReopen: () => void;
  formatDate: (d: string) => string;
  diffSelected: boolean;
  onDiffToggle: () => void;
  showDiffCheckbox: boolean;
}) {
  return (
    <div className="rounded-xl overflow-hidden" style={{ backgroundColor: C.cardBg, border: `1px solid ${C.border}` }}>
      <div className="flex items-center gap-3 px-4 py-3 cursor-pointer transition hover:bg-black/[0.02]" onClick={onToggle}>
        {showDiffCheckbox && (
          <input
            type="checkbox"
            checked={diffSelected}
            onChange={(e) => { e.stopPropagation(); onDiffToggle(); }}
            onClick={(e) => e.stopPropagation()}
            className="rounded"
          />
        )}
        <span
          className="px-2 py-0.5 rounded-full text-xs font-medium flex-shrink-0"
          style={plan.version === 'full'
            ? { background: `linear-gradient(135deg, ${C.accent}, ${C.amber})`, color: '#fff' }
            : { backgroundColor: C.border, color: C.textMid }}
        >
          {versionLabel(plan.version)}
        </span>
        <span className="text-xs flex-1" style={{ color: C.textLight }}>{formatDate(plan.createdAt)}</span>
        <svg className={`w-4 h-4 transition-transform ${expanded ? 'rotate-180' : ''}`} style={{ color: C.textLight }} fill="none" viewBox="0 0 24 24" stroke="currentColor">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
        </svg>
      </div>
      {expanded && (
        <div className="px-4 pb-4">
          <div className="flex flex-wrap gap-2 mb-4 pt-2" style={{ borderTop: `1px solid ${C.border}` }}>
            <button onClick={onDownload} className="px-3 py-1 rounded-lg text-xs transition hover:opacity-70" style={{ border: `1px solid ${C.border}`, color: C.textMid }}>.md 다운로드</button>
            <button onClick={onReopen} className="px-3 py-1 rounded-lg text-xs transition hover:opacity-70" style={{ border: `1px solid ${C.border}`, color: C.textMid }}>이 버전으로 열기</button>
            <button onClick={(e) => { e.stopPropagation(); onDelete(); }} className="px-3 py-1 rounded-lg text-xs transition hover:opacity-70 ml-auto" style={{ color: '#DC2626' }}>삭제</button>
          </div>
          <div style={{ overflowWrap: 'break-word', wordBreak: 'break-word', overflow: 'hidden' }}>
            <MarkdownRenderer content={plan.content} />
          </div>
        </div>
      )}
    </div>
  );
}

function PrdItem({ prd, expanded, onToggle, onDelete, onDownload, formatDate }: {
  prd: SavedPRD;
  expanded: boolean;
  onToggle: () => void;
  onDelete: () => void;
  onDownload: () => void;
  formatDate: (d: string) => string;
}) {
  return (
    <div className="rounded-xl overflow-hidden" style={{ backgroundColor: C.cardBg, border: `1px solid ${C.border}` }}>
      <div className="flex items-center gap-3 px-4 py-3 cursor-pointer transition hover:bg-black/[0.02]" onClick={onToggle}>
        <span className="px-2 py-0.5 rounded-full text-xs font-medium flex-shrink-0" style={{ backgroundColor: C.cream, color: C.accent }}>PRD</span>
        <span className="text-xs flex-1" style={{ color: C.textLight }}>{formatDate(prd.createdAt)}</span>
        <svg className={`w-4 h-4 transition-transform ${expanded ? 'rotate-180' : ''}`} style={{ color: C.textLight }} fill="none" viewBox="0 0 24 24" stroke="currentColor">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
        </svg>
      </div>
      {expanded && (
        <div className="px-4 pb-4">
          <div className="flex flex-wrap gap-2 mb-4 pt-2" style={{ borderTop: `1px solid ${C.border}` }}>
            <button onClick={onDownload} className="px-3 py-1 rounded-lg text-xs transition hover:opacity-70" style={{ border: `1px solid ${C.border}`, color: C.textMid }}>.md 다운로드</button>
            <button onClick={(e) => { e.stopPropagation(); onDelete(); }} className="px-3 py-1 rounded-lg text-xs transition hover:opacity-70 ml-auto" style={{ color: '#DC2626' }}>삭제</button>
          </div>
          <div style={{ overflowWrap: 'break-word', wordBreak: 'break-word', overflow: 'hidden' }}>
            <MarkdownRenderer content={prd.content} />
          </div>
        </div>
      )}
    </div>
  );
}
