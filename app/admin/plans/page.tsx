'use client';

import React, { useEffect, useState } from 'react';

interface SAPUserStory {
  sapModule?: string;
  sapTransaction?: string;
  sapCode?: string;
}

interface SAPTestCase {
  id: string;
  code?: string;
  title?: string;
  complexity?: string;
  preconditions?: string;
  steps?: string;
  expectedResult?: string;
  userStory?: SAPUserStory;
}

interface Assignee {
  id: string;
  name: string;
  email: string;
}

interface PlanItem {
  testCase?: SAPTestCase;
  assignedTo?: Assignee;
}

interface TestPlan {
  id: string;
  name: string;
  createdAt: string;
  items: PlanItem[];
}

interface StoredStep {
  stepNumber: number;
  action: string;
  expectedResult: string;
}

export default function PlansPage() {
  const [approvedCases, setApprovedCases] = useState<SAPTestCase[]>([]);
  const [keyUsers, setKeyUsers] = useState<Assignee[]>([]);
  const [plans, setPlans] = useState<TestPlan[]>([]);
  const [loading, setLoading] = useState(true);

  const [planName, setPlanName] = useState('Ciclo UAT Sprint Activo');
  const [selectedCaseIds, setSelectedCaseIds] = useState<string[]>([]);
  const [caseAssignee, setCaseAssignee] = useState<Record<string, string>>({});

  const loadData = async () => {
    try {
      const [casesRes, usersRes, plansRes] = await Promise.all([
        fetch('/api/test-cases?status=APPROVED'),
        fetch('/api/users'),
        fetch('/api/test-plans'),
      ]);

      const casesData = await casesRes.json();
      const usersData = await usersRes.json();
      const plansData = await plansRes.json();

      setApprovedCases(casesData);
      setKeyUsers(usersData);
      setPlans(plansData);

      if (usersData.length > 0) {
        const initialMap: Record<string, string> = {};
        casesData.forEach((c: SAPTestCase) => {
          initialMap[c.id] = usersData[0].id;
        });
        setCaseAssignee(initialMap);
      }
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadData();
  }, []);

  const toggleCaseSelect = (id: string) => {
    setSelectedCaseIds((prev) =>
      prev.includes(id) ? prev.filter((item) => item !== id) : [...prev, id]
    );
  };

  const handleBulkAssign = (userId: string) => {
    if (!userId) return;
    const updated = { ...caseAssignee };
    selectedCaseIds.forEach((id) => {
      updated[id] = userId;
    });
    setCaseAssignee(updated);
  };

  const handleCreatePlan = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!planName || selectedCaseIds.length === 0) return;

    const assignments = selectedCaseIds.map((cid) => ({
      testCaseId: cid,
      assignedToId: caseAssignee[cid] || keyUsers[0]?.id,
    }));

    await fetch('/api/test-plans', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        name: planName,
        assignments,
      }),
    });

    setPlanName('');
    setSelectedCaseIds([]);
    await loadData();
  };

  // Exportador con las 12 columnas oficiales de SAP Cloud ALM (1 fila por paso)
  const exportPlanToSAPALM = (plan: TestPlan) => {
    const headers = [
      'Test Case Name',
      'Scope',
      'Solution Process',
      'Preparation Status',
      'Priority',
      'Owner',
      'Activity Sequence',
      'Activity Title',
      'Action Sequence',
      'Action Title',
      'Action Instructions',
      'Expected Result',
    ];

    const mapPriority = (complexity?: string): string => {
      switch (complexity?.toUpperCase()) {
        case 'ALTA':
          return 'High';
        case 'BAJA':
          return 'Low';
        default:
          return 'Medium';
      }
    };

    const rows: string[][] = [];

    plan.items?.forEach((it) => {
      const tc = it.testCase || ({} as SAPTestCase);
      const us = tc.userStory || {};

      const fullTestCaseName = tc.code
        ? `${tc.code} - ${tc.title || 'Sin título'}`
        : tc.title || 'Test Case';

      const activityTitle =
        us.sapTransaction && us.sapTransaction !== 'N/A'
          ? `Ejecución en Transacción ${us.sapTransaction}`
          : `Flujo ${us.sapModule || 'SAP'}`;

      let parsedSteps: StoredStep[] = [];

      try {
        const raw = JSON.parse(tc.steps || '[]');
        if (Array.isArray(raw) && raw.length > 0) {
          parsedSteps = raw;
        } else {
          throw new Error('No es JSON array');
        }
      } catch {
        // Fallback para casos antiguos guardados como texto plano
        const fallbackLines = (tc.steps || 'Ejecutar prueba en SAP')
          .split(/[\r\n]+/)
          .filter(Boolean);
        parsedSteps = fallbackLines.map((line, idx) => ({
          stepNumber: idx + 1,
          action: line,
          expectedResult:
            idx === fallbackLines.length - 1
              ? tc.expectedResult || 'Ejecución correcta'
              : '',
        }));
      }

      const hasAnyStepExpected = parsedSteps.some(
        (s) => s.expectedResult && s.expectedResult.trim() !== ''
      );

      parsedSteps.forEach((step, idx) => {
        const stepNum = step.stepNumber || idx + 1;
        const isLastStep = idx === parsedSteps.length - 1;
        const cleanAction = (step.action || '').replace(/[\r\n;]+/g, ' ').trim();

        // Respeta vacío en pasos intermedios; si ningún paso tenía resultado, pone el general en el último paso
        const rawExpected =
          step.expectedResult?.trim() ||
          (!hasAnyStepExpected && isLastStep ? tc.expectedResult || '' : '');
        const cleanExpected = rawExpected.replace(/[\r\n;]+/g, ' ').trim();

        // Si es el paso 1 y existen precondiciones, las anteponemos en la instrucción
        const actionWithPrecondition =
          stepNum === 1 && tc.preconditions
            ? `[Precondición: ${tc.preconditions.replace(/[\r\n;]+/g, ' ')}] ${cleanAction}`
            : cleanAction;

        rows.push([
          fullTestCaseName,
          us.sapModule || 'MM',
          us.sapCode || '',
          'Prepared',
          mapPriority(tc.complexity),
          it.assignedTo?.email || '',
          '1',
          activityTitle,
          String(stepNum),
          `Paso ${stepNum}`,
          actionWithPrecondition,
          cleanExpected,
        ]);
      });
    });

    const csvContent = [
      headers.join(';'),
      ...rows.map((row) =>
        row.map((cell) => `"${String(cell).replace(/"/g, '""')}"`).join(';')
      ),
    ].join('\n');

    const blob = new Blob(['\uFEFF' + csvContent], {
      type: 'text/csv;charset=utf-8;',
    });
    const url = URL.createObjectURL(blob);

    const link = document.createElement('a');
    link.href = url;
    link.setAttribute(
      'download',
      `SAP_Cloud_ALM_${plan.name.replace(/\s+/g, '_')}.csv`
    );
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  if (loading) {
    return (
      <div className="p-8 text-center text-slate-400">
        Cargando planes y asignaciones desde Neon...
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="border-b border-slate-800 pb-4">
        <span className="text-xs font-mono uppercase tracking-wider text-indigo-400 font-semibold">
          Etapa 03 • Planificación y Asignación
        </span>
        <h1 className="text-xl font-semibold text-slate-100 mt-0.5">
          Planes de Prueba y Asignación de Key Users
        </h1>
        <p className="text-xs text-slate-400 mt-1">
          Casos certificados en Neon listos para armar ciclos de prueba y exportar a SAP Cloud ALM.
        </p>
      </div>

      <div className="grid lg:grid-cols-12 gap-6">
        <form
          onSubmit={handleCreatePlan}
          className="lg:col-span-8 rounded-xl border border-slate-800 bg-slate-900/40 p-6 space-y-5"
        >
          <div>
            <label className="text-xs font-medium text-slate-400 block mb-1">
              Nombre del Plan / Ciclo UAT *
            </label>
            <input
              required
              placeholder="Ej: Validación Sprint 4 - Finanzas & Compras"
              value={planName}
              onChange={(e) => setPlanName(e.target.value)}
              className="w-full bg-slate-950 border border-slate-800 rounded-lg px-3 py-2 text-sm text-slate-200 focus:outline-none focus:border-indigo-500"
            />
          </div>

          {selectedCaseIds.length > 0 && (
            <div className="flex flex-wrap items-center justify-between gap-2 p-3 bg-indigo-950/20 border border-indigo-500/30 rounded-lg text-xs">
              <span className="text-indigo-300 font-medium">
                {selectedCaseIds.length} caso(s) seleccionado(s)
              </span>
              <div className="flex items-center gap-2">
                <span className="text-slate-400">Asignar todos a:</span>
                <select
                  onChange={(e) => handleBulkAssign(e.target.value)}
                  defaultValue=""
                  className="bg-slate-900 border border-slate-700 rounded px-2.5 py-1 text-slate-200 text-xs focus:outline-none"
                >
                  <option value="" disabled>
                    Seleccionar usuario...
                  </option>
                  {keyUsers.map((u) => (
                    <option key={u.id} value={u.id}>
                      {u.name} ({u.email})
                    </option>
                  ))}
                </select>
              </div>
            </div>
          )}

          <div className="space-y-3">
            <label className="text-xs font-semibold uppercase tracking-wider text-slate-400 block">
              Casos Aprobados en Neon ({selectedCaseIds.length} seleccionados)
            </label>

            {approvedCases.length === 0 ? (
              <div className="p-4 bg-slate-950 rounded-lg border border-slate-800 text-xs text-amber-400">
                No hay casos aprobados en el Catálogo Oficial. Ve a la Etapa 2 para aprobar borradores.
              </div>
            ) : (
              <div className="space-y-2.5">
                {approvedCases.map((c) => {
                  const isSelected = selectedCaseIds.includes(c.id);
                  return (
                    <div
                      key={c.id}
                      className={`p-4 rounded-xl border transition-all flex flex-col sm:flex-row sm:items-center justify-between gap-3 ${
                        isSelected
                          ? 'border-indigo-500/60 bg-indigo-950/20 shadow-sm'
                          : 'border-slate-800 bg-slate-950/40 opacity-70'
                      }`}
                    >
                      <label className="flex items-start gap-3 cursor-pointer select-none">
                        <input
                          type="checkbox"
                          checked={isSelected}
                          onChange={() => toggleCaseSelect(c.id)}
                          className="mt-1 rounded border-slate-700 bg-slate-900 text-indigo-600 focus:ring-indigo-500"
                        />
                        <div>
                          <div className="flex items-center gap-2 mb-0.5">
                            <span className="text-xs font-mono font-semibold text-indigo-400">
                              {c.code}
                            </span>
                            <span className="text-xs font-mono text-slate-500">
                              {c.userStory?.sapCode}
                            </span>
                            <span className="text-[10px] bg-slate-800 text-slate-300 px-2 py-0.5 rounded font-mono">
                              {c.userStory?.sapModule} - {c.userStory?.sapTransaction || 'Sin Tx'}
                            </span>
                          </div>
                          <p className="text-sm font-medium text-slate-200">{c.title}</p>
                        </div>
                      </label>

                      {isSelected && (
                        <div className="sm:w-60 pl-7 sm:pl-0">
                          <label className="text-[10px] uppercase tracking-wider text-slate-400 block mb-0.5">
                            Responsable Asignado:
                          </label>
                          <select
                            value={caseAssignee[c.id] || (keyUsers[0] ? keyUsers[0].id : '')}
                            onChange={(e) =>
                              setCaseAssignee({ ...caseAssignee, [c.id]: e.target.value })
                            }
                            className="w-full bg-slate-900 border border-slate-700 text-xs rounded-lg px-2.5 py-1.5 text-slate-200 focus:border-indigo-500 focus:outline-none"
                          >
                            {keyUsers.map((u) => (
                              <option key={u.id} value={u.id}>
                                {u.name}
                              </option>
                            ))}
                          </select>
                        </div>
                      )}
                    </div>
                  );
                })}
              </div>
            )}
          </div>

          <button
            type="submit"
            disabled={selectedCaseIds.length === 0}
            className="w-full bg-indigo-600 hover:bg-indigo-500 disabled:opacity-40 text-white font-medium text-xs py-2.5 rounded-lg transition-all shadow-sm"
          >
            Guardar Plan UAT en PostgreSQL
          </button>
        </form>

        {/* Historial de Planes */}
        <div className="lg:col-span-4 space-y-4">
          <h2 className="text-xs font-semibold uppercase tracking-wider text-slate-400">
            Planes UAT en Neon ({plans.length})
          </h2>

          <div className="space-y-3">
            {plans.map((p) => (
              <div
                key={p.id}
                className="p-4 rounded-xl border border-slate-800 bg-slate-900/40 space-y-3"
              >
                <div className="flex justify-between items-start">
                  <div>
                    <h3 className="text-sm font-semibold text-slate-100">{p.name}</h3>
                    <span className="text-[10px] text-slate-500 font-mono block mt-1">
                      Creado: {new Date(p.createdAt).toLocaleDateString()}
                    </span>
                  </div>
                  <span className="text-[10px] font-semibold bg-indigo-500/10 text-indigo-400 border border-indigo-500/20 px-2 py-0.5 rounded-full">
                    {p.items?.length || 0} Casos
                  </span>
                </div>

                <div className="space-y-1.5 border-t border-slate-800/80 pt-2.5">
                  <span className="text-[10px] uppercase tracking-wider text-slate-500 font-semibold block">
                    Distribución de Pruebas:
                  </span>
                  {p.items?.map((it, idx) => (
                    <div
                      key={idx}
                      className="flex justify-between items-center text-xs bg-slate-950 p-2 rounded border border-slate-800/60"
                    >
                      <span className="font-mono text-indigo-400">{it.testCase?.code}</span>
                      <span className="text-slate-300 font-medium truncate max-w-[140px] text-right">
                        {it.assignedTo?.name || 'Sin asignar'}
                      </span>
                    </div>
                  ))}
                </div>

                <button
                  onClick={() => exportPlanToSAPALM(p)}
                  className="w-full mt-3 flex items-center justify-center gap-2 bg-slate-800 hover:bg-slate-700 text-slate-200 border border-slate-700 text-xs font-medium py-2 rounded-lg transition-colors"
                >
                  <svg
                    className="w-3.5 h-3.5"
                    fill="none"
                    stroke="currentColor"
                    viewBox="0 0 24 24"
                  >
                    <path
                      strokeLinecap="round"
                      strokeLinejoin="round"
                      strokeWidth="2"
                      d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-4l-4 4m0 0l-4-4m4 4V4"
                    />
                  </svg>
                  Descargar para SAP Cloud ALM (CSV)
                </button>
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}