import './globals.css';
import Link from 'next/link';

export const metadata = {
  title: 'SAP Test Manager | QA Lead Console',
  description: 'Enterprise UAT Governance & Test Planning',
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="es">
      <body className="bg-slate-950 text-slate-100 min-h-screen antialiased selection:bg-indigo-500/30">
        <header className="border-b border-slate-800 bg-slate-900/60 backdrop-blur sticky top-0 z-50">
          <div className="max-w-6xl mx-auto px-6 h-16 flex items-center justify-between">
            <Link href="/admin/stories" className="flex items-center gap-2.5">
              <div className="h-7 w-7 rounded-lg bg-indigo-600 flex items-center justify-center font-bold text-xs text-white shadow-sm shadow-indigo-500/20">
                SAP
              </div>
              <div>
                <span className="font-semibold text-sm tracking-tight text-slate-100">TestManager</span>
                <span className="text-[10px] text-slate-500 block leading-none font-mono">QA Lead Console</span>
              </div>
            </Link>

            <nav className="flex items-center gap-1 bg-slate-950/60 p-1 rounded-xl border border-slate-800/80 text-xs font-medium">
              <Link
                href="/admin/stories"
                className="px-3.5 py-1.5 rounded-lg text-slate-400 hover:text-slate-100 hover:bg-slate-900 transition-all"
              >
                1. Requerimientos y Casos
              </Link>
              <Link
                href="/admin/governance"
                className="px-3.5 py-1.5 rounded-lg text-slate-400 hover:text-slate-100 hover:bg-slate-900 transition-all"
              >
                2. Gobernanza QA
              </Link>
              <Link
                href="/admin/plans"
                className="px-3.5 py-1.5 rounded-lg text-indigo-400 hover:text-indigo-300 hover:bg-indigo-950/30 transition-all font-semibold"
              >
                3. Planes y Asignación UAT
              </Link>
            </nav>
          </div>
        </header>

        <main className="max-w-6xl mx-auto px-6 py-8">{children}</main>
      </body>
    </html>
  );
}