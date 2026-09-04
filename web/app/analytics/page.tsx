// web/app/analytics/page.tsx
'use client';
import { Sidebar } from '../../components/Sidebar';
import { Header } from '../../components/Header';
import { BarChart3, TrendingUp, Cpu, Globe } from 'lucide-react';

export default function AnalyticsPage() {
  return (
    <div className="flex min-h-screen bg-slate-950 text-slate-100 font-sans">
      <Sidebar />
      <div className="flex-1 flex flex-col min-w-0">
        <Header />
        <main className="p-8 space-y-6 flex-1 overflow-y-auto">
          <div>
            <h2 className="text-2xl font-bold text-white">System Analytics</h2>
            <p className="text-slate-400 text-sm">Performance metrics, authentication latency, and regional distribution</p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            <div className="bg-slate-900/60 border border-slate-800 rounded-2xl p-6">
              <div className="flex items-center justify-between text-slate-400 text-sm">
                <span>Avg Handshake Latency</span>
                <Cpu className="w-5 h-5 text-blue-500" />
              </div>
              <p className="text-3xl font-extrabold text-white mt-2">18.4 ms</p>
              <p className="text-xs text-emerald-400 mt-1">Sub-20ms crypto verification</p>
            </div>

            <div className="bg-slate-900/60 border border-slate-800 rounded-2xl p-6">
              <div className="flex items-center justify-between text-slate-400 text-sm">
                <span>Offline Vault Sync Rate</span>
                <TrendingUp className="w-5 h-5 text-purple-500" />
              </div>
              <p className="text-3xl font-extrabold text-white mt-2">99.98%</p>
              <p className="text-xs text-slate-400 mt-1">Zero data loss on reconnect</p>
            </div>

            <div className="bg-slate-900/60 border border-slate-800 rounded-2xl p-6">
              <div className="flex items-center justify-between text-slate-400 text-sm">
                <span>Active Regional Vaults</span>
                <Globe className="w-5 h-5 text-emerald-500" />
              </div>
              <p className="text-3xl font-extrabold text-white mt-2">12 Nodes</p>
              <p className="text-xs text-slate-400 mt-1">Multi-cloud Firestore clusters</p>
            </div>
          </div>
        </main>
      </div>
    </div>
  );
}
