import { NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';

export async function GET() {
  try {
    const plans = await prisma.testPlan.findMany({
      include: {
        items: {
          include: {
            assignedTo: true,
            testCase: {
              include: { userStory: true }
            }
          }
        }
      },
      orderBy: { createdAt: 'desc' }
    });
    return NextResponse.json(plans);
  } catch (error) {
    return NextResponse.json({ error: 'Error cargando planes' }, { status: 500 });
  }
}

export async function POST(req: Request) {
  try {
    const body = await req.json();
    const { name, assignments } = body; // assignments: [{ testCaseId, assignedToId }]

    const plan = await prisma.testPlan.create({
      data: {
        name,
        items: {
          create: assignments.map((a: any) => ({
            testCaseId: a.testCaseId,
            assignedToId: a.assignedToId,
            executionStatus: 'PENDING'
          }))
        }
      },
      include: { items: true }
    });

    return NextResponse.json(plan);
  } catch (error) {
    return NextResponse.json({ error: 'Error creando plan UAT' }, { status: 500 });
  }
}