import { NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';

export async function GET(req: Request) {
  try {
    const { searchParams } = new URL(req.url);
    const status = searchParams.get('status');

    const testCases = await prisma.testCase.findMany({
      where: status ? { governanceStatus: status as any } : undefined,
      include: { userStory: true },
      orderBy: { createdAt: 'desc' }
    });
    return NextResponse.json(testCases);
  } catch (error) {
    return NextResponse.json({ error: 'Error cargando casos' }, { status: 500 });
  }
}

export async function POST(req: Request) {
  try {
    const body = await req.json();

    // Soporte para Carga Masiva (Array de casos)
    if (Array.isArray(body)) {
      const created = await prisma.$transaction(
        body.map((item) =>
          prisma.testCase.create({
            data: {
              code: item.code,
              userStoryId: item.userStoryId,
              title: item.title,
              testType: item.testType || 'POSITIVA',
              origin: item.origin || 'BULK',
              preconditions: item.preconditions,
              steps: item.steps,
              expectedResult: item.expectedResult,
              governanceStatus: 'DRAFT',
            }
          })
        )
      );
      return NextResponse.json(created);
    }

    // Soporte para Creación Individual
    const created = await prisma.testCase.create({
      data: {
        code: body.code,
        userStoryId: body.userStoryId,
        title: body.title,
        testType: body.testType || 'POSITIVA',
        origin: body.origin || 'MANUAL',
        preconditions: body.preconditions,
        steps: body.steps,
        expectedResult: body.expectedResult,
        governanceStatus: 'DRAFT',
      }
    });
    return NextResponse.json(created);
  } catch (error) {
    return NextResponse.json({ error: 'Error al registrar casos' }, { status: 500 });
  }
}