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
import ReactMarkdown from 'react-markdown';
import remarkGfm from 'remark-gfm';
import { Document, Packer, Paragraph, TextRun, Table, TableRow, TableCell, WidthType, BorderStyle, ShadingType } from 'docx';
import { Idea, BusinessPlan, WorkflowStep, AIProvider, PROVIDER_CONFIGS } from '@/lib/types';
import { SearchResult } from '@/lib/prompts';

export default function WorkflowPage() {
  const [step, setStep] = useState<WorkflowStep>('keyword');
  const [keyword, setKeyword] = useState('');
  const [ideas, setIdeas] = useState<Idea[]>([]);
  const [selectedIdeas, setSelectedIdeas] = useState<number[]>([]);
  const [businessPlans, setBusinessPlans] = useState<BusinessPlan[]>([]);
  const [currentPlanIndex, setCurrentPlanIndex] = useState(0);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [selectedProvider, setSelectedProvider] = useState<AIProvider>('ollama');
  const [availableProviders, setAvailableProviders] = useState<Record<AIProvider, boolean | null>>({
    ollama: null,
    claude: null,
    gemini: null,
    openai: null,
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
      // Step 1: Search for market trends (parallel multi-query)
      let searchData: SearchResult[] = [];
      setLoadingMessage('시장 규모·트렌드 조사 중...');
      const searchStart = Date.now();
      try {
        const base = keyword || 'SaaS AI 에이전트';
        searchData = await searchMultiple([
          `${base} SaaS 시장 규모 성장률 트렌드 2025`,
          `${base} B2B B2C 솔루션 스타트업 투자 기회`,
          `${base} AI 자동화 에이전트 적용 사례 2025`,
        ]);
        setSearchResults(searchData);
      } catch (searchErr) {
        console.log('Search failed, continuing without search results:', searchErr);
      }
      updateStoredTiming('ideaSearch', Date.now() - searchStart);
      setProgressCurrent(1);
      setCompletedSteps([`시장 자료 ${searchData.length}건 수집 완료`]);
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
          model: PROVIDER_CONFIGS[selectedProvider].model,
          type: 'generate-ideas',
          keyword: keyword || undefined,
          searchResults: searchData,
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
            model: PROVIDER_CONFIGS[selectedProvider].model,
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
    return text.split(/(\*\*[^*]+\*\*)/).map((part) => {
      if (part.startsWith('**') && part.endsWith('**')) {
        return new TextRun({ text: part.slice(2, -2), bold: true });
      }
      return new TextRun({ text: part });
    });
  }

  async function buildDocxBlob(plan: BusinessPlan): Promise<Blob> {
    const lines = plan.content.split('\n');
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const children: any[] = [];
    let i = 0;

    while (i < lines.length) {
      const line = lines[i];

      // H1: # 제목 (## 아님)
      if (/^# /.test(line) && !/^##/.test(line)) {
        children.push(new Paragraph({
          children: [new TextRun({ text: line.slice(2), bold: true, size: 36, color: '111827' })],
          spacing: { before: 400, after: 200 },
        }));
        i++;

      // H2: ## → 짙은 슬레이트 배경 + 흰 글자 (브라우저: bg-slate-700 #334155)
      } else if (/^## /.test(line) && !/^###/.test(line)) {
        children.push(new Paragraph({
          children: [new TextRun({ text: line.slice(3), color: 'FFFFFF', bold: true, size: 28 })],
          shading: { type: ShadingType.SOLID, color: '334155', fill: '334155' },
          spacing: { before: 480, after: 160 },
          indent: { left: 160, right: 160 },
        }));
        i++;

      // H3: ### → 파란 좌측 보더 (브라우저: border-l-4 border-blue-500 text-blue-800)
      } else if (/^### /.test(line) && !/^####/.test(line)) {
        children.push(new Paragraph({
          children: [new TextRun({ text: line.slice(4), color: '1E40AF', bold: true, size: 24 })],
          border: { left: { style: BorderStyle.SINGLE, size: 24, color: '3B82F6', space: 8 } },
          indent: { left: 180 },
          spacing: { before: 280, after: 80 },
        }));
        i++;

      // H4: #### → 회색 좌측 보더 (브라우저: border-l-4 border-gray-400)
      } else if (/^#### /.test(line)) {
        children.push(new Paragraph({
          children: [new TextRun({ text: line.slice(5), color: '374151', bold: true, size: 22 })],
          border: { left: { style: BorderStyle.SINGLE, size: 12, color: '9CA3AF', space: 8 } },
          indent: { left: 160 },
          spacing: { before: 200, after: 60 },
        }));
        i++;

      // 표: | 가 있고 다음 줄이 구분선(|---|---|)인 경우
      } else if (line.includes('|') && /^\s*\|[\s\-:|]+\|\s*$/.test(lines[i + 1] || '')) {
        const headerCells = line.split('|').slice(1, -1).map(c => c.trim());
        const colCount = headerCells.length;
        i += 2; // 헤더 + 구분선 건너뜀
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
                shading: { fill: 'E2E8F0', type: ShadingType.SOLID, color: 'auto' },
                children: [new Paragraph({ children: [new TextRun({ text, bold: true, size: 20 })] })],
              })),
            }),
            ...bodyRows.map(row => {
              const cells = [...row];
              while (cells.length < colCount) cells.push('');
              return new TableRow({
                children: cells.slice(0, colCount).map(text => new TableCell({
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
          border: { bottom: { style: BorderStyle.SINGLE, size: 6, color: 'E5E7EB', space: 1 } },
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

  function openSaveDialog(plan: BusinessPlan) {
    setPendingPlan(plan);
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
    const blob = await buildDocxBlob(pendingPlan);
    const fileName = keyword
      ? `사업기획서_${keyword}_${pendingPlan.ideaName}.docx`
      : `사업기획서_${pendingPlan.ideaName}.docx`;
    if (dirHandle) {
      try {
        const fileHandle = await dirHandle.getFileHandle(fileName, { create: true });
        const writable = await fileHandle.createWritable();
        await writable.write(blob);
        await writable.close();
      } catch {
        // 권한 오류 등 실패 시 브라우저 다운로드로 폴백
        triggerBrowserDownload(blob, fileName);
      }
    } else {
      triggerBrowserDownload(blob, fileName);
    }
  }

  function reset() {
    stopTimer();
    setStep('keyword');
    setKeyword('');
    setIdeas([]);
    setSelectedIdeas([]);
    setBusinessPlans([]);
    setCurrentPlanIndex(0);
    setError(null);
    setRawResponse('');
  }

  return (
    <div className="min-h-screen bg-gray-50">
      <div className="max-w-4xl mx-auto py-12 px-4">
        {/* Header */}
        <div className="text-center mb-12">
          <h1 className="text-3xl font-bold text-gray-900 mb-2">
            SaaS 사업기획안 도출
          </h1>
          <p className="text-gray-700">
            AI가 유망한 SaaS 아이디어를 발굴하고 사업기획서를 작성합니다
          </p>
        </div>

        {/* Provider Status */}
        <div className="mb-8 text-center">
          {availableProviders[selectedProvider] === null ? (
            <span className="text-gray-500 text-sm">AI 모델 상태 확인 중...</span>
          ) : availableProviders[selectedProvider] ? (
            <span className="text-green-600 text-sm">
              ● {PROVIDER_CONFIGS[selectedProvider].label} 사용 가능
            </span>
          ) : (
            <span className="text-red-500 text-sm">
              ● {PROVIDER_CONFIGS[selectedProvider].label} 사용 불가
              {selectedProvider === 'ollama' && ' — ollama serve 실행 필요'}
              {selectedProvider !== 'ollama' && ' — .env.local에 API 키 추가 필요'}
            </span>
          )}
        </div>

        {/* Progress Steps */}
        <div className="flex justify-center mb-12">
          <div className="flex items-center space-x-4">
            {['키워드 입력', '아이디어 선택', '기획서 작성', '완료'].map(
              (label, idx) => {
                const stepOrder = ['keyword', 'select-ideas', 'view-plan', 'complete'];
                const currentIdx = stepOrder.indexOf(step);
                const isActive = idx <= currentIdx || step === 'generating-ideas' || step === 'generating-plan';

                return (
                  <div key={label} className="flex items-center">
                    <div
                      className={`w-8 h-8 rounded-full flex items-center justify-center text-sm font-medium ${
                        isActive
                          ? 'bg-blue-600 text-white'
                          : 'bg-gray-200 text-gray-600'
                      }`}
                    >
                      {idx + 1}
                    </div>
                    <span
                      className={`ml-2 text-sm ${
                        isActive ? 'text-gray-900' : 'text-gray-600'
                      }`}
                    >
                      {label}
                    </span>
                    {idx < 3 && (
                      <div
                        className={`w-12 h-0.5 mx-4 ${
                          idx < currentIdx ? 'bg-blue-600' : 'bg-gray-200'
                        }`}
                      />
                    )}
                  </div>
                );
              }
            )}
          </div>
        </div>

        {/* Error Display */}
        {error && (
          <div className="mb-8 p-4 bg-red-50 border border-red-200 rounded-lg text-red-700">
            {error}
          </div>
        )}

        {/* Step: Keyword Input */}
        {step === 'keyword' && (
          <div className="bg-white rounded-lg shadow p-8">
            {/* AI Model Selector */}
            <div className="mb-8">
              <h2 className="text-sm font-semibold text-gray-500 uppercase tracking-wide mb-3">
                사용할 AI 모델 선택
              </h2>
              <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
                {(Object.keys(PROVIDER_CONFIGS) as AIProvider[]).map((provider) => {
                  const cfg = PROVIDER_CONFIGS[provider];
                  const available = availableProviders[provider];
                  const isSelected = selectedProvider === provider;
                  return (
                    <button
                      key={provider}
                      onClick={() => setSelectedProvider(provider)}
                      className={`relative p-3 rounded-lg border-2 text-left transition ${
                        isSelected
                          ? 'border-blue-600 bg-blue-50'
                          : 'border-gray-200 hover:border-gray-300'
                      }`}
                    >
                      <div className="font-medium text-sm text-gray-900">{cfg.label}</div>
                      <div className="text-xs text-gray-500 mt-0.5">{cfg.description}</div>
                      <div className="mt-1.5">
                        {available === null ? (
                          <span className="text-xs text-gray-400">확인 중...</span>
                        ) : available ? (
                          <span className="text-xs text-green-600">● 사용 가능</span>
                        ) : (
                          <span className="text-xs text-red-400">● 미설정</span>
                        )}
                      </div>
                    </button>
                  );
                })}
              </div>
            </div>

            <h2 className="text-xl font-semibold mb-4 text-gray-900">
              서비스 아이템을 브레인스토밍해보려고 합니다
            </h2>
            <p className="text-gray-700 mb-6">
              특별히 원하는 키워드가 있으면 넣어주세요. (옵션)
            </p>
            <input
              type="text"
              value={keyword}
              onChange={(e) => setKeyword(e.target.value)}
              onKeyDown={(e) => {
                if (e.key === 'Enter' && isProviderReady()) {
                  generateIdeas();
                }
              }}
              placeholder="예: AI, 헬스케어, 교육, 생산성..."
              className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 outline-none text-gray-900 placeholder:text-gray-400"
            />
            <div className="mt-6 flex justify-end">
              <button
                onClick={generateIdeas}
                disabled={!isProviderReady()}
                className="px-6 py-3 bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:bg-gray-400 disabled:cursor-not-allowed transition"
              >
                아이디어 발굴 시작
              </button>
            </div>
          </div>
        )}

        {/* Step: Generating Ideas */}
        {step === 'generating-ideas' && (
          <div className="bg-white rounded-lg shadow p-8">
            <h2 className="text-xl font-semibold mb-4 text-gray-900">아이디어 발굴 중</h2>

            {/* Time info */}
            <div className="flex gap-8 mb-5">
              <div>
                <div className="text-xs text-gray-400 mb-0.5">경과 시간</div>
                <div className="font-mono text-base font-semibold text-gray-700">{formatTime(elapsedSeconds)}</div>
              </div>
              {etaSeconds !== null && (
                <div>
                  <div className="text-xs text-gray-400 mb-0.5">예상 완료</div>
                  <div className="font-mono text-base font-semibold text-blue-600">
                    {etaSeconds > 0 ? `약 ${formatTime(etaSeconds)} 후` : '거의 완료...'}
                  </div>
                </div>
              )}
            </div>

            {/* Progress bar */}
            <div className="mb-1 flex justify-between items-center text-sm">
              <span className="text-gray-500">{progressCurrent} / {progressTotal}단계 완료</span>
              <span className="font-medium text-blue-600">
                {Math.round((progressCurrent / progressTotal) * 100)}%
              </span>
            </div>
            <div className="w-full bg-gray-100 rounded-full h-2 mb-6">
              <div
                className="bg-blue-600 h-2 rounded-full transition-all duration-700 ease-in-out"
                style={{ width: `${Math.round((progressCurrent / progressTotal) * 100)}%` }}
              />
            </div>

            {/* Completed steps */}
            <div className="space-y-2 mb-4">
              {completedSteps.map((msg, i) => (
                <div key={i} className="flex items-center gap-2 text-sm text-gray-500">
                  <svg className="w-4 h-4 text-green-500 flex-shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                  </svg>
                  {msg}
                </div>
              ))}
            </div>

            {/* Current step */}
            {progressCurrent < progressTotal && (
              <div className="flex items-center gap-2 text-sm text-blue-600">
                <div className="animate-spin w-4 h-4 border-2 border-blue-600 border-t-transparent rounded-full flex-shrink-0" />
                {loadingMessage}
              </div>
            )}
          </div>
        )}

        {/* Step: Select Ideas */}
        {step === 'select-ideas' && (
          <div className="bg-white rounded-lg shadow p-8">
            <h2 className="text-xl font-semibold mb-4 text-gray-900">
              진행할 아이디어를 선택해주세요
            </h2>
            <p className="text-gray-700 mb-6">
              상세 사업기획서를 작성할 아이디어를 선택하세요. (복수 선택 가능)
            </p>

            <div className="space-y-4 mb-6">
              {ideas.map((idea) => (
                <div
                  key={idea.id}
                  onClick={() => toggleIdeaSelection(idea.id)}
                  className={`p-6 border-2 rounded-lg cursor-pointer transition ${
                    selectedIdeas.includes(idea.id)
                      ? 'border-blue-600 bg-blue-50'
                      : 'border-gray-200 hover:border-gray-300'
                  }`}
                >
                  <div className="flex items-start">
                    <div
                      className={`w-6 h-6 rounded border-2 flex items-center justify-center mr-4 flex-shrink-0 ${
                        selectedIdeas.includes(idea.id)
                          ? 'border-blue-600 bg-blue-600'
                          : 'border-gray-300'
                      }`}
                    >
                      {selectedIdeas.includes(idea.id) && (
                        <svg
                          className="w-4 h-4 text-white"
                          fill="none"
                          viewBox="0 0 24 24"
                          stroke="currentColor"
                        >
                          <path
                            strokeLinecap="round"
                            strokeLinejoin="round"
                            strokeWidth={2}
                            d="M5 13l4 4L19 7"
                          />
                        </svg>
                      )}
                    </div>
                    <div className="flex-1">
                      <div className="flex items-center gap-2 mb-2">
                        <h3 className="font-semibold text-lg text-gray-900">{idea.name}</h3>
                        {idea.category && (
                          <span className="px-2 py-0.5 bg-purple-100 text-purple-700 text-xs rounded-full">
                            {idea.category}
                          </span>
                        )}
                        {idea.mvpDifficulty && (
                          <span className={`px-2 py-0.5 text-xs rounded-full ${
                            idea.mvpDifficulty === '하' ? 'bg-green-100 text-green-700' :
                            idea.mvpDifficulty === '중' ? 'bg-yellow-100 text-yellow-700' :
                            'bg-red-100 text-red-700'
                          }`}>
                            난이도: {idea.mvpDifficulty}
                          </span>
                        )}
                      </div>
                      <p className="text-gray-800 mb-2">{idea.oneLiner}</p>
                      {idea.problem && (
                        <p className="text-sm text-gray-700 mb-2">
                          <span className="font-medium">해결 문제:</span> {idea.problem}
                        </p>
                      )}
                      <div className="text-sm text-gray-700 flex flex-wrap gap-x-4 gap-y-1">
                        <span>타깃: {idea.target}</span>
                        <span>수익모델: {idea.revenueModel}</span>
                      </div>
                      {idea.features && idea.features.length > 0 && (
                        <div className="mt-2 flex flex-wrap gap-1">
                          {idea.features.map((feature, idx) => (
                            <span key={idx} className="px-2 py-0.5 bg-gray-100 text-gray-700 text-xs rounded">
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
              <summary className="cursor-pointer text-sm text-gray-700 hover:text-gray-900">
                AI 원본 응답 보기
              </summary>
              <pre className="mt-2 p-4 bg-gray-100 rounded text-xs overflow-auto max-h-96 whitespace-pre-wrap text-gray-800">
                {rawResponse}
              </pre>
            </details>

            <div className="flex justify-between items-center">
              <button
                onClick={reset}
                className="px-6 py-3 border border-gray-300 rounded-lg hover:bg-gray-50 transition"
              >
                처음으로
              </button>
              <button
                onClick={() => window.location.href = '/'}
                className="px-6 py-3 bg-red-500 text-white rounded-lg hover:bg-red-600 transition"
              >
                모두 진행 중단
              </button>
              <button
                onClick={generateBusinessPlan}
                disabled={selectedIdeas.length === 0}
                className="px-6 py-3 bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:bg-gray-400 disabled:cursor-not-allowed transition"
              >
                사업기획서 작성 ({selectedIdeas.length}개 선택)
              </button>
            </div>
          </div>
        )}

        {/* Step: Generating Plan */}
        {step === 'generating-plan' && (
          <div className="bg-white rounded-lg shadow p-8">
            <h2 className="text-xl font-semibold mb-4 text-gray-900">사업기획서 작성 중</h2>

            {/* Time info */}
            <div className="flex gap-8 mb-5">
              <div>
                <div className="text-xs text-gray-400 mb-0.5">경과 시간</div>
                <div className="font-mono text-base font-semibold text-gray-700">{formatTime(elapsedSeconds)}</div>
              </div>
              {etaSeconds !== null && (
                <div>
                  <div className="text-xs text-gray-400 mb-0.5">예상 완료</div>
                  <div className="font-mono text-base font-semibold text-blue-600">
                    {etaSeconds > 0 ? `약 ${formatTime(etaSeconds)} 후` : '거의 완료...'}
                  </div>
                </div>
              )}
            </div>

            {/* Progress bar */}
            <div className="mb-1 flex justify-between items-center text-sm">
              <span className="text-gray-500">{progressCurrent} / {progressTotal}단계 완료</span>
              <span className="font-medium text-blue-600">
                {Math.round((progressCurrent / progressTotal) * 100)}%
              </span>
            </div>
            <div className="w-full bg-gray-100 rounded-full h-2 mb-6">
              <div
                className="bg-blue-600 h-2 rounded-full transition-all duration-700 ease-in-out"
                style={{ width: `${Math.round((progressCurrent / progressTotal) * 100)}%` }}
              />
            </div>

            {/* Completed steps */}
            <div className="space-y-2 mb-4">
              {completedSteps.map((msg, i) => (
                <div key={i} className="flex items-center gap-2 text-sm text-gray-500">
                  <svg className="w-4 h-4 text-green-500 flex-shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                  </svg>
                  {msg}
                </div>
              ))}
            </div>

            {/* Current step */}
            {progressCurrent < progressTotal && (
              <div className="flex items-center gap-2 text-sm text-blue-600">
                <div className="animate-spin w-4 h-4 border-2 border-blue-600 border-t-transparent rounded-full flex-shrink-0" />
                {loadingMessage}
              </div>
            )}
          </div>
        )}

        {/* Step: View Plan */}
        {step === 'view-plan' && businessPlans.length > 0 && (
          <div className="bg-white rounded-lg shadow p-8">
            {/* Plan Tabs */}
            {businessPlans.length > 1 && (
              <div className="flex space-x-2 mb-6 overflow-x-auto">
                {businessPlans.map((plan, idx) => (
                  <button
                    key={plan.ideaId}
                    onClick={() => setCurrentPlanIndex(idx)}
                    className={`px-4 py-2 rounded-lg whitespace-nowrap ${
                      currentPlanIndex === idx
                        ? 'bg-blue-600 text-white'
                        : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
                    }`}
                  >
                    {plan.ideaName}
                  </button>
                ))}
              </div>
            )}

            {/* Current Plan */}
            <div>
              <div className="flex items-center justify-between mb-4">
                <h2 className="text-2xl font-bold">
                  {businessPlans[currentPlanIndex].ideaName}
                </h2>
                <button
                  onClick={() => window.scrollTo({ top: document.body.scrollHeight, behavior: 'smooth' })}
                  className="flex items-center gap-1 px-3 py-1.5 text-sm text-gray-500 border border-gray-200 rounded-lg hover:bg-gray-50 transition"
                >
                  제일 아래로
                  <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
                  </svg>
                </button>
              </div>
              <div className="mb-6">
                <ReactMarkdown
                  remarkPlugins={[remarkGfm]}
                  components={{
                    h2: ({ children }) => (
                      <div className="bg-slate-700 text-white px-4 py-2 rounded-lg font-bold text-lg mt-8 mb-3">
                        {children}
                      </div>
                    ),
                    h3: ({ children }) => (
                      <div className="bg-blue-50 text-blue-800 px-4 py-2 border-l-4 border-blue-500 font-semibold text-base mt-5 mb-2">
                        {children}
                      </div>
                    ),
                    h4: ({ children }) => (
                      <div className="border-l-4 border-gray-400 pl-3 font-semibold text-gray-700 text-sm mt-4 mb-1">
                        {children}
                      </div>
                    ),
                    p: ({ children }) => (
                      <p className="text-sm text-gray-700 leading-7 my-2">{children}</p>
                    ),
                    ul: ({ children }) => (
                      <ul className="ml-5 my-2 space-y-1 list-disc">{children}</ul>
                    ),
                    ol: ({ children }) => (
                      <ol className="ml-5 my-2 space-y-1 list-decimal">{children}</ol>
                    ),
                    li: ({ children }) => (
                      <li className="text-sm text-gray-700 leading-7">{children}</li>
                    ),
                    strong: ({ children }) => (
                      <strong className="font-bold text-gray-900">{children}</strong>
                    ),
                    table: ({ children }) => (
                      <div className="overflow-x-auto my-4">
                        <table className="w-full border-collapse text-sm">{children}</table>
                      </div>
                    ),
                    thead: ({ children }) => (
                      <thead className="bg-slate-100">{children}</thead>
                    ),
                    tbody: ({ children }) => (
                      <tbody className="divide-y divide-gray-200">{children}</tbody>
                    ),
                    tr: ({ children }) => (
                      <tr className="hover:bg-gray-50">{children}</tr>
                    ),
                    th: ({ children }) => (
                      <th className="border border-gray-300 px-3 py-2 text-left font-semibold text-gray-800 text-sm">{children}</th>
                    ),
                    td: ({ children }) => (
                      <td className="border border-gray-300 px-3 py-2 text-gray-700 text-sm leading-6">{children}</td>
                    ),
                    a: ({ href, children }) => (
                      <a href={href} target="_blank" rel="noopener noreferrer" className="text-blue-600 underline text-sm hover:text-blue-800">{children}</a>
                    ),
                    hr: () => (
                      <hr className="border-gray-200 my-6" />
                    ),
                  }}
                >
                  {businessPlans[currentPlanIndex].content}
                </ReactMarkdown>
              </div>

              <div className="flex justify-between items-center">
                <button
                  onClick={reset}
                  className="px-6 py-3 border border-gray-300 rounded-lg hover:bg-gray-50 transition"
                >
                  새로 시작
                </button>
                <button
                  onClick={() => window.scrollTo({ top: 0, behavior: 'smooth' })}
                  className="flex items-center gap-1 px-3 py-1.5 text-sm text-gray-500 border border-gray-200 rounded-lg hover:bg-gray-50 transition"
                >
                  <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 15l7-7 7 7" />
                  </svg>
                  제일 위로
                </button>
                <button
                  onClick={() => openSaveDialog(businessPlans[currentPlanIndex])}
                  className="px-6 py-3 bg-green-600 text-white rounded-lg hover:bg-green-700 transition"
                >
                  워드 파일로 저장
                </button>
              </div>
            </div>
          </div>
        )}
      </div>

      {/* Save Dialog Modal */}
      {showSaveDialog && pendingPlan && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50">
          <div className="bg-white rounded-xl shadow-xl p-6 w-96">
            <h3 className="text-lg font-semibold text-gray-900 mb-5">워드 파일로 저장</h3>

            <div className="mb-4">
              <div className="text-xs text-gray-500 mb-1">파일명</div>
              <div className="text-sm text-gray-900 bg-gray-50 px-3 py-2 rounded border border-gray-200">
                {keyword ? `사업기획서_${keyword}_${pendingPlan.ideaName}.docx` : `사업기획서_${pendingPlan.ideaName}.docx`}
              </div>
            </div>

            <div className="mb-6">
              <div className="text-xs text-gray-500 mb-1">저장 위치</div>
              <div className="flex items-center gap-2">
                <div className="flex-1 text-sm text-gray-900 bg-gray-50 px-3 py-2 rounded border border-gray-200 truncate">
                  {dirName}
                </div>
                {'showDirectoryPicker' in window && (
                  <button
                    onClick={handlePickFolder}
                    className="px-3 py-2 text-sm border border-gray-300 rounded-lg hover:bg-gray-50 whitespace-nowrap"
                  >
                    변경
                  </button>
                )}
              </div>
            </div>

            <div className="flex justify-end gap-3">
              <button
                onClick={() => setShowSaveDialog(false)}
                className="px-4 py-2 border border-gray-300 rounded-lg text-sm hover:bg-gray-50"
              >
                취소
              </button>
              <button
                onClick={executeSave}
                className="px-4 py-2 bg-green-600 text-white rounded-lg text-sm hover:bg-green-700"
              >
                저장
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
