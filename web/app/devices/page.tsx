// web/app/devices/page.tsx
'use client';
import { Sidebar } from '../../components/Sidebar';
import { Header } from '../../components/Header';
import { Smartphone, ShieldCheck, AlertCircle } from 'lucide-react';

export default function DevicesPage() {
  const devicesList = [
    { id: 'dev_01', name: 'Google Pixel 8 Pro', model: 'Pixel 8 Pro (Android 14)', fingerprint: 'a8f9c2d1...3e90', trustScore: 98, status: 'TRUSTED' },
    { id: 'dev_02', name: 'Defense Secure Terminal', model: 'OTH-Tactical-Linux v2', fingerprint: '3c8e9f11...5b77', trustScore: 100, status: 'HIGH_SECURITY' },
    { id: 'dev_03', name: 'Samsung Galaxy Tab S9', model: 'SM-X910 (Android 13)', fingerprint: '7b2a5f4c...1d88', trustScore: 92, status: 'TRUSTED' },
    { id: 'dev_04', name: 'Untrusted Device Clone', model: 'Generic Android (Emulated)', fingerprint: '0000000...ffff', trustScore: 12, status: 'BLOCKED' },
  ];

  return (
    <div className="flex min-h-screen bg-slate-950 text-slate-100 font-sans">
      <Sidebar />
      <div className="flex-1 flex flex-col min-w-0">
        <Header />
        <main className="p-8 space-y-6 flex-1 overflow-y-auto">
          <div>
            <h2 className="text-2xl font-bold text-white">Device Management</h2>
            <p className="text-slate-400 text-sm">Bound device hardware fingerprints and trust scoring</p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            {devicesList.map((d) => (
              <div key={d.id} className="bg-slate-900/60 border border-slate-800 rounded-2xl p-6 space-y-4">
                <div className="flex items-start justify-between">
                  <div className="flex items-center space-x-3">
                    <div className="p-3 bg-blue-500/10 text-blue-400 rounded-xl">
                      <Smartphone className="w-6 h-6" />
                    </div>
                    <div>
                      <h3 className="font-bold text-white text-base">{d.name}</h3>
                      <p className="text-xs text-slate-400">{d.model}</p>
                    </div>
                  </div>
                  <span className={`px-2.5 py-1 rounded-full text-xs font-bold ${
                    d.status === 'BLOCKED'
                      ? 'bg-red-500/10 text-red-400 border border-red-500/20'
                      : 'bg-emerald-500/10 text-emerald-400 border border-emerald-500/20'
                  }`}>
                    {d.status}
                  </span>
                </div>

                <div className="bg-slate-800/40 p-3 rounded-xl border border-slate-700/40 space-y-1">
                  <div className="flex justify-between text-xs">
                    <span className="text-slate-400">Fingerprint Hash:</span>
                    <span className="text-slate-200 font-mono">{d.fingerprint}</span>
                  </div>
                  <div className="flex justify-between text-xs">
                    <span className="text-slate-400">Device Trust Score:</span>
                    <span className="text-emerald-400 font-bold">{d.trustScore}%</span>
                  </div>
                </div>

                <div className="flex justify-end space-x-3">
                  <button className="px-3 py-1.5 text-xs font-semibold bg-red-500/10 text-red-400 border border-red-500/20 rounded-lg hover:bg-red-500/20">
                    Revoke Device
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
