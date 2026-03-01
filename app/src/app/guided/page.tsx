'use client';

import { useState, useEffect, useRef } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import {
  Idea, BusinessPlan, AIProvider,
  QualityPreset, MODULE_PRESETS, PRESET_INFO,
  GuidedAnswers, GuidedStep, GuidedResult, GUIDED_RESULT_KEY,
} from '@/lib/types';
import UserMenu from '@/components/UserMenu';
import { SearchResult } from '@/lib/prompts';
import { CANYON } from '@/lib/colors';

const C = CANYON;

// ── 상수 ────────────────────────────────────────────────────
const CATEGORY_OPTIONS = ['웹 SaaS', '모바일 앱', '플랫폼·마켓플레이스', 'API·개발자 도구', 'AI 에이전트', '기타'];
const REVENUE_OPTIONS = ['월 구독 (SaaS)', '거래 수수료', '프리미엄', '광고', 'API 과금', '라이선스', '기타'];
const DIFFICULTY_OPTIONS = [
  { value: '쉬움', label: '쉬움 (하)', desc: '기존 API·프레임워크 조합으로 빠르게 MVP 가능' },
  { value: '보통', label: '보통 (중)', desc: '커스텀 로직이나 외부 연동이 일부 필요' },
  { value: '어려움', label: '어려움 (상)', desc: '복잡한 인프라, ML 모델, 규제 대응 등이 필요' },
];

// ── 유틸 ────────────────────────────────────────────────────
function formatTime(seconds: number): string {
  const m = Math.floor(seconds / 60);
  const s = seconds % 60;
  return m > 0 ? `${m}분 ${s.toString().padStart(2, '0')}초` : `${s}초`;
}

// ── 메인 컴포넌트 ───────────────────────────────────────────
export default function GuidedPage() {
  const router = useRouter();

  // 질문 상태
  const [guidedStep, setGuidedStep] = useState<GuidedStep>(1);
  const [answers, setAnswers] = useState<Partial<GuidedAnswers>>({
    features: ['', '', ''],
  });

  // 프리셋 상태
  const [selectedPreset, setSelectedPreset] = useState<QualityPreset>('premium');
  const [availableProviders, setAvailableProviders] = useState<Record<AIProvider, boolean | null>>({
    claude: null, gemini: null, openai: null, ollama: null,
  });
  const [showProviderPanel, setShowProviderPanel] = useState(false);

  // 페이지 모드: 직접 입력(wizard) vs 기존 기획서 가져오기(import)
  const [pageMode, setPageMode] = useState<'wizard' | 'import'>('wizard');

  // 기획서 Import 관련 상태
  const [importMode, setImportMode] = useState<'file' | 'paste'>('file');
  const [pasteText, setPasteText] = useState('');
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [isDragging, setIsDragging] = useState(false);

  // 생성 상태
  const [error, setError] = useState<string | null>(null);
  const [loadingMessage, setLoadingMessage] = useState('');
  const [progressCurrent, setProgressCurrent] = useState(0);
  const [completedSteps, setCompletedSteps] = useState<string[]>([]);
  const [elapsedSeconds, setElapsedSeconds] = useState(0);
  const processStartRef = useRef<number | null>(null);
  const timerRef = useRef<ReturnType<typeof setInterval> | null>(null);

  useEffect(() => {
    checkProviders();
    return () => { if (timerRef.current) clearInterval(timerRef.current); };
  }, []);

  // 프리셋 사용 가능 여부 판단
  function isPresetReady(): boolean {
    const types = Object.keys(MODULE_PRESETS[selectedPreset]);
    return types.every(type => {
      const chain = MODULE_PRESETS[selectedPreset][type];
      return chain.some(c => availableProviders[c.provider] === true);
    });
  }

  // ── Provider 체크 ────────────────────────────────────────
  async function checkProviders() {
    try {
      const res = await fetch('/api/providers');
      const data = await res.json();
      setAvailableProviders({
        ollama: data.ollama ?? false,
        claude: data.claude ?? false,
        gemini: data.gemini ?? false,
        openai: data.openai ?? false,
      });
    } catch {
      setAvailableProviders({ ollama: false, claude: false, gemini: false, openai: false });
    }
  }

  // ── 검색 ────────────────────────────────────────────────
  async function searchMultiple(queries: string[], countEach = 3, depth: 'basic' | 'advanced' = 'advanced'): Promise<SearchResult[]> {
    const allResults = await Promise.all(
      queries.map(async (q) => {
        try {
          const res = await fetch('/api/search', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ query: q, count: countEach, depth }),
          });
          if (!res.ok) return [];
          const data = await res.json();
          return (data.results || []) as SearchResult[];
        } catch { return []; }
      })
    );
    const seen = new Set<string>();
    return allResults.flat().filter((r) => {
      if (seen.has(r.url)) return false;
      seen.add(r.url);
      return true;
    });
  }

  /** LLM으로 동적 검색 쿼리 생성 (실패 시 fallbackQueries로 폴백) */
  async function generateSearchQueries(
    kw: string,
    context: 'idea-generation' | 'business-plan',
    fallbackQueries: string[],
    queryCount?: number,
    idea?: Idea,
  ): Promise<string[]> {
    const count = queryCount || fallbackQueries.length;
    try {
      const controller = new AbortController();
      const timer = setTimeout(() => controller.abort(), 8000);
      const res = await fetch('/api/generate', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          preset: selectedPreset,
          type: 'generate-queries',
          keyword: kw,
          queryContext: context,
          queryCount: count,
          ideaName: idea?.name,
          ideaTarget: idea?.target,
          ideaCategory: idea?.category,
        }),
        signal: controller.signal,
      });
      clearTimeout(timer);
      if (!res.ok) throw new Error('generate-queries API 실패');
      const data = await res.json();
      const text: string = data.response || '';
      const jsonMatch = text.match(/\[[\s\S]*\]/);
      if (!jsonMatch) throw new Error('JSON 배열 미발견');
      const queries = JSON.parse(jsonMatch[0]) as string[];
      if (!Array.isArray(queries) || queries.length === 0) throw new Error('빈 배열');
      console.log(`[generate-queries] ${context}: ${queries.length}개 동적 쿼리 생성`);
      return queries.slice(0, count + 2);
    } catch (err) {
      console.warn('[generate-queries] 폴백 사용:', err instanceof Error ? err.message : err);
      return fallbackQueries;
    }
  }

  // ── 타이머 ──────────────────────────────────────────────
  function startTimer() {
    processStartRef.current = Date.now();
    setElapsedSeconds(0);
    if (timerRef.current) clearInterval(timerRef.current);
    timerRef.current = setInterval(() => {
      const t = Date.now();
      setElapsedSeconds(Math.floor((t - (processStartRef.current ?? t)) / 1000));
    }, 1000);
  }
  function stopTimer() {
    if (timerRef.current) { clearInterval(timerRef.current); timerRef.current = null; }
  }

  // ── Idea 구성 ──────────────────────────────────────────
  function generateServiceName(oneLiner: string): string {
    const cleaned = oneLiner.trim();
    // 핵심 키워드 추출: 조사/접속사 등 제거 후 앞 2~3단어 조합
    const stopWords = ['이', '가', '을', '를', '의', '에', '로', '으로', '와', '과', '는', '은', '도', '만', '까지', '부터', '에서', '한', '된', '하는', '해주는', '위한', '통한', '있는'];
    const words = cleaned.replace(/[,.\-()]/g, ' ').split(/\s+/).filter(w => w.length > 1 && !stopWords.includes(w));
    const keywords = words.slice(0, 3);
    if (keywords.length === 0) return 'My Service';
    return keywords.join(' ');
  }

  function buildIdea(overrideAnswers?: GuidedAnswers): Idea {
    const a = overrideAnswers ?? (answers as GuidedAnswers);
    const name = a.serviceName?.trim() || generateServiceName(a.serviceOneLiner);
    return {
      id: -2,
      name,
      category: a.category,
      oneLiner: a.serviceOneLiner,
      target: a.targetCustomer,
      problem: a.problem,
      features: a.features.filter(f => f.trim()),
      differentiation: a.differentiation,
      revenueModel: a.revenueModel,
      mvpDifficulty: a.mvpDifficulty,
      rationale: `사용자 직접 입력: ${a.problem}`,
    };
  }

  // ── 기획서 생성 ─────────────────────────────────────────
  async function generatePlan(overrideAnswers?: GuidedAnswers) {
    setGuidedStep('generating');
    setError(null);
    setProgressCurrent(0);
    setCompletedSteps([]);
    startTimer();

    try {
      const idea = buildIdea(overrideAnswers);

      // 1) 시장 조사 (동적 쿼리 생성 → Tavily 검색)
      setLoadingMessage(`"${idea.name}" 관련 시장 조사 중...`);
      let planSearchResults: SearchResult[] = [];
      try {
        const guidedFallback = [
          `${idea.name} 경쟁사 대안 솔루션 비교`,
          `${idea.target} 고객 페인포인트 문제점 수요`,
          `${idea.category || 'SaaS'} 시장 규모 TAM SAM SOM 투자 트렌드 2025`,
          `${idea.name} SaaS 가격 책정 수익 모델 사례`,
          `${idea.name} 규제 법률 리스크 진입 장벽`,
        ];
        const guidedQueries = await generateSearchQueries(idea.name, 'business-plan', guidedFallback, 5, idea);
        planSearchResults = await searchMultiple(guidedQueries);
      } catch {}
      setProgressCurrent(1);
      setCompletedSteps([`시장 자료 ${planSearchResults.length}건 수집 완료`]);

      // 2) 사업기획서 생성
      setLoadingMessage(`"${idea.name}" 사업기획서 작성 중...`);
      const res = await fetch('/api/generate', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          preset: selectedPreset,
          type: 'business-plan',
          idea,
          searchResults: planSearchResults,
        }),
      });

      if (!res.ok) {
        const errData = await res.json().catch(() => ({}));
        throw new Error(errData.error || '사업기획서 생성에 실패했습니다.');
      }

      const data = await res.json();
      setProgressCurrent(2);
      setCompletedSteps(prev => [...prev, '사업기획서 작성 완료']);

      const businessPlan: BusinessPlan = {
        ideaId: idea.id,
        ideaName: idea.name,
        content: data.response,
        createdAt: new Date().toISOString(),
        version: 'draft',
      };

      // sessionStorage에 결과 저장 → workflow로 이동
      const result: GuidedResult = {
        idea,
        businessPlan,
        preset: selectedPreset,
      };
      sessionStorage.setItem(GUIDED_RESULT_KEY, JSON.stringify(result));
      router.push('/workflow?from=guided');
    } catch (err) {
      setError(err instanceof Error ? err.message : '알 수 없는 오류가 발생했습니다.');
      setGuidedStep(8); // 마지막 질문으로 돌아감
    } finally {
      setLoadingMessage('');
      stopTimer();
    }
  }

  // ── 기획서 Import ─────────────────────────────────────────
  async function handleImportPlan(content: string) {
    if (!content.trim()) {
      setError('기획서 내용이 비어있습니다.');
      return;
    }

    setGuidedStep('generating');
    setError(null);
    setLoadingMessage('기획서에서 핵심 정보를 추출하는 중...');
    setProgressCurrent(0);
    setCompletedSteps([]);
    startTimer();

    try {
      const res = await fetch('/api/generate', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          preset: selectedPreset,
          type: 'extract-idea',
          planContent: content,
        }),
      });

      if (!res.ok) {
        const errBody = await res.json().catch(() => ({}));
        console.error('[extract-idea] 서버 응답:', res.status, errBody);
        throw new Error(errBody?.error || '기획서 분석 실패');
      }
      const data = await res.json();
      const response = data.response as string;

      // JSON 파싱 (여러 패턴 시도)
      let extracted: Record<string, unknown> | null = null;
      const jsonBlockMatch = response.match(/```json\s*([\s\S]*?)\s*```/);
      if (jsonBlockMatch) {
        try { extracted = JSON.parse(jsonBlockMatch[1]); } catch { /* ignore */ }
      }
      if (!extracted) {
        const rawMatch = response.match(/\{[\s\S]*"name"[\s\S]*\}/);
        if (rawMatch) {
          try { extracted = JSON.parse(rawMatch[0]); } catch { /* ignore */ }
        }
      }
      if (!extracted) {
        try { extracted = JSON.parse(response); } catch { /* ignore */ }
      }

      const syntheticIdea: Idea = {
        id: -1,
        name: (extracted?.name as string) || '가져온 기획서',
        category: (extracted?.category as string) || '미분류',
        oneLiner: (extracted?.oneLiner as string) || '',
        target: (extracted?.target as string) || '',
        problem: (extracted?.problem as string) || '',
        features: (extracted?.features as string[]) || [],
        differentiation: (extracted?.differentiation as string) || '',
        revenueModel: (extracted?.revenueModel as string) || '',
        mvpDifficulty: (extracted?.mvpDifficulty as string) || '중',
        rationale: (extracted?.rationale as string) || '',
      };

      const syntheticPlan: BusinessPlan = {
        ideaId: -1,
        ideaName: syntheticIdea.name,
        content,
        createdAt: new Date().toISOString(),
        version: 'draft',
      };

      setProgressCurrent(1);
      setCompletedSteps(['기획서 분석 완료']);

      // sessionStorage에 결과 저장 → workflow로 이동
      const result: GuidedResult = {
        idea: syntheticIdea,
        businessPlan: syntheticPlan,
        preset: selectedPreset,
        importedPlanContent: content,
      };
      sessionStorage.setItem(GUIDED_RESULT_KEY, JSON.stringify(result));
      router.push('/workflow?from=guided');
    } catch (err) {
      setError(err instanceof Error ? err.message : '알 수 없는 오류가 발생했습니다.');
      setGuidedStep(1);
      setPageMode('import');
    } finally {
      setLoadingMessage('');
      stopTimer();
    }
  }

  async function processImportFile(file: File) {
    const ext = file.name.split('.').pop()?.toLowerCase();
    if (!['md', 'txt', 'docx'].includes(ext || '')) {
      setError('.md, .txt 또는 .docx 파일만 지원합니다.');
      return;
    }

    if (ext === 'docx') {
      try {
        const formData = new FormData();
        formData.append('file', file);
        const res = await fetch('/api/parse-docx', { method: 'POST', body: formData });
        if (!res.ok) throw new Error('DOCX 파싱 실패');
        const data = await res.json();
        handleImportPlan(data.text);
      } catch (err) {
        setError(err instanceof Error ? err.message : 'DOCX 파일 읽기 실패');
      }
      return;
    }

    const text = await file.text();
    handleImportPlan(text);
  }

  function handleFileUpload(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    if (!file) return;
    processImportFile(file);
  }

  function handleDrop(e: React.DragEvent) {
    e.preventDefault();
    setIsDragging(false);
    const file = e.dataTransfer.files?.[0];
    if (!file) return;
    processImportFile(file);
  }

  // ── 스텝 유효성 검사 ───────────────────────────────────
  function isStepValid(s: GuidedStep): boolean {
    switch (s) {
      case 1: return !!(answers.serviceOneLiner?.trim());
      case 2: return !!answers.category;
      case 3: return !!(answers.targetCustomer?.trim());
      case 4: return !!(answers.problem?.trim() && answers.problem.trim().length >= 10);
      case 5: return (answers.features || []).filter(f => f.trim()).length >= 2;
      case 6: return !!(answers.differentiation?.trim());
      case 7: return !!answers.revenueModel;
      case 8: return !!answers.mvpDifficulty;
      default: return false;
    }
  }

  function goNext() {
    if (typeof guidedStep === 'number' && guidedStep < 8) {
      setGuidedStep((guidedStep + 1) as GuidedStep);
    } else if (guidedStep === 8) {
      generatePlan();
    }
  }

  function goBack() {
    if (typeof guidedStep === 'number' && guidedStep > 1) {
      setGuidedStep((guidedStep - 1) as GuidedStep);
    }
  }

  // ── 렌더링 ────────────────────────────────────────────
  return (
    <div className="min-h-screen flex flex-col" style={{ backgroundColor: C.bg }}>
      {/* 네비게이션 */}
      <nav className="w-full px-6 py-4 flex items-center justify-between max-w-3xl mx-auto relative">
        <Link href="/start" className="text-sm font-medium flex items-center gap-1" style={{ color: C.textMid }}>
          ← 돌아가기
        </Link>
        <Link href="/" className="flex items-center gap-2 transition hover:opacity-70 absolute left-1/2 -translate-x-1/2">
          <div
            className="w-6 h-6 rounded-md flex items-center justify-center"
            style={{ background: `linear-gradient(135deg, ${C.amber}, ${C.amberLight})` }}
          >
            <svg className="w-3.5 h-3.5 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9.663 17h4.673M12 3v1m6.364 1.636l-.707.707M21 12h-1M4 12H3m3.343-5.657l-.707-.707m2.828 9.9a5 5 0 117.072 0l-.548.547A3.374 3.374 0 0014 18.469V19a2 2 0 11-4 0v-.531c0-.895-.356-1.754-.988-2.386l-.548-.547z" />
            </svg>
          </div>
          <span className="font-semibold text-sm" style={{ color: C.textDark }}>My CSO</span>
        </Link>
        {/* 프리셋 + 사용자 메뉴 */}
        <div className="flex items-center gap-3">
          <button
            onClick={() => setShowProviderPanel(!showProviderPanel)}
            className="text-xs px-3 py-1.5 rounded-lg transition"
            style={{ backgroundColor: C.cream, color: C.textDark, border: `1px solid ${C.border}` }}
          >
            {PRESET_INFO[selectedPreset].label} 모드{' '}
            <span style={{ color: C.textLight }}>▾</span>
          </button>
          <UserMenu />
        </div>
      </nav>

      {/* 프리셋 선택 패널 (접이식) */}
      {showProviderPanel && (
        <div className="max-w-3xl mx-auto w-full px-4 mb-4">
          <div className="rounded-xl p-4" style={{ backgroundColor: C.cardBg, border: `1px solid ${C.border}` }}>
            <div className="grid grid-cols-2 gap-3">
              {(Object.keys(PRESET_INFO) as QualityPreset[]).map((preset) => {
                const info = PRESET_INFO[preset];
                const isSelected = selectedPreset === preset;
                return (
                  <div
                    key={preset}
                    onClick={() => { setSelectedPreset(preset); setShowProviderPanel(false); }}
                    className="relative p-4 rounded-xl text-left transition cursor-pointer"
                    style={isSelected
                      ? { border: `2px solid ${C.accent}`, backgroundColor: C.selectedBg }
                      : { border: `2px solid ${C.border}`, backgroundColor: '#fff' }
                    }
                  >
                    <div className="font-bold text-sm mb-1" style={{ color: C.textDark }}>
                      {preset === 'standard' ? '⚡ ' : '✦ '}{info.label}
                    </div>
                    <div className="text-xs font-medium mb-0.5" style={{ color: C.accent }}>{info.description}</div>
                    <div className="text-xs" style={{ color: C.textLight }}>{info.detail}</div>
                  </div>
                );
              })}
            </div>
          </div>
        </div>
      )}

      {/* 메인 컨텐츠 */}
      <main className="flex-1 flex items-start justify-center px-4 pt-4 pb-16">
        <div className="w-full max-w-2xl">

          {/* ── 생성 중 화면 ──────────────────────────────── */}
          {guidedStep === 'generating' && (
            <div className="rounded-2xl p-8 text-center" style={{ backgroundColor: C.cardBg, border: `1px solid ${C.border}` }}>
              <div className="mb-6">
                <div className="w-16 h-16 mx-auto rounded-full flex items-center justify-center animate-pulse" style={{ backgroundColor: C.cream }}>
                  <span className="text-3xl">✍️</span>
                </div>
              </div>
              <h2 className="text-lg font-bold mb-2" style={{ color: C.textDark }}>
                사업기획서를 작성하고 있습니다
              </h2>
              <p className="text-sm mb-6" style={{ color: C.textMid }}>{loadingMessage}</p>

              {/* 프로그레스 바 */}
              <div className="w-full rounded-full h-2 mb-4" style={{ backgroundColor: C.border }}>
                <div
                  className="h-2 rounded-full transition-all duration-500"
                  style={{ width: `${(progressCurrent / 2) * 100}%`, backgroundColor: C.accent }}
                />
              </div>

              {/* 경과 시간 */}
              <p className="text-xs mb-4" style={{ color: C.textLight }}>
                경과 시간: {formatTime(elapsedSeconds)}
              </p>

              {/* 완료 단계 */}
              {completedSteps.map((s, i) => (
                <div key={i} className="flex items-center gap-2 justify-center text-sm mb-1" style={{ color: C.success }}>
                  <span>✓</span> {s}
                </div>
              ))}

              {error && (
                <div className="mt-4 p-3 rounded-lg text-sm" style={{ backgroundColor: C.error, border: `1px solid ${C.errorBorder}`, color: C.errorText }}>
                  {error}
                </div>
              )}
            </div>
          )}

          {/* ── 모드 선택 탭 (step 1에서만 표시) ───────────── */}
          {typeof guidedStep === 'number' && guidedStep === 1 && (
            <div className="flex gap-1 mb-6 p-1 rounded-xl" style={{ backgroundColor: '#F0D5C0' }}>
              <button
                onClick={() => { setPageMode('wizard'); setError(null); }}
                className="flex-1 px-4 py-2 rounded-lg text-sm font-medium transition"
                style={pageMode === 'wizard'
                  ? { backgroundColor: '#fff', color: C.textDark, boxShadow: '0 1px 3px rgba(0,0,0,0.1)' }
                  : { color: C.textMid }
                }
              >
                직접 입력
              </button>
              <button
                onClick={() => { setPageMode('import'); setError(null); }}
                className="flex-1 px-4 py-2 rounded-lg text-sm font-medium transition"
                style={pageMode === 'import'
                  ? { backgroundColor: '#fff', color: C.textDark, boxShadow: '0 1px 3px rgba(0,0,0,0.1)' }
                  : { color: C.textMid }
                }
              >
                기존 기획서 가져오기
              </button>
            </div>
          )}

          {/* ── 기획서 Import 모드 ───────────────────────────── */}
          {typeof guidedStep === 'number' && guidedStep === 1 && pageMode === 'import' && (
            <div className="rounded-2xl p-6 md:p-8 mb-6" style={{ backgroundColor: C.cardBg, border: `1px solid ${C.border}` }}>
              <h2 className="text-xl font-bold mb-2" style={{ color: C.textDark }}>
                기존 사업기획서 가져오기
              </h2>
              <p className="text-sm mb-6" style={{ color: C.textMid }}>
                기존 기획서를 가져오면 AI가 심화 분석하거나, 바로 PRD를 생성할 수 있습니다.
              </p>

              <input
                ref={fileInputRef}
                type="file"
                accept=".md,.txt,.docx"
                onChange={handleFileUpload}
                className="hidden"
              />
              <div className="flex gap-2 mb-4">
                <button
                  onClick={() => { setImportMode('file'); fileInputRef.current?.click(); }}
                  className="px-4 py-2 rounded-lg text-sm font-medium transition"
                  style={importMode === 'file'
                    ? { backgroundColor: C.selectedBg, color: C.accent, border: `1.5px solid ${C.accent}` }
                    : { border: `1.5px solid ${C.border}`, color: C.textMid }
                  }
                >
                  파일 업로드 (.md, .txt, .docx)
                </button>
                <button
                  onClick={() => setImportMode('paste')}
                  className="px-4 py-2 rounded-lg text-sm font-medium transition"
                  style={importMode === 'paste'
                    ? { backgroundColor: C.selectedBg, color: C.accent, border: `1.5px solid ${C.accent}` }
                    : { border: `1.5px solid ${C.border}`, color: C.textMid }
                  }
                >
                  텍스트 붙여넣기
                </button>
              </div>

              {importMode === 'file' && (
                <div
                  onDragOver={(e) => { e.preventDefault(); setIsDragging(true); }}
                  onDragLeave={() => setIsDragging(false)}
                  onDrop={handleDrop}
                  onClick={() => fileInputRef.current?.click()}
                  className="p-8 rounded-xl text-center cursor-pointer transition"
                  style={{
                    border: `1.5px dashed ${isDragging ? C.accent : C.border}`,
                    backgroundColor: isDragging ? C.selectedBg : '#fff',
                  }}
                >
                  <svg className="w-10 h-10 mx-auto mb-3" style={{ color: isDragging ? C.accent : C.textLight }} fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M7 16a4 4 0 01-.88-7.903A5 5 0 1115.9 6L16 6a5 5 0 011 9.9M15 13l-3-3m0 0l-3 3m3-3v12" />
                  </svg>
                  <p className="text-sm mb-1" style={{ color: isDragging ? C.accent : C.textMid }}>
                    {isDragging ? '여기에 놓으세요' : '파일을 드래그하여 놓거나 클릭하여 선택'}
                  </p>
                  <p className="text-xs" style={{ color: C.textLight }}>.md, .txt, .docx 지원</p>
                </div>
              )}

              {importMode === 'paste' && (
                <div>
                  <textarea
                    value={pasteText}
                    onChange={(e) => setPasteText(e.target.value)}
                    placeholder="사업기획서 내용을 여기에 붙여넣으세요..."
                    className="w-full px-4 py-3 rounded-xl outline-none text-sm resize-y"
                    style={{
                      border: `1.5px solid ${C.border}`,
                      minHeight: '180px',
                      color: C.textDark,
                      backgroundColor: '#fff',
                    }}
                    onFocus={e => (e.currentTarget.style.borderColor = C.accent)}
                    onBlur={e => (e.currentTarget.style.borderColor = C.border)}
                  />
                  <div className="flex justify-end mt-4">
                    <button
                      onClick={() => handleImportPlan(pasteText)}
                      disabled={!pasteText.trim() || !isPresetReady()}
                      className="px-7 py-3 rounded-xl font-semibold transition disabled:opacity-40 disabled:cursor-not-allowed"
                      style={{ background: `linear-gradient(135deg, ${C.accent}, ${C.amber})`, color: '#fff', boxShadow: `0 4px 16px rgba(194,75,37,0.3)` }}
                    >
                      기획서 분석 시작 →
                    </button>
                  </div>
                </div>
              )}

              {error && (
                <div className="mt-4 p-3 rounded-lg text-sm" style={{ backgroundColor: C.error, border: `1px solid ${C.errorBorder}`, color: C.errorText }}>
                  {error}
                </div>
              )}
            </div>
          )}

          {/* ── 질문 스텝 (1~8) ───────────────────────────── */}
          {typeof guidedStep === 'number' && pageMode === 'wizard' && (
            <>
              {/* DEV: 예시 답변 자동 입력 + 즉시 생성 */}
              {process.env.NODE_ENV === 'development' && guidedStep === 1 && (
                <button
                  onClick={() => {
                    const testAnswers: GuidedAnswers = {
                      serviceName: 'My CSO',
                      serviceOneLiner: 'AI 에이전트 팀이 시장 조사부터 전체 사업기획서까지 자동작성해주는 나만의 전략 기획팀',
                      category: 'B2B SaaS',
                      targetCustomer: '아이디어는 있지만 사업기획서 작성 경험이 없는 1인 창업자, 사내 신사업 담당자, 액셀러레이터 지원 준비 중인 초기 스타트업',
                      problem: '사업기획서를 처음부터 쓰려면 시장 조사, 경쟁 분석, 재무 모델링 등 전문 영역을 혼자 다뤄야 해서 2~3주 이상 소요된다. 외주를 맡기면 300만 원 이상 비용이 들고, 빠르게 검증하고 싶은 초기 단계에서 이 비용과 시간은 큰 진입장벽이다.',
                      features: [
                        '키워드 입력만으로 4채널(Tavily·Reddit·Trends·ProductHunt) 시장 신호 자동 수집',
                        '4개 전문 에이전트(시장·경쟁·전략·재무)가 순차 협업하여 13섹션 사업기획서 자동 생성',
                        '사업기획서 기반 PRD 자동 변환 및 .md/.docx 즉시 다운로드',
                      ],
                      differentiation: 'ChatGPT 대화형은 단일 LLM이 모든 섹션을 한 번에 쓰기때문에 깊이가 얕다. My CSO는 역할별 에이전트 4명이 이전 에이전트의 결과를 컨텍스트로 받아 순차 작성하므로 시장 데이터 기반의 일관성 있는 기획서가 나온다. 또한 실시간 웹 검색 결과를 프롬프트에 주입해 할루시네이션을 줄인다.',
                      revenueModel: '월 구독 (SaaS)',
                      mvpDifficulty: '보통',
                    };
                    setAnswers(testAnswers);
                    generatePlan(testAnswers);
                  }}
                  className="w-full mb-4 px-4 py-2 rounded-xl text-xs font-medium transition opacity-60 hover:opacity-100"
                  style={{ backgroundColor: '#fde68a', color: '#92400e', border: '1px dashed #d97706' }}
                >
                  🧪 DEV: 예시 답변으로 즉시 생성 (My CSO)
                </button>
              )}
              {process.env.NODE_ENV === 'development' && guidedStep === 1 && (
                <button
                  onClick={() => {
                    const testAnswers2: GuidedAnswers = {
                      serviceName: 'AI 입시 컨설턴트',
                      serviceOneLiner: 'AI 에이전트가 고등학생의 정보(가고자 하는 대학, 학과, 세부능력 및 특기사항, 행동특성 및 종합의견, 성적)를 기반으로 대학가기 일정, 전략, 해야할 일 등을 작성해주는 관리 도우미',
                      category: '웹 SaaS',
                      targetCustomer: '원하는 대학(학과)을 가고자 하는 고등학생, 고등학생 자녀를 둔 학부모, 고등학교 입시 담당 교사',
                      problem: '대학입시를 준비하는 학생들이 고등학교 입학하고 나서, 원하는 대학(학과)에 입학하기 위해서, 대학교 입시 요강을 분석해야 하며, 그 요강에 맞춰서 학생은 세부능력 및 특기사항, 행동특성 및 종합의견서에 담길 항목을 어떻게 만들어야 할지, 어떻게 학교 생활을 해야 할지에 대해서 모르는 경우가 대부분이다. 이에, 고등학교 입학부터 학생이 스스로 대학교(학과)를 선택하면, 그 대학교(학과)의 입시 요강과 합격 성적 수준을 분석해서, 학생이 목표로하는 대학교(학과)에 입학이 가능하도록 세부능력 및 특기사항, 행동특성 및 종합의견서 작성에 도움을 주고, 성적을 어떻게 올려야 하는지, 그리고 고교학점제에서 어떤 과목을 수강해야 하는지 코칭해주는 서비스가 없는 것이 문제이다.',
                      features: [
                        '입력된 대학교(학과) 입시 요강 분석(3년치), 합격자 세부능력 및 특기사항, 행동특성 및 종합의견서, 수능 성적, 경쟁률 분석, 분석된 결과',
                        '분석된 결과를 기반으로 고등학교 고교학점제 과목선정, 세부능력 및 특기사항, 행동특성 및 종합의견서에 담길 활동 사항 나열, 목표 수능 점수 안내 등 컨설팅',
                        '학생 컨설팅 분석서를 기반으로 학생의 3년 간의 스케줄, 해야할 일에 대한 체크리스트, 각 항목별 실행 여부에 따른 대학 합격률 예측 서비스',
                      ],
                      differentiation: '기존의 대학입시 관련 컨설팅은 일회성 그리고 오프라인 컨설팅이 대부분이다. 그리고 그 결과를 기반으로 학부모, 학생이 스스로 찾고, 정보를 취득해서 컨설팅 결과에 맞춰가는데 많은 시간과 노력, 스스로의 관리가 필요하다보니, 의도한바 대로 컨설팅 결과에 100% 적합하게 진행하는데 한계점이 뚜렷히 보인다. 이에, 대학입시 전략 서비스를 통해 입시 컨설팅, 컨설팅 결과 수행 도우미, 컨설팅 결과 유무를 통한 합격률 예측, 그리고 진로/진학 변경으로 기존 목표로 한 대학교(학과)에서 최소한의 입시 전략 수정으로 합격률 변화 최소화 등의 서비스의 차별성을 만들 수 있습니다.',
                      revenueModel: '월 구독 (SaaS)',
                      mvpDifficulty: '어려움',
                    };
                    setAnswers(testAnswers2);
                    generatePlan(testAnswers2);
                  }}
                  className="w-full mb-4 px-4 py-2 rounded-xl text-xs font-medium transition opacity-60 hover:opacity-100"
                  style={{ backgroundColor: '#bfdbfe', color: '#1e3a5f', border: '1px dashed #3b82f6' }}
                >
                  🧪 DEV: 예시 답변으로 즉시 생성 (AI 입시 컨설턴트)
                </button>
              )}

              {/* 프로그레스 인디케이터 */}
              <div className="mb-6">
                <div className="flex items-center justify-between mb-2">
                  <span className="text-xs font-medium" style={{ color: C.textMid }}>
                    질문 {guidedStep} / 8
                  </span>
                  <span className="text-xs" style={{ color: C.textLight }}>
                    {Math.round((guidedStep / 8) * 100)}%
                  </span>
                </div>
                <div className="w-full rounded-full h-1.5" style={{ backgroundColor: C.border }}>
                  <div
                    className="h-1.5 rounded-full transition-all duration-300"
                    style={{ width: `${(guidedStep / 8) * 100}%`, backgroundColor: C.accent }}
                  />
                </div>
              </div>

              {/* 질문 카드 */}
              <div className="rounded-2xl p-6 md:p-8 mb-6" style={{ backgroundColor: C.cardBg, border: `1px solid ${C.border}` }}>

                {/* Step 1: 서비스명 + 한 줄 설명 */}
                {guidedStep === 1 && (
                  <div>
                    <h2 className="text-xl font-bold mb-2" style={{ color: C.textDark }}>
                      어떤 서비스를 만들고 싶으신가요?
                    </h2>
                    <p className="text-sm mb-6" style={{ color: C.textMid }}>
                      서비스 이름과 한 줄로 설명해주세요.
                    </p>
                    <label className="block text-xs font-medium mb-1.5" style={{ color: C.textLight }}>서비스명 <span style={{ color: C.textLight, fontWeight: 400 }}>(선택 — 비워두면 자동 생성)</span></label>
                    <input
                      type="text"
                      value={answers.serviceName || ''}
                      onChange={(e) => setAnswers(prev => ({ ...prev, serviceName: e.target.value }))}
                      placeholder="예: My CSO"
                      className="w-full px-4 py-3 rounded-xl outline-none mb-4 transition"
                      style={{ border: `1.5px solid ${C.border}`, backgroundColor: '#fff', color: C.textDark }}
                      autoFocus
                    />
                    <label className="block text-xs font-medium mb-1.5" style={{ color: C.textLight }}>한 줄 설명</label>
                    <input
                      type="text"
                      value={answers.serviceOneLiner || ''}
                      onChange={(e) => setAnswers(prev => ({ ...prev, serviceOneLiner: e.target.value }))}
                      onKeyDown={(e) => { if (e.key === 'Enter' && isStepValid(1)) goNext(); }}
                      placeholder="예: AI 에이전트 팀이 시장 조사부터 13섹션 사업기획서까지 자동 작성해주는 SaaS 기획 도우미"
                      className="w-full px-4 py-3 rounded-xl outline-none transition"
                      style={{ border: `1.5px solid ${C.border}`, backgroundColor: '#fff', color: C.textDark }}
                    />
                  </div>
                )}

                {/* Step 2: 카테고리 */}
                {guidedStep === 2 && (
                  <div>
                    <h2 className="text-xl font-bold mb-2" style={{ color: C.textDark }}>
                      카테고리는 무엇인가요?
                    </h2>
                    <p className="text-sm mb-6" style={{ color: C.textMid }}>
                      서비스 유형에 가장 가까운 것을 선택해주세요.
                    </p>
                    <div className="flex flex-wrap gap-2">
                      {CATEGORY_OPTIONS.map((cat) => (
                        <button
                          key={cat}
                          onClick={() => setAnswers(prev => ({ ...prev, category: cat }))}
                          className="px-4 py-2.5 rounded-xl text-sm font-medium transition"
                          style={answers.category === cat
                            ? { backgroundColor: C.accent, color: '#fff', border: `1.5px solid ${C.accent}` }
                            : { backgroundColor: '#fff', color: C.textDark, border: `1.5px solid ${C.border}` }
                          }
                        >
                          {cat}
                        </button>
                      ))}
                    </div>
                    {answers.category === '기타' && (
                      <input
                        type="text"
                        value={answers.category === '기타' ? '' : answers.category || ''}
                        onChange={(e) => setAnswers(prev => ({ ...prev, category: e.target.value || '기타' }))}
                        placeholder="직접 입력"
                        className="mt-3 w-full px-4 py-3 rounded-xl outline-none transition"
                        style={{ border: `1.5px solid ${C.border}`, backgroundColor: '#fff', color: C.textDark }}
                        autoFocus
                      />
                    )}
                  </div>
                )}

                {/* Step 3: 타겟 고객 */}
                {guidedStep === 3 && (
                  <div>
                    <h2 className="text-xl font-bold mb-2" style={{ color: C.textDark }}>
                      주요 타겟 고객은 누구인가요?
                    </h2>
                    <p className="text-sm mb-6" style={{ color: C.textMid }}>
                      이 서비스를 가장 먼저 쓸 사람을 구체적으로 설명해주세요.
                    </p>
                    <input
                      type="text"
                      value={answers.targetCustomer || ''}
                      onChange={(e) => setAnswers(prev => ({ ...prev, targetCustomer: e.target.value }))}
                      onKeyDown={(e) => { if (e.key === 'Enter' && isStepValid(3)) goNext(); }}
                      placeholder="예: 아이디어는 있지만 사업기획서 작성 경험이 없는 1인 창업자, 사내 신사업 담당자, 액셀러레이터 지원 준비 중인 초기 스타트업"
                      className="w-full px-4 py-3 rounded-xl outline-none transition"
                      style={{ border: `1.5px solid ${C.border}`, backgroundColor: '#fff', color: C.textDark }}
                      autoFocus
                    />
                  </div>
                )}

                {/* Step 4: 문제 */}
                {guidedStep === 4 && (
                  <div>
                    <h2 className="text-xl font-bold mb-2" style={{ color: C.textDark }}>
                      어떤 문제를 해결하나요?
                    </h2>
                    <p className="text-sm mb-6" style={{ color: C.textMid }}>
                      타겟 고객이 현재 겪고 있는 구체적인 불편함이나 페인 포인트를 적어주세요.
                    </p>
                    <textarea
                      value={answers.problem || ''}
                      onChange={(e) => setAnswers(prev => ({ ...prev, problem: e.target.value }))}
                      placeholder="예: 사업기획서를 처음부터 쓰려면 시장 조사, 경쟁 분석, 재무 모델링 등 전문 영역을 혼자 다뤄야 해서 2~3주 이상 소요된다. 외주를 맡기면 300만 원 이상 비용이 들고, 빠르게 검증하고 싶은 초기 단계에서 이 비용과 시간은 큰 진입장벽이다."
                      rows={4}
                      className="w-full px-4 py-3 rounded-xl outline-none resize-none transition"
                      style={{ border: `1.5px solid ${C.border}`, backgroundColor: '#fff', color: C.textDark }}
                      autoFocus
                    />
                  </div>
                )}

                {/* Step 5: 핵심 기능 */}
                {guidedStep === 5 && (
                  <div>
                    <h2 className="text-xl font-bold mb-2" style={{ color: C.textDark }}>
                      핵심 기능은 무엇인가요?
                    </h2>
                    <p className="text-sm mb-6" style={{ color: C.textMid }}>
                      가장 중요한 기능 2~3개를 적어주세요.
                    </p>
                    {[0, 1, 2].map((idx) => (
                      <div key={idx} className="mb-3">
                        <label className="block text-xs font-medium mb-1" style={{ color: C.textLight }}>
                          기능 {idx + 1}{idx < 2 ? ' (필수)' : ' (선택)'}
                        </label>
                        <input
                          type="text"
                          value={(answers.features || ['', '', ''])[idx] || ''}
                          onChange={(e) => {
                            const newFeatures = [...(answers.features || ['', '', ''])];
                            newFeatures[idx] = e.target.value;
                            setAnswers(prev => ({ ...prev, features: newFeatures }));
                          }}
                          onKeyDown={(e) => {
                            if (e.key === 'Enter' && idx === 2 && isStepValid(5)) goNext();
                          }}
                          placeholder={
                            idx === 0 ? '예: 키워드 입력만으로 4채널(Tavily·Reddit·Trends·ProductHunt) 시장 신호 자동 수집'
                            : idx === 1 ? '예: 4개 전문 에이전트(시장·경쟁·전략·재무)가 순차 협업하여 13섹션 사업기획서 자동 생성'
                            : '예: 사업기획서 기반 PRD 자동 변환 및 .md/.docx 즉시 다운로드 (선택)'
                          }
                          className="w-full px-4 py-3 rounded-xl outline-none transition"
                          style={{ border: `1.5px solid ${C.border}`, backgroundColor: '#fff', color: C.textDark }}
                          autoFocus={idx === 0}
                        />
                      </div>
                    ))}
                  </div>
                )}

                {/* Step 6: 차별점 */}
                {guidedStep === 6 && (
                  <div>
                    <h2 className="text-xl font-bold mb-2" style={{ color: C.textDark }}>
                      기존 솔루션 대비 차별점은?
                    </h2>
                    <p className="text-sm mb-6" style={{ color: C.textMid }}>
                      경쟁 서비스와 비교해 어떤 점이 다른지 설명해주세요.
                    </p>
                    <textarea
                      value={answers.differentiation || ''}
                      onChange={(e) => setAnswers(prev => ({ ...prev, differentiation: e.target.value }))}
                      placeholder="예: 기존 ChatGPT 대화형은 단일 LLM이 모든 섹션을 한 번에 쓰기 때문에 깊이가 얕다. My CSO는 역할별 에이전트 4명이 이전 에이전트의 결과를 컨텍스트로 받아 순차 작성하므로 시장 데이터 기반의 일관성 있는 기획서가 나온다."
                      rows={3}
                      className="w-full px-4 py-3 rounded-xl outline-none resize-none transition"
                      style={{ border: `1.5px solid ${C.border}`, backgroundColor: '#fff', color: C.textDark }}
                      autoFocus
                    />
                  </div>
                )}

                {/* Step 7: 수익 모델 */}
                {guidedStep === 7 && (
                  <div>
                    <h2 className="text-xl font-bold mb-2" style={{ color: C.textDark }}>
                      수익 모델은 무엇인가요?
                    </h2>
                    <p className="text-sm mb-6" style={{ color: C.textMid }}>
                      주요 수익원을 선택해주세요.
                    </p>
                    <div className="flex flex-wrap gap-2">
                      {REVENUE_OPTIONS.map((rev) => (
                        <button
                          key={rev}
                          onClick={() => setAnswers(prev => ({ ...prev, revenueModel: rev }))}
                          className="px-4 py-2.5 rounded-xl text-sm font-medium transition"
                          style={answers.revenueModel === rev
                            ? { backgroundColor: C.accent, color: '#fff', border: `1.5px solid ${C.accent}` }
                            : { backgroundColor: '#fff', color: C.textDark, border: `1.5px solid ${C.border}` }
                          }
                        >
                          {rev}
                        </button>
                      ))}
                    </div>
                  </div>
                )}

                {/* Step 8: MVP 난이도 */}
                {guidedStep === 8 && (
                  <div>
                    <h2 className="text-xl font-bold mb-2" style={{ color: C.textDark }}>
                      MVP 개발 난이도는 어떻게 예상하시나요?
                    </h2>
                    <p className="text-sm mb-6" style={{ color: C.textMid }}>
                      초기 버전(MVP) 구현의 기술적 복잡도를 선택해주세요.
                    </p>
                    <div className="space-y-3">
                      {DIFFICULTY_OPTIONS.map((opt) => (
                        <button
                          key={opt.value}
                          onClick={() => setAnswers(prev => ({ ...prev, mvpDifficulty: opt.value }))}
                          className="w-full text-left p-4 rounded-xl transition"
                          style={answers.mvpDifficulty === opt.value
                            ? { backgroundColor: C.selectedBg, border: `2px solid ${C.accent}` }
                            : { backgroundColor: '#fff', border: `2px solid ${C.border}` }
                          }
                        >
                          <div className="font-semibold text-sm" style={{ color: C.textDark }}>{opt.label}</div>
                          <div className="text-xs mt-0.5" style={{ color: C.textMid }}>{opt.desc}</div>
                        </button>
                      ))}
                    </div>

                    {error && (
                      <div className="mt-4 p-3 rounded-lg text-sm" style={{ backgroundColor: C.error, border: `1px solid ${C.errorBorder}`, color: C.errorText }}>
                        {error}
                      </div>
                    )}
                  </div>
                )}
              </div>

              {/* 하단 네비게이션 */}
              <div className="flex items-center justify-between">
                {guidedStep > 1 ? (
                  <button
                    onClick={goBack}
                    className="px-5 py-2.5 rounded-xl text-sm font-medium transition"
                    style={{ color: C.textMid, border: `1.5px solid ${C.border}`, backgroundColor: '#fff' }}
                  >
                    ← 이전
                  </button>
                ) : (
                  <Link
                    href="/start"
                    className="px-5 py-2.5 rounded-xl text-sm font-medium transition"
                    style={{ color: C.textMid, border: `1.5px solid ${C.border}`, backgroundColor: '#fff' }}
                  >
                    ← 돌아가기
                  </Link>
                )}

                <button
                  onClick={goNext}
                  disabled={!isStepValid(guidedStep) || !isPresetReady()}
                  className="px-6 py-2.5 rounded-xl text-sm font-semibold transition disabled:opacity-40 disabled:cursor-not-allowed"
                  style={{ backgroundColor: C.accent, color: '#fff' }}
                >
                  {guidedStep === 8 ? '사업기획서 생성 →' : '다음 →'}
                </button>
              </div>
            </>
          )}

        </div>
      </main>
    </div>
  );
}
