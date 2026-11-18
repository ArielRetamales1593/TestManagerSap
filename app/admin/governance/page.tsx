'use client';

import React, { useEffect, useState } from 'react';

export interface TestStepItem {
  stepNumber: number;
  action: string;
  expectedResult: string;
}

export default function GovernancePage() {
  const [cases, setCases] = useState<any[]>([]);
  const [filter, setFilter] = useState<'ALL' | 'DRAFT' | 'APPROVED' | 'REJECTED'>('DRAFT');
  const [loading, setLoading] = useState(true);

  // Estados de edición inline
  const [editingId, setEditingId] = useState<string | null>(null);
  const [editTitle, setEditTitle] = useState('');
  const [editPreconditions, setEditPreconditions] = useState('');
  const [editStepsList, setEditStepsList] = useState<TestStepItem[]>([]);
  const [editComplexity, setEditComplexity] = useState('MEDIA');

  const fetchCases = async () => {
    try {
      const res = await fetch('/api/test-cases');
      const data = await res.json();
      setCases(data);
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchCases();
  }, []);

  const parseStoredSteps = (rawSteps: string, fallbackExpected?: string): TestStepItem[] => {
    try {
      const parsed = JSON.parse(rawSteps);
      if (Array.isArray(parsed) && parsed.length > 0) {
        return parsed.map((st, idx) => ({
          stepNumber: st.stepNumber || idx + 1,
          action: st.action || '',
          expectedResult: st.expectedResult || '',
        }));
      }
    } catch {
      // Fallback para casos antiguos en texto plano
    }

    const lines = (rawSteps || '')
      .split(/[\r\n]+/)
      .map((l) => l.trim())
      .filter(Boolean);

    if (lines.length === 0) {
      return [{ stepNumber: 1, action: '', expectedResult: fallbackExpected || '' }];
    }

    return lines.map((line, idx) => ({
      stepNumber: idx + 1,
      action: line.replace(/^\d+[\.\)\-]\s*/, ''),
      // Solo asigna el fallback al último paso para dejar limpios los pasos intermedios
      expectedResult: idx === lines.length - 1 ? fallbackExpected || '' : '',
    }));
  };

  const startEditing = (item: any) => {
    setEditingId(item.id);
    setEditTitle(item.title);
    setEditPreconditions(item.preconditions || '');
    setEditStepsList(parseStoredSteps(item.steps, item.expectedResult));
    setEditComplexity(item.complexity || 'MEDIA');
  };

  const handleAddEditStep = () => {
    setEditStepsList((prev) => [
      ...prev,
      { stepNumber: prev.length + 1, action: '', expectedResult: '' },
    ]);
  };

  const handleRemoveEditStep = (idxToRemove: number) => {
    if (editStepsList.length <= 1) return;
    setEditStepsList((prev) =>
      prev
        .filter((_, idx) => idx !== idxToRemove)
        .map((step, idx) => ({ ...step, stepNumber: idx + 1 }))
    );
  };

  const handleEditStepChange = (
    index: number,
    field: 'action' | 'expectedResult',
    value: string
  ) => {
    setEditStepsList((prev) =>
      prev.map((step, idx) => (idx === index ? { ...step, [field]: value } : step))
    );
  };

  const saveEditing = async (id: string) => {
    const validSteps = editStepsList
      .filter((s) => s.action.trim() !== '')
      .map((s, idx) => ({
        stepNumber: idx + 1,
        action: s.action.trim(),
        expectedResult: s.expectedResult.trim(),
      }));

    if (validSteps.length === 0) return;

    const serializedSteps = JSON.stringify(validSteps);
    const stepsWithExpected = validSteps.filter((s) => s.expectedResult !== '');
    const summaryExpected =
      stepsWithExpected.length > 0
        ? stepsWithExpected.map((s) => `Paso ${s.stepNumber}: ${s.expectedResult}`).join(' | ')
        : 'Ejecución completada correctamente.';

    await fetch('/api/governance', {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        id,
        title: editTitle,
        preconditions: editPreconditions,
        steps: serializedSteps,
        expectedResult: summaryExpected,
        complexity: editComplexity,
      }),
    });
    setEditingId(null);
    await fetchCases();
  };

  const handleStatusUpdate = async (id: string, status: 'APPROVED' | 'REJECTED' | 'DRAFT') => {
    let rejectionReason = null;
    if (status === 'REJECTED') {
      rejectionReason = prompt('Indica el motivo de rechazo:') || 'Rechazado por QA Lead';
    }

    await fetch('/api/governance', {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ id, governanceStatus: status, rejectionReason }),
    });

    await fetchCases();
  };

  const filteredCases = filter === 'ALL' ? cases : cases.filter((c) => c.governanceStatus === filter);

  if (loading) return <div className="p-8 text-center text-slate-400">Cargando bandeja desde Neon...</div>;

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-slate-800 pb-4">
        <div>
          <span className="text-xs font-mono uppercase tracking-wider text-indigo-400 font-semibold">
            Etapa 02 • Quality Gate
          </span>
          <h1 className="text-xl font-semibold text-slate-100 mt-0.5">
            Bandeja de Gobernanza (QA Lead)
          </h1>
          <p className="text-xs text-slate-400 mt-1">
            Audita, edita paso a paso o dictamina los casos guardados en PostgreSQL antes de incorporarlos al Catálogo Oficial.
          </p>
        </div>

        <div className="flex gap-1 bg-slate-900 p-1 rounded-lg border border-slate-800 text-xs">
          {(['DRAFT', 'APPROVED', 'REJECTED', 'ALL'] as const).map((tab) => (
            <button
              key={tab}
              onClick={() => setFilter(tab)}
              className={`px-3 py-1 rounded-md transition-all font-medium ${
                filter === tab ? 'bg-indigo-600 text-white shadow-sm' : 'text-slate-400 hover:text-slate-200'
              }`}
            >
              {tab === 'DRAFT'
                ? `Borradores (${cases.filter((c) => c.governanceStatus === 'DRAFT').length})`
                : tab === 'APPROVED'
                ? `Aprobados (${cases.filter((c) => c.governanceStatus === 'APPROVED').length})`
                : tab === 'REJECTED'
                ? `Rechazados (${cases.filter((c) => c.governanceStatus === 'REJECTED').length})`
                : 'Todos'}
            </button>
          ))}
        </div>
      </div>

      <div className="space-y-4">
        {filteredCases.length === 0 ? (
          <div className="p-8 text-center border border-dashed border-slate-800 rounded-xl text-slate-500 text-sm">
            No hay casos en este estado.
          </div>
        ) : (
          filteredCases.map((item) => {
            const isEditing = editingId === item.id;
            const parsedSteps = parseStoredSteps(item.steps, item.expectedResult);

            return (
              <div
                key={item.id}
                className="rounded-xl border border-slate-800 bg-slate-900/40 p-5 space-y-4 transition-all hover:border-slate-700"
              >
                <div className="flex flex-wrap items-start justify-between gap-3">
                  <div className="flex-1 min-w-[260px]">
                    <div className="flex items-center gap-2 mb-1.5 flex-wrap">
                      <span className="text-xs font-mono font-semibold text-indigo-400">{item.code}</span>
                      <span className="text-xs font-mono text-slate-400">{item.userStory?.sapCode}</span>
                      <span className="text-xs bg-slate-800 text-slate-300 px-2 py-0.5 rounded font-medium">
                        {item.userStory?.sapModule} • {item.userStory?.sapTransaction || 'Sin Tx'}
                      </span>
                      <span className="text-[10px] bg-slate-950 border border-slate-800 text-slate-400 px-2 py-0.5 rounded">
                        {item.testType}
                      </span>
                      <span className="text-[10px] font-mono text-slate-500">
                        {parsedSteps.length} paso(s)
                      </span>
                      <span
                        className={`text-[10px] px-2 py-0.5 rounded font-bold uppercase ${
                          item.complexity === 'ALTA'
                            ? 'bg-rose-500/10 text-rose-400 border border-rose-500/20'
                            : item.complexity === 'BAJA'
                            ? 'bg-emerald-500/10 text-emerald-400 border border-emerald-500/20'
                            : 'bg-amber-500/10 text-amber-400 border border-amber-500/20'
                        }`}
                      >
                        {item.complexity || 'MEDIA'}
                      </span>
                    </div>

                    {isEditing ? (
                      <div className="grid sm:grid-cols-12 gap-3 mt-2">
                        <div className="sm:col-span-8">
                          <label className="text-[10px] font-semibold uppercase tracking-wider text-slate-400 block mb-1">
                            Título del Caso
                          </label>
                          <input
                            value={editTitle}
                            onChange={(e) => setEditTitle(e.target.value)}
                            className="w-full bg-slate-950 border border-slate-700 rounded-lg px-3 py-1.5 text-sm text-slate-200 focus:outline-none focus:border-indigo-500"
                          />
                        </div>

                        <div className="sm:col-span-4">
                          <label className="text-[10px] font-semibold uppercase tracking-wider text-slate-400 block mb-1">
                            Complejidad (Esfuerzo Estimado)
                          </label>
                          <select
                            value={editComplexity}
                            onChange={(e) => setEditComplexity(e.target.value)}
                            className="w-full bg-slate-950 border border-slate-700 rounded-lg px-3 py-1.5 text-xs text-slate-200 focus:outline-none focus:border-indigo-500"
                          >
                            <option value="BAJA">Baja (15 min)</option>
                            <option value="MEDIA">Media (30 min - Default)</option>
                            <option value="ALTA">Alta (60 min)</option>
                          </select>
                        </div>
                      </div>
                    ) : (
                      <h2 className="text-base font-medium text-slate-100">{item.title}</h2>
                    )}
                  </div>

                  <span
                    className={`text-xs font-semibold px-2.5 py-1 rounded-full border ${
                      item.governanceStatus === 'APPROVED'
                        ? 'bg-emerald-500/10 text-emerald-400 border-emerald-500/20'
                        : item.governanceStatus === 'REJECTED'
                        ? 'bg-rose-500/10 text-rose-400 border-rose-500/20'
                        : 'bg-amber-500/10 text-amber-400 border-amber-500/20'
                    }`}
                  >
                    {item.governanceStatus}
                  </span>
                </div>

                {isEditing ? (
                  <div className="space-y-4 bg-slate-950 p-4 rounded-lg border border-indigo-500/40 text-xs">
                    <div>
                      <label className="text-slate-400 font-semibold uppercase tracking-wider block mb-1">
                        Precondiciones
                      </label>
                      <input
                        value={editPreconditions}
                        onChange={(e) => setEditPreconditions(e.target.value)}
                        className="w-full bg-slate-900 border border-slate-800 rounded-lg p-2 text-xs text-slate-200 focus:outline-none focus:border-indigo-500"
                      />
                    </div>

                    <div className="space-y-2.5 border-t border-slate-800/80 pt-3">
                      <div className="flex items-center justify-between">
                        <label className="text-indigo-400 font-semibold uppercase tracking-wider">
                          Secuencia de Pasos SAP Cloud ALM ({editStepsList.length})
                        </label>
                        <button
                          type="button"
                          onClick={handleAddEditStep}
                          className="px-2.5 py-1 rounded bg-indigo-500/10 hover:bg-indigo-500/20 text-indigo-300 border border-indigo-500/30 text-xs font-medium transition"
                        >
                          + Agregar Paso #{editStepsList.length + 1}
                        </button>
                      </div>

                      <div className="space-y-2">
                        {editStepsList.map((st, idx) => (
                          <div
                            key={idx}
                            className="grid grid-cols-1 sm:grid-cols-12 gap-2 items-start bg-slate-900/70 p-2.5 rounded-lg border border-slate-800"
                          >
                            <div className="sm:col-span-1 flex items-center sm:justify-center pt-1.5">
                              <span className="font-mono font-bold text-indigo-400 text-xs">
                                #{st.stepNumber}
                              </span>
                            </div>

                            <div className="sm:col-span-5">
                              <input
                                required
                                type="text"
                                placeholder="Acción en SAP (Obligatorio)..."
                                value={st.action}
                                onChange={(e) => handleEditStepChange(idx, 'action', e.target.value)}
                                className="w-full bg-slate-950 border border-slate-800 rounded px-2.5 py-1.5 text-xs text-slate-200 focus:outline-none focus:border-indigo-500"
                              />
                            </div>

                            <div className="sm:col-span-5">
                              <input
                                type="text"
                                placeholder="Resultado esperado (Opcional)..."
                                value={st.expectedResult}
                                onChange={(e) =>
                                  handleEditStepChange(idx, 'expectedResult', e.target.value)
                                }
                                className="w-full bg-slate-950 border border-slate-800 rounded px-2.5 py-1.5 text-xs text-slate-200 focus:outline-none focus:border-indigo-500"
                              />
                            </div>

                            <div className="sm:col-span-1 flex justify-end sm:justify-center pt-1">
                              <button
                                type="button"
                                disabled={editStepsList.length === 1}
                                onClick={() => handleRemoveEditStep(idx)}
                                className="text-slate-500 hover:text-rose-400 disabled:opacity-20 px-1.5 py-0.5"
                              >
                                ✕
                              </button>
                            </div>
                          </div>
                        ))}
                      </div>
                    </div>

                    <div className="flex justify-end gap-2 pt-2 border-t border-slate-800/80">
                      <button
                        onClick={() => setEditingId(null)}
                        className="px-3 py-1.5 rounded-lg border border-slate-700 text-slate-400 text-xs hover:text-slate-200"
                      >
                        Cancelar
                      </button>
                      <button
                        onClick={() => saveEditing(item.id)}
                        className="px-4 py-1.5 rounded-lg bg-indigo-600 hover:bg-indigo-500 text-white text-xs font-medium transition-all"
                      >
                        Guardar Cambios en Neon
                      </button>
                    </div>
                  </div>
                ) : (
                  <div className="space-y-3 bg-slate-950 p-4 rounded-lg border border-slate-800/80 text-xs">
                    <div>
                      <span className="text-slate-500 font-semibold uppercase tracking-wider block mb-0.5">
                        Precondiciones
                      </span>
                      <p className="text-slate-300">{item.preconditions || 'Sin precondiciones'}</p>
                    </div>

                    {/* Vista de Tabla Paso por Paso */}
                    <div className="border-t border-slate-800/80 pt-2.5">
                      <div className="grid grid-cols-12 text-[10px] font-mono uppercase tracking-wider text-slate-500 pb-1.5 border-b border-slate-900">
                        <div className="col-span-1">Paso</div>
                        <div className="col-span-6">Acción en SAP</div>
                        <div className="col-span-5">Resultado Esperado (Opcional)</div>
                      </div>
                      <div className="divide-y divide-slate-900/80">
                        {parsedSteps.map((st, i) => {
                          const isLast = i === parsedSteps.length - 1;
                          const displayExpected =
                            st.expectedResult?.trim() ||
                            (isLast && parsedSteps.every((s) => !s.expectedResult?.trim())
                              ? item.expectedResult
                              : '');

                          return (
                            <div key={i} className="grid grid-cols-12 py-2 gap-2 items-start">
                              <div className="col-span-1 font-mono font-bold text-indigo-400">
                                #{st.stepNumber}
                              </div>
                              <div className="col-span-6 text-slate-200">{st.action}</div>
                              <div className="col-span-5 text-slate-400 italic">
                                {displayExpected || <span className="text-slate-600">—</span>}
                              </div>
                            </div>
                          );
                        })}
                      </div>
                    </div>
                  </div>
                )}

                {item.rejectionReason && (
                  <div className="p-3 bg-rose-950/20 border border-rose-500/20 rounded-lg text-xs text-rose-300">
                    <strong>Motivo de rechazo:</strong> {item.rejectionReason}
                  </div>
                )}

                {!isEditing && (
                  <div className="flex items-center justify-end gap-2 pt-2 border-t border-slate-800/60">
                    <button
                      onClick={() => startEditing(item)}
                      className="px-3 py-1.5 rounded-lg border border-slate-700 bg-slate-800 hover:bg-slate-700 text-slate-200 text-xs font-medium transition-all flex items-center gap-1"
                    >
                      ✏️ Editar Caso y Pasos ({parsedSteps.length})
                    </button>

                    {item.governanceStatus === 'DRAFT' && (
                      <>
                        <button
                          onClick={() => handleStatusUpdate(item.id, 'REJECTED')}
                          className="px-3 py-1.5 rounded-lg border border-rose-500/30 text-rose-400 text-xs font-medium hover:bg-rose-500/10 transition-all"
                        >
                          Rechazar
                        </button>
                        <button
                          onClick={() => handleStatusUpdate(item.id, 'APPROVED')}
                          className="px-4 py-1.5 rounded-lg bg-emerald-600 hover:bg-emerald-500 text-white text-xs font-medium transition-all shadow-sm"
                        >
                          Aprobar para Catálogo
                        </button>
                      </>
                    )}

                    {item.governanceStatus === 'REJECTED' && (
                      <button
                        onClick={() => handleStatusUpdate(item.id, 'APPROVED')}
                        className="px-3 py-1.5 rounded-lg bg-emerald-600 hover:bg-emerald-500 text-white text-xs font-medium transition-all"
                      >
                        Re-aprobar
                      </button>
                    )}

                    {item.governanceStatus === 'APPROVED' && (
                      <button
                        onClick={() => handleStatusUpdate(item.id, 'DRAFT')}
                        className="px-3 py-1.5 rounded-lg border border-amber-500/30 text-amber-400 text-xs font-medium hover:bg-amber-500/10 transition-all"
                      >
                        ↩ Volver a Borrador
                      </button>
                    )}
                  </div>
                )}
              </div>
            );
          })
        )}
      </div>
    </div>
  );
}