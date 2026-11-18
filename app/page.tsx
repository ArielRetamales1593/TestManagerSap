import Link from 'next/link';

export default function HomePage() {
  const stages = [
    {
      step: 'ETAPA 01',
      title: 'Ingreso de HU y Diseño de Casos',
      desc: 'Registra Historias de Usuario SAP (MM, SD, FI) con su transacción y nivel de riesgo. Diseña casos de prueba que nacen bloqueados en estado DRAFT.',
      href: '/admin/stories',
      badge: 'Manual • Preparado para IA',
    },
    {
      step: 'ETAPA 02',
      title: 'Bandeja de Gobernanza (Quality Gate)',
      desc: 'Filtro exclusivo del QA Lead. Audita, edita, rechaza o aprueba borradores. Solo los casos APPROVED ingresan al Catálogo Oficial.',
      href: '/admin/governance',
      badge: 'Control QA Lead',
    },
    {
      step: 'ETAPA 03',
      title: 'Planes UAT y Asignación Híbrida',
      desc: 'Construye ciclos de prueba reutilizando casos del Catálogo Oficial. Asigna planes completos o casos individuales (End-to-End) a cada Key User.',
      href: '/admin/plans',
      badge: 'Matriz de Trazabilidad',
    },
    {
      step: 'ETAPA 04',
      title: 'Ejecución Limpia del Key User',
      desc: 'Interfaz minimalista de tarjetas de trabajo sin ruido técnico. El usuario de negocio ejecuta en SAP y reporta PASÓ o FALLÓ con evidencia.',
      href: '/key-user/execution',
      badge: 'Vista de Negocio',
    },
  ];

  return (
    <div className="space-y-12 py-6">
      <section className="max-w-3xl space-y-4">
        <div className="inline-flex items-center gap-2 rounded-full border border-indigo-500/30 bg-indigo-500/10 px-3 py-1 text-xs font-semibold uppercase tracking-wider text-indigo-300">
          <span className="h-1.5 w-1.5 rounded-full bg-indigo-400"></span>
          SAP UAT Governance Hub
        </div>
        <h1 className="text-4xl sm:text-5xl font-semibold tracking-tight text-slate-100">
          Gobernanza y Trazabilidad UAT sin planillas dispersas.
        </h1>
        <p className="text-slate-400 text-base leading-relaxed">
          Plataforma Side-by-Side diseñada para estructurar el ciclo completo de pruebas de aceptación en SAP:
          desde el requerimiento funcional hasta la firma de conformidad del Key User.
        </p>
      </section>

      <section className="grid md:grid-cols-2 gap-5">
        {stages.map((item) => (
          <Link
            key={item.step}
            href={item.href}
            className="group relative flex flex-col justify-between rounded-xl border border-slate-800/80 bg-slate-900/40 p-6 shadow-sm transition-all duration-200 hover:border-indigo-500/50 hover:bg-slate-900/80"
          >
            <div className="space-y-3">
              <div className="flex items-center justify-between">
                <span className="text-xs font-mono uppercase tracking-wider text-indigo-400 font-semibold">
                  {item.step}
                </span>
                <span className="text-[11px] font-medium px-2.5 py-0.5 rounded-full bg-slate-800/80 text-slate-300 border border-slate-700/60">
                  {item.badge}
                </span>
              </div>
              <h2 className="text-lg font-semibold text-slate-100 group-hover:text-indigo-300 transition-colors">
                {item.title}
              </h2>
              <p className="text-sm text-slate-400 leading-relaxed">
                {item.desc}
              </p>
            </div>

            <div className="mt-6 pt-4 border-t border-slate-800/60 flex items-center justify-between text-xs font-medium text-slate-400 group-hover:text-slate-200">
              <span>Ir al módulo</span>
              <span className="transition-transform group-hover:translate-x-1">→</span>
            </div>
          </Link>
        ))}
      </section>
    </div>
  );
}
