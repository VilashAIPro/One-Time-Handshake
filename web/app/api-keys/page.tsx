// web/app/api-keys/page.tsx
'use client';
import { Sidebar } from '../../components/Sidebar';
import { Header } from '../../components/Header';
import { Key, Copy, Plus } from 'lucide-react';

export default function ApiKeysPage() {
  const keys = [
    { id: 'k1', name: 'Government Services Portal API', keyPrefix: 'oth_live_gov_...9a8f', created: '2026-08-10', status: 'ACTIVE' },
    { id: 'k2', name: 'National Bank Mobile SDK Key', keyPrefix: 'oth_live_bnk_...3e21', created: '2026-08-15', status: 'ACTIVE' },
  ];

  return (
    <div className="flex min-h-screen bg-slate-950 text-slate-100 font-sans">
      <Sidebar />
      <div className="flex-1 flex flex-col min-w-0">
        <Header />
        <main className="p-8 space-y-6 flex-1 overflow-y-auto">
          <div className="flex justify-between items-center">
            <div>
              <h2 className="text-2xl font-bold text-white">API Keys & SDK Licences</h2>
              <p className="text-slate-400 text-sm">Issue and manage API credentials for third-party enterprise integrations</p>
            </div>
            <button className="bg-blue-600 hover:bg-blue-500 text-white text-sm font-semibold px-4 py-2.5 rounded-xl transition-all flex items-center">
              <Plus className="w-4 h-4 mr-2" /> Generate API Key
            </button>
          </div>

          <div className="space-y-4">
            {keys.map((k) => (
              <div key={k.id} className="bg-slate-900/60 border border-slate-800 rounded-2xl p-6 flex items-center justify-between">
                <div className="flex items-center space-x-4">
                  <div className="p-3 bg-purple-500/10 text-purple-400 rounded-xl">
                    <Key className="w-6 h-6" />
                  </div>
                  <div>
                    <h3 className="font-bold text-white text-base">{k.name}</h3>
                    <p className="text-xs font-mono text-slate-400 mt-1">{k.keyPrefix}</p>
                  </div>
                </div>

                <div className="flex items-center space-x-4">
                  <span className="px-2.5 py-1 bg-emerald-500/10 text-emerald-400 text-xs font-bold rounded-full border border-emerald-500/20">
                    {k.status}
                  </span>
                  <button className="p-2 text-slate-400 hover:text-white bg-slate-800 rounded-xl">
                    <Copy className="w-4 h-4" />
                  </button>
                </div>
              </div>
            ))}
          </div>
        </main>
      </div>
    </div>
  );
}
