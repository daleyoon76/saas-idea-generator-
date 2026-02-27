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
  mvpDifficulty: string;
}

export type GuidedStep = 1 | 2 | 3 | 4 | 5 | 6 | 7 | 8 | 'generating' | 'complete';

export interface GuidedResult {
  idea: Idea;
  businessPlan: BusinessPlan;
  provider: AIProvider;
  model: string;
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
