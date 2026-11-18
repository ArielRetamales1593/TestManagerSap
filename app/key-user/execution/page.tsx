'use client';

import { useState, useEffect } from 'react';

interface Task {
  id: string;
  plan: string;
  code: string;
  tx: string;
  title: string;
  preconditions: string;
  steps: { text: string; done: boolean }[];
  expected: string;
  status: 'PENDING' | 'PASSED' | 'FAILED' | 'BLOCKED';
  evidence: string;
  evidenceUrl: string;
}

export default function IntermediateExecutionPage() {
  const [tasks, setTasks] = useState<Task[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchTasks = async () => {
      try {
        const dummyUserId = "cc37680f-a20f-4dc4-a0e7-11cdff519bd9"; 
        
        const res = await fetch(`/api/execution?userId=${dummyUserId}`);
        if (!res.ok) throw new Error('Error al cargar tareas');
        
        const data = await res.json();
        
        const formattedTasks: Task[] = data.map((item: any) => ({
          id: item.id,
          plan: 'Ciclo UAT', 
          code: item.testCase.code,
          tx: item.testCase.sapTransaction || 'N/A',
          title: item.testCase.title,
          preconditions: item.testCase.preconditions || 'N/A',
          steps: (item.testCase.steps || '').split('\n').filter(Boolean).map((step: string) => ({ 
            text: step.trim(), 
            done: false 
          })),
          expected: item.testCase.expectedResult || 'Sin resultado esperado.',
          status: item.executionStatus,
          evidence: item.evidenceNotes || '',
          evidenceUrl: item.evidenceUrl || '',
        }));

        setTasks(formattedTasks);
      } catch (error) {
        console.error(error);
      } finally {
        setLoading(false);
      }
    };

    fetchTasks();
  }, []);

  const toggleStep = (taskId: string, stepIndex: number) => {
    setTasks(
      tasks.map((t) => {
        if (t.id !== taskId) return t;
        const updatedSteps = [...t.steps];
        updatedSteps[stepIndex].done = !updatedSteps[stepIndex].done;
        return { ...t, steps: updatedSteps };
      })
    );
  };

  // 1. CAMBIO: Agregamos 'BLOCKED' a los tipos permitidos
  const setExecutionResult = async (taskId: string, result: 'PASSED' | 'FAILED' | 'BLOCKED') => {
    const task = tasks.find((t) => t.id === taskId);
    if (!task) return;

    setTasks(tasks.map((t) => (t.id === taskId ? { ...t, status: result } : t)));

    try {
      const res = await fetch('/api/execution', {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          itemId: taskId,
          executionStatus: result,
          evidenceNotes: task.evidence,
          evidenceUrl: task.evidenceUrl,
        }),
      });

      if (!res.ok) {
        alert('Hubo un error al guardar el resultado en la base de datos.');
      }
    } catch (error) {
      console.error('Error enviando resultado:', error);
    }
  };

  if (loading) {
    return (
      <div className="flex justify-center items-center min-h-screen text-slate-400 font-mono text-sm">
        Cargando pruebas asignadas...
      </div>
    );
  }

  return (
    <div className="max-w-3xl mx-auto space-y-6">
      <div className="flex justify-between items-center border-b border-slate-800 pb-4">
        <div>
          <span className="text-xs font-mono uppercase tracking-wider text-indigo-400 font-semibold">Etapa 04</span>
          <h1 className="text-xl font-semibold text-slate-100 mt-0.5">Mis Pruebas Asignadas</h1>
          <p className="text-xs text-slate-400">Ejecución en vivo</p>
        </div>
      </div>

      <div className="space-y-5">
        {tasks.length === 0 ? (
          <div className="text-slate-400 text-sm p-4 text-center bg-slate-900/40 rounded-xl border border-slate-800">
            No tienes casos de prueba asignados actualmente.
          </div>
        ) : (
          tasks.map((task) => (
            <div key={task.id} className="rounded-xl border border-slate-800 bg-slate-900/40 overflow-hidden shadow-sm">
              <div className="border-b border-slate-800 bg-slate-900/80 p-4 flex justify-between items-center">
                <div className="flex items-center gap-2">
                  <span className="text-xs font-mono font-semibold text-indigo-400">{task.code}</span>
                  <span className="text-xs bg-slate-800 text-slate-300 px-2.5 py-0.5 rounded font-mono">
                    Tx: {task.tx}
                  </span>
                </div>
                {/* 2. CAMBIO: Agregamos el color ámbar para la etiqueta BLOCKED */}
                <span
                  className={`text-xs font-semibold px-2.5 py-0.5 rounded-full border ${
                    task.status === 'PASSED'
                      ? 'bg-emerald-500/10 text-emerald-400 border-emerald-500/20'
                      : task.status === 'FAILED'
                      ? 'bg-rose-500/10 text-rose-400 border-rose-500/20'
                      : task.status === 'BLOCKED'
                      ? 'bg-amber-500/10 text-amber-400 border-amber-500/20'
                      : 'bg-slate-800 text-slate-400 border-slate-700'
                  }`}
                >
                  {task.status}
                </span>
              </div>

              <div className="p-5 space-y-4">
                <h2 className="text-base font-medium text-slate-100">{task.title}</h2>

                <div className="bg-slate-950 p-3.5 rounded-lg border border-slate-800 text-xs">
                  <span className="text-slate-500 font-semibold uppercase tracking-wider block mb-1">Precondiciones</span>
                  <p className="text-slate-300">{task.preconditions}</p>
                </div>

                <div className="space-y-2">
                  <span className="text-xs font-semibold uppercase tracking-wider text-slate-400 block">
                    Pasos a Ejecutar en SAP
                  </span>
                  <div className="space-y-1.5">
                    {task.steps.map((s, idx) => (
                      <label
                        key={idx}
                        className={`flex items-start gap-2.5 p-2 rounded-lg border text-xs cursor-pointer transition-all ${
                          s.done ? 'bg-indigo-950/20 border-indigo-500/40 text-slate-200' : 'bg-slate-950 border-slate-800/80 text-slate-400'
                        }`}
                      >
                        <input
                          type="checkbox"
                          checked={s.done}
                          onChange={() => toggleStep(task.id, idx)}
                          className="mt-0.5 rounded border-slate-700 bg-slate-900 text-indigo-600 focus:ring-indigo-500"
                        />
                        <span className={s.done ? 'line-through text-slate-400' : ''}>{s.text}</span>
                      </label>
                    ))}
                  </div>
                </div>

                <div className="bg-indigo-950/20 p-3.5 rounded-lg border border-indigo-500/30 text-xs">
                  <span className="text-indigo-400 font-semibold uppercase tracking-wider block mb-0.5">
                    Resultado Esperado
                  </span>
                  <p className="text-slate-200">{task.expected}</p>
                </div>

                <div className="pt-2 border-t border-slate-800/60 space-y-3">
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                    <input
                      placeholder="Número de doc o nota..."
                      value={task.evidence}
                      onChange={(e) =>
                        setTasks(tasks.map((t) => (t.id === task.id ? { ...t, evidence: e.target.value } : t)))
                      }
                      className="w-full bg-slate-950 border border-slate-800 rounded-lg px-3 py-2 text-xs text-slate-200 focus:outline-none focus:border-indigo-500"
                    />
                    <input
                      placeholder="URL de captura de pantalla..."
                      value={task.evidenceUrl}
                      onChange={(e) =>
                        setTasks(tasks.map((t) => (t.id === task.id ? { ...t, evidenceUrl: e.target.value } : t)))
                      }
                      className="w-full bg-slate-950 border border-slate-800 rounded-lg px-3 py-2 text-xs text-slate-200 focus:outline-none focus:border-indigo-500"
                    />
                  </div>

                  {/* 3. CAMBIO: Agregamos el tercer botón de BLOCKED */}
                  <div className="flex gap-2">
                    <button
                      onClick={() => setExecutionResult(task.id, 'PASSED')}
                      className="flex-1 bg-emerald-600 hover:bg-emerald-500 text-white font-medium text-xs py-2.5 rounded-lg transition-all shadow-sm shadow-emerald-600/20"
                    >
                      ✓ PASÓ
                    </button>
                    <button
                      onClick={() => setExecutionResult(task.id, 'FAILED')}
                      className="flex-1 bg-rose-600 hover:bg-rose-500 text-white font-medium text-xs py-2.5 rounded-lg transition-all shadow-sm shadow-rose-600/20"
                    >
                      ✕ FALLÓ
                    </button>
                    <button
                      onClick={() => setExecutionResult(task.id, 'BLOCKED')}
                      className="flex-1 bg-amber-600 hover:bg-amber-500 text-white font-medium text-xs py-2.5 rounded-lg transition-all shadow-sm shadow-amber-600/20"
                    >
                      ⚠ BLOQUEAR
                    </button>
                  </div>
                </div>
              </div>
            </div>
          ))
        )}
      </div>
    </div>
  );
}