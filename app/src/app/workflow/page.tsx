'use client';

import { useState, useEffect, useRef } from 'react';

// 단계별 기본 예상 소요 시간 (ms) — localStorage에 실측값이 쌓이면 자동으로 갱신됨
const DEFAULT_STEP_MS = {
  ideaSearch: 7000,   // Tavily 병렬 2회
  ideaLLM: 20000,     // Claude Sonnet 아이디어 생성
  planSearch: 9000,   // Tavily 병렬 3회
  planLLM: 75000,     // Claude Sonnet 사업기획서
};
const TIMING_KEY = 'saas-generator-step-timings';

function getStoredTimings(): typeof DEFAULT_STEP_MS {
  if (typeof window === 'undefined') return { ...DEFAULT_STEP_MS };
  try {
    const raw = localStorage.getItem(TIMING_KEY);
    if (raw) return { ...DEFAULT_STEP_MS, ...JSON.parse(raw) };
  } catch {}
  return { ...DEFAULT_STEP_MS };
}

function updateStoredTiming(key: keyof typeof DEFAULT_STEP_MS, durationMs: number) {
  try {
    const current = getStoredTimings();
    // 가중 이동평균: 과거 70% + 실측 30%
    current[key] = Math.round(current[key] * 0.7 + durationMs * 0.3);
    localStorage.setItem(TIMING_KEY, JSON.stringify(current));
  } catch {}
}

function formatTime(seconds: number): string {
  const m = Math.floor(seconds / 60);
  const s = seconds % 60;
  return m > 0 ? `${m}분 ${s.toString().padStart(2, '0')}초` : `${s}초`;
}
import Link from 'next/link';
import ReactMarkdown from 'react-markdown';
import remarkGfm from 'remark-gfm';
import { Document, Packer, Paragraph, TextRun, Table, TableRow, TableCell, WidthType, BorderStyle, ShadingType } from 'docx';
import { Idea, BusinessPlan, PRD, WorkflowStep, AIProvider, PROVIDER_CONFIGS } from '@/lib/types';
import { SearchResult } from '@/lib/prompts';

export default function WorkflowPage() {
  const [step, setStep] = useState<WorkflowStep>('keyword');
  const [keyword, setKeyword] = useState('');
  const [ideas, setIdeas] = useState<Idea[]>([]);
  const [selectedIdeas, setSelectedIdeas] = useState<number[]>([]);
  const [businessPlans, setBusinessPlans] = useState<BusinessPlan[]>([]);
  const [currentPlanIndex, setCurrentPlanIndex] = useState(0);
  const [fullBusinessPlans, setFullBusinessPlans] = useState<BusinessPlan[]>([]);
  const [currentFullPlanIndex, setCurrentFullPlanIndex] = useState(0);
  const [prds, setPRDs] = useState<PRD[]>([]);
  const [currentPRDIndex, setCurrentPRDIndex] = useState(0);
  const [prdFormat, setPrdFormat] = useState<'markdown' | 'plain'>('markdown');
  const [prdCopied, setPrdCopied] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [selectedProvider, setSelectedProvider] = useState<AIProvider>('ollama');
  const [availableProviders, setAvailableProviders] = useState<Record<AIProvider, boolean | null>>({
    ollama: null,
    claude: null,
    gemini: null,
    openai: null,
  });
  const [selectedModels, setSelectedModels] = useState<Record<AIProvider, string>>({
    ollama: PROVIDER_CONFIGS.ollama.defaultModel,
    claude: PROVIDER_CONFIGS.claude.defaultModel,
    gemini: PROVIDER_CONFIGS.gemini.defaultModel,
    openai: PROVIDER_CONFIGS.openai.defaultModel,
  });
  const [rawResponse, setRawResponse] = useState('');
  const [searchResults, setSearchResults] = useState<SearchResult[]>([]);
  const [loadingMessage, setLoadingMessage] = useState('');
  const [progressCurrent, setProgressCurrent] = useState(0);
  const [progressTotal, setProgressTotal] = useState(2);
  const [completedSteps, setCompletedSteps] = useState<string[]>([]);
  const [elapsedSeconds, setElapsedSeconds] = useState(0);
  const [etaSeconds, setEtaSeconds] = useState<number | null>(null);
  const processStartRef = useRef<number | null>(null);
  const expectedEndRef = useRef<number | null>(null);
  const timerRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const [dirHandle, setDirHandle] = useState<FileSystemDirectoryHandle | null>(null);
  const [dirName, setDirName] = useState('다운로드');
  const [showSaveDialog, setShowSaveDialog] = useState(false);
  const [pendingPlan, setPendingPlan] = useState<BusinessPlan | null>(null);
  const [pendingPlanType, setPendingPlanType] = useState<'bizplan' | 'prd'>('bizplan');
  const [pendingFileFormat, setPendingFileFormat] = useState<'docx' | 'md'>('docx');
  // 실측 생성 시간 (아이디어 생성 / 사업기획서 생성 완료 후 표시)
  const [lastGenTime, setLastGenTime] = useState<{ seconds: number; label: string } | null>(null);
  // 기획서 Import 관련 상태
  const [importedPlanContent, setImportedPlanContent] = useState<string | null>(null);
  const [importMode, setImportMode] = useState<'file' | 'paste' | null>(null);
  const [pasteText, setPasteText] = useState('');
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [isDragging, setIsDragging] = useState(false);

  useEffect(() => {
    checkProviders();
    return () => { if (timerRef.current) clearInterval(timerRef.current); };
  }, []);

  function startTimer(initialEtaMs: number) {
    const now = Date.now();
    processStartRef.current = now;
    expectedEndRef.current = now + initialEtaMs;
    setElapsedSeconds(0);
    setEtaSeconds(Math.ceil(initialEtaMs / 1000));
    if (timerRef.current) clearInterval(timerRef.current);
    timerRef.current = setInterval(() => {
      const t = Date.now();
      setElapsedSeconds(Math.floor((t - (processStartRef.current ?? t)) / 1000));
      const remaining = (expectedEndRef.current ?? t) - t;
      setEtaSeconds(remaining > 0 ? Math.ceil(remaining / 1000) : 0);
    }, 1000);
  }

  function stopTimer() {
    if (timerRef.current) { clearInterval(timerRef.current); timerRef.current = null; }
  }

  function updateEta(remainingMs: number) {
    expectedEndRef.current = Date.now() + remainingMs;
    setEtaSeconds(Math.ceil(remainingMs / 1000));
  }

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

  function isProviderReady(): boolean {
    return availableProviders[selectedProvider] === true;
  }

  async function searchMultiple(queries: string[], countEach: number = 4, depth: 'basic' | 'advanced' = 'basic'): Promise<SearchResult[]> {
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
        } catch {
          return [];
        }
      })
    );
    const seen = new Set<string>();
    return allResults.flat().filter((r) => {
      if (seen.has(r.url)) return false;
      seen.add(r.url);
      return true;
    });
  }

  async function searchReddit(kw: string): Promise<SearchResult[]> {
    try {
      const res = await fetch('/api/reddit', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ keyword: kw || 'SaaS startup' }),
      });
      if (!res.ok) return [];
      return ((await res.json()).results || []) as SearchResult[];
    } catch {
      return [];
    }
  }

  async function searchTrends(kw: string): Promise<SearchResult[]> {
    try {
      const res = await fetch('/api/trends', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ keyword: kw || 'SaaS' }),
      });
      if (!res.ok) return [];
      return ((await res.json()).results || []) as SearchResult[];
    } catch {
      return [];
    }
  }

  async function searchProductHunt(kw: string): Promise<SearchResult[]> {
    try {
      const res = await fetch('/api/producthunt', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ keyword: kw || '' }),
      });
      if (!res.ok) return [];
      return ((await res.json()).results || []) as SearchResult[];
    } catch {
      return [];
    }
  }

  async function generateIdeas() {
    setIsLoading(true);
    setError(null);
    setStep('generating-ideas');
    setSearchResults([]);
    setProgressCurrent(0);
    setProgressTotal(2);
    setCompletedSteps([]);

    const timings = getStoredTimings();
    startTimer(timings.ideaSearch + timings.ideaLLM);

    try {
      // Step 1: 시장 조사(Tavily) + Reddit + Google Trends + Product Hunt 병렬 수집
      let searchData: SearchResult[] = [];
      let redditData: SearchResult[] = [];
      let trendsData: SearchResult[] = [];
      let productHuntData: SearchResult[] = [];
      setLoadingMessage('시장 조사 + Reddit + Google Trends + Product Hunt 수집 중...');
      const searchStart = Date.now();
      try {
        const base = keyword || 'SaaS AI 에이전트';
        [searchData, redditData, trendsData, productHuntData] = await Promise.all([
          searchMultiple([
            `${base} SaaS 시장 규모 성장률 트렌드 2025`,
            `${base} B2B B2C 솔루션 스타트업 투자 기회`,
            `${base} AI 자동화 에이전트 적용 사례 2025`,
          ]),
          searchReddit(keyword || 'SaaS startup'),
          searchTrends(keyword || 'SaaS'),
          searchProductHunt(keyword || ''),
        ]);
        setSearchResults(searchData);
      } catch (searchErr) {
        console.log('Search failed, continuing without search results:', searchErr);
      }
      updateStoredTiming('ideaSearch', Date.now() - searchStart);
      setProgressCurrent(1);
      setCompletedSteps([
        `시장 자료 ${searchData.length}건 + Reddit ${redditData.length}건 + 급등 트렌드 ${trendsData.length}건 + Product Hunt ${productHuntData.length}건 수집 완료`,
      ]);
      updateEta(timings.ideaLLM);

      // Step 2: Generate ideas with search context
      // 프롬프트 구성은 서버(api/generate)에서 app/src/assets/criteria.md를 읽어 처리
      setLoadingMessage('AI가 아이디어 3개를 생성하는 중...');
      const llmStart = Date.now();

      const res = await fetch('/api/generate', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          provider: selectedProvider,
          model: selectedModels[selectedProvider],
          type: 'generate-ideas',
          keyword: keyword || undefined,
          searchResults: searchData,
          redditResults: redditData,
          trendsResults: trendsData,
          productHuntResults: productHuntData,
        }),
      });

      if (!res.ok) {
        throw new Error('Failed to generate ideas');
      }

      const data = await res.json();
      setRawResponse(data.response);

      // Parse JSON from response
      let parsed = null;
      const response = data.response;

      // Try 1: Extract from ```json ... ``` block
      const jsonBlockMatch = response.match(/```json\s*([\s\S]*?)\s*```/);
      if (jsonBlockMatch) {
        try {
          parsed = JSON.parse(jsonBlockMatch[1]);
        } catch (e) {
          console.log('JSON block parse failed:', e);
        }
      }

      // Try 2: Extract from ``` ... ``` block
      if (!parsed) {
        const codeBlockMatch = response.match(/```\s*([\s\S]*?)\s*```/);
        if (codeBlockMatch) {
          try {
            parsed = JSON.parse(codeBlockMatch[1]);
          } catch (e) {
            console.log('Code block parse failed:', e);
          }
        }
      }

      // Try 3: Find raw JSON object with "ideas"
      if (!parsed) {
        const rawJsonMatch = response.match(/\{\s*"ideas"\s*:\s*\[[\s\S]*\]\s*\}/);
        if (rawJsonMatch) {
          try {
            parsed = JSON.parse(rawJsonMatch[0]);
          } catch (e) {
            console.log('Raw JSON parse failed:', e);
          }
        }
      }

      // Try 4: Direct JSON parse (for Ollama json mode)
      if (!parsed) {
        try {
          const directParsed = JSON.parse(response);
          if (directParsed.ideas && Array.isArray(directParsed.ideas)) {
            parsed = directParsed;
          } else if (Array.isArray(directParsed)) {
            parsed = { ideas: directParsed };
          }
        } catch (e) {
          console.log('Direct JSON parse failed:', e);
        }
      }

      // Try 5: Find any JSON array in the response
      if (!parsed) {
        const arrayMatch = response.match(/\[[\s\S]*\]/);
        if (arrayMatch) {
          try {
            const arr = JSON.parse(arrayMatch[0]);
            if (Array.isArray(arr) && arr.length > 0) {
              parsed = { ideas: arr };
            }
          } catch (e) {
            console.log('Array JSON parse failed:', e);
          }
        }
      }

      if (parsed && parsed.ideas && Array.isArray(parsed.ideas)) {
        // Ensure all required fields exist
        const validIdeas = parsed.ideas.map((idea: Partial<Idea>, idx: number) => ({
          id: idea.id || idx + 1,
          name: idea.name || `아이디어 ${idx + 1}`,
          category: idea.category || 'B2C',
          oneLiner: idea.oneLiner || '-',
          target: idea.target || '-',
          problem: idea.problem || '-',
          features: Array.isArray(idea.features) ? idea.features : [],
          differentiation: idea.differentiation || '-',
          revenueModel: idea.revenueModel || '-',
          mvpDifficulty: idea.mvpDifficulty || '-',
          rationale: idea.rationale || '-',
        }));
        setIdeas(validIdeas);
      } else {
        // Fallback: create placeholder ideas if parsing fails
        setIdeas([
          {
            id: 1,
            name: '아이디어 파싱 실패',
            category: '-',
            oneLiner: 'JSON 형식을 파싱할 수 없습니다. 아래 원본 응답을 확인하세요.',
            target: '-',
            problem: '-',
            features: [],
            differentiation: '-',
            revenueModel: '-',
            mvpDifficulty: '-',
            rationale: '원본 응답 확인 필요',
          },
        ]);
      }

      updateStoredTiming('ideaLLM', Date.now() - llmStart);
      setProgressCurrent(2);
      if (processStartRef.current) {
        const secs = Math.round((Date.now() - processStartRef.current) / 1000);
        const modelLabel = PROVIDER_CONFIGS[selectedProvider].models.find(m => m.id === selectedModels[selectedProvider])?.label ?? selectedModels[selectedProvider];
        setLastGenTime({ seconds: secs, label: `${PROVIDER_CONFIGS[selectedProvider].label} ${modelLabel}` });
      }
      setStep('select-ideas');
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Unknown error');
      setStep('keyword');
    } finally {
      setIsLoading(false);
      setLoadingMessage('');
      stopTimer();
    }
  }

  async function generateBusinessPlan() {
    if (selectedIdeas.length === 0) return;

    setIsLoading(true);
    setError(null);
    setStep('generating-plan');
    setBusinessPlans([]);
    setProgressCurrent(0);
    setProgressTotal(selectedIdeas.length * 2);
    setCompletedSteps([]);

    const timings = getStoredTimings();
    startTimer(selectedIdeas.length * (timings.planSearch + timings.planLLM));

    try {
      const plans: BusinessPlan[] = [];
      let completedIdeas = 0;

      for (const ideaId of selectedIdeas) {
        const idea = ideas.find((i) => i.id === ideaId);
        if (!idea) continue;

        const remainingIdeas = selectedIdeas.length - completedIdeas;

        // Step 1: Search for relevant market data (parallel multi-query)
        setLoadingMessage(`"${idea.name}" 관련 시장 조사 중...`);
        const planSearchStart = Date.now();
        let planSearchResults: SearchResult[] = [];
        try {
          planSearchResults = await searchMultiple([
            `${idea.name} 경쟁사 대안 솔루션 비교`,
            `${idea.target} 고객 페인포인트 문제점 수요`,
            `${idea.category || 'SaaS'} 시장 규모 TAM SAM SOM 투자 트렌드 2025`,
            `${idea.name} SaaS 가격 책정 수익 모델 사례`,
            `${idea.name} 규제 법률 리스크 진입 장벽`,
          ], 3, 'advanced');
        } catch (searchErr) {
          console.log('Search failed for business plan:', searchErr);
        }
        updateStoredTiming('planSearch', Date.now() - planSearchStart);
        setProgressCurrent(prev => prev + 1);
        setCompletedSteps(prev => [...prev, `"${idea.name}" 시장 자료 ${planSearchResults.length}건 수집 완료`]);
        updateEta(timings.planLLM + (remainingIdeas - 1) * (timings.planSearch + timings.planLLM));

        // Step 2: Generate business plan with search context
        // 프롬프트 구성은 서버(api/generate)에서 docs/bizplan-template.md를 읽어 처리
        setLoadingMessage(`"${idea.name}" 사업기획서 작성 중...`);
        const planLLMStart = Date.now();

        const res = await fetch('/api/generate', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            provider: selectedProvider,
            model: selectedModels[selectedProvider],
            type: 'business-plan',
            idea,
            searchResults: planSearchResults,
          }),
        });

        if (!res.ok) {
          throw new Error(`Failed to generate plan for ${idea.name}`);
        }

        const data = await res.json();

        updateStoredTiming('planLLM', Date.now() - planLLMStart);
        plans.push({
          ideaId: idea.id,
          ideaName: idea.name,
          content: data.response,
          createdAt: new Date().toISOString(),
        });
        completedIdeas += 1;
        setProgressCurrent(prev => prev + 1);
        setCompletedSteps(prev => [...prev, `"${idea.name}" 사업기획서 작성 완료`]);
        updateEta((selectedIdeas.length - completedIdeas) * (timings.planSearch + timings.planLLM));
      }

      setBusinessPlans(plans);
      setCurrentPlanIndex(0);
      if (processStartRef.current) {
        const secs = Math.round((Date.now() - processStartRef.current) / 1000);
        const modelLabel = PROVIDER_CONFIGS[selectedProvider].models.find(m => m.id === selectedModels[selectedProvider])?.label ?? selectedModels[selectedProvider];
        setLastGenTime({ seconds: secs, label: `${PROVIDER_CONFIGS[selectedProvider].label} ${modelLabel}` });
      }
      setStep('view-plan');
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Unknown error');
      setStep('select-ideas');
    } finally {
      setIsLoading(false);
      setLoadingMessage('');
      stopTimer();
    }
  }

  function toggleIdeaSelection(id: number) {
    setSelectedIdeas((prev) =>
      prev.includes(id) ? prev.filter((i) => i !== id) : [...prev, id]
    );
  }

  function parseInlineText(text: string): TextRun[] {
    const F = { name: 'Calibri', eastAsia: '맑은 고딕', cs: '맑은 고딕' } as const;
    return text.split(/(\*\*[^*]+\*\*)/).map((part) => {
      if (part.startsWith('**') && part.endsWith('**')) {
        return new TextRun({ text: part.slice(2, -2), bold: true, font: F });
      }
      return new TextRun({ text: part, font: F });
    });
  }

  async function buildDocxBlob(plan: BusinessPlan): Promise<Blob> {
    // ── 캐니언 컬러 팔레트 (웹 UI와 동일) ─────────────────────────
    const DC = {
      textDark:  '3D1008',  // 다크 브라운
      accent:    'C24B25',  // 테라코타
      amber:     'F5901E',  // 앰버
      cream:     'FDE8D0',  // 크림
      border:    'F0D5C0',  // 연크림 보더
      textMid:   '8B5A40',  // 미드 브라운
      textLight: 'B08060',  // 라이트 브라운
      white:     'FFFFFF',
    };

    const lines = plan.content.split('\n');
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const children: any[] = [];

    // ── 문서 상단 메타 정보 ─────────────────────────────────────────
    const modelLabel = PROVIDER_CONFIGS[selectedProvider].models.find(
      m => m.id === selectedModels[selectedProvider]
    )?.label ?? selectedModels[selectedProvider];
    const providerLabel = PROVIDER_CONFIGS[selectedProvider].label;
    const createdAt = new Date().toLocaleString('ko-KR', { timeZone: 'Asia/Seoul' });
    children.push(new Paragraph({
      children: [
        new TextRun({ text: `생성 모델: ${providerLabel} ${modelLabel}`, size: 18, color: DC.textLight }),
        new TextRun({ text: `    |    생성 일시: ${createdAt}`, size: 18, color: DC.textLight }),
      ],
      spacing: { after: 40 },
    }));
    children.push(new Paragraph({
      children: [new TextRun({ text: '', size: 4 })],
      border: { bottom: { style: BorderStyle.SINGLE, size: 2, color: DC.border } },
      spacing: { after: 240 },
    }));

    let i = 0;

    while (i < lines.length) {
      const line = lines[i];

      // H1: # 제목 → 다크 브라운 대제목
      if (/^# /.test(line) && !/^##/.test(line)) {
        children.push(new Paragraph({
          children: [new TextRun({ text: line.slice(2), bold: true, size: 40, color: DC.textDark, font: { name: 'Calibri', eastAsia: '맑은 고딕', cs: '맑은 고딕' } })],
          spacing: { before: 400, after: 240 },
          border: { bottom: { style: BorderStyle.SINGLE, size: 4, color: DC.accent, space: 6 } },
        }));
        i++;

      // H2: ## → 테라코타 배경 + 흰 글자
      } else if (/^## /.test(line) && !/^###/.test(line)) {
        children.push(new Paragraph({
          children: [new TextRun({ text: line.slice(3), color: DC.white, bold: true, size: 28, font: { name: 'Calibri', eastAsia: '맑은 고딕', cs: '맑은 고딕' } })],
          shading: { type: ShadingType.CLEAR, fill: DC.accent, color: 'auto' },
          spacing: { before: 480, after: 160 },
          indent: { left: 200, right: 200 },
        }));
        i++;

      // H3: ### → 앰버 좌측 보더 + 다크 브라운 글자
      } else if (/^### /.test(line) && !/^####/.test(line)) {
        children.push(new Paragraph({
          children: [new TextRun({ text: line.slice(4), color: DC.textDark, bold: true, size: 24, font: { name: 'Calibri', eastAsia: '맑은 고딕', cs: '맑은 고딕' } })],
          border: { left: { style: BorderStyle.SINGLE, size: 24, color: DC.amber, space: 8 } },
          indent: { left: 200 },
          spacing: { before: 280, after: 80 },
        }));
        i++;

      // H4: #### → 크림 좌측 보더 + 미드 브라운 글자
      } else if (/^#### /.test(line)) {
        children.push(new Paragraph({
          children: [new TextRun({ text: line.slice(5), color: DC.textMid, bold: true, size: 22, font: { name: 'Calibri', eastAsia: '맑은 고딕', cs: '맑은 고딕' } })],
          border: { left: { style: BorderStyle.SINGLE, size: 12, color: DC.border, space: 8 } },
          indent: { left: 160 },
          spacing: { before: 200, after: 60 },
        }));
        i++;

      // 표: | 가 있고 다음 줄이 구분선(|---|---|)인 경우
      } else if (line.includes('|') && /^\s*\|[\s\-:|]+\|\s*$/.test(lines[i + 1] || '')) {
        const headerCells = line.split('|').slice(1, -1).map(c => c.trim());
        const colCount = headerCells.length;
        i += 2;
        const bodyRows: string[][] = [];
        while (i < lines.length && lines[i].includes('|')) {
          bodyRows.push(lines[i].split('|').slice(1, -1).map(c => c.trim()));
          i++;
        }
        const table = new Table({
          width: { size: 100, type: WidthType.PERCENTAGE },
          rows: [
            new TableRow({
              tableHeader: true,
              children: headerCells.map(text => new TableCell({
                // CLEAR = 배경색만 채움 (SOLID는 전경 패턴으로 덮어 버림)
                shading: { type: ShadingType.CLEAR, fill: DC.cream, color: 'auto' },
                children: [new Paragraph({
                  children: [new TextRun({ text, bold: true, size: 20, color: DC.textDark, font: { name: 'Calibri', eastAsia: '맑은 고딕', cs: '맑은 고딕' } })],
                  spacing: { after: 60 },
                })],
              })),
            }),
            ...bodyRows.map((row, rowIdx) => {
              const cells = [...row];
              while (cells.length < colCount) cells.push('');
              return new TableRow({
                children: cells.slice(0, colCount).map(text => new TableCell({
                  shading: rowIdx % 2 === 1
                    ? { type: ShadingType.CLEAR, fill: 'FDF5EE', color: 'auto' }
                    : { type: ShadingType.CLEAR, fill: 'FFFFFF', color: 'auto' },
                  children: [new Paragraph({ children: parseInlineText(text), spacing: { after: 60 } })],
                })),
              });
            }),
          ],
        });
        children.push(table);
        children.push(new Paragraph({ text: '', spacing: { after: 120 } }));

      // 불릿 리스트
      } else if (/^[-*] /.test(line)) {
        children.push(new Paragraph({
          children: parseInlineText(line.slice(2)),
          bullet: { level: 0 },
          spacing: { after: 60 },
        }));
        i++;

      // 번호 리스트
      } else if (/^\d+\. /.test(line)) {
        children.push(new Paragraph({
          children: parseInlineText(line.replace(/^\d+\. /, '')),
          numbering: { reference: 'default-numbering', level: 0 },
          spacing: { after: 60 },
        }));
        i++;

      // 수평선
      } else if (line.trim() === '---') {
        children.push(new Paragraph({
          border: { bottom: { style: BorderStyle.SINGLE, size: 4, color: DC.border, space: 1 } },
          spacing: { before: 240, after: 240 },
        }));
        i++;

      // 빈 줄
      } else if (line.trim() === '') {
        children.push(new Paragraph({ text: '', spacing: { after: 80 } }));
        i++;

      // 일반 텍스트
      } else {
        children.push(new Paragraph({
          children: parseInlineText(line),
          spacing: { after: 100 },
        }));
        i++;
      }
    }

    const doc = new Document({
      // 문서 기본 폰트: 영문 Calibri + 한글 맑은 고딕 (웹 UI Outfit + Noto Sans KR에 대응)
      styles: {
        default: {
          document: {
            run: {
              font: { name: 'Calibri', eastAsia: '맑은 고딕', cs: '맑은 고딕' },
              size: 22,
              color: DC.textDark,
            },
            paragraph: {
              spacing: { line: 288, lineRule: 'auto' },
            },
          },
        },
      },
      numbering: {
        config: [{ reference: 'default-numbering', levels: [{ level: 0, format: 'decimal', text: '%1.', alignment: 'left' }] }],
      },
      sections: [{ children }],
    });

    return await Packer.toBlob(doc);
  }

  function triggerBrowserDownload(blob: Blob, fileName: string) {
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = fileName;
    a.click();
    URL.revokeObjectURL(url);
  }

  function openSaveDialog(plan: BusinessPlan, type: 'bizplan' | 'prd' = 'bizplan', format: 'docx' | 'md' = 'docx') {
    setPendingPlan(plan);
    setPendingPlanType(type);
    setPendingFileFormat(format);
    setShowSaveDialog(true);
  }

  async function handlePickFolder() {
    try {
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const handle: FileSystemDirectoryHandle = await (window as any).showDirectoryPicker({ mode: 'readwrite' });
      setDirHandle(handle);
      setDirName(handle.name);
    } catch {
      // 사용자가 취소한 경우 무시
    }
  }

  async function executeSave() {
    if (!pendingPlan) return;
    setShowSaveDialog(false);
    const keywordPart = keyword || '없음';
    let baseName: string;
    if (pendingPlanType === 'prd') {
      baseName = `PRD_${keywordPart}_${pendingPlan.ideaName}`;
    } else {
      const versionLabel = pendingPlan.version === 'full' ? 'Full' : 'Draft';
      baseName = `사업기획서_${keywordPart}_${versionLabel}_${pendingPlan.ideaName}`;
    }

    let blob: Blob;
    let fileName: string;
    if (pendingFileFormat === 'md') {
      blob = new Blob([pendingPlan.content], { type: 'text/markdown;charset=utf-8' });
      fileName = `${baseName}.md`;
    } else {
      blob = await buildDocxBlob(pendingPlan);
      fileName = `${baseName}.docx`;
    }

    if (dirHandle) {
      try {
        const fileHandle = await dirHandle.getFileHandle(fileName, { create: true });
        const writable = await fileHandle.createWritable();
        await writable.write(blob);
        await writable.close();
      } catch {
        triggerBrowserDownload(blob, fileName);
      }
    } else {
      triggerBrowserDownload(blob, fileName);
    }
  }

  async function generatePRD(sourcePlan?: BusinessPlan, returnStep: WorkflowStep = 'view-plan') {
    const currentPlan = sourcePlan ?? businessPlans[currentPlanIndex];
    if (!currentPlan) return;
    const idea = ideas.find((i) => i.id === currentPlan.ideaId);
    if (!idea) return;

    setIsLoading(true);
    setError(null);
    setStep('generating-prd');
    setLoadingMessage(`"${idea.name}" PRD 작성 중...`);
    setProgressCurrent(0);
    setProgressTotal(1);
    setCompletedSteps([]);
    startTimer(75000);

    try {
      const res = await fetch('/api/generate', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          provider: selectedProvider,
          model: selectedModels[selectedProvider],
          type: 'generate-prd',
          idea,
          businessPlanContent: currentPlan.content,
        }),
      });

      if (!res.ok) {
        throw new Error(`PRD 생성 실패: ${idea.name}`);
      }

      const data = await res.json();
      const newPRD: PRD = {
        ideaId: idea.id,
        ideaName: idea.name,
        content: data.response,
        createdAt: new Date().toISOString(),
      };

      setPRDs((prev) => {
        const filtered = prev.filter((p) => p.ideaId !== idea.id);
        return [...filtered, newPRD];
      });
      setCurrentPRDIndex(0);
      setProgressCurrent(1);
      setCompletedSteps([`"${idea.name}" PRD 작성 완료`]);
      setStep('view-prd');
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Unknown error');
      setStep(returnStep);
    } finally {
      setIsLoading(false);
      setLoadingMessage('');
      stopTimer();
    }
  }

  async function generateFullPlan(sourcePlan?: BusinessPlan) {
    // sourcePlan이 주어지면 그것을 사용, 없으면 현재 탭 기획서 사용
    const currentPlan = sourcePlan ?? businessPlans[currentPlanIndex];
    if (!currentPlan) return;
    const idea = ideas.find((i) => i.id === currentPlan.ideaId);
    if (!idea) return;

    setIsLoading(true);
    setError(null);
    setStep('generating-full-plan');
    setProgressCurrent(0);
    setProgressTotal(4);
    setCompletedSteps([]);

    const agentEtaMs = 90000;
    startTimer(4 * agentEtaMs);

    try {
      // 시장 조사 (진행 표시 없이 조용히 수집)
      let planSearchResults: SearchResult[] = [];
      try {
        planSearchResults = await searchMultiple([
          `${idea.name} 경쟁사 대안 솔루션 비교`,
          `${idea.target} 고객 페인포인트 문제점 수요`,
          `${idea.category || 'SaaS'} 시장 규모 TAM SAM SOM 투자 트렌드 2025`,
          `${idea.name} SaaS 가격 책정 수익 모델 사례`,
          `${idea.name} 규제 법률 리스크 진입 장벽`,
        ], 3, 'advanced');
      } catch { /* 검색 실패 시 빈 배열로 계속 진행 */ }

      // ── Agent 1: 시장·문제 ────────────────────────────────────────────
      setLoadingMessage(`[에이전트 1/4] "${idea.name}" 시장·트렌드·TAM 분석 중...`);
      const r1 = await fetch('/api/generate', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ provider: selectedProvider, model: selectedModels[selectedProvider], type: 'full-plan-market', idea, searchResults: planSearchResults, existingPlanContent: importedPlanContent || undefined }),
      });
      if (!r1.ok) throw new Error(`시장 분석 실패: ${idea.name}`);
      const marketContent = (await r1.json()).response as string;
      setProgressCurrent(1);
      setCompletedSteps(prev => [...prev, `[1/4] "${idea.name}" 시장·트렌드·TAM 분석 완료`]);
      updateEta(3 * agentEtaMs);

      // ── Agent 2: 경쟁·차별화 ─────────────────────────────────────────
      setLoadingMessage(`[에이전트 2/4] "${idea.name}" 경쟁·차별화 분석 중...`);
      const r2 = await fetch('/api/generate', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ provider: selectedProvider, model: selectedModels[selectedProvider], type: 'full-plan-competition', idea, marketContent, searchResults: planSearchResults, existingPlanContent: importedPlanContent || undefined }),
      });
      if (!r2.ok) throw new Error(`경쟁 분석 실패: ${idea.name}`);
      const competitionContent = (await r2.json()).response as string;
      setProgressCurrent(2);
      setCompletedSteps(prev => [...prev, `[2/4] "${idea.name}" 경쟁·차별화 분석 완료`]);
      updateEta(2 * agentEtaMs);

      // ── Agent 3: 전략·솔루션 ─────────────────────────────────────────
      setLoadingMessage(`[에이전트 3/4] "${idea.name}" 전략·로드맵 수립 중...`);
      const r3 = await fetch('/api/generate', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ provider: selectedProvider, model: selectedModels[selectedProvider], type: 'full-plan-strategy', idea, marketContent, competitionContent, searchResults: planSearchResults, existingPlanContent: importedPlanContent || undefined }),
      });
      if (!r3.ok) throw new Error(`전략 수립 실패: ${idea.name}`);
      const strategyContent = (await r3.json()).response as string;
      setProgressCurrent(3);
      setCompletedSteps(prev => [...prev, `[3/4] "${idea.name}" 전략·로드맵 수립 완료`]);
      updateEta(1 * agentEtaMs);

      // ── Agent 4: 재무·리스크 ─────────────────────────────────────────
      setLoadingMessage(`[에이전트 4/4] "${idea.name}" 재무·리스크 분석 중...`);
      const r4 = await fetch('/api/generate', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ provider: selectedProvider, model: selectedModels[selectedProvider], type: 'full-plan-finance', idea, marketContent, competitionContent, strategyContent, searchResults: planSearchResults, existingPlanContent: importedPlanContent || undefined }),
      });
      if (!r4.ok) throw new Error(`재무 분석 실패: ${idea.name}`);
      const financeContent = (await r4.json()).response as string;
      setProgressCurrent(4);
      setCompletedSteps(prev => [...prev, `[4/4] "${idea.name}" 재무·리스크 분석 완료`]);

      // ── 섹션 순서대로 조합 (1→2→3→...→참고문헌) ─────────────────────
      const combined = combineFullPlanSections(idea.name, marketContent, competitionContent, strategyContent, financeContent);
      const newFullPlan: BusinessPlan = {
        ideaId: idea.id,
        ideaName: idea.name,
        content: combined,
        createdAt: new Date().toISOString(),
        version: 'full',
      };

      // 기존 풀버전 중 같은 ideaId가 있으면 교체, 없으면 추가 + 방금 만든 플랜으로 탭 이동
      const prevFiltered = fullBusinessPlans.filter(p => p.ideaId !== idea.id);
      const newPlans = [...prevFiltered, newFullPlan];
      setFullBusinessPlans(newPlans);
      setCurrentFullPlanIndex(newPlans.length - 1); // 방금 만든 플랜이 항상 마지막
      setStep('view-full-plan');
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Unknown error');
      setStep('view-plan');
    } finally {
      setIsLoading(false);
      setLoadingMessage('');
      stopTimer();
    }
  }

  /** 4개 에이전트 출력물에서 섹션을 추출해 1→2→3→...→참고문헌 순서로 합친다 */
  function combineFullPlanSections(
    ideaName: string,
    marketContent: string,      // 섹션 2, 3, 8
    competitionContent: string, // 섹션 5, 6, 7
    strategyContent: string,    // 섹션 1, 4, 9, 10
    financeContent: string      // 섹션 11, 12, 13, 참고문헌
  ): string {
    /**
     * content 내에서 sectionNum 번호의 섹션을 추출한다.
     * "## 2." / "## **2.**" / "## 2. 제목" 등 다양한 형태를 처리.
     */
    function getSection(content: string, sectionNum: number | '참고문헌'): string {
      const normalized = '\n' + content; // 첫 섹션도 \n## 로 찾을 수 있게

      let startIdx: number;
      if (sectionNum === '참고문헌') {
        const m = normalized.match(/\n##\s+\**참고문헌/);
        if (!m || m.index === undefined) return '';
        startIdx = m.index + 1;
      } else {
        // "## 숫자." — 앞뒤에 다른 숫자가 없는 경우만 매칭 (예: 1은 10,11... 과 구분)
        const pattern = new RegExp(`\n##\\s+\\**${sectionNum}[.．](?![0-9])`);
        const m = normalized.match(pattern);
        if (!m || m.index === undefined) return '';
        startIdx = m.index + 1;
      }

      // 다음 ## 섹션이 시작되는 위치 찾기
      const rest = normalized.slice(startIdx + 1);
      const nextMatch = rest.match(/\n##\s/);
      const endIdx = nextMatch?.index !== undefined
        ? startIdx + 1 + nextMatch.index
        : normalized.length;

      return normalized.slice(startIdx, endIdx).trim();
    }

    const ordered = [
      getSection(strategyContent, 1),
      getSection(marketContent, 2),
      getSection(marketContent, 3),
      getSection(strategyContent, 4),
      getSection(competitionContent, 5),
      getSection(competitionContent, 6),
      getSection(competitionContent, 7),
      getSection(marketContent, 8),
      getSection(strategyContent, 9),
      getSection(strategyContent, 10),
      getSection(financeContent, 11),
      getSection(financeContent, 12),
      getSection(financeContent, 13),
      getSection(financeContent, '참고문헌'),
    ].filter(Boolean);

    // 섹션 추출이 절반 이하로 실패하면 raw 조합으로 fallback
    if (ordered.length < 7) {
      console.warn(`[combineFullPlanSections] 섹션 ${ordered.length}개만 추출됨 → raw 조합으로 대체`);
      const raw = [strategyContent, marketContent, competitionContent, financeContent]
        .filter(Boolean)
        .join('\n\n---\n\n');
      return `# ${ideaName} 사업기획서 (풀버전)\n\n${raw}`;
    }

    return `# ${ideaName} 사업기획서 (풀버전)\n\n${ordered.join('\n\n---\n\n')}`;
  }

  function stripMarkdownForAI(content: string): string {
    return content
      .replace(/^#{1,6}\s+/gm, '')               // 헤딩 기호 제거
      .replace(/\*\*(.*?)\*\*/g, '$1')            // 볼드 제거
      .replace(/\*(.*?)\*/g, '$1')               // 이탤릭 제거
      .replace(/`([^`]+)`/g, '$1')               // 인라인 코드 제거
      .replace(/^\s*[-]\s+/gm, '• ')             // 불릿 통일
      .replace(/^(\s*)\|\s*[-:]+\s*\|.*/gm, '')  // 표 구분선 제거
      .replace(/---+/gm, '')                     // 수평선 제거
      .replace(/>\s?(.*)/gm, '$1')               // 인용 기호 제거
      .replace(/\n{3,}/g, '\n\n')                // 연속 빈 줄 압축
      .trim();
  }

  async function copyToClipboard(text: string) {
    await navigator.clipboard.writeText(text);
    setPrdCopied(true);
    setTimeout(() => setPrdCopied(false), 2000);
  }

  // ── 기획서 Import ─────────────────────────────────────────────────
  async function handleImportPlan(content: string) {
    if (!content.trim()) {
      setError('기획서 내용이 비어있습니다.');
      return;
    }

    setIsLoading(true);
    setError(null);
    setStep('importing-plan');
    setLoadingMessage('기획서에서 핵심 정보를 추출하는 중...');
    setProgressCurrent(0);
    setProgressTotal(1);
    setCompletedSteps([]);
    startTimer(15000);

    try {
      const res = await fetch('/api/generate', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          provider: selectedProvider,
          model: selectedModels[selectedProvider],
          type: 'extract-idea',
          planContent: content,
        }),
      });

      if (!res.ok) throw new Error('기획서 분석 실패');
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

      setImportedPlanContent(content);
      setIdeas([syntheticIdea]);
      setSelectedIdeas([-1]);
      setBusinessPlans([syntheticPlan]);
      setCurrentPlanIndex(0);
      setProgressCurrent(1);
      setCompletedSteps(['기획서 분석 완료']);
      setStep('view-plan');
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Unknown error');
      setStep('keyword');
    } finally {
      setIsLoading(false);
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

  function reset() {
    stopTimer();
    setStep('keyword');
    setKeyword('');
    setIdeas([]);
    setSelectedIdeas([]);
    setBusinessPlans([]);
    setCurrentPlanIndex(0);
    setFullBusinessPlans([]);
    setCurrentFullPlanIndex(0);
    setPRDs([]);
    setCurrentPRDIndex(0);
    setError(null);
    setRawResponse('');
    setImportedPlanContent(null);
    setImportMode(null);
    setPasteText('');
  }

  // ── 캐니언 컬러 팔레트 ──────────────────────────────────────
  const C = {
    bg:        '#FDF5EE',
    cardBg:    '#FFFAF5',
    border:    '#F0D5C0',
    textDark:  '#3D1008',
    textMid:   '#8B5A40',
    textLight: '#B08060',
    accent:    '#C24B25',
    amber:     '#F5901E',
    amberLight:'#FFB347',
    cream:     '#FDE8D0',
    selectedBg:'#FEF3EB',
  };

  return (
    <div className="min-h-screen" style={{ backgroundColor: C.bg }}>

      {/* ── 상단 네비게이션 ────────────────────────────────────── */}
      <nav
        className="sticky top-0 z-20"
        style={{ backgroundColor: C.cardBg, borderBottom: `1px solid ${C.border}` }}
      >
        <div className="max-w-4xl mx-auto px-4 py-3 flex items-center justify-between">
          <Link
            href="/"
            className="flex items-center gap-1.5 text-sm transition hover:opacity-70"
            style={{ color: C.textMid }}
          >
            <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
            </svg>
            홈으로
          </Link>
          <div className="flex items-center gap-2">
            <div
              className="w-6 h-6 rounded-md flex items-center justify-center"
              style={{ background: `linear-gradient(135deg, ${C.amber}, ${C.amberLight})` }}
            >
              <svg className="w-3.5 h-3.5 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9.663 17h4.673M12 3v1m6.364 1.636l-.707.707M21 12h-1M4 12H3m3.343-5.657l-.707-.707m2.828 9.9a5 5 0 117.072 0l-.548.547A3.374 3.374 0 0014 18.469V19a2 2 0 11-4 0v-.531c0-.895-.356-1.754-.988-2.386l-.548-.547z" />
              </svg>
            </div>
            <span className="font-semibold text-sm" style={{ color: C.textDark }}>SaaS Idea Generator</span>
          </div>
          {/* Provider 상태 */}
          <div className="text-xs">
            {availableProviders[selectedProvider] === null ? (
              <span style={{ color: C.textLight }}>확인 중...</span>
            ) : availableProviders[selectedProvider] ? (
              <span className="flex items-center gap-1" style={{ color: '#6B7B3A' }}>
                <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 inline-block" />
                {PROVIDER_CONFIGS[selectedProvider].label}
              </span>
            ) : (
              <span className="flex items-center gap-1 text-red-500">
                <span className="w-1.5 h-1.5 rounded-full bg-red-400 inline-block" />
                {PROVIDER_CONFIGS[selectedProvider].label} 미설정
              </span>
            )}
          </div>
        </div>
      </nav>

      <div className="max-w-4xl mx-auto py-10 px-4">

        {/* ── 진행 단계 표시 ─────────────────────────────────────── */}
        <div className="flex justify-center mb-10">
          <div className="flex items-center gap-1">
            {['키워드 입력', '아이디어 선택', '기획서 작성', '완료'].map((label, idx) => {
              const stepOrder = ['keyword', 'select-ideas', 'view-plan', 'complete'];
              // 로딩 중인 스텝은 다음 스텝(도달 예정)으로 매핑
              const effectiveStep =
                step === 'generating-ideas' ? 'select-ideas' :
                step === 'importing-plan' ? 'view-plan' :
                (step === 'generating-plan' || step === 'generating-full-plan' ||
                 step === 'generating-prd' || step === 'view-prd' ||
                 step === 'view-full-plan') ? 'view-plan' : step;
              const currentIdx = stepOrder.indexOf(effectiveStep);
              const isActive = idx <= currentIdx;
              return (
                <div key={label} className="flex items-center">
                  <div className="flex flex-col items-center">
                    <div
                      className="w-7 h-7 rounded-full flex items-center justify-center text-xs font-semibold transition-all"
                      style={isActive
                        ? { background: `linear-gradient(135deg, ${C.accent}, ${C.amber})`, color: '#fff' }
                        : { backgroundColor: '#F0D5C0', color: C.textLight }
                      }
                    >
                      {idx + 1}
                    </div>
                    <span className="mt-1 text-xs" style={{ color: isActive ? C.textDark : C.textLight }}>
                      {label}
                    </span>
                  </div>
                  {idx < 3 && (
                    <div
                      className="w-10 h-px mx-2 mb-4"
                      style={{ backgroundColor: idx < currentIdx ? C.accent : '#F0D5C0' }}
                    />
                  )}
                </div>
              );
            })}
          </div>
        </div>

        {/* Error Display */}
        {error && (
          <div className="mb-8 p-4 rounded-xl text-sm" style={{ backgroundColor: '#FEF2F2', border: '1px solid #FECACA', color: '#991B1B' }}>
            {error}
          </div>
        )}

        {/* Step: Keyword Input */}
        {step === 'keyword' && (
          <div className="rounded-2xl p-8" style={{ backgroundColor: C.cardBg, border: `1px solid ${C.border}` }}>
            {/* AI Model Selector */}
            <div className="mb-8">
              <h2 className="text-xs font-semibold uppercase tracking-widest mb-3" style={{ color: C.textLight }}>
                사용할 AI 모델 선택
              </h2>
              <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
                {(Object.keys(PROVIDER_CONFIGS) as AIProvider[]).map((provider) => {
                  const cfg = PROVIDER_CONFIGS[provider];
                  const available = availableProviders[provider];
                  const isSelected = selectedProvider === provider;
                  // 현재 선택된 모델의 스펙
                  const currentModel = cfg.models.find(m => m.id === selectedModels[provider]) ?? cfg.models[0];
                  const dotRow = (score: number, color: string) =>
                    Array.from({ length: 5 }, (_, i) => (
                      <span key={i} style={{ color: i < score ? color : C.border, fontSize: 10 }}>●</span>
                    ));
                  return (
                    <div
                      key={provider}
                      onClick={() => setSelectedProvider(provider)}
                      className="relative p-3 rounded-xl text-left transition cursor-pointer"
                      style={isSelected
                        ? { border: `2px solid ${C.accent}`, backgroundColor: C.selectedBg }
                        : { border: `2px solid ${C.border}`, backgroundColor: '#fff' }
                      }
                    >
                      <div className="flex items-center justify-between">
                        <div className="font-semibold text-sm" style={{ color: C.textDark }}>{cfg.label}</div>
                        {available === null ? (
                          <span className="text-xs" style={{ color: C.textLight }}>…</span>
                        ) : available ? (
                          <span className="text-xs text-emerald-600">●</span>
                        ) : (
                          <span className="text-xs text-red-400">●</span>
                        )}
                      </div>
                      <div className="text-xs mt-0.5 mb-2" style={{ color: C.textMid }}>{cfg.description}</div>

                      {/* 스펙 배지 */}
                      <div className="space-y-0.5">
                        <div className="flex items-center gap-1">
                          <span className="text-[10px] w-7" style={{ color: C.textLight }}>품질</span>
                          <div className="flex gap-px">{dotRow(currentModel.quality, C.accent)}</div>
                        </div>
                        <div className="flex items-center gap-1">
                          <span className="text-[10px] w-7" style={{ color: C.textLight }}>속도</span>
                          <div className="flex gap-px">{dotRow(currentModel.speed, C.amber)}</div>
                        </div>
                        <div className="flex items-center gap-1">
                          <span className="text-[10px] w-7" style={{ color: C.textLight }}>비용</span>
                          <div className="flex gap-px">{dotRow(currentModel.cost, '#4ade80')}</div>
                        </div>
                      </div>

                      {isSelected && cfg.models.length > 1 && (
                        <select
                          value={selectedModels[provider]}
                          onClick={(e) => e.stopPropagation()}
                          onChange={(e) => setSelectedModels(prev => ({ ...prev, [provider]: e.target.value }))}
                          className="mt-2 w-full text-xs rounded px-1.5 py-1 cursor-pointer"
                          style={{ border: `1px solid ${C.accent}`, backgroundColor: '#fff', color: C.textDark }}
                        >
                          {cfg.models.map(m => (
                            <option key={m.id} value={m.id}>{m.label} — {m.description}</option>
                          ))}
                        </select>
                      )}
                    </div>
                  );
                })}
              </div>
            </div>

            {/* ── 시작 방법 선택 탭 ──────────────────────────────── */}
            <div className="flex gap-1 mb-6 p-1 rounded-xl" style={{ backgroundColor: '#F0D5C0' }}>
              <button
                onClick={() => setImportMode(null)}
                className="flex-1 px-4 py-2 rounded-lg text-sm font-medium transition"
                style={importMode === null
                  ? { backgroundColor: '#fff', color: C.textDark, boxShadow: '0 1px 3px rgba(0,0,0,0.1)' }
                  : { color: C.textMid }
                }
              >
                키워드로 아이디어 발굴
              </button>
              <button
                onClick={() => setImportMode('file')}
                className="flex-1 px-4 py-2 rounded-lg text-sm font-medium transition"
                style={importMode !== null
                  ? { backgroundColor: '#fff', color: C.textDark, boxShadow: '0 1px 3px rgba(0,0,0,0.1)' }
                  : { color: C.textMid }
                }
              >
                기존 기획서 가져오기
              </button>
            </div>

            {/* ── 키워드 입력 모드 ──────────────────────────────── */}
            {importMode === null && (
              <>
                <h2 className="text-xl font-semibold mb-2" style={{ color: C.textDark }}>
                  서비스 아이템을 브레인스토밍해보려고 합니다
                </h2>
                <p className="mb-6 text-sm" style={{ color: C.textMid }}>
                  특별히 원하는 키워드가 있으면 넣어주세요. (옵션 — 비워두면 AI가 자동 선정)
                </p>
                <input
                  type="text"
                  value={keyword}
                  onChange={(e) => setKeyword(e.target.value)}
                  onKeyDown={(e) => { if (e.key === 'Enter' && isProviderReady()) generateIdeas(); }}
                  placeholder="예: AI, 헬스케어, 교육, 생산성..."
                  className="w-full px-4 py-3 rounded-xl outline-none transition"
                  style={{
                    border: `1.5px solid ${C.border}`,
                    backgroundColor: '#fff',
                    color: C.textDark,
                  }}
                  onFocus={e => (e.currentTarget.style.borderColor = C.accent)}
                  onBlur={e => (e.currentTarget.style.borderColor = C.border)}
                />
                <div className="mt-6 flex justify-end">
                  <button
                    onClick={generateIdeas}
                    disabled={!isProviderReady()}
                    className="px-7 py-3 rounded-xl font-semibold transition disabled:opacity-40 disabled:cursor-not-allowed"
                    style={{
                      background: `linear-gradient(135deg, ${C.accent}, ${C.amber})`,
                      color: '#fff',
                      boxShadow: `0 4px 16px rgba(194,75,37,0.3)`,
                    }}
                  >
                    아이디어 발굴 시작 →
                  </button>
                </div>
              </>
            )}

            {/* ── 기획서 Import 모드 ──────────────────────────────── */}
            {importMode !== null && (
              <>
                <h2 className="text-xl font-semibold mb-2" style={{ color: C.textDark }}>
                  기존 사업기획서 가져오기
                </h2>
                <p className="mb-6 text-sm" style={{ color: C.textMid }}>
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
                        disabled={!pasteText.trim() || !isProviderReady()}
                        className="px-7 py-3 rounded-xl font-semibold transition disabled:opacity-40 disabled:cursor-not-allowed"
                        style={{ background: `linear-gradient(135deg, ${C.accent}, ${C.amber})`, color: '#fff', boxShadow: `0 4px 16px rgba(194,75,37,0.3)` }}
                      >
                        기획서 분석 시작 →
                      </button>
                    </div>
                  </div>
                )}
              </>
            )}
          </div>
        )}

        {/* Step: Importing Plan */}
        {step === 'importing-plan' && (
          <div className="rounded-2xl p-8" style={{ backgroundColor: C.cardBg, border: `1px solid ${C.border}` }}>
            <h2 className="text-xl font-semibold mb-5" style={{ color: C.textDark }}>기획서 분석 중</h2>
            <div className="flex gap-8 mb-5">
              <div>
                <div className="text-xs mb-0.5" style={{ color: C.textLight }}>경과 시간</div>
                <div className="font-mono text-base font-semibold" style={{ color: C.textDark }}>{formatTime(elapsedSeconds)}</div>
              </div>
              {etaSeconds !== null && (
                <div>
                  <div className="text-xs mb-0.5" style={{ color: C.textLight }}>예상 완료</div>
                  <div className="font-mono text-base font-semibold" style={{ color: C.amber }}>
                    {etaSeconds > 0 ? `약 ${formatTime(etaSeconds)} 후` : '거의 완료...'}
                  </div>
                </div>
              )}
            </div>
            <div className="mb-1 flex justify-between items-center text-sm">
              <span style={{ color: C.textMid }}>{progressCurrent} / {progressTotal}단계 완료</span>
              <span className="font-semibold" style={{ color: C.amber }}>{Math.round((progressCurrent / progressTotal) * 100)}%</span>
            </div>
            <div className="w-full rounded-full h-2 mb-6" style={{ backgroundColor: '#F0D5C0' }}>
              <div className="h-2 rounded-full transition-all duration-700 ease-in-out" style={{ width: `${Math.round((progressCurrent / progressTotal) * 100)}%`, background: `linear-gradient(90deg, ${C.accent}, ${C.amber})` }} />
            </div>
            <div className="space-y-2 mb-4">
              {completedSteps.map((msg, i) => (
                <div key={i} className="flex items-center gap-2 text-sm" style={{ color: C.textMid }}>
                  <svg className="w-4 h-4 flex-shrink-0 text-emerald-500" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                  </svg>
                  {msg}
                </div>
              ))}
            </div>
            {progressCurrent < progressTotal && (
              <div className="flex items-center gap-2 text-sm" style={{ color: C.accent }}>
                <div className="animate-spin w-4 h-4 border-2 border-t-transparent rounded-full flex-shrink-0" style={{ borderColor: C.accent, borderTopColor: 'transparent' }} />
                {loadingMessage}
              </div>
            )}
          </div>
        )}

        {/* Step: Generating Ideas */}
        {step === 'generating-ideas' && (
          <div className="rounded-2xl p-8" style={{ backgroundColor: C.cardBg, border: `1px solid ${C.border}` }}>
            <h2 className="text-xl font-semibold mb-5" style={{ color: C.textDark }}>아이디어 발굴 중</h2>
            <div className="flex gap-8 mb-5">
              <div>
                <div className="text-xs mb-0.5" style={{ color: C.textLight }}>경과 시간</div>
                <div className="font-mono text-base font-semibold" style={{ color: C.textDark }}>{formatTime(elapsedSeconds)}</div>
              </div>
              {etaSeconds !== null && (
                <div>
                  <div className="text-xs mb-0.5" style={{ color: C.textLight }}>예상 완료</div>
                  <div className="font-mono text-base font-semibold" style={{ color: C.amber }}>
                    {etaSeconds > 0 ? `약 ${formatTime(etaSeconds)} 후` : '거의 완료...'}
                  </div>
                </div>
              )}
            </div>
            <div className="mb-1 flex justify-between items-center text-sm">
              <span style={{ color: C.textMid }}>{progressCurrent} / {progressTotal}단계 완료</span>
              <span className="font-semibold" style={{ color: C.amber }}>{Math.round((progressCurrent / progressTotal) * 100)}%</span>
            </div>
            <div className="w-full rounded-full h-2 mb-6" style={{ backgroundColor: '#F0D5C0' }}>
              <div className="h-2 rounded-full transition-all duration-700 ease-in-out" style={{ width: `${Math.round((progressCurrent / progressTotal) * 100)}%`, background: `linear-gradient(90deg, ${C.accent}, ${C.amber})` }} />
            </div>
            <div className="space-y-2 mb-4">
              {completedSteps.map((msg, i) => (
                <div key={i} className="flex items-center gap-2 text-sm" style={{ color: C.textMid }}>
                  <svg className="w-4 h-4 flex-shrink-0 text-emerald-500" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                  </svg>
                  {msg}
                </div>
              ))}
            </div>
            {progressCurrent < progressTotal && (
              <div className="flex items-center gap-2 text-sm" style={{ color: C.accent }}>
                <div className="animate-spin w-4 h-4 border-2 border-t-transparent rounded-full flex-shrink-0" style={{ borderColor: C.accent, borderTopColor: 'transparent' }} />
                {loadingMessage}
              </div>
            )}
          </div>
        )}

        {/* Step: Select Ideas */}
        {step === 'select-ideas' && (
          <div className="rounded-2xl p-8" style={{ backgroundColor: C.cardBg, border: `1px solid ${C.border}` }}>
            <div className="flex items-center justify-between mb-2">
              <h2 className="text-xl font-semibold" style={{ color: C.textDark }}>
                진행할 아이디어를 선택해주세요
              </h2>
              {lastGenTime && (
                <span className="text-xs px-2.5 py-1 rounded-full" style={{ backgroundColor: C.cream, color: C.textMid }}>
                  ⚡ {lastGenTime.label}으로 {formatTime(lastGenTime.seconds)} 만에 생성
                </span>
              )}
            </div>
            <p className="text-sm mb-6" style={{ color: C.textMid }}>
              상세 사업기획서를 작성할 아이디어를 선택하세요. (복수 선택 가능)
            </p>

            <div className="space-y-4 mb-6">
              {ideas.map((idea) => (
                <div
                  key={idea.id}
                  onClick={() => toggleIdeaSelection(idea.id)}
                  className="p-5 rounded-xl cursor-pointer transition-all"
                  style={selectedIdeas.includes(idea.id)
                    ? { border: `2px solid ${C.accent}`, backgroundColor: C.selectedBg }
                    : { border: `2px solid ${C.border}`, backgroundColor: '#fff' }
                  }
                >
                  <div className="flex items-start gap-3">
                    <div
                      className="w-5 h-5 rounded flex items-center justify-center mt-0.5 flex-shrink-0 transition-all"
                      style={selectedIdeas.includes(idea.id)
                        ? { background: `linear-gradient(135deg, ${C.accent}, ${C.amber})` }
                        : { border: `2px solid ${C.border}`, backgroundColor: '#fff' }
                      }
                    >
                      {selectedIdeas.includes(idea.id) && (
                        <svg className="w-3 h-3 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={3} d="M5 13l4 4L19 7" />
                        </svg>
                      )}
                    </div>
                    <div className="flex-1">
                      <div className="flex items-center gap-2 mb-1.5 flex-wrap">
                        <h3 className="font-semibold text-base" style={{ color: C.textDark }}>{idea.name}</h3>
                        {idea.category && (
                          <span className="px-2 py-0.5 text-xs rounded-full" style={{ backgroundColor: C.selectedBg, color: C.accent, border: `1px solid ${C.border}` }}>
                            {idea.category}
                          </span>
                        )}
                        {idea.mvpDifficulty && (
                          <span className={`px-2 py-0.5 text-xs rounded-full ${
                            idea.mvpDifficulty === '하' ? 'bg-emerald-50 text-emerald-700' :
                            idea.mvpDifficulty === '중' ? 'bg-yellow-50 text-yellow-700' :
                            'bg-red-50 text-red-600'
                          }`}>
                            난이도 {idea.mvpDifficulty}
                          </span>
                        )}
                      </div>
                      <p className="text-sm mb-2" style={{ color: C.textDark }}>{idea.oneLiner}</p>
                      {idea.problem && (
                        <p className="text-xs mb-2" style={{ color: C.textMid }}>
                          <span className="font-medium">해결 문제:</span> {idea.problem}
                        </p>
                      )}
                      <div className="text-xs flex flex-wrap gap-x-4 gap-y-1 mb-2" style={{ color: C.textMid }}>
                        <span>타깃: {idea.target}</span>
                        <span>수익모델: {idea.revenueModel}</span>
                      </div>
                      {idea.features && idea.features.length > 0 && (
                        <div className="flex flex-wrap gap-1">
                          {idea.features.map((feature, idx) => (
                            <span key={idx} className="px-2 py-0.5 text-xs rounded-md" style={{ backgroundColor: '#F0D5C0', color: C.textMid }}>
                              {feature}
                            </span>
                          ))}
                        </div>
                      )}
                    </div>
                  </div>
                </div>
              ))}
            </div>

            {/* Raw Response Toggle */}
            <details className="mb-6">
              <summary className="cursor-pointer text-xs" style={{ color: C.textLight }}>AI 원본 응답 보기</summary>
              <pre className="mt-2 p-4 rounded-xl text-xs overflow-auto max-h-64 whitespace-pre-wrap" style={{ backgroundColor: '#F0D5C0', color: C.textDark }}>
                {rawResponse}
              </pre>
            </details>

            <div className="flex justify-between items-center gap-3 flex-wrap">
              <button onClick={reset} className="px-5 py-2.5 rounded-xl text-sm transition" style={{ border: `1px solid ${C.border}`, color: C.textMid }}>처음으로</button>
              <button onClick={() => window.location.href = '/'} className="px-5 py-2.5 rounded-xl text-sm text-red-600 transition" style={{ border: '1px solid #FECACA', backgroundColor: '#FEF2F2' }}>진행 중단</button>
              <button
                onClick={generateBusinessPlan}
                disabled={selectedIdeas.length === 0}
                className="px-6 py-2.5 rounded-xl text-sm font-semibold transition disabled:opacity-40 disabled:cursor-not-allowed"
                style={{ background: `linear-gradient(135deg, ${C.accent}, ${C.amber})`, color: '#fff', boxShadow: `0 4px 12px rgba(194,75,37,0.25)` }}
              >
                사업기획서 작성 ({selectedIdeas.length}개 선택)
              </button>
            </div>
          </div>
        )}

        {/* Step: Generating Plan */}
        {step === 'generating-plan' && (
          <div className="rounded-2xl p-8" style={{ backgroundColor: C.cardBg, border: `1px solid ${C.border}` }}>
            <h2 className="text-xl font-semibold mb-5" style={{ color: C.textDark }}>사업기획서 작성 중</h2>
            <div className="flex gap-8 mb-5">
              <div>
                <div className="text-xs mb-0.5" style={{ color: C.textLight }}>경과 시간</div>
                <div className="font-mono text-base font-semibold" style={{ color: C.textDark }}>{formatTime(elapsedSeconds)}</div>
              </div>
              {etaSeconds !== null && (
                <div>
                  <div className="text-xs mb-0.5" style={{ color: C.textLight }}>예상 완료</div>
                  <div className="font-mono text-base font-semibold" style={{ color: C.amber }}>
                    {etaSeconds > 0 ? `약 ${formatTime(etaSeconds)} 후` : '거의 완료...'}
                  </div>
                </div>
              )}
            </div>
            <div className="mb-1 flex justify-between items-center text-sm">
              <span style={{ color: C.textMid }}>{progressCurrent} / {progressTotal}단계 완료</span>
              <span className="font-semibold" style={{ color: C.amber }}>{Math.round((progressCurrent / progressTotal) * 100)}%</span>
            </div>
            <div className="w-full rounded-full h-2 mb-6" style={{ backgroundColor: '#F0D5C0' }}>
              <div className="h-2 rounded-full transition-all duration-700 ease-in-out" style={{ width: `${Math.round((progressCurrent / progressTotal) * 100)}%`, background: `linear-gradient(90deg, ${C.accent}, ${C.amber})` }} />
            </div>
            <div className="space-y-2 mb-4">
              {completedSteps.map((msg, i) => (
                <div key={i} className="flex items-center gap-2 text-sm" style={{ color: C.textMid }}>
                  <svg className="w-4 h-4 flex-shrink-0 text-emerald-500" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                  </svg>
                  {msg}
                </div>
              ))}
            </div>
            {progressCurrent < progressTotal && (
              <div className="flex items-center gap-2 text-sm" style={{ color: C.accent }}>
                <div className="animate-spin w-4 h-4 border-2 border-t-transparent rounded-full flex-shrink-0" style={{ borderColor: C.accent, borderTopColor: 'transparent' }} />
                {loadingMessage}
              </div>
            )}
          </div>
        )}

        {/* Step: View Plan */}
        {step === 'view-plan' && businessPlans.length > 0 && (
          <div className="rounded-2xl p-8 overflow-hidden" style={{ backgroundColor: C.cardBg, border: `1px solid ${C.border}` }}>
            {/* Plan Tabs */}
            {businessPlans.length > 1 && (
              <div className="flex gap-2 mb-6 overflow-x-auto pb-1">
                {businessPlans.map((plan, idx) => (
                  <button
                    key={plan.ideaId}
                    onClick={() => setCurrentPlanIndex(idx)}
                    className="px-4 py-2 rounded-xl text-sm whitespace-nowrap font-medium transition"
                    style={currentPlanIndex === idx
                      ? { background: `linear-gradient(135deg, ${C.accent}, ${C.amber})`, color: '#fff' }
                      : { backgroundColor: '#F0D5C0', color: C.textMid }
                    }
                  >
                    {plan.ideaName}
                  </button>
                ))}
              </div>
            )}

            {/* Current Plan */}
            <div>
              <div className="flex items-center justify-between mb-5">
                <div>
                  <h2 className="text-xl font-bold" style={{ color: C.textDark }}>
                    {businessPlans[currentPlanIndex].ideaName}
                  </h2>
                  {importedPlanContent ? (
                    <span className="text-xs mt-1 inline-block px-2 py-0.5 rounded-full" style={{ backgroundColor: C.selectedBg, color: C.accent, border: `1px solid ${C.border}` }}>
                      가져온 기획서
                    </span>
                  ) : lastGenTime ? (
                    <span className="text-xs mt-1 inline-block" style={{ color: C.textLight }}>
                      ⚡ {lastGenTime.label}으로 {formatTime(lastGenTime.seconds)} 만에 생성
                    </span>
                  ) : null}
                </div>
                <button
                  onClick={() => window.scrollTo({ top: document.body.scrollHeight, behavior: 'smooth' })}
                  className="flex items-center gap-1 px-3 py-1.5 text-xs rounded-lg transition"
                  style={{ border: `1px solid ${C.border}`, color: C.textMid }}
                >
                  아래로 <svg className="w-3 h-3" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" /></svg>
                </button>
              </div>
              <div className="mb-6" style={{ overflowWrap: 'break-word', wordBreak: 'break-word', overflow: 'hidden' }}>
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
                    tr: ({ children }) => <tr style={{ ['&:hover' as string]: { backgroundColor: C.selectedBg } }}>{children}</tr>,
                    th: ({ children }) => <th className="px-3 py-2 text-left text-sm font-semibold" style={{ border: `1px solid ${C.border}`, color: C.textDark }}>{children}</th>,
                    td: ({ children }) => <td className="px-3 py-2 text-sm leading-6" style={{ border: `1px solid ${C.border}`, color: C.textMid }}>{children}</td>,
                    a: ({ href, children }) => <a href={href} target="_blank" rel="noopener noreferrer" className="underline text-sm" style={{ color: C.accent }}>{children}</a>,
                    hr: () => <hr className="my-6" style={{ borderColor: C.border }} />,
                  }}
                >
                  {businessPlans[currentPlanIndex].content}
                </ReactMarkdown>
              </div>

              <div className="flex flex-wrap justify-between items-center gap-3 pt-4" style={{ borderTop: `1px solid ${C.border}` }}>
                <button onClick={reset} className="px-5 py-2.5 rounded-xl text-sm transition" style={{ border: `1px solid ${C.border}`, color: C.textMid }}>새로 시작</button>
                <button onClick={() => window.scrollTo({ top: 0, behavior: 'smooth' })} className="flex items-center gap-1 px-3 py-2 rounded-xl text-xs transition" style={{ border: `1px solid ${C.border}`, color: C.textMid }}>
                  <svg className="w-3 h-3" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 15l7-7 7 7" /></svg>
                  위로
                </button>
                <div className="flex gap-2">
                  <button onClick={() => openSaveDialog(businessPlans[currentPlanIndex], 'bizplan', 'md')} className="px-4 py-2.5 rounded-xl text-sm font-medium transition" style={{ border: `1px solid ${C.border}`, color: C.textMid, backgroundColor: '#fff' }}>.md 저장</button>
                  <button onClick={() => openSaveDialog(businessPlans[currentPlanIndex], 'bizplan', 'docx')} className="px-4 py-2.5 rounded-xl text-sm font-medium transition" style={{ backgroundColor: '#3D6B3A', color: '#fff' }}>.docx 저장</button>
                </div>
              </div>
              <div className="mt-4 flex flex-wrap justify-center gap-3">
                <button onClick={() => generatePRD()} className="px-7 py-2.5 rounded-xl text-sm font-semibold transition" style={{ backgroundColor: C.textDark, color: C.cream }}>
                  개발문서(PRD) 생성하기
                </button>
                <button onClick={() => generateFullPlan()} className="px-7 py-2.5 rounded-xl text-sm font-semibold transition" style={{ background: `linear-gradient(135deg, ${C.accent}, ${C.amber})`, color: '#fff', boxShadow: `0 4px 12px rgba(194,75,37,0.25)` }}>
                  풀버전 사업기획서 생성 (에이전트 팀)
                </button>
              </div>
            </div>
          </div>
        )}

        {/* Step: Generating PRD */}
        {step === 'generating-prd' && (
          <div className="rounded-2xl p-8" style={{ backgroundColor: C.cardBg, border: `1px solid ${C.border}` }}>
            <h2 className="text-xl font-semibold mb-5" style={{ color: C.textDark }}>개발문서(PRD) 작성 중</h2>
            <div className="flex gap-8 mb-5">
              <div>
                <div className="text-xs mb-0.5" style={{ color: C.textLight }}>경과 시간</div>
                <div className="font-mono text-base font-semibold" style={{ color: C.textDark }}>{formatTime(elapsedSeconds)}</div>
              </div>
              {etaSeconds !== null && (
                <div>
                  <div className="text-xs mb-0.5" style={{ color: C.textLight }}>예상 완료</div>
                  <div className="font-mono text-base font-semibold" style={{ color: C.amber }}>
                    {etaSeconds > 0 ? `약 ${formatTime(etaSeconds)} 후` : '거의 완료...'}
                  </div>
                </div>
              )}
            </div>
            <div className="mb-1 flex justify-between items-center text-sm">
              <span style={{ color: C.textMid }}>{progressCurrent} / {progressTotal}단계 완료</span>
              <span className="font-semibold" style={{ color: C.amber }}>{Math.round((progressCurrent / progressTotal) * 100)}%</span>
            </div>
            <div className="w-full rounded-full h-2 mb-6" style={{ backgroundColor: '#F0D5C0' }}>
              <div className="h-2 rounded-full transition-all duration-700 ease-in-out" style={{ width: `${Math.round((progressCurrent / progressTotal) * 100)}%`, background: `linear-gradient(90deg, ${C.accent}, ${C.amber})` }} />
            </div>
            <div className="space-y-2 mb-4">
              {completedSteps.map((msg, i) => (
                <div key={i} className="flex items-center gap-2 text-sm" style={{ color: C.textMid }}>
                  <svg className="w-4 h-4 flex-shrink-0 text-emerald-500" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                  </svg>
                  {msg}
                </div>
              ))}
            </div>
            {progressCurrent < progressTotal && (
              <div className="flex items-center gap-2 text-sm" style={{ color: C.accent }}>
                <div className="animate-spin w-4 h-4 border-2 border-t-transparent rounded-full flex-shrink-0" style={{ borderColor: C.accent, borderTopColor: 'transparent' }} />
                {loadingMessage || 'PRD 초안을 작성하는 중입니다...'}
              </div>
            )}
          </div>
        )}

        {/* Step: Generating Full Plan */}
        {step === 'generating-full-plan' && (
          <div className="rounded-2xl p-8" style={{ backgroundColor: C.cardBg, border: `1px solid ${C.border}` }}>
            <div className="flex items-center gap-3 mb-2">
              <h2 className="text-xl font-semibold" style={{ color: C.textDark }}>풀버전 사업기획서 작성 중</h2>
              <span className="px-2.5 py-0.5 text-xs font-semibold rounded-full" style={{ backgroundColor: C.selectedBg, color: C.accent, border: `1px solid ${C.border}` }}>에이전트 팀</span>
            </div>
            <p className="text-sm mb-5" style={{ color: C.textMid }}>4개 전문 에이전트가 순차적으로 각 섹션을 심층 분석합니다.</p>
            <div className="flex gap-8 mb-5">
              <div>
                <div className="text-xs mb-0.5" style={{ color: C.textLight }}>경과 시간</div>
                <div className="font-mono text-base font-semibold" style={{ color: C.textDark }}>{formatTime(elapsedSeconds)}</div>
              </div>
              {etaSeconds !== null && (
                <div>
                  <div className="text-xs mb-0.5" style={{ color: C.textLight }}>예상 완료</div>
                  <div className="font-mono text-base font-semibold" style={{ color: C.amber }}>
                    {etaSeconds > 0 ? `약 ${formatTime(etaSeconds)} 후` : '거의 완료...'}
                  </div>
                </div>
              )}
            </div>
            <div className="mb-1 flex justify-between items-center text-sm">
              <span style={{ color: C.textMid }}>{progressCurrent} / {progressTotal}단계 완료</span>
              <span className="font-semibold" style={{ color: C.amber }}>{Math.round((progressCurrent / progressTotal) * 100)}%</span>
            </div>
            <div className="w-full rounded-full h-2 mb-6" style={{ backgroundColor: '#F0D5C0' }}>
              <div className="h-2 rounded-full transition-all duration-700 ease-in-out" style={{ width: `${Math.round((progressCurrent / progressTotal) * 100)}%`, background: `linear-gradient(90deg, ${C.accent}, ${C.amber})` }} />
            </div>
            <div className="space-y-2 mb-4">
              {completedSteps.map((msg, i) => (
                <div key={i} className="flex items-center gap-2 text-sm" style={{ color: C.textMid }}>
                  <svg className="w-4 h-4 flex-shrink-0 text-emerald-500" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                  </svg>
                  {msg}
                </div>
              ))}
            </div>
            {progressCurrent < progressTotal && (
              <div className="flex items-center gap-2 text-sm" style={{ color: C.accent }}>
                <div className="animate-spin w-4 h-4 border-2 border-t-transparent rounded-full flex-shrink-0" style={{ borderColor: C.accent, borderTopColor: 'transparent' }} />
                {loadingMessage}
              </div>
            )}
          </div>
        )}

        {/* Step: View Full Plan */}
        {step === 'view-full-plan' && fullBusinessPlans.length > 0 && (
          <div className="rounded-2xl p-8 overflow-hidden" style={{ backgroundColor: C.cardBg, border: `1px solid ${C.border}` }}>
            {(() => {
              const draftsWithoutFull = businessPlans.filter(draft => !fullBusinessPlans.some(fp => fp.ideaId === draft.ideaId));
              const showTabs = fullBusinessPlans.length > 1 || draftsWithoutFull.length > 0;
              return showTabs ? (
                <div className="flex flex-wrap gap-2 mb-6">
                  {fullBusinessPlans.map((plan, idx) => (
                    <button key={plan.ideaId} onClick={() => setCurrentFullPlanIndex(idx)}
                      className="px-4 py-2 rounded-xl text-sm font-medium whitespace-nowrap transition"
                      style={currentFullPlanIndex === idx
                        ? { background: `linear-gradient(135deg, ${C.accent}, ${C.amber})`, color: '#fff' }
                        : { backgroundColor: '#F0D5C0', color: C.textMid }
                      }
                    >{plan.ideaName}</button>
                  ))}
                  {draftsWithoutFull.map(draft => (
                    <button key={draft.ideaId} onClick={() => generateFullPlan(draft)}
                      className="px-4 py-2 rounded-xl text-sm whitespace-nowrap transition"
                      style={{ border: `2px dashed ${C.border}`, color: C.textMid, backgroundColor: 'transparent' }}
                    >{draft.ideaName} — 풀버전 생성</button>
                  ))}
                </div>
              ) : null;
            })()}

            <div>
              <div className="flex items-center justify-between mb-5">
                <div className="flex items-center gap-2">
                  <h2 className="text-xl font-bold" style={{ color: C.textDark }}>{fullBusinessPlans[currentFullPlanIndex].ideaName}</h2>
                  <span className="px-2 py-0.5 text-xs font-semibold rounded-full" style={{ backgroundColor: C.selectedBg, color: C.accent, border: `1px solid ${C.border}` }}>Full Version</span>
                </div>
                <button onClick={() => window.scrollTo({ top: document.body.scrollHeight, behavior: 'smooth' })}
                  className="flex items-center gap-1 px-3 py-1.5 text-xs rounded-lg transition"
                  style={{ border: `1px solid ${C.border}`, color: C.textMid }}
                >아래로 <svg className="w-3 h-3" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" /></svg></button>
              </div>

              <div className="mb-6" style={{ overflowWrap: 'break-word', wordBreak: 'break-word', overflow: 'hidden' }}>
                <ReactMarkdown
                  remarkPlugins={[remarkGfm]}
                  components={{
                    h2: ({ children }) => <div className="px-4 py-2 rounded-lg font-bold text-base mt-8 mb-3" style={{ backgroundColor: C.textDark, color: C.cream }}>{children}</div>,
                    h3: ({ children }) => <div className="px-4 py-2 font-semibold text-sm mt-5 mb-2 border-l-4" style={{ backgroundColor: C.selectedBg, color: C.accent, borderColor: C.accent }}>{children}</div>,
                    h4: ({ children }) => <div className="pl-3 font-semibold text-sm mt-4 mb-1 border-l-4" style={{ borderColor: C.border, color: C.textMid }}>{children}</div>,
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
                    a: ({ href, children }) => <a href={href} target="_blank" rel="noopener noreferrer" className="underline text-sm" style={{ color: C.accent }}>{children}</a>,
                    hr: () => <hr className="my-6" style={{ borderColor: C.border }} />,
                  }}
                >
                  {fullBusinessPlans[currentFullPlanIndex].content}
                </ReactMarkdown>
              </div>

              <div className="flex flex-wrap justify-between items-center gap-3 pt-4" style={{ borderTop: `1px solid ${C.border}` }}>
                <button onClick={() => setStep('view-plan')} className="px-5 py-2.5 rounded-xl text-sm transition" style={{ border: `1px solid ${C.border}`, color: C.textMid }}>초안 보기</button>
                <button onClick={() => window.scrollTo({ top: 0, behavior: 'smooth' })} className="flex items-center gap-1 px-3 py-2 rounded-xl text-xs transition" style={{ border: `1px solid ${C.border}`, color: C.textMid }}>
                  <svg className="w-3 h-3" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 15l7-7 7 7" /></svg>위로
                </button>
                <button onClick={reset} className="px-5 py-2.5 rounded-xl text-sm transition" style={{ border: `1px solid ${C.border}`, color: C.textMid }}>새로 시작</button>
                <div className="flex gap-2">
                  <button onClick={() => openSaveDialog(fullBusinessPlans[currentFullPlanIndex], 'bizplan', 'md')} className="px-4 py-2.5 rounded-xl text-sm font-medium" style={{ border: `1px solid ${C.border}`, color: C.textMid, backgroundColor: '#fff' }}>.md 저장</button>
                  <button onClick={() => openSaveDialog(fullBusinessPlans[currentFullPlanIndex], 'bizplan', 'docx')} className="px-4 py-2.5 rounded-xl text-sm font-medium" style={{ backgroundColor: '#3D6B3A', color: '#fff' }}>.docx 저장</button>
                </div>
              </div>
              <div className="mt-4 flex justify-center">
                <button onClick={() => generatePRD(fullBusinessPlans[currentFullPlanIndex], 'view-full-plan')} className="px-7 py-2.5 rounded-xl text-sm font-semibold" style={{ backgroundColor: C.textDark, color: C.cream }}>
                  개발문서(PRD) 생성하기
                </button>
              </div>
            </div>
          </div>
        )}

        {/* Step: View PRD */}
        {step === 'view-prd' && prds.length > 0 && (
          <div className="rounded-2xl p-8 overflow-hidden" style={{ backgroundColor: C.cardBg, border: `1px solid ${C.border}` }}>
            {prds.length > 1 && (
              <div className="flex gap-2 mb-6 overflow-x-auto pb-1">
                {prds.map((prd, idx) => (
                  <button key={prd.ideaId} onClick={() => setCurrentPRDIndex(idx)}
                    className="px-4 py-2 rounded-xl text-sm font-medium whitespace-nowrap transition"
                    style={currentPRDIndex === idx
                      ? { background: `linear-gradient(135deg, ${C.accent}, ${C.amber})`, color: '#fff' }
                      : { backgroundColor: '#F0D5C0', color: C.textMid }
                    }
                  >{prd.ideaName}</button>
                ))}
              </div>
            )}

            <div>
              <div className="flex items-center justify-between mb-5">
                <h2 className="text-xl font-bold" style={{ color: C.textDark }}>{prds[currentPRDIndex].ideaName} PRD</h2>
                <button onClick={() => window.scrollTo({ top: document.body.scrollHeight, behavior: 'smooth' })}
                  className="flex items-center gap-1 px-3 py-1.5 text-xs rounded-lg transition"
                  style={{ border: `1px solid ${C.border}`, color: C.textMid }}
                >아래로 <svg className="w-3 h-3" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" /></svg></button>
              </div>

              {/* 포맷 토글 */}
              <div className="flex items-center gap-2 mb-5">
                {(['markdown', 'plain'] as const).map(fmt => (
                  <button key={fmt} onClick={() => setPrdFormat(fmt)}
                    className="px-4 py-1.5 rounded-xl text-sm font-medium transition"
                    style={prdFormat === fmt
                      ? { background: `linear-gradient(135deg, ${C.accent}, ${C.amber})`, color: '#fff' }
                      : { backgroundColor: '#F0D5C0', color: C.textMid }
                    }
                  >{fmt === 'markdown' ? '마크다운 (개발자용)' : 'AI용 서식'}</button>
                ))}
                {prdFormat === 'plain' && (
                  <button onClick={() => copyToClipboard(stripMarkdownForAI(prds[currentPRDIndex].content))}
                    className="ml-auto flex items-center gap-1.5 px-3 py-1.5 text-sm rounded-xl transition"
                    style={{ border: `1px solid ${C.border}`, color: prdCopied ? '#3D6B3A' : C.textMid }}
                  >
                    {prdCopied
                      ? <><svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" /></svg>복사됨</>
                      : <><svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 16H6a2 2 0 01-2-2V6a2 2 0 012-2h8a2 2 0 012 2v2m-6 12h8a2 2 0 002-2v-8a2 2 0 00-2-2h-8a2 2 0 00-2 2v8a2 2 0 002 2z" /></svg>클립보드 복사</>
                    }
                  </button>
                )}
              </div>

              <div className="mb-6">
                {prdFormat === 'plain' ? (
                  <pre className="whitespace-pre-wrap font-mono text-sm leading-6 rounded-xl p-4" style={{ backgroundColor: '#F0D5C0', color: C.textDark }}>
                    {stripMarkdownForAI(prds[currentPRDIndex].content)}
                  </pre>
                ) : (
                  <ReactMarkdown remarkPlugins={[remarkGfm]} components={{
                    h2: ({ children }) => <div className="px-4 py-2 rounded-lg font-bold text-base mt-8 mb-3" style={{ backgroundColor: C.textDark, color: C.cream }}>{children}</div>,
                    h3: ({ children }) => <div className="px-4 py-2 font-semibold text-sm mt-5 mb-2 border-l-4" style={{ backgroundColor: C.selectedBg, color: C.accent, borderColor: C.accent }}>{children}</div>,
                    h4: ({ children }) => <div className="pl-3 font-semibold text-sm mt-4 mb-1 border-l-4" style={{ borderColor: C.border, color: C.textMid }}>{children}</div>,
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
                    a: ({ href, children }) => <a href={href} target="_blank" rel="noopener noreferrer" className="underline text-sm" style={{ color: C.accent }}>{children}</a>,
                    hr: () => <hr className="my-6" style={{ borderColor: C.border }} />,
                  }}>{prds[currentPRDIndex].content}</ReactMarkdown>
                )}
              </div>

              <div className="flex flex-wrap justify-between items-center gap-3 pt-4" style={{ borderTop: `1px solid ${C.border}` }}>
                <button onClick={() => setStep('view-plan')} className="px-5 py-2.5 rounded-xl text-sm transition" style={{ border: `1px solid ${C.border}`, color: C.textMid }}>사업기획서로 돌아가기</button>
                <button onClick={() => window.scrollTo({ top: 0, behavior: 'smooth' })} className="flex items-center gap-1 px-3 py-2 rounded-xl text-xs" style={{ border: `1px solid ${C.border}`, color: C.textMid }}>
                  <svg className="w-3 h-3" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 15l7-7 7 7" /></svg>위로
                </button>
                <button onClick={reset} className="px-5 py-2.5 rounded-xl text-sm" style={{ border: `1px solid ${C.border}`, color: C.textMid }}>새로 시작</button>
                <div className="flex gap-2">
                  <button onClick={() => openSaveDialog(prds[currentPRDIndex], 'prd', 'md')} className="px-4 py-2.5 rounded-xl text-sm font-medium" style={{ border: `1px solid ${C.border}`, color: C.textMid, backgroundColor: '#fff' }}>.md 저장</button>
                  <button onClick={() => openSaveDialog(prds[currentPRDIndex], 'prd', 'docx')} className="px-4 py-2.5 rounded-xl text-sm font-medium" style={{ backgroundColor: '#3D6B3A', color: '#fff' }}>.docx 저장</button>
                </div>
              </div>
            </div>
          </div>
        )}
      </div>

      {/* Save Dialog Modal */}
      {showSaveDialog && pendingPlan && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50">
          <div className="rounded-2xl shadow-2xl p-6 w-96" style={{ backgroundColor: C.cardBg, border: `1px solid ${C.border}` }}>
            <h3 className="text-base font-semibold mb-5" style={{ color: C.textDark }}>
              {pendingFileFormat === 'md' ? '마크다운(.md)으로 저장' : '워드(.docx) 파일로 저장'}
            </h3>
            <div className="mb-4">
              <div className="text-xs mb-1" style={{ color: C.textLight }}>파일명</div>
              <div className="text-sm px-3 py-2 rounded-lg" style={{ backgroundColor: '#F0D5C0', color: C.textDark }}>
                {(() => {
                  const prefix = pendingPlanType === 'prd' ? 'PRD' : pendingPlan.version === 'full' ? '사업기획서_Full' : '사업기획서';
                  const base = keyword ? `${prefix}_${keyword}_${pendingPlan.ideaName}` : `${prefix}_${pendingPlan.ideaName}`;
                  return `${base}.${pendingFileFormat}`;
                })()}
              </div>
            </div>
            <div className="mb-6">
              <div className="text-xs mb-1" style={{ color: C.textLight }}>저장 위치</div>
              <div className="flex items-center gap-2">
                <div className="flex-1 text-sm px-3 py-2 rounded-lg truncate" style={{ backgroundColor: '#F0D5C0', color: C.textDark }}>{dirName}</div>
                {'showDirectoryPicker' in window && (
                  <button onClick={handlePickFolder} className="px-3 py-2 text-sm rounded-lg whitespace-nowrap transition" style={{ border: `1px solid ${C.border}`, color: C.textMid }}>변경</button>
                )}
              </div>
            </div>
            <div className="flex justify-end gap-3">
              <button onClick={() => setShowSaveDialog(false)} className="px-4 py-2 rounded-xl text-sm transition" style={{ border: `1px solid ${C.border}`, color: C.textMid }}>취소</button>
              <button onClick={executeSave} className="px-5 py-2 rounded-xl text-sm font-semibold transition" style={{ backgroundColor: '#3D6B3A', color: '#fff' }}>저장</button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
