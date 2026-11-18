import { prisma } from '../prisma';
import { TestType, GovernanceStatus } from '@prisma/client';

export interface CreateTestCaseInput {
  code: string;
  userStoryId: string;
  title: string;
  testType: TestType;
  preconditions: string;
  steps: string;
  expectedResult: string;
}

/**
 * Servicio Modular de Casos de Prueba.
 * Regla Crítica: Todo caso nace en estado DRAFT para pasar por la Bandeja de Gobernanza.
 */
export async function createManualTestCase(data: CreateTestCaseInput) {
  return await prisma.testCase.create({
    data: {
      ...data,
      governanceStatus: GovernanceStatus.DRAFT,
    },
  });
}

/**
 * [PREPARADO PARA FUTURO MÓDULO IA]
 * Este método aisla la creación de casos desde un motor LLM (ej. OpenAI JSON Schema)
 * inyectando los borradores directamente en la bandeja del QA Lead sin alterar la BD.
 */
export async function generateTestCasesFromAI(userStoryId: string) {
  const story = await prisma.userStory.findUnique({ where: { id: userStoryId } });
  if (!story) throw new Error('Historia de Usuario no encontrada');

  // Futuro hook hacia OpenAI / Gemini API leyendo story.acceptanceCriteria
  throw new Error('Módulo IA pendiente de activación en Fase 2.');
}
