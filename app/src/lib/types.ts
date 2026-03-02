export interface Idea {
  id: number;
  name: string;
  category: string;
  oneLiner: string;
  target: string;
  problem: string;
  features: string[];
  differentiation: string;
  revenueModel: string;
  mvpDifficulty: string;
  rationale: string;
  vibeCoding?: string;
}

export interface BusinessPlan {
  ideaId: number;
  ideaName: string;
  content: string;
  createdAt: string;
  version?: 'draft' | 'full';
}

export interface PRD {
  ideaId: number;
  ideaName: string;
  content: string;
  createdAt: string;
}

// ── DB 저장용 타입 (히스토리/대시보드) ──

export interface SavedIdeaSummary {
  id: string;
  localId: number;
  keyword: string | null;
  name: string;
  category: string;
  oneLiner: string;
  preset: string | null;
  createdAt: string;
  _count: {
    businessPlans: number;
    prds: number;
  };
}

export interface SavedBusinessPlan {
  id: string;
  ideaName: string;
  version: string;
  content: string;
  createdAt: string;
}

export interface SavedPRD {
  id: string;
  ideaName: string;
  content: string;
  createdAt: string;
}

export interface SavedIdeaDetail extends Omit<SavedIdeaSummary, '_count'> {
  target: string;
  problem: string;
  features: string[];
  differentiation: string;
  revenueModel: string;
  mvpDifficulty: string;
  rationale: string;
  businessPlans: SavedBusinessPlan[];
  prds: SavedPRD[];
}

export interface HistoryResponse {
  ideas: SavedIdeaSummary[];
  total: number;
  page: number;
  pageSize: number;
  totalPages: number;
}

export type WorkflowStep =
  | 'keyword'
  | 'generating-ideas'
  | 'select-ideas'
  | 'generating-plan'
  | 'view-plan'
  | 'generating-prd'
  | 'view-prd'
  | 'generating-full-plan'
  | 'view-full-plan'
  | 'complete';

export type IdeaCategory =
  | '정서적 공명 웰니스 에이전트'
  | '버티컬 B2B 에이전트'
  | 'AI 품질 보증/디버깅 도구';

export type AIProvider = 'ollama' | 'claude' | 'gemini' | 'openai';

export interface ModelOption {
  id: string;
  label: string;
  description: string;
  // 1–5점 기준: quality=품질, speed=속도(높을수록 빠름), cost=비용효율(높을수록 저렴)
  // 출처: Chatbot Arena ELO, 공식 가격표, 실측 토큰속도 추정치
  quality: number;
  speed: number;
  cost: number;
}

export interface ProviderConfig {
  label: string;
  description: string;
  defaultModel: string;
  models: ModelOption[];
}

// --- Guided flow types ---

export interface GuidedAnswers {
  serviceName: string;
  serviceOneLiner: string;
  category: string;
  targetCustomer: string;
  problem: string;
  features: string[];
  differentiation: string;
  revenueModel: string;
  vibeCoding: string;
  mvpDifficulty: string;
}

export type GuidedStep = 1 | 2 | 3 | 4 | 5 | 6 | 7 | 8 | 9 | 'generating' | 'complete';

export interface GuidedResult {
  idea: Idea;
  businessPlan: BusinessPlan;
  preset: QualityPreset;
  importedPlanContent?: string;
}

export const GUIDED_RESULT_KEY = 'guided-result';

// --- Provider configs ---

export const PROVIDER_CONFIGS: Record<AIProvider, ProviderConfig> = {
  claude: {
    label: 'Claude',
    description: 'Anthropic',
    defaultModel: 'claude-sonnet-4-6',
    models: [
      { id: 'claude-haiku-4-5-20251001', label: 'Haiku 4.5',  description: '빠름·저렴',   quality: 3, speed: 5, cost: 5 },
      { id: 'claude-sonnet-4-6',         label: 'Sonnet 4.6', description: '균형 (추천)', quality: 4, speed: 4, cost: 3 },
      { id: 'claude-opus-4-6',           label: 'Opus 4.6',   description: '최고 성능',   quality: 5, speed: 3, cost: 1 },
    ],
  },
  gemini: {
    label: 'Gemini',
    description: 'Google',
    defaultModel: 'gemini-2.5-flash',
    models: [
      { id: 'gemini-2.5-flash-lite', label: 'Flash 2.5 Lite', description: '빠름·저렴',   quality: 3, speed: 5, cost: 5 },
      { id: 'gemini-2.5-flash',      label: 'Flash 2.5',      description: '균형 (추천)', quality: 4, speed: 4, cost: 4 },
      { id: 'gemini-2.5-pro',        label: 'Pro 2.5',        description: '최고 성능',   quality: 5, speed: 3, cost: 2 },
    ],
  },
  openai: {
    label: 'OpenAI',
    description: 'GPT',
    defaultModel: 'gpt-4o',
    models: [
      { id: 'gpt-4o-mini', label: 'GPT-4o mini', description: '빠름·저렴',   quality: 3, speed: 5, cost: 5 },
      { id: 'gpt-4o',      label: 'GPT-4o',      description: '균형 (추천)', quality: 4, speed: 4, cost: 3 },
      { id: 'gpt-4.1',     label: 'GPT-4.1',     description: '최신',        quality: 5, speed: 4, cost: 2 },
    ],
  },
  ollama: {
    label: 'Ollama',
    description: '로컬 실행 (무료)',
    defaultModel: 'gemma2:9b',
    models: [
      { id: 'gemma2:9b', label: 'gemma2:9b', description: '기본', quality: 3, speed: 2, cost: 5 },
    ],
  },
};

// --- 프리셋 기반 멀티모델 라우팅 ---

export type QualityPreset = 'standard' | 'premium';

export interface PresetModelConfig {
  provider: AIProvider;
  model: string;
}

/**
 * 모듈별 프리셋 → fallback chain.
 * 서버에서 첫 번째 사용 가능한 provider(API 키 존재)를 자동 선택한다.
 *
 * Standard: 비용 효율 (GPT 중심, Gemini Flash 보조)
 * Premium:  최고 품질 3자 혼합 (Claude 한국어 서술 + Gemini Pro 데이터 분석 + GPT-5 추론)
 */
export const MODULE_PRESETS: Record<QualityPreset, Record<string, PresetModelConfig[]>> = {
  standard: {
    'generate-ideas':        [{ provider: 'openai', model: 'gpt-4.1-mini' },    { provider: 'gemini', model: 'gemini-2.5-flash' },     { provider: 'claude', model: 'claude-haiku-4-5-20251001' }],
    'business-plan':         [{ provider: 'openai', model: 'gpt-5' },           { provider: 'gemini', model: 'gemini-2.5-pro' },        { provider: 'claude', model: 'claude-sonnet-4-6' }],
    'full-plan-market':      [{ provider: 'openai', model: 'gpt-4.1-mini' },    { provider: 'gemini', model: 'gemini-2.5-flash' },      { provider: 'claude', model: 'claude-haiku-4-5-20251001' }],
    'full-plan-competition': [{ provider: 'openai', model: 'gpt-4.1-mini' },    { provider: 'gemini', model: 'gemini-2.5-flash' },      { provider: 'claude', model: 'claude-haiku-4-5-20251001' }],
    'full-plan-strategy':    [{ provider: 'openai', model: 'gpt-5' },           { provider: 'gemini', model: 'gemini-2.5-pro' },        { provider: 'claude', model: 'claude-sonnet-4-6' }],
    'full-plan-finance':     [{ provider: 'openai', model: 'gpt-4.1' },         { provider: 'gemini', model: 'gemini-2.5-flash' },      { provider: 'claude', model: 'claude-sonnet-4-6' }],
    'full-plan-devil':       [{ provider: 'openai', model: 'gpt-5' },           { provider: 'gemini', model: 'gemini-2.5-pro' },        { provider: 'claude', model: 'claude-sonnet-4-6' }],
    'generate-prd':          [{ provider: 'openai', model: 'gpt-4.1' },         { provider: 'gemini', model: 'gemini-2.5-flash' },      { provider: 'claude', model: 'claude-sonnet-4-6' }],
    'extract-idea':          [{ provider: 'openai', model: 'gpt-4.1-nano' },    { provider: 'gemini', model: 'gemini-2.5-flash-lite' }, { provider: 'claude', model: 'claude-haiku-4-5-20251001' }],
    'generate-queries':      [{ provider: 'openai', model: 'gpt-4.1-nano' },    { provider: 'gemini', model: 'gemini-2.5-flash-lite' }, { provider: 'claude', model: 'claude-haiku-4-5-20251001' }],
  },
  premium: {
    // 아이디어 발굴: 창의성 + 4개 소스 통합 → GPT-5 primary
    'generate-ideas':        [{ provider: 'openai', model: 'gpt-5' },            { provider: 'gemini', model: 'gemini-2.5-pro' },        { provider: 'claude', model: 'claude-sonnet-4-6' }],
    // 초안: 한국어 서술 품질 최우선 → Claude Sonnet primary
    'business-plan':         [{ provider: 'claude', model: 'claude-sonnet-4-6' },{ provider: 'openai', model: 'gpt-5' },                 { provider: 'gemini', model: 'gemini-2.5-pro' }],
    // 시장분석: 대량 데이터 처리 + 1M 컨텍스트 → Gemini Pro primary
    'full-plan-market':      [{ provider: 'gemini', model: 'gemini-2.5-pro' },   { provider: 'openai', model: 'gpt-5' },                 { provider: 'claude', model: 'claude-sonnet-4-6' }],
    // 경쟁분석: 데이터 비교/표 생성 → Gemini Pro primary
    'full-plan-competition': [{ provider: 'gemini', model: 'gemini-2.5-pro' },   { provider: 'openai', model: 'gpt-5' },                 { provider: 'claude', model: 'claude-sonnet-4-6' }],
    // 전략·로드맵: 한국어 전략 서술 → Claude Sonnet primary
    'full-plan-strategy':    [{ provider: 'claude', model: 'claude-sonnet-4-6' },{ provider: 'openai', model: 'gpt-5' },                 { provider: 'gemini', model: 'gemini-2.5-pro' }],
    // 재무: 수치 분석 + 대량 컨텍스트 → Gemini Pro primary
    'full-plan-finance':     [{ provider: 'gemini', model: 'gemini-2.5-pro' },   { provider: 'openai', model: 'gpt-5' },                 { provider: 'claude', model: 'claude-sonnet-4-6' }],
    // Devil's Advocate: 비판적 한국어 분석 → Claude Sonnet primary
    'full-plan-devil':       [{ provider: 'claude', model: 'claude-sonnet-4-6' },{ provider: 'openai', model: 'gpt-5' },                 { provider: 'gemini', model: 'gemini-2.5-pro' }],
    // PRD: 기술 스펙 (영어 혼용 OK) → GPT-4.1
    'generate-prd':          [{ provider: 'openai', model: 'gpt-4.1' },          { provider: 'openai', model: 'gpt-5' },                 { provider: 'claude', model: 'claude-sonnet-4-6' }],
    // 추출: 단순 태스크 → GPT-4.1 Nano
    'extract-idea':          [{ provider: 'openai', model: 'gpt-4.1-nano' },     { provider: 'gemini', model: 'gemini-2.5-flash' },      { provider: 'claude', model: 'claude-haiku-4-5-20251001' }],
    // 검색 쿼리 생성: 단순 구조화 → 빠르고 저렴한 모델
    'generate-queries':      [{ provider: 'openai', model: 'gpt-4.1-mini' },     { provider: 'gemini', model: 'gemini-2.5-flash' },      { provider: 'claude', model: 'claude-haiku-4-5-20251001' }],
  },
};

// --- 토큰 사용량 & 원가 추적 ---

export interface TokenUsage {
  inputTokens: number;
  outputTokens: number;
  costUSD: number;
  provider: AIProvider;
  model: string;
}

// 2026-03 기준 USD per 1M tokens
export const MODEL_PRICING: Record<string, { input: number; output: number }> = {
  // Claude
  'claude-sonnet-4-6':           { input: 3.00,  output: 15.00 },
  'claude-haiku-4-5-20251001':   { input: 1.00,  output: 5.00  },
  'claude-opus-4-6':             { input: 15.00, output: 75.00 },
  // Gemini
  'gemini-2.5-pro':              { input: 1.25,  output: 10.00 },
  'gemini-2.5-flash':            { input: 0.30,  output: 2.50  },
  'gemini-2.5-flash-lite':       { input: 0.10,  output: 0.40  },
  // OpenAI
  'gpt-5':                       { input: 1.25,  output: 10.00 },
  'gpt-4.1':                     { input: 2.00,  output: 8.00  },
  'gpt-4.1-mini':                { input: 0.40,  output: 1.60  },
  'gpt-4.1-nano':                { input: 0.10,  output: 0.40  },
  'gpt-4o':                      { input: 2.50,  output: 10.00 },
  'gpt-4o-mini':                 { input: 0.15,  output: 0.60  },
  // Ollama (무료)
  'gemma2:9b':                   { input: 0, output: 0 },
};

/** UI 표시용 프리셋 메타 정보 */
export const PRESET_INFO: Record<QualityPreset, { label: string; description: string; detail: string }> = {
  standard: {
    label: '기본',
    description: '비용 효율 최적화',
    detail: 'GPT 중심 · Gemini Flash 보조',
  },
  premium: {
    label: '고품질',
    description: '최고 품질 한국어',
    detail: 'Claude + Gemini Pro + GPT 혼합',
  },
};
