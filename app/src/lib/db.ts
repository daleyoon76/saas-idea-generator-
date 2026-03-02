import { prisma } from './prisma';
import type { Idea as ClientIdea, BusinessPlan as ClientBusinessPlan, PRD as ClientPRD } from './types';

// ============================================================
// CRITICAL: 모든 쿼리에 userId where절 필수 (Application-level RLS)
// 이 파일 외부에서 prisma를 직접 호출하지 말 것
// ============================================================

/** 아이디어 배치 저장 (생성 세션 1회분) */
export async function saveIdeas(
  userId: string,
  ideas: ClientIdea[],
  keyword?: string,
  preset?: string,
) {
  return prisma.idea.createManyAndReturn({
    data: ideas.map((idea) => ({
      userId,
      keyword: keyword || null,
      localId: idea.id,
      name: idea.name,
      category: idea.category,
      oneLiner: idea.oneLiner,
      target: idea.target,
      problem: idea.problem,
      features: idea.features,
      differentiation: idea.differentiation,
      revenueModel: idea.revenueModel,
      mvpDifficulty: idea.mvpDifficulty,
      rationale: idea.rationale,
      preset: preset || null,
    })),
    select: { id: true, localId: true },
  });
}

/** 단일 아이디어 저장, DB id 반환 */
export async function saveIdea(
  userId: string,
  idea: ClientIdea,
  keyword?: string,
  preset?: string,
): Promise<string> {
  const created = await prisma.idea.create({
    data: {
      userId,
      keyword: keyword || null,
      localId: idea.id,
      name: idea.name,
      category: idea.category,
      oneLiner: idea.oneLiner,
      target: idea.target,
      problem: idea.problem,
      features: idea.features,
      differentiation: idea.differentiation,
      revenueModel: idea.revenueModel,
      mvpDifficulty: idea.mvpDifficulty,
      rationale: idea.rationale,
      preset: preset || null,
    },
  });
  return created.id;
}

/** 기획서 저장 (draft 또는 full) */
export async function saveBusinessPlan(
  userId: string,
  dbIdeaId: string,
  plan: ClientBusinessPlan,
) {
  return prisma.businessPlan.create({
    data: {
      userId,
      ideaId: dbIdeaId,
      ideaName: plan.ideaName,
      content: plan.content,
      version: plan.version || 'draft',
    },
  });
}

/** PRD 저장 */
export async function savePRD(
  userId: string,
  dbIdeaId: string,
  prd: ClientPRD,
) {
  return prisma.pRD.create({
    data: {
      userId,
      ideaId: dbIdeaId,
      ideaName: prd.ideaName,
      content: prd.content,
    },
  });
}

/** 사용자 히스토리 조회 (페이지네이션, 기획서/PRD 건수 포함) */
export async function getUserHistory(
  userId: string,
  page: number = 1,
  pageSize: number = 20,
) {
  const [ideas, total] = await Promise.all([
    prisma.idea.findMany({
      where: { userId },
      orderBy: { createdAt: 'desc' },
      skip: (page - 1) * pageSize,
      take: pageSize,
      include: {
        _count: {
          select: { businessPlans: true, prds: true },
        },
      },
    }),
    prisma.idea.count({ where: { userId } }),
  ]);

  return { ideas, total, page, pageSize, totalPages: Math.ceil(total / pageSize) };
}

/** 아이디어 상세 조회 (기획서 + PRD 포함) */
export async function getIdeaWithRelations(userId: string, ideaId: string) {
  return prisma.idea.findFirst({
    where: { id: ideaId, userId },
    include: {
      businessPlans: { orderBy: { createdAt: 'desc' } },
      prds: { orderBy: { createdAt: 'desc' } },
    },
  });
}

/** 아이디어 삭제 (cascade → 기획서 + PRD도 삭제) */
export async function deleteIdea(userId: string, ideaId: string) {
  const idea = await prisma.idea.findFirst({
    where: { id: ideaId, userId },
  });
  if (!idea) return null;
  return prisma.idea.delete({ where: { id: ideaId } });
}

/** 개별 기획서 삭제 */
export async function deleteBusinessPlan(userId: string, planId: string) {
  const plan = await prisma.businessPlan.findFirst({
    where: { id: planId, userId },
  });
  if (!plan) return null;
  return prisma.businessPlan.delete({ where: { id: planId } });
}

/** 개별 PRD 삭제 */
export async function deletePRD(userId: string, prdId: string) {
  const prd = await prisma.pRD.findFirst({
    where: { id: prdId, userId },
  });
  if (!prd) return null;
  return prisma.pRD.delete({ where: { id: prdId } });
}

/** 아이디어 이름 변경 */
export async function updateIdeaName(userId: string, ideaId: string, name: string) {
  const idea = await prisma.idea.findFirst({
    where: { id: ideaId, userId },
  });
  if (!idea) return null;
  return prisma.idea.update({ where: { id: ideaId }, data: { name } });
}

/** localId + keyword로 기존 DB 아이디어 찾기 */
export async function findIdeaByLocalId(
  userId: string,
  localId: number,
  keyword?: string,
) {
  return prisma.idea.findFirst({
    where: {
      userId,
      localId,
      ...(keyword ? { keyword } : {}),
    },
    orderBy: { createdAt: 'desc' },
  });
}
