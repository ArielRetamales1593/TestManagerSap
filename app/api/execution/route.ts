import { NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';

// 1. GET: Traer los casos asignados al Key User
// Uso: GET /api/execution?userId=ID_DEL_USUARIO
export async function GET(request: Request) {
  try {
    const { searchParams } = new URL(request.url);
    const userId = searchParams.get('userId');

    if (!userId) {
      return NextResponse.json({ error: 'Falta el parámetro userId' }, { status: 400 });
    }

    const assignedItems = await prisma.testPlanItem.findMany({
      where: {
        assignedToId: userId,
      },
      include: {
        testCase: true, // Vital para mostrar título, pasos y resultado esperado en el UI
      },
      orderBy: { createdAt: 'desc' }
    });

    return NextResponse.json(assignedItems);
  } catch (error) {
    console.error('Error GET execution:', error);
    return NextResponse.json({ error: 'Error al obtener los casos asignados' }, { status: 500 });
  }
}

// 2. PATCH: Actualizar el resultado (Tu código original, solo sumamos evidenceUrl)
export async function PATCH(request: Request) {
  try {
    const body = await request.json();
    // Sumamos evidenceUrl extraído del body
    const { itemId, executionStatus, evidenceNotes, evidenceUrl } = body;

    const updatedItem = await prisma.testPlanItem.update({
      where: { id: itemId },
      data: {
        executionStatus,
        evidenceNotes,
        evidenceUrl, // <-- Guardamos la URL de la imagen
        executedAt: new Date(),
      },
    });

    return NextResponse.json(updatedItem);
  } catch (error) {
    console.error('Error PATCH execution:', error);
    return NextResponse.json({ error: 'Error al registrar ejecución del Key User' }, { status: 500 });
  }
}