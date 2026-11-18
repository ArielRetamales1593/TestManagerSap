import { NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';

export async function PATCH(req: Request) {
  try {
    const body = await req.json();
    const { id, governanceStatus, rejectionReason, title, preconditions, steps, expectedResult, complexity } = body;

    const dataToUpdate: any = {};
    if (governanceStatus) dataToUpdate.governanceStatus = governanceStatus;
    if (rejectionReason !== undefined) dataToUpdate.rejectionReason = rejectionReason;
    if (title) dataToUpdate.title = title;
    if (preconditions !== undefined) dataToUpdate.preconditions = preconditions;
    if (steps) dataToUpdate.steps = steps;
    if (expectedResult) dataToUpdate.expectedResult = expectedResult;
    if (complexity) dataToUpdate.complexity = complexity; // <-- Agregado correctamente al objeto data

    const updated = await prisma.testCase.update({
      where: { id },
      data: dataToUpdate, // <-- Aquí se pasa todo el objeto limpio
    });

    return NextResponse.json(updated);
  } catch (error) {
    console.error('Error en gobernanza:', error);
    return NextResponse.json({ error: 'Error actualizando gobernanza' }, { status: 500 });
  }
}