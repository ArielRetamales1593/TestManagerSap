'use client';

import React, { useEffect, useState } from 'react';

interface DashboardData {
  stats: {
    planned: number;
    executed: number;
    pending: number;
    executionRate: number;
    passRate: number;
    failRate: number;
    estimatedHours: number;
    results: { passed: number; failed: number; blocked: number };
  };
  usersLoad: Array<{
    name: string;
    planned: number;
    executed: number;
    percentage: number;
    estimatedHours: number;
    breakdown: { baja: number; media: number; alta: number };
  }>;
  items: Array<{
    id: string;
    executionStatus: string;
    evidenceNotes: string | null;
    evidenceUrl: string | null;
    executedAt: string | null;
    testCase: { code: string; title: string; complexity: string };
    assignedTo: { name: string | null; email: string } | null;
  }>;
}

export default function QALeadConsole() {
  const [data, setData] = useState<DashboardData | null>(null);
  const [loading, setLoading] = useState(true);

  // Estados para el Modal de Importación desde SAP Cloud ALM
  const [showImportModal, setShowImportModal] = useState(false);
  const [rawSapData, setRawSapData] = useState('');
  const [importing, setImporting] = useState(false);

  const fetchDashboardData = async () => {
    setLoading(true);
    try {
      const res = await fetch('/api/dashboard');
      if (res.ok) {
        const jsonData = await res.json();
        setData(jsonData);
      }
    } catch (err) {
      console.error('Error al cargar dashboard:', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchDashboardData();
  }, []);

  // Traduce estados de SAP Cloud ALM (Inglés/Español) al estándar de Neon
  const normalizeSapStatus = (raw: string): 'PASSED' | 'FAILED' | 'BLOCKED' | 'PENDING' => {
    const val = raw.trim().toUpperCase();
    if (['PASSED', 'PASS', 'OK', 'SUCCESS', 'APROBADO', 'EXITOSO'].includes(val)) {
      return 'PASSED';
    }
    if (['FAILED', 'FAIL', 'ERROR', 'FALLIDO', 'RECHAZADO', 'WITH ERROR'].includes(val)) {
      return 'FAILED';
    }
    if (['BLOCKED', 'BLOCK', 'BLOQUEADO', 'ON HOLD'].includes(val)) {
      return 'BLOCKED';
    }
    return 'PENDING';
  };

  // Leer archivo CSV exportado de SAP Cloud ALM directamente desde el input file
  const handleFileUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    const reader = new FileReader();
    reader.onload = (event) => {
      const content = event.target?.result as string;
      if (content) setRawSapData(content);
    };
    reader.readAsText(file);
  };

  // Procesar filas del CSV/Excel de SAP Cloud ALM y enviar a Neon
  const handleImportSapResults = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!rawSapData.trim()) return;

    setImporting(true);
    try {
      const lines = rawSapData
        .split(/\r?\n/)
        .map((l) => l.trim())
        .filter(Boolean);

      const updates: Array<{
        code: string;
        executionStatus: 'PASSED' | 'FAILED' | 'BLOCKED' | 'PENDING';
        evidenceNotes?: string;
      }> = [];

      lines.forEach((line) => {
        // Ignorar posible fila de cabecera
        if (
          line.toLowerCase().includes('test case name') ||
          line.toLowerCase().includes('execution status')
        ) {
          return;
        }

        const cleanLine = line.replace(/"/g, '');
        let parts: string[] = [];
        if (cleanLine.includes('\t')) parts = cleanLine.split('\t');
        else if (cleanLine.includes(';')) parts = cleanLine.split(';');
        else if (cleanLine.includes(',')) parts = cleanLine.split(',');
        else parts = [cleanLine];

        // Extraemos el código CP-XX-XX aunque venga dentro de "CP-MM-01-01 - Título..."
        const rawCaseIdentifier = parts[0]?.trim() || '';
        const codeMatch = rawCaseIdentifier.match(/(CP-[A-Z0-9-]+|TC-[A-Z0-9-]+)/i);
        const extractedCode = codeMatch
          ? codeMatch[1].toUpperCase()
          : rawCaseIdentifier.split(' - ')[0].trim().toUpperCase();

        const rawStatus = parts[1]?.trim() || 'PENDING';
        const notes = parts[2]?.trim() || 'Sincronizado desde SAP Cloud ALM';

        if (extractedCode) {
          updates.push({
            code: extractedCode,
            executionStatus: normalizeSapStatus(rawStatus),
            evidenceNotes: notes,
          });
        }
      });

      if (updates.length === 0) {
        alert('No se detectaron códigos de casos válidos en el archivo.');
        setImporting(false);
        return;
      }

      const res = await fetch('/api/dashboard', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ updates }),
      });

      if (res.ok) {
        setShowImportModal(false);
        setRawSapData('');
        await fetchDashboardData();
      } else {
        alert('Error al actualizar resultados en Neon.');
      }
    } catch (error) {
      console.error('Error importando resultados SAP ALM:', error);
    } finally {
      setImporting(false);
    }
  };

  if (loading) {
    return (
      <div className="p-10 text-slate-400 font-mono text-sm flex justify-center">
        Cargando consola del QA Lead...
      </div>
    );
  }

  if (!data) {
    return <div className="p-10 text-rose-400 font-mono text-sm">Error al cargar los datos.</div>;
  }

  const getStatusBadge = (status: string) => {
    switch (status) {
      case 'PASSED':
        return (
          <span className="bg-emerald-500/10 text-emerald-400 border border-emerald-500/20 px-2 py-1 rounded text-xs font-semibold">
            PASSED
          </span>
        );
      case 'FAILED':
        return (
          <span className="bg-rose-500/10 text-rose-400 border border-rose-500/20 px-2 py-1 rounded text-xs font-semibold">
            FAILED
          </span>
        );
      case 'BLOCKED':
        return (
          <span className="bg-amber-500/10 text-amber-400 border border-amber-500/20 px-2 py-1 rounded text-xs font-semibold">
            BLOCKED
          </span>
        );
      default:
        return (
          <span className="bg-slate-800 text-slate-400 border border-slate-700 px-2 py-1 rounded text-xs font-semibold">
            PENDING
          </span>
        );
    }
  };

  return (
    <div className="max-w-7xl mx-auto space-y-8 p-6">
      {/* Header */}
      <div className="flex flex-wrap justify-between items-end gap-4 border-b border-slate-800 pb-4">
        <div>
          <span className="text-xs font-mono uppercase tracking-wider text-indigo-400 font-semibold">
            SAP Test Manager
          </span>
          <h1 className="text-2xl font-semibold text-slate-100 mt-1">QA Lead Console</h1>
        </div>
        <div className="flex items-center gap-2.5">
          <button
            onClick={() => setShowImportModal(true)}
            className="px-4 py-2 bg-slate-800 hover:bg-slate-700 text-indigo-300 border border-indigo-500/30 text-xs font-semibold rounded-lg transition flex items-center gap-1.5"
          >
            📥 Importar Resultados SAP ALM
          </button>
          <button
            onClick={fetchDashboardData}
            className="px-4 py-2 bg-indigo-600 hover:bg-indigo-500 text-white text-xs font-semibold rounded-lg transition"
          >
            ↻ Actualizar Datos
          </button>
        </div>
      </div>

      {/* 1. Métricas Generales */}
      <div className="grid grid-cols-2 md:grid-cols-5 gap-4">
        <div className="bg-slate-900/40 border border-slate-800 rounded-xl p-5">
          <span className="text-xs font-semibold uppercase text-slate-500">
            Planificado vs Ejecutado
          </span>
          <div className="text-3xl font-extrabold text-slate-100 mt-2">
            {data.stats.executed}{' '}
            <span className="text-lg text-slate-500 font-medium">/ {data.stats.planned}</span>
          </div>
        </div>
        <div className="bg-slate-900/40 border border-slate-800 rounded-xl p-5">
          <span className="text-xs font-semibold uppercase text-slate-500">
            % Ejecución General
          </span>
          <div className="text-3xl font-extrabold text-indigo-400 mt-2">
            {data.stats.executionRate}%
          </div>
        </div>
        <div className="bg-slate-900/40 border border-slate-800 rounded-xl p-5">
          <span className="text-xs font-semibold uppercase text-slate-500">
            % Aprobación (Pass Rate)
          </span>
          <div className="text-3xl font-extrabold text-emerald-400 mt-2">
            {data.stats.passRate}%
          </div>
        </div>
        <div className="bg-slate-900/40 border border-slate-800 rounded-xl p-5">
          <span className="text-xs font-semibold uppercase text-slate-500">
            % Rechazo (Fail Rate)
          </span>
          <div className="text-3xl font-extrabold text-rose-400 mt-2">
            {data.stats.failRate}%
          </div>
        </div>
        <div className="bg-slate-900/40 border border-slate-800 rounded-xl p-5">
          <span className="text-xs font-semibold uppercase text-slate-500">
            Esfuerzo Total Est.
          </span>
          <div className="text-3xl font-extrabold text-amber-400 mt-2">
            {data.stats.estimatedHours}h
          </div>
        </div>
      </div>

      {/* 2. Estados Globales */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <div className="p-4 rounded-xl border border-emerald-500/20 bg-emerald-500/5 flex justify-between items-center">
          <span className="text-sm font-semibold text-emerald-400">✓ Aprobados</span>
          <span className="text-2xl font-bold text-emerald-300">{data.stats.results.passed}</span>
        </div>
        <div className="p-4 rounded-xl border border-rose-500/20 bg-rose-500/5 flex justify-between items-center">
          <span className="text-sm font-semibold text-rose-400">✕ Rechazados</span>
          <span className="text-2xl font-bold text-rose-300">{data.stats.results.failed}</span>
        </div>
        <div className="p-4 rounded-xl border border-amber-500/20 bg-amber-500/5 flex justify-between items-center">
          <span className="text-sm font-semibold text-amber-400">⚠ Bloqueados</span>
          <span className="text-2xl font-bold text-amber-300">{data.stats.results.blocked}</span>
        </div>
      </div>

      {/* 3. Carga, Esfuerzo Estimado y Desglose por Key User */}
      <div className="bg-slate-900/40 border border-slate-800 rounded-xl p-6">
        <h2 className="text-sm font-semibold text-slate-200 mb-4">
          Carga, Avance y Esfuerzo Estimado por Key User
        </h2>
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {data.usersLoad.map((user) => (
            <div
              key={user.name}
              className="p-4 border border-slate-700/50 rounded-lg bg-slate-800/30 space-y-3"
            >
              <div className="flex justify-between items-start">
                <div>
                  <span className="text-sm font-medium text-slate-200 block">👤 {user.name}</span>
                  <span className="text-xs text-slate-400">
                    {user.executed} de {user.planned} casos ejecutados
                  </span>
                </div>
                <div className="text-right">
                  <span className="text-base font-extrabold text-amber-400">
                    {user.estimatedHours}h
                  </span>
                  <span className="text-[10px] uppercase text-slate-500 block">Estimado</span>
                </div>
              </div>

              <div className="flex gap-2 text-[11px] font-mono bg-slate-950 p-2 rounded border border-slate-800/80">
                <span className="text-slate-400">
                  Alta: <strong className="text-rose-400">{user.breakdown.alta}</strong>
                </span>
                <span className="text-slate-400">
                  Med: <strong className="text-amber-400">{user.breakdown.media}</strong>
                </span>
                <span className="text-slate-400">
                  Baja: <strong className="text-emerald-400">{user.breakdown.baja}</strong>
                </span>
              </div>

              <div>
                <div className="w-full bg-slate-800 rounded-full h-1.5 overflow-hidden flex">
                  <div
                    style={{ width: `${user.percentage}%` }}
                    className={`h-full rounded-full transition-all duration-500 ${
                      user.percentage === 100 ? 'bg-emerald-500' : 'bg-indigo-500'
                    }`}
                  />
                </div>
                <div className="flex justify-between items-center text-[10px] text-slate-500 mt-1">
                  <span>Progreso</span>
                  <span className="font-semibold">{user.percentage}%</span>
                </div>
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* 4. Tabla Detallada */}
      <div className="bg-slate-900/40 border border-slate-800 rounded-xl shadow-sm overflow-hidden">
        <div className="p-5 border-b border-slate-800 bg-slate-900/80">
          <h2 className="text-sm font-semibold text-slate-200">Detalle de Ejecuciones</h2>
        </div>
        <div className="overflow-x-auto">
          <table className="w-full text-left border-collapse">
            <thead>
              <tr className="bg-slate-950 text-slate-400 text-xs uppercase tracking-wider border-b border-slate-800">
                <th className="p-4 font-semibold">Caso SAP</th>
                <th className="p-4 font-semibold">Complejidad</th>
                <th className="p-4 font-semibold">Key User</th>
                <th className="p-4 font-semibold">Estado</th>
                <th className="p-4 font-semibold">Evidencia / Notas</th>
              </tr>
            </thead>
            <tbody className="text-sm text-slate-300 divide-y divide-slate-800/50">
              {data.items.length === 0 ? (
                <tr>
                  <td colSpan={5} className="p-8 text-center text-slate-500">
                    No hay casos asignados.
                  </td>
                </tr>
              ) : (
                data.items.map((item) => (
                  <tr key={item.id} className="hover:bg-slate-800/20 transition-colors">
                    <td className="p-4">
                      <div className="font-mono text-indigo-400 text-xs mb-0.5">
                        {item.testCase.code}
                      </div>
                      <div className="text-xs truncate max-w-xs">{item.testCase.title}</div>
                    </td>
                    <td className="p-4 text-xs font-mono">
                      <span
                        className={`px-2 py-0.5 rounded text-[10px] font-bold ${
                          item.testCase.complexity === 'ALTA'
                            ? 'bg-rose-500/10 text-rose-400 border border-rose-500/20'
                            : item.testCase.complexity === 'BAJA'
                            ? 'bg-emerald-500/10 text-emerald-400 border border-emerald-500/20'
                            : 'bg-amber-500/10 text-amber-400 border border-amber-500/20'
                        }`}
                      >
                        {item.testCase.complexity || 'MEDIA'}
                      </span>
                    </td>
                    <td className="p-4 text-xs">
                      {item.assignedTo?.name || item.assignedTo?.email || 'Sin Asignar'}
                    </td>
                    <td className="p-4">{getStatusBadge(item.executionStatus)}</td>
                    <td className="p-4 text-xs max-w-xs">
                      {item.evidenceNotes && (
                        <div className="truncate text-slate-400 mb-1">📝 {item.evidenceNotes}</div>
                      )}
                      {item.evidenceUrl && (
                        <a
                          href={item.evidenceUrl}
                          target="_blank"
                          rel="noreferrer"
                          className="text-indigo-400 hover:text-indigo-300 underline"
                        >
                          Ver Anexo ↗
                        </a>
                      )}
                      {!item.evidenceNotes && !item.evidenceUrl && (
                        <span className="text-slate-600">-</span>
                      )}
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* Modal Importar Resultados desde SAP Cloud ALM */}
      {showImportModal && (
        <div className="fixed inset-0 z-50 bg-slate-950/80 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="w-full max-w-2xl rounded-2xl border border-slate-800 bg-slate-900 p-6 shadow-2xl space-y-4">
            <div className="flex justify-between items-center border-b border-slate-800 pb-3">
              <div>
                <h3 className="text-base font-semibold text-slate-100">
                  Importar Resultados de Ejecución desde SAP Cloud ALM
                </h3>
                <p className="text-xs text-slate-400 mt-0.5">
                  Sube el CSV exportado de SAP ALM o pega las filas desde Excel para actualizar las métricas del Dashboard.
                </p>
              </div>
              <button
                onClick={() => setShowImportModal(false)}
                className="text-slate-400 hover:text-slate-200 text-sm"
              >
                ✕
              </button>
            </div>

            <form onSubmit={handleImportSapResults} className="space-y-4">
              <div className="bg-slate-950 border border-slate-800 rounded-xl p-3.5 text-xs space-y-2">
                <div className="flex items-center justify-between">
                  <span className="font-semibold text-indigo-400">
                    Opción A: Subir archivo .CSV de SAP Cloud ALM
                  </span>
                  <input
                    type="file"
                    accept=".csv,.txt"
                    onChange={handleFileUpload}
                    className="text-xs text-slate-400 file:mr-2 file:py-1 file:px-2.5 file:rounded-lg file:border-0 file:text-xs file:font-semibold file:bg-indigo-600 file:text-white hover:file:bg-indigo-500 cursor-pointer"
                  />
                </div>
                <p className="text-slate-500 font-mono text-[11px]">
                  Formato de columnas: Test Case Name (o Código CP-XX) ; Status (Passed / Failed / Blocked) ; Comentario/Defecto
                </p>
              </div>

              <div>
                <label className="text-xs font-medium text-slate-400 block mb-1">
                  Opción B: Pegar directamente desde el Excel de SAP Cloud ALM *
                </label>
                <textarea
                  required
                  rows={7}
                  placeholder={`CP-MM-01-01 - Validar orden;Passed;Ejecutado OK en QAS\nCP-MM-01-02 - Rechazo stock;Failed;Defecto #402 en ME21N\nCP-FI-02-01 - Contabilizar;Blocked;Falta rol FI en usuario`}
                  value={rawSapData}
                  onChange={(e) => setRawSapData(e.target.value)}
                  className="w-full bg-slate-950 border border-slate-800 rounded-lg p-3 text-xs text-slate-200 font-mono focus:outline-none focus:border-indigo-500"
                />
              </div>

              <div className="flex justify-end gap-2 pt-2 border-t border-slate-800">
                <button
                  type="button"
                  onClick={() => setShowImportModal(false)}
                  className="px-3 py-2 text-xs text-slate-400 hover:text-slate-200"
                >
                  Cancelar
                </button>
                <button
                  type="submit"
                  disabled={importing}
                  className="bg-indigo-600 hover:bg-indigo-500 disabled:opacity-50 text-white font-semibold text-xs px-4 py-2 rounded-lg transition"
                >
                  {importing ? 'Sincronizando con Neon...' : 'Sincronizar Resultados y Actualizar KPIs'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}