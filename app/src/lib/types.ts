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
