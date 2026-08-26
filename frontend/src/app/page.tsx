import Link from 'next/link';
import { ArrowRight, ShieldCheck, Activity, Cpu } from 'lucide-react';

export default function LandingPage() {
  return (
    <main className="min-h-screen bg-slate-950 text-slate-100 flex flex-col justify-between">
      <header className="px-8 py-6 flex items-center justify-between border-b border-slate-800">
        <div className="flex items-center gap-2">
          <div className="w-4 h-4 rounded bg-blue-500" />
          <span className="font-bold text-lg tracking-wide">SelfHeal SC</span>
        </div>
        <Link
          href="/login"
          className="text-sm font-medium bg-blue-600 hover:bg-blue-500 px-4 py-2 rounded-lg transition"
        >
          Sign In
        </Link>
      </header>

      <section className="max-w-4xl mx-auto px-6 py-20 text-center flex flex-col items-center">
        <span className="text-xs font-semibold uppercase tracking-widest text-blue-400 bg-blue-950/60 border border-blue-800 px-3 py-1 rounded-full mb-6">
          Autonomous Supply Chain Operations
        </span>
        <h1 className="text-4xl sm:text-6xl font-extrabold tracking-tight leading-tight">
          Self-Healing Logistics, Powered by AI
        </h1>
        <p className="mt-6 text-lg text-slate-400 max-w-2xl">
          Automate disruption detection, evaluate multi-modal rerouting options deterministically, and query past operational decisions with tenant-isolated RAG.
        </p>
        <div className="mt-8 flex gap-4">
          <Link
            href="/login"
            className="flex items-center gap-2 bg-blue-600 hover:bg-blue-500 text-white font-medium px-6 py-3 rounded-lg transition"
          >
            Launch Console <ArrowRight className="w-4 h-4" />
          </Link>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-3 gap-6 mt-16 text-left w-full">
          <div className="p-5 rounded-xl border border-slate-800 bg-slate-900/50">
            <Activity className="w-6 h-6 text-blue-400 mb-3" />
            <h3 className="font-semibold text-white">Live Disruption Radar</h3>
            <p className="text-sm text-slate-400 mt-1">
              Natural language alert parsing and automatic impact mapping.
            </p>
          </div>
          <div className="p-5 rounded-xl border border-slate-800 bg-slate-900/50">
            <Cpu className="w-6 h-6 text-emerald-400 mb-3" />
            <h3 className="font-semibold text-white">Deterministic Healing</h3>
            <p className="text-sm text-slate-400 mt-1">
              Algorithmic route generation with time and cost penalty balancing.
            </p>
          </div>
          <div className="p-5 rounded-xl border border-slate-800 bg-slate-900/50">
            <ShieldCheck className="w-6 h-6 text-purple-400 mb-3" />
            <h3 className="font-semibold text-white">Grounded Decision RAG</h3>
            <p className="text-sm text-slate-400 mt-1">
              Isolated enterprise namespaces for verifiable decision auditing.
            </p>
          </div>
        </div>
      </section>

      <footer className="py-6 text-center text-xs text-slate-600 border-t border-slate-900">
        Autonomous Self-Healing Supply Chain System
      </footer>
    </main>
  );
}