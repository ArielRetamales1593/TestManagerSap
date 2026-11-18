import { NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';

export const dynamic = 'force-dynamic';

const getComplexityMinutes = (complexity: string) => {
  if (complexity === 'BAJA') return 15;
  if (complexity === 'ALTA') return 60;
  return 30; // MEDIA por defecto
};

export async function GET() {
  try {
    const planItems = await prisma.testPlanItem.findMany({
      include: {
        testCase: true,
        assignedTo: {
          select: { name: true, email: true }
        }
      },
      orderBy: { updatedAt: 'desc' }
    });

    const totalPlanned = planItems.length;
    let passed = 0, failed = 0, blocked = 0, pending = 0, totalMinutesGlobal = 0;

    // Mapa detallado por usuario
    const userStatsMap: Record<string, { 
      planned: number; 
      executed: number; 
      totalMinutes: number;
      breakdown: { baja: number; media: number; alta: number };
    }> = {};

    planItems.forEach((item) => {
      if (item.executionStatus === 'PASSED') passed++;
      else if (item.executionStatus === 'FAILED') failed++;
      else if (item.executionStatus === 'BLOCKED') blocked++;
      else pending++;

      const complexity = item.testCase.complexity || 'MEDIA';
      const itemMinutes = getComplexityMinutes(complexity);
      totalMinutesGlobal += itemMinutes;

      const userName = item.assignedTo?.name || item.assignedTo?.email || 'Sin Asignar';
      if (!userStatsMap[userName]) {
        userStatsMap[userName] = { 
          planned: 0, 
          executed: 0, 
          totalMinutes: 0,
          breakdown: { baja: 0, media: 0, alta: 0 }
        };
      }
      
      userStatsMap[userName].planned++;
      userStatsMap[userName].totalMinutes += itemMinutes;
      
      if (complexity === 'BAJA') userStatsMap[userName].breakdown.baja++;
      else if (complexity === 'ALTA') userStatsMap[userName].breakdown.alta++;
      else userStatsMap[userName].breakdown.media++;

      if (item.executionStatus !== 'PENDING') {
        userStatsMap[userName].executed++;
      }
    });

    const totalExecuted = passed + failed + blocked;
    const executionRate = totalPlanned > 0 ? Math.round((totalExecuted / totalPlanned) * 100) : 0;
    const passRate = totalExecuted > 0 ? Math.round((passed / totalExecuted) * 100) : 0;
    const failRate = totalExecuted > 0 ? Math.round((failed / totalExecuted) * 100) : 0;
    const estimatedHours = Math.round((totalMinutesGlobal / 60) * 10) / 10;

    // Mapear para el frontend incluyendo las horas estimadas por usuario
    const usersLoad = Object.entries(userStatsMap).map(([name, stats]) => ({
      name,
      planned: stats.planned,
      executed: stats.executed,
      percentage: stats.planned > 0 ? Math.round((stats.executed / stats.planned) * 100) : 0,
      estimatedHours: Math.round((stats.totalMinutes / 60) * 10) / 10,
      breakdown: stats.breakdown
    }));

    return NextResponse.json({
      stats: {
        planned: totalPlanned,
        executed: totalExecuted,
        pending,
        executionRate,
        passRate,
        failRate,
        estimatedHours,
        results: { passed, failed, blocked }
      },
      usersLoad,
      items: planItems
    });
  } catch (error) {
    console.error('Error al obtener datos del dashboard:', error);
    return NextResponse.json({ error: 'Error al obtener métricas.' }, { status: 500 });
  }
}

// Sincroniza los resultados importados desde SAP Cloud ALM (CSV/Excel) o actualizados desde la consola
export async function POST(request: Request) {
  try {
    const body = await request.json();
    const { updates } = body;

    if (!Array.isArray(updates) || updates.length === 0) {
      return NextResponse.json(
        { error: 'No se recibieron actualizaciones válidas.' },
        { status: 400 }
      );
    }

    // Si el CSV de SAP Cloud ALM trae varias filas por el mismo caso (1 por paso),
    // consolidamos por código de caso priorizando FAILED > BLOCKED > PASSED
    const consolidatedMap = new Map<
      string,
      { executionStatus: string; evidenceNotes?: string }
    >();

    const statusPriority: Record<string, number> = {
      FAILED: 4,
      BLOCKED: 3,
      PASSED: 2,
      PENDING: 1,
    };

    for (const raw of updates) {
      const code = String(raw.code || '').trim().toUpperCase();
      if (!code) continue;

      const incomingStatus = String(raw.executionStatus || 'PENDING').toUpperCase();
      const existing = consolidatedMap.get(code);

      if (
        !existing ||
        (statusPriority[incomingStatus] || 0) >= (statusPriority[existing.executionStatus] || 0)
      ) {
        consolidatedMap.set(code, {
          executionStatus: incomingStatus,
          evidenceNotes: raw.evidenceNotes || existing?.evidenceNotes,
        });
      }
    }

    let updatedCount = 0;
    const updatePromises: Promise<void>[] = [];

    consolidatedMap.forEach((data, code) => {
      updatePromises.push(
        prisma.testPlanItem.updateMany({
          where: {
            testCase: {
              code: {
                equals: code,
                mode: 'insensitive',
              },
            },
          },
          data: {
            executionStatus: data.executionStatus as any,
            evidenceNotes: data.evidenceNotes || 'Sincronizado desde SAP Cloud ALM',
            executedAt: data.executionStatus !== 'PENDING' ? new Date() : null,
          },
        }).then((result) => {
          updatedCount += result.count;
        })
      );
    });

    await Promise.all(updatePromises);

    return NextResponse.json({
      ok: true,
      casesProcessed: consolidatedMap.size,
      planItemsUpdated: updatedCount,
    });
  } catch (error) {
    console.error('Error al sincronizar resultados de SAP ALM en el dashboard:', error);
    return NextResponse.json(
      { error: 'Error interno al actualizar las ejecuciones.' },
      { status: 500 }
    );
  }
}