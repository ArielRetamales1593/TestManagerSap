'use client';

import React, { useEffect, useState } from 'react';

export interface TestStepItem {
  stepNumber: number;
  action: string;
  expectedResult: string;
}

export default function StoriesPage() {
  const [stories, setStories] = useState<any[]>([]);
  const [selectedHu, setSelectedHu] = useState<any>(null);
  const [loading, setLoading] = useState(true);

  // Modales
  const [showHuModal, setShowHuModal] = useState(false);
  const [isEditingHu, setIsEditingHu] = useState(false);
  const [editingHuId, setEditingHuId] = useState<string | null>(null);
  const [showBulkModal, setShowBulkModal] = useState(false);

  // Form HU
  const [huCode, setHuCode] = useState('');
  const [huTitle, setHuTitle] = useState('');
  const [huDescription, setHuDescription] = useState('');
  const [huModule, setHuModule] = useState('MM');
  const [huTx, setHuTx] = useState('');
  const [huCriteria, setHuCriteria] = useState('');

  // Form Caso Individual con pasos separados uno por uno
  const [caseTitle, setCaseTitle] = useState('');
  const [testType, setTestType] = useState('POSITIVA');
  const [preconditions, setPreconditions] = useState('');
  const [stepsList, setStepsList] = useState<TestStepItem[]>([
    { stepNumber: 1, action: '', expectedResult: '' },
  ]);

  // Form Carga Masiva
  const [bulkRawText, setBulkRawText] = useState('');

  const loadData = async () => {
    try {
      const res = await fetch('/api/stories');
      const data = await res.json();
      setStories(data);
      if (data.length > 0) {
        if (!selectedHu) {
          setSelectedHu(data[0]);
        } else {
          const current = data.find((s: any) => s.id === selectedHu.id);
          setSelectedHu(current || data[0]);
        }
      } else {
        setSelectedHu(null);
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

  const handleAddStep = () => {
    setStepsList((prev) => [
      ...prev,
      { stepNumber: prev.length + 1, action: '', expectedResult: '' },
    ]);
  };

  const handleRemoveStep = (indexToRemove: number) => {
    if (stepsList.length <= 1) return;
    setStepsList((prev) =>
      prev
        .filter((_, idx) => idx !== indexToRemove)
        .map((item, idx) => ({ ...item, stepNumber: idx + 1 }))
    );
  };

  const handleStepChange = (
    index: number,
    field: 'action' | 'expectedResult',
    value: string
  ) => {
    setStepsList((prev) =>
      prev.map((item, idx) => (idx === index ? { ...item, [field]: value } : item))
    );
  };

  const parseStoredSteps = (rawSteps: string): TestStepItem[] => {
    try {
      const parsed = JSON.parse(rawSteps);
      if (Array.isArray(parsed)) return parsed;
    } catch {
      // Fallback para casos antiguos en texto plano
    }
    return (rawSteps || '')
      .split('\n')
      .filter(Boolean)
      .map((line, idx) => ({
        stepNumber: idx + 1,
        action: line,
        expectedResult: '',
      }));
  };

  const openCreateModal = () => {
    setIsEditingHu(false);
    setEditingHuId(null);
    setHuCode('');
    setHuTitle('');
    setHuDescription('');
    setHuModule('MM');
    setHuTx('');
    setHuCriteria('');
    setShowHuModal(true);
  };

  const openEditModal = (hu: any) => {
    setIsEditingHu(true);
    setEditingHuId(hu.id);
    setHuCode(hu.sapCode);
    setHuTitle(hu.title);
    setHuDescription(hu.description);
    setHuModule(hu.sapModule);
    setHuTx(hu.sapTransaction || '');
    setHuCriteria(hu.acceptanceCriteria || '');
    setShowHuModal(true);
  };

  const handleSaveHu = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!huTitle || !huDescription) return;

    if (isEditingHu && editingHuId) {
      await fetch('/api/stories', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          id: editingHuId,
          sapCode: huCode.trim().toUpperCase(),
          title: huTitle,
          description: huDescription,
          sapModule: huModule,
          sapTransaction: huTx.toUpperCase() || 'N/A',
          acceptanceCriteria: huCriteria,
        }),
      });
    } else {
      const generatedCode = huCode.trim() || `HU-${huModule}-0${stories.length + 1}`;
      await fetch('/api/stories', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          sapCode: generatedCode.toUpperCase(),
          title: huTitle,
          description: huDescription,
          sapModule: huModule,
          sapTransaction: huTx.toUpperCase() || 'N/A',
          acceptanceCriteria: huCriteria,
        }),
      });
    }

    setShowHuModal(false);
    await loadData();
  };

  const handleDeleteHu = async (id: string, code: string) => {
    if (!window.confirm(`¿Eliminar ${code}? Sus casos de prueba se borrarán en cascada de Neon.`)) return;
    await fetch(`/api/stories?id=${id}`, { method: 'DELETE' });
    await loadData();
  };

  const handleCreateCase = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!caseTitle || !selectedHu) return;

    // Solo exigimos que la Acción (action) tenga contenido; expectedResult es opcional por paso
    const validSteps = stepsList
      .filter((s) => s.action.trim() !== '')
      .map((s, idx) => ({
        stepNumber: idx + 1,
        action: s.action.trim(),
        expectedResult: s.expectedResult.trim(),
      }));

    if (validSteps.length === 0) return;

    const count = (selectedHu.testCases?.length || 0) + 1;
    const cleanCode = selectedHu.sapCode.replace('HU-', '');
    const code = `CP-${cleanCode}-${count < 10 ? '0' + count : count}`;

    const serializedSteps = JSON.stringify(validSteps);

    // Armamos el resumen general solo con los pasos que sí tengan resultado esperado escrito
    const stepsWithExpected = validSteps.filter((s) => s.expectedResult !== '');
    const summaryExpectedResult =
      stepsWithExpected.length > 0
        ? stepsWithExpected.map((s) => `Paso ${s.stepNumber}: ${s.expectedResult}`).join(' | ')
        : 'Ejecución completada correctamente según criterios de la HU.';

    await fetch('/api/test-cases', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        code,
        userStoryId: selectedHu.id,
        title: caseTitle,
        testType,
        origin: 'MANUAL',
        preconditions,
        steps: serializedSteps,
        expectedResult: summaryExpectedResult,
      }),
    });

    setCaseTitle('');
    setPreconditions('');
    setStepsList([{ stepNumber: 1, action: '', expectedResult: '' }]);
    await loadData();
  };

  const handleProcessBulk = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!bulkRawText.trim() || !selectedHu) return;

    const lines = bulkRawText.split('\n').map((l) => l.trim()).filter((l) => l.length > 0);
    const cleanCode = selectedHu.sapCode.replace('HU-', '');
    let existingCount = selectedHu.testCases?.length || 0;

    const payload = lines.map((line) => {
      let parts: string[] = [];
      if (line.includes('\t')) parts = line.split('\t');
      else if (line.includes(';')) parts = line.split(';');
      else parts = [line];

      existingCount += 1;
      const indexStr = existingCount < 10 ? `0${existingCount}` : `${existingCount}`;

      const rawStepsText = parts[3]?.trim() || 'Ejecutar transacción SAP';
      const rawExpectedText = parts[4]?.trim() || 'Grabación exitosa';

      const stepActions = rawStepsText.split('|').map((s) => s.trim()).filter(Boolean);
      const stepExpecteds = rawExpectedText.split('|').map((s) => s.trim()).filter(Boolean);

      const structuredBulkSteps: TestStepItem[] = stepActions.map((act, idx) => ({
        stepNumber: idx + 1,
        action: act,
        // Si solo pusieron 1 resultado esperado general en el CSV, se asigna únicamente al último paso
        expectedResult:
          stepExpecteds.length === 1
            ? idx === stepActions.length - 1
              ? stepExpecteds[0]
              : ''
            : stepExpecteds[idx] || '',
      }));

      return {
        code: `CP-${cleanCode}-${indexStr}`,
        userStoryId: selectedHu.id,
        title: parts[0]?.trim() || 'Sin título',
        testType: ['POSITIVA', 'NEGATIVA', 'BORDE'].includes(parts[1]?.trim().toUpperCase())
          ? parts[1].trim().toUpperCase()
          : 'POSITIVA',
        origin: 'BULK',
        preconditions: parts[2]?.trim() || '',
        steps: JSON.stringify(structuredBulkSteps),
        expectedResult: rawExpectedText,
      };
    });

    await fetch('/api/test-cases', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(payload),
    });

    setBulkRawText('');
    setShowBulkModal(false);
    await loadData();
  };

  if (loading) return <div className="p-8 text-center text-slate-400">Conectando...</div>;

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-slate-800 pb-4">
        <div>
          <span className="text-xs font-mono uppercase tracking-wider text-indigo-400 font-semibold">
            Etapa 01 • Requerimientos y Diseño
          </span>
          <h1 className="text-xl font-semibold text-slate-100 mt-0.5">
            Historias de Usuario y Diseño de Casos
          </h1>
        </div>
        <button
          onClick={openCreateModal}
          className="bg-indigo-600 hover:bg-indigo-500 text-white font-medium text-xs px-4 py-2 rounded-lg transition-all shadow-sm flex items-center gap-1.5 self-start sm:self-auto"
        >
          <span>+</span> Nueva Historia de Usuario (HU)
        </button>
      </div>

      <div className="grid lg:grid-cols-12 gap-6">
        {/* Panel lateral */}
        <div className="lg:col-span-4 space-y-3">
          <h2 className="text-xs font-semibold uppercase tracking-wider text-slate-400">
            Historias en Neon ({stories.length})
          </h2>

          <div className="space-y-2.5">
            {stories.map((hu) => {
              const isSelected = selectedHu?.id === hu.id;
              return (
                <div
                  key={hu.id}
                  onClick={() => setSelectedHu(hu)}
                  className={`p-4 rounded-xl border cursor-pointer transition-all ${
                    isSelected
                      ? 'border-indigo-500/70 bg-indigo-950/20 shadow-sm'
                      : 'border-slate-800 bg-slate-900/30 hover:border-slate-700'
                  }`}
                >
                  <div className="flex items-center justify-between mb-2">
                    <span className="text-xs font-mono font-semibold text-indigo-400">{hu.sapCode}</span>
                    <span className="text-[10px] font-mono bg-slate-800 text-slate-300 px-2 py-0.5 rounded">
                      {hu.sapModule} • {hu.sapTransaction || 'Sin Tx'}
                    </span>
                  </div>
                  <h3 className="text-sm font-medium text-slate-200 line-clamp-1">{hu.title}</h3>
                  <p className="text-xs text-slate-400 line-clamp-2 mt-1 leading-relaxed">
                    {hu.description}
                  </p>
                  <div className="mt-3 flex items-center justify-between text-[11px] text-slate-500 border-t border-slate-800/60 pt-2">
                    <span>{hu.testCases?.length || 0} caso(s) en BD</span>
                    {isSelected && <span className="text-indigo-400 font-medium">Activa →</span>}
                  </div>
                </div>
              );
            })}

            {stories.length === 0 && (
              <div className="p-6 text-center border border-dashed border-slate-800 rounded-xl text-slate-500 text-xs">
                No hay Historias creadas. Haz clic en '+ Nueva Historia de Usuario'.
              </div>
            )}
          </div>
        </div>

        {/* Panel principal */}
        <div className="lg:col-span-8 space-y-6">
          {selectedHu ? (
            <>
              <div className="rounded-xl border border-slate-800 bg-slate-900/50 p-5 space-y-4">
                <div className="flex flex-wrap items-center justify-between gap-2 border-b border-slate-800/80 pb-3">
                  <div className="flex items-center gap-2">
                    <span className="text-xs font-mono font-semibold bg-indigo-500/10 text-indigo-400 border border-indigo-500/20 px-2.5 py-0.5 rounded">
                      {selectedHu.sapCode}
                    </span>
                    <span className="text-xs text-slate-400">
                      Módulo {selectedHu.sapModule} • Transacción {selectedHu.sapTransaction || 'N/A'}
                    </span>
                  </div>

                  <div className="flex items-center gap-2">
                    <button
                      onClick={() => openEditModal(selectedHu)}
                      className="text-xs font-medium px-2.5 py-1 rounded bg-slate-800 hover:bg-slate-700 text-slate-300 border border-slate-700 transition-all flex items-center gap-1"
                    >
                      ✏️ Editar
                    </button>
                    <button
                      onClick={() => handleDeleteHu(selectedHu.id, selectedHu.sapCode)}
                      className="text-xs font-medium px-2.5 py-1 rounded bg-rose-500/10 hover:bg-rose-500/20 text-rose-400 border border-rose-500/20 transition-all flex items-center gap-1"
                    >
                      🗑️ Eliminar
                    </button>
                    <button
                      onClick={() => setShowBulkModal(true)}
                      className="text-xs font-medium px-2.5 py-1 rounded bg-indigo-500/10 hover:bg-indigo-500/20 text-indigo-300 border border-indigo-500/30 transition-all flex items-center gap-1 shadow-sm"
                    >
                      📑 Carga Masiva
                    </button>
                  </div>
                </div>

                <div>
                  <span className="text-[10px] font-semibold uppercase tracking-wider text-slate-500 block">
                    Título del Requerimiento
                  </span>
                  <h2 className="text-base font-semibold text-slate-100 mt-0.5">{selectedHu.title}</h2>
                </div>

                <div className="grid md:grid-cols-2 gap-3">
                  <div className="bg-slate-950 p-3.5 rounded-lg border border-slate-800/80 space-y-1">
                    <span className="text-[10px] font-semibold uppercase tracking-wider text-indigo-400 block">
                      Narrativa de la HU
                    </span>
                    <p className="text-xs text-slate-300 leading-relaxed italic">
                      "{selectedHu.description}"
                    </p>
                  </div>
                  <div className="bg-slate-950 p-3.5 rounded-lg border border-slate-800/80 space-y-1">
                    <span className="text-[10px] font-semibold uppercase tracking-wider text-slate-400 block">
                      Criterios de Aceptación
                    </span>
                    <p className="text-xs text-slate-300 whitespace-pre-line leading-relaxed">
                      {selectedHu.acceptanceCriteria || 'Sin criterios especificados.'}
                    </p>
                  </div>
                </div>
              </div>

              {/* Formulario Manual de Caso con Pasos Uno por Uno */}
              <form
                onSubmit={handleCreateCase}
                className="rounded-xl border border-slate-800 bg-slate-900/40 p-5 space-y-4"
              >
                <div className="flex items-center justify-between border-b border-slate-800 pb-3">
                  <div>
                    <h3 className="text-sm font-semibold text-slate-100 flex items-center gap-2">
                      Diseño Manual de Caso para {selectedHu.sapCode}
                      <span className="text-[10px] font-normal px-2 py-0.5 rounded bg-slate-800 text-slate-300">
                        Manual • Formato SAP ALM
                      </span>
                    </h3>
                    <p className="text-xs text-slate-400 mt-0.5">
                      La acción es obligatoria en cada paso; el resultado esperado es opcional en pasos intermedios.
                    </p>
                  </div>
                  <select
                    value={testType}
                    onChange={(e) => setTestType(e.target.value)}
                    className="bg-slate-950 border border-slate-800 text-xs rounded-lg px-2.5 py-1.5 text-slate-300 focus:border-indigo-500 focus:outline-none"
                  >
                    <option value="POSITIVA">Tipo: Positiva</option>
                    <option value="NEGATIVA">Tipo: Negativa</option>
                    <option value="BORDE">Tipo: Borde</option>
                  </select>
                </div>

                <div className="grid sm:grid-cols-2 gap-4">
                  <div>
                    <label className="text-xs font-medium text-slate-400 block mb-1">
                      Título del Escenario *
                    </label>
                    <input
                      required
                      placeholder="Ej: Validar rechazo al ingresar cantidad con stock en cero"
                      value={caseTitle}
                      onChange={(e) => setCaseTitle(e.target.value)}
                      className="w-full bg-slate-950 border border-slate-800 rounded-lg px-3 py-2 text-xs text-slate-200 focus:outline-none focus:border-indigo-500"
                    />
                  </div>

                  <div>
                    <label className="text-xs font-medium text-slate-400 block mb-1">
                      Precondiciones (Datos SAP)
                    </label>
                    <input
                      placeholder="Ej: Material 100-100 sin stock, Proveedor 10045, Rol Comprador"
                      value={preconditions}
                      onChange={(e) => setPreconditions(e.target.value)}
                      className="w-full bg-slate-950 border border-slate-800 rounded-lg px-3 py-2 text-xs text-slate-200 focus:outline-none focus:border-indigo-500"
                    />
                  </div>
                </div>

                {/* Grilla dinámica de pasos uno por uno */}
                <div className="space-y-3 border-t border-slate-800/80 pt-4">
                  <div className="flex items-center justify-between">
                    <div>
                      <label className="text-xs font-semibold uppercase tracking-wider text-indigo-400 block">
                        Secuencia de Pasos en SAP ({stepsList.length}) *
                      </label>
                      <span className="text-[11px] text-slate-500">
                        Puedes dejar el Resultado Esperado solo en el último paso o detallarlo donde lo necesites.
                      </span>
                    </div>
                    <button
                      type="button"
                      onClick={handleAddStep}
                      className="text-xs font-medium px-3 py-1.5 rounded-lg bg-indigo-500/10 hover:bg-indigo-500/20 text-indigo-300 border border-indigo-500/30 transition-all"
                    >
                      + Agregar Paso #{stepsList.length + 1}
                    </button>
                  </div>

                  <div className="space-y-2">
                    {stepsList.map((step, idx) => (
                      <div
                        key={idx}
                        className="grid grid-cols-1 sm:grid-cols-12 gap-2.5 items-start bg-slate-950 p-3 rounded-xl border border-slate-800/90"
                      >
                        <div className="sm:col-span-1 flex items-center sm:justify-center pt-1.5">
                          <span className="text-xs font-mono font-bold text-indigo-400 bg-indigo-950/50 border border-indigo-500/30 w-7 h-7 flex items-center justify-center rounded-lg">
                            {step.stepNumber}
                          </span>
                        </div>

                        <div className="sm:col-span-5">
                          <label className="text-[10px] uppercase tracking-wider text-slate-500 block mb-1">
                            Acción en SAP (Action Instructions) *
                          </label>
                          <input
                            required
                            type="text"
                            placeholder={`Ej: Ejecutar transacción ${selectedHu.sapTransaction || 'ME21N'}`}
                            value={step.action}
                            onChange={(e) => handleStepChange(idx, 'action', e.target.value)}
                            className="w-full bg-slate-900 border border-slate-800 rounded-lg px-2.5 py-1.5 text-xs text-slate-200 focus:border-indigo-500 focus:outline-none"
                          />
                        </div>

                        <div className="sm:col-span-5">
                          <label className="text-[10px] uppercase tracking-wider text-slate-500 block mb-1">
                            Resultado Esperado (Opcional en pasos intermedios)
                          </label>
                          <input
                            type="text"
                            placeholder={
                              idx === stepsList.length - 1
                                ? 'Ej: Documento contabilizado / Mensaje de éxito'
                                : 'Opcional...'
                            }
                            value={step.expectedResult}
                            onChange={(e) => handleStepChange(idx, 'expectedResult', e.target.value)}
                            className="w-full bg-slate-900 border border-slate-800 rounded-lg px-2.5 py-1.5 text-xs text-slate-200 focus:border-indigo-500 focus:outline-none"
                          />
                        </div>

                        <div className="sm:col-span-1 flex justify-end sm:justify-center pt-5">
                          <button
                            type="button"
                            disabled={stepsList.length === 1}
                            onClick={() => handleRemoveStep(idx)}
                            className="text-slate-500 hover:text-rose-400 disabled:opacity-20 text-xs px-2 py-1 rounded hover:bg-slate-900 transition"
                            title="Eliminar paso"
                          >
                            ✕
                          </button>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>

                <div className="flex justify-end pt-2">
                  <button
                    type="submit"
                    className="bg-indigo-600 hover:bg-indigo-500 text-white font-medium text-xs px-4 py-2 rounded-lg transition-all shadow-sm"
                  >
                    Guardar Caso con {stepsList.length} Paso(s) en Neon (DRAFT)
                  </button>
                </div>
              </form>

              {/* Lista de Casos en Neon */}
              <div className="space-y-2.5">
                <h4 className="text-xs font-semibold uppercase tracking-wider text-slate-400">
                  Casos de {selectedHu.sapCode} ({selectedHu.testCases?.length || 0})
                </h4>
                {selectedHu.testCases?.map((c: any) => {
                  const caseSteps = parseStoredSteps(c.steps);
                  return (
                    <div
                      key={c.id}
                      className="p-3.5 rounded-xl border border-slate-800 bg-slate-900/30 space-y-2"
                    >
                      <div className="flex items-center justify-between">
                        <div>
                          <div className="flex items-center gap-2 mb-1">
                            <span className="text-xs font-mono font-semibold text-indigo-400">{c.code}</span>
                            <span className="text-[10px] bg-slate-800 text-slate-300 px-2 py-0.5 rounded">
                              {c.testType}
                            </span>
                            <span className="text-[10px] text-slate-400 font-mono">
                              {caseSteps.length} paso(s)
                            </span>
                            <span className="text-[10px] text-slate-500 font-mono">
                              {c.origin === 'BULK' ? '📑 Masivo' : '✍️ Manual'}
                            </span>
                          </div>
                          <p className="text-xs font-medium text-slate-200">{c.title}</p>
                        </div>
                        <span className="text-[10px] font-semibold px-2 py-0.5 rounded-full bg-amber-500/10 text-amber-400 border border-amber-500/20">
                          {c.governanceStatus}
                        </span>
                      </div>

                      {caseSteps.length > 0 && (
                        <div className="bg-slate-950/70 rounded-lg p-2.5 border border-slate-800/70 space-y-1">
                          {caseSteps.map((st, i) => (
                            <div
                              key={i}
                              className="text-[11px] flex flex-col sm:flex-row sm:items-center justify-between gap-1 text-slate-300 border-b border-slate-900 last:border-0 pb-1 last:pb-0"
                            >
                              <span>
                                <strong className="font-mono text-indigo-400 mr-1.5">
                                  #{st.stepNumber}
                                </strong>
                                {st.action}
                              </span>
                              {st.expectedResult ? (
                                <span className="text-slate-400 text-[10px] sm:text-right italic">
                                  → {st.expectedResult}
                                </span>
                              ) : (
                                <span className="text-slate-600 text-[10px] sm:text-right italic">
                                  —
                                </span>
                              )}
                            </div>
                          ))}
                        </div>
                      )}
                    </div>
                  );
                })}
              </div>
            </>
          ) : (
            <div className="p-8 text-center text-slate-500 text-sm border border-dashed border-slate-800 rounded-xl">
              Selecciona o crea una Historia de Usuario para comenzar.
            </div>
          )}
        </div>
      </div>

      {/* Modal Crear / Editar HU */}
      {showHuModal && (
        <div className="fixed inset-0 z-50 bg-slate-950/80 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="w-full max-w-lg rounded-2xl border border-slate-800 bg-slate-900 p-6 shadow-2xl space-y-4 max-h-[90vh] overflow-y-auto">
            <div className="flex justify-between items-center border-b border-slate-800 pb-3">
              <h3 className="text-base font-semibold text-slate-100">
                {isEditingHu ? `Editar Historia: ${huCode}` : 'Nueva Historia de Usuario SAP'}
              </h3>
              <button onClick={() => setShowHuModal(false)} className="text-slate-400 hover:text-slate-200 text-sm">
                ✕
              </button>
            </div>

            <form onSubmit={handleSaveHu} className="space-y-4">
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="text-xs font-medium text-slate-400 block mb-1">Código (Opcional)</label>
                  <input
                    placeholder="Ej: HU-MM-015"
                    value={huCode}
                    onChange={(e) => setHuCode(e.target.value)}
                    className="w-full bg-slate-950 border border-slate-800 rounded-lg px-3 py-2 text-xs text-slate-200 focus:outline-none focus:border-indigo-500 uppercase"
                  />
                </div>
                <div>
                  <label className="text-xs font-medium text-slate-400 block mb-1">Módulo SAP *</label>
                  <select
                    value={huModule}
                    onChange={(e) => setHuModule(e.target.value)}
                    className="w-full bg-slate-950 border border-slate-800 rounded-lg px-2.5 py-2 text-xs text-slate-200 focus:outline-none focus:border-indigo-500"
                  >
                    <option value="MM">MM (Compras / Inventario)</option>
                    <option value="SD">SD (Ventas y Distribución)</option>
                    <option value="FI">FI (Finanzas)</option>
                    <option value="CO">CO (Costos / Controlling)</option>
                    <option value="PP">PP (Producción)</option>
                  </select>
                </div>
              </div>

              <div className="grid grid-cols-3 gap-3">
                <div className="col-span-2">
                  <label className="text-xs font-medium text-slate-400 block mb-1">Título Resumido *</label>
                  <input
                    required
                    placeholder="Ej: Bloqueo de pedido por falta de presupuesto"
                    value={huTitle}
                    onChange={(e) => setHuTitle(e.target.value)}
                    className="w-full bg-slate-950 border border-slate-800 rounded-lg px-3 py-2 text-xs text-slate-200 focus:outline-none focus:border-indigo-500"
                  />
                </div>
                <div>
                  <label className="text-xs font-medium text-slate-400 block mb-1">Transacción SAP</label>
                  <input
                    placeholder="ME21N"
                    value={huTx}
                    onChange={(e) => setHuTx(e.target.value)}
                    className="w-full bg-slate-950 border border-slate-800 rounded-lg px-3 py-2 text-xs text-slate-200 focus:outline-none focus:border-indigo-500 uppercase"
                  />
                </div>
              </div>

              <div>
                <label className="text-xs font-medium text-slate-400 block mb-1">Narrativa de la Historia *</label>
                <textarea
                  required
                  rows={3}
                  placeholder="Como [rol], quiero [acción en SAP] para [beneficio]..."
                  value={huDescription}
                  onChange={(e) => setHuDescription(e.target.value)}
                  className="w-full bg-slate-950 border border-slate-800 rounded-lg p-2.5 text-xs text-slate-200 focus:outline-none focus:border-indigo-500 leading-relaxed"
                />
              </div>

              <div>
                <label className="text-xs font-medium text-slate-400 block mb-1">Criterios de Aceptación</label>
                <textarea
                  rows={3}
                  placeholder="1. Si el monto supera $10,000 USD se bloquea..."
                  value={huCriteria}
                  onChange={(e) => setHuCriteria(e.target.value)}
                  className="w-full bg-slate-950 border border-slate-800 rounded-lg p-2.5 text-xs text-slate-200 focus:outline-none focus:border-indigo-500"
                />
              </div>

              <div className="flex justify-end gap-2 pt-2 border-t border-slate-800">
                <button
                  type="button"
                  onClick={() => setShowHuModal(false)}
                  className="px-3 py-2 text-xs text-slate-400 hover:text-slate-200"
                >
                  Cancelar
                </button>
                <button
                  type="submit"
                  className="bg-indigo-600 hover:bg-indigo-500 text-white font-medium text-xs px-4 py-2 rounded-lg transition-all"
                >
                  {isEditingHu ? 'Guardar Cambios en Neon' : 'Crear en Neon'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Modal Carga Masiva */}
      {showBulkModal && (
        <div className="fixed inset-0 z-50 bg-slate-950/80 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="w-full max-w-2xl rounded-2xl border border-slate-800 bg-slate-900 p-6 shadow-2xl space-y-4 max-h-[90vh] overflow-y-auto">
            <div className="flex justify-between items-center border-b border-slate-800 pb-3">
              <div>
                <h3 className="text-base font-semibold text-slate-100">
                  Carga Masiva de Casos para {selectedHu?.sapCode}
                </h3>
                <p className="text-xs text-slate-400 mt-0.5">
                  Pega desde Excel/CSV separado por punto y coma (;). Separa múltiples pasos con barra vertical (|).
                </p>
              </div>
              <button onClick={() => setShowBulkModal(false)} className="text-slate-400 hover:text-slate-200 text-sm">
                ✕
              </button>
            </div>

            <form onSubmit={handleProcessBulk} className="space-y-4">
              <div className="bg-slate-950 border border-slate-800/80 rounded-xl p-3 text-xs space-y-1">
                <span className="font-semibold text-indigo-400 block">Columnas esperadas:</span>
                <p className="text-slate-400 font-mono text-[11px]">
                  Título ; Tipo ; Precondiciones ; Paso 1 | Paso 2 ; Resultado General (o Resultado 1 | Resultado 2)
                </p>
              </div>

              <div>
                <label className="text-xs font-medium text-slate-400 block mb-1">
                  Pegar Filas de Casos de Prueba *
                </label>
                <textarea
                  required
                  rows={8}
                  placeholder={`Verificar orden sin presupuesto;POSITIVA;Proveedor activo;Entrar a ME21N | Guardar orden;Pedido grabado con bloqueo`}
                  value={bulkRawText}
                  onChange={(e) => setBulkRawText(e.target.value)}
                  className="w-full bg-slate-950 border border-slate-800 rounded-lg p-3 text-xs text-slate-200 font-mono focus:outline-none focus:border-indigo-500 leading-relaxed"
                />
              </div>

              <div className="flex items-center justify-between pt-2 border-t border-slate-800">
                <span className="text-xs text-slate-500">
                  {bulkRawText.split('\n').filter((l) => l.trim()).length} fila(s) detectada(s)
                </span>
                <div className="flex gap-2">
                  <button
                    type="button"
                    onClick={() => setShowBulkModal(false)}
                    className="px-3 py-2 text-xs text-slate-400 hover:text-slate-200"
                  >
                    Cancelar
                  </button>
                  <button
                    type="submit"
                    className="bg-indigo-600 hover:bg-indigo-500 text-white font-medium text-xs px-4 py-2 rounded-lg transition-all"
                  >
                    Insertar en Neon como DRAFT
                  </button>
                </div>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}