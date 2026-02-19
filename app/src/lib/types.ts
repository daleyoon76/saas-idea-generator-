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

export type WorkflowStep =
  | 'keyword'
  | 'generating-ideas'
  | 'select-ideas'
  | 'generating-plan'
  | 'view-plan'
  | 'complete';

export type IdeaCategory =
  | '정서적 공명 웰니스 에이전트'
  | '버티컬 B2B 에이전트'
  | 'AI 품질 보증/디버깅 도구';

export type AIProvider = 'ollama' | 'claude' | 'gemini' | 'openai';

export interface ProviderConfig {
  label: string;
  model: string;
  description: string;
}

export const PROVIDER_CONFIGS: Record<AIProvider, ProviderConfig> = {
  ollama: { label: 'Ollama', model: 'gemma2:9b', description: '로컬 실행 (무료)' },
  claude: { label: 'Claude Sonnet', model: 'claude-sonnet-4-6', description: 'Anthropic 최신 모델' },
  gemini: { label: 'Gemini Flash', model: 'gemini-2.0-flash', description: 'Google 고속 모델' },
  openai: { label: 'GPT-4o', model: 'gpt-4o', description: 'OpenAI 플래그십 모델' },
};
