import { prisma } from '../prisma';

/**
 * [PREPARADO PARA FUTURO MÓDULO DE DASHBOARD Y MÉTRICAS]
 * Calcula KPIs en tiempo real para alimentar futuros gráficos de cobertura y ejecución UAT.
 */
export async function getGovernanceAndExecutionMetrics() {
  const [totalStories, draftCases, approvedCases, rejectedCases, executions] = await Promise.all([
    prisma.userStory.count(),
    prisma.testCase.count({ where: { governanceStatus: 'DRAFT' } }),
    prisma.testCase.count({ where: { governanceStatus: 'APPROVED' } }),
    prisma.testCase.count({ where: { governanceStatus: 'REJECTED' } }),
    prisma.testPlanItem.groupBy({
      by: ['executionStatus'],
      _count: { _all: true },
    }),
  ]);

  return {
    totalStories,
    governance: { draftCases, approvedCases, rejectedCases },
    executions,
  };
}
