'use client';

import { useState, useEffect } from 'react';
import { Idea, BusinessPlan, WorkflowStep, AIProvider, PROVIDER_CONFIGS } from '@/lib/types';
import { createIdeaGenerationPrompt, createBusinessPlanPrompt, SearchResult } from '@/lib/prompts';

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

  useEffect(() => {
    checkProviders();
  }, []);

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

  async function generateIdeas() {
    setIsLoading(true);
    setError(null);
    setStep('generating-ideas');
    setSearchResults([]);

    try {
      // Step 1: Search for market trends
      let searchData: SearchResult[] = [];
      if (keyword) {
        setLoadingMessage('시장 트렌드 검색 중...');
        try {
          const searchRes = await fetch('/api/search', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ query: `${keyword} SaaS 트렌드 시장 2024`, count: 5 }),
          });
          if (searchRes.ok) {
            const data = await searchRes.json();
            searchData = data.results || [];
            setSearchResults(searchData);
          }
        } catch (searchErr) {
          console.log('Search failed, continuing without search results:', searchErr);
        }
      }

      // Step 2: Generate ideas with search context
      setLoadingMessage('AI가 아이디어를 분석하고 있습니다...');
      const prompt = createIdeaGenerationPrompt(keyword || undefined, searchData);

      const res = await fetch('/api/generate', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          provider: selectedProvider,
          model: PROVIDER_CONFIGS[selectedProvider].model,
          prompt,
          type: 'json',
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

      setStep('select-ideas');
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Unknown error');
      setStep('keyword');
    } finally {
      setIsLoading(false);
      setLoadingMessage('');
    }
  }

  async function generateBusinessPlan() {
    if (selectedIdeas.length === 0) return;

    setIsLoading(true);
    setError(null);
    setStep('generating-plan');
    setBusinessPlans([]);

    try {
      const plans: BusinessPlan[] = [];

      for (const ideaId of selectedIdeas) {
        const idea = ideas.find((i) => i.id === ideaId);
        if (!idea) continue;

        // Step 1: Search for relevant market data and competitors
        setLoadingMessage(`"${idea.name}" 관련 시장 조사 중...`);
        let planSearchResults: SearchResult[] = [];
        try {
          const searchRes = await fetch('/api/search', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
              query: `${idea.name} ${idea.target} 시장 경쟁사 트렌드`,
              count: 5,
            }),
          });
          if (searchRes.ok) {
            const data = await searchRes.json();
            planSearchResults = data.results || [];
          }
        } catch (searchErr) {
          console.log('Search failed for business plan:', searchErr);
        }

        // Step 2: Generate business plan with search context
        setLoadingMessage(`"${idea.name}" 사업기획서 작성 중...`);
        const prompt = createBusinessPlanPrompt(idea, planSearchResults);

        const res = await fetch('/api/generate', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            provider: selectedProvider,
            model: PROVIDER_CONFIGS[selectedProvider].model,
            prompt,
          }),
        });

        if (!res.ok) {
          throw new Error(`Failed to generate plan for ${idea.name}`);
        }

        const data = await res.json();

        plans.push({
          ideaId: idea.id,
          ideaName: idea.name,
          content: data.response,
          createdAt: new Date().toISOString(),
        });
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
    }
  }

  function toggleIdeaSelection(id: number) {
    setSelectedIdeas((prev) =>
      prev.includes(id) ? prev.filter((i) => i !== id) : [...prev, id]
    );
  }

  function downloadPlan(plan: BusinessPlan) {
    const blob = new Blob([plan.content], { type: 'text/markdown' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `사업기획안_${plan.ideaName}.md`;
    a.click();
    URL.revokeObjectURL(url);
  }

  function reset() {
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
          <div className="bg-white rounded-lg shadow p-8 text-center">
            <div className="animate-spin w-12 h-12 border-4 border-blue-600 border-t-transparent rounded-full mx-auto mb-4" />
            <h2 className="text-xl font-semibold mb-2 text-gray-900">
              아이디어 발굴 중...
            </h2>
            <p className="text-gray-700">
              {loadingMessage || 'AI가 유망한 SaaS 아이디어를 분석하고 있습니다'}
            </p>
            {searchResults.length > 0 && (
              <div className="mt-4 text-sm text-green-600">
                ✓ {searchResults.length}개의 시장 조사 자료를 수집했습니다
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
          <div className="bg-white rounded-lg shadow p-8 text-center">
            <div className="animate-spin w-12 h-12 border-4 border-blue-600 border-t-transparent rounded-full mx-auto mb-4" />
            <h2 className="text-xl font-semibold mb-2 text-gray-900">
              사업기획서 작성 중...
            </h2>
            <p className="text-gray-700">
              {loadingMessage || '선택하신 아이디어에 대한 상세 기획서를 작성하고 있습니다'}
            </p>
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
              <h2 className="text-2xl font-bold mb-4">
                {businessPlans[currentPlanIndex].ideaName}
              </h2>
              <div className="prose max-w-none mb-6">
                <pre className="whitespace-pre-wrap bg-gray-50 p-6 rounded-lg text-sm text-gray-900 leading-relaxed">
                  {businessPlans[currentPlanIndex].content}
                </pre>
              </div>

              <div className="flex justify-between">
                <button
                  onClick={reset}
                  className="px-6 py-3 border border-gray-300 rounded-lg hover:bg-gray-50 transition"
                >
                  새로 시작
                </button>
                <button
                  onClick={() => downloadPlan(businessPlans[currentPlanIndex])}
                  className="px-6 py-3 bg-green-600 text-white rounded-lg hover:bg-green-700 transition"
                >
                  마크다운 파일로 저장
                </button>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
