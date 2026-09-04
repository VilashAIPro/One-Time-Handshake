// web/app/threats/page.tsx
'use client';
import { Sidebar } from '../../components/Sidebar';
import { Header } from '../../components/Header';
import { AlertOctagon, ShieldAlert, Zap } from 'lucide-react';

export default function ThreatsPage() {
  const threatLogs = [
    { id: 't1', type: 'REPLAY_ATTEMPT', sourceIp: '185.220.101.5', severity: 'HIGH', time: '45 mins ago', description: 'Re-use of previously spent Nonce token detected by ReplayGuard.' },
    { id: 't2', type: 'DEVICE_CLONING', sourceIp: '192.168.1.199', severity: 'CRITICAL', time: '3 hours ago', description: 'Mismatched hardware fingerprint vs registered public key signature.' },
    { id: 't3', type: 'EXPIRED_TIMESTAMP', sourceIp: '10.0.0.50', severity: 'MEDIUM', time: '1 day ago', description: 'Handshake token timestamp exceeded 30-second skew window.' },
  ];

  return (
    <div className="flex min-h-screen bg-slate-950 text-slate-100 font-sans">
      <Sidebar />
      <div className="flex-1 flex flex-col min-w-0">
        <Header />
        <main className="p-8 space-y-6 flex-1 overflow-y-auto">
          <div>
            <h2 className="text-2xl font-bold text-white">Threat Detection Center</h2>
            <p className="text-slate-400 text-sm">Automated AI risk detection & cryptographic anomaly alerts</p>
          </div>

          <div className="space-y-4">
            {threatLogs.map((t) => (
              <div key={t.id} className="bg-slate-900/60 border border-red-500/20 rounded-2xl p-6 flex items-start justify-between">
                <div className="flex items-start space-x-4">
                  <div className="p-3 bg-red-500/10 text-red-400 rounded-xl">
                    <AlertOctagon className="w-6 h-6" />
                  </div>
                  <div className="space-y-1">
                    <div className="flex items-center space-x-3">
                      <h3 className="font-bold text-white text-base">{t.type}</h3>
                      <span className="px-2.5 py-0.5 bg-red-500/20 text-red-400 text-xs font-extrabold rounded-full">
                        {t.severity}
                      </span>
                    </div>
                    <p className="text-sm text-slate-300">{t.description}</p>
                    <p className="text-xs text-slate-400 font-mono">
                      Source IP: {t.sourceIp} • {t.time}
                    </p>
                  </div>
                </div>

                <button className="px-4 py-2 bg-slate-800 hover:bg-slate-700 text-slate-200 text-xs font-semibold rounded-xl border border-slate-700">
                  Block IP / Hash
                </button>
              </div>
            ))}
          </div>
        </main>
      </div>
    </div>
  );
}
