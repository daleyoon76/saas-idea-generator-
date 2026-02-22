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
}

export interface ProviderConfig {
  label: string;
  description: string;
  defaultModel: string;
  models: ModelOption[];
}

export const PROVIDER_CONFIGS: Record<AIProvider, ProviderConfig> = {
  ollama: {
    label: 'Ollama',
    description: '로컬 실행 (무료)',
    defaultModel: 'gemma2:9b',
    models: [
      { id: 'gemma2:9b', label: 'gemma2:9b', description: '기본' },
    ],
  },
  claude: {
    label: 'Claude',
    description: 'Anthropic',
    defaultModel: 'claude-sonnet-4-6',
    models: [
      { id: 'claude-haiku-4-5-20251001', label: 'Haiku 4.5', description: '빠름·저렴' },
      { id: 'claude-sonnet-4-6', label: 'Sonnet 4.6', description: '균형 (추천)' },
      { id: 'claude-opus-4-6', label: 'Opus 4.6', description: '최고 성능' },
    ],
  },
  gemini: {
    label: 'Gemini',
    description: 'Google',
    defaultModel: 'gemini-2.0-flash',
    models: [
      { id: 'gemini-2.0-flash-lite', label: 'Flash 2.0 Lite', description: '빠름·저렴' },
      { id: 'gemini-2.0-flash', label: 'Flash 2.0', description: '균형 (추천)' },
      { id: 'gemini-2.5-pro', label: 'Pro 2.5', description: '최고 성능' },
    ],
  },
  openai: {
    label: 'OpenAI',
    description: 'GPT',
    defaultModel: 'gpt-4o',
    models: [
      { id: 'gpt-4o-mini', label: 'GPT-4o mini', description: '빠름·저렴' },
      { id: 'gpt-4o', label: 'GPT-4o', description: '균형 (추천)' },
      { id: 'gpt-4.1', label: 'GPT-4.1', description: '최신' },
    ],
  },
};
