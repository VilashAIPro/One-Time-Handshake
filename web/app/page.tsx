// web/app/page.tsx
'use client';
import { Sidebar } from '../components/Sidebar';
import { Header } from '../components/Header';
import { 
  ShieldCheck, 
  Users, 
  Smartphone, 
  WifiOff, 
  AlertOctagon,
  ArrowUpRight,
  TrendingUp
} from 'lucide-react';

export default function AdminDashboardPage() {
  const stats = [
    { title: 'Total Registered Users', value: '24,890', change: '+12.4%', icon: Users, color: 'text-blue-500', bg: 'bg-blue-500/10' },
    { title: 'Active Bound Devices', value: '18,420', change: '+8.1%', icon: Smartphone, color: 'text-emerald-500', bg: 'bg-emerald-500/10' },
    { title: 'Offline Authenticators', value: '6,140', change: '+24.5%', icon: WifiOff, color: 'text-purple-500', bg: 'bg-purple-500/10' },
    { title: 'Threat Rejections (24h)', value: '14', change: '-45.2%', icon: AlertOctagon, color: 'text-red-500', bg: 'bg-red-500/10' },
  ];

  const recentLogs = [
    { id: '1', user: 'Officer Rahul Sharma', device: 'Pixel 8 Pro (Fingerprint bound)', status: 'SUCCESS', type: 'ONLINE_HANDSHAKE', time: '2 mins ago' },
    { id: '2', user: 'Dr. Ananya Roy', device: 'Defense Secure Pad X', status: 'SUCCESS', type: 'OFFLINE_VAULT', time: '14 mins ago' },
    { id: '3', user: 'Unknown Subject', device: 'Cloned Fingerprint Hash', status: 'REJECTED', type: 'REPLAY_ATTEMPT', time: '45 mins ago' },
    { id: '4', user: 'Vikram Singh', device: 'Galaxy Tab S9', status: 'SUCCESS', type: 'QR_HANDSHAKE', time: '1 hour ago' },
  ];

  return (
    <div className="flex min-h-screen bg-slate-950 text-slate-100 font-sans">
      <Sidebar />

      <div className="flex-1 flex flex-col min-w-0">
        <Header />

        <main className="p-8 space-y-8 flex-1 overflow-y-auto">
          {/* Top Banner */}
          <div className="bg-gradient-to-r from-blue-900/40 via-indigo-900/30 to-purple-900/40 border border-blue-500/20 rounded-2xl p-6 relative overflow-hidden backdrop-blur-md">
            <div className="flex justify-between items-center relative z-10">
              <div>
                <div className="flex items-center space-x-2 text-blue-400 font-semibold text-sm mb-1">
                  <ShieldCheck className="w-5 h-5" />
                  <span>ONE TIME HANDSHAKE PLATFORM</span>
                </div>
                <h2 className="text-2xl font-extrabold text-white tracking-tight">
                  Cryptographic Zero-OTP Authentication Command Center
                </h2>
                <p className="text-slate-400 text-sm mt-1 max-w-2xl">
                  Real-time defense-grade verification overview across government portals, military communications, banking gateways, and offline rural deployments.
                </p>
              </div>
              <div className="hidden lg:flex items-center space-x-3 bg-slate-900/80 px-4 py-3 rounded-xl border border-slate-700/50">
                <div className="w-3 h-3 rounded-full bg-emerald-500 animate-pulse"></div>
                <span className="text-xs font-semibold text-slate-300">Firestore & SQLite Sync Active</span>
              </div>
            </div>
          </div>

          {/* Stats Grid */}
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
            {stats.map((item) => {
              const Icon = item.icon;
              return (
                <div key={item.title} className="bg-slate-900/60 border border-slate-800/80 rounded-2xl p-6 hover:border-slate-700 transition-all">
                  <div className="flex items-center justify-between">
                    <div className={`p-3 rounded-xl ${item.bg} ${item.color}`}>
                      <Icon className="w-6 h-6" />
                    </div>
                    <span className="flex items-center text-xs font-semibold text-emerald-400">
                      <TrendingUp className="w-3.5 h-3.5 mr-1" />
                      {item.change}
                    </span>
                  </div>
                  <h3 className="text-3xl font-extrabold text-white mt-4 tracking-tight">{item.value}</h3>
                  <p className="text-xs text-slate-400 font-medium mt-1">{item.title}</p>
                </div>
              );
            })}
          </div>

          {/* Table & Status Cards */}
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
            {/* Recent Live Verification Logs */}
            <div className="lg:col-span-2 bg-slate-900/60 border border-slate-800/80 rounded-2xl p-6">
              <div className="flex items-center justify-between mb-6">
                <div>
                  <h3 className="text-lg font-bold text-white">Live Verification Stream</h3>
                  <p className="text-xs text-slate-400">HMAC-SHA256 authenticated sessions</p>
                </div>
                <button className="text-xs text-blue-400 hover:text-blue-300 font-semibold flex items-center">
                  View All <ArrowUpRight className="w-3.5 h-3.5 ml-1" />
                </button>
              </div>

              <div className="overflow-x-auto">
                <table className="w-full text-left border-collapse">
                  <thead>
                    <tr className="text-xs font-semibold text-slate-400 border-b border-slate-800 pb-3">
                      <th className="pb-3">User Subject</th>
                      <th className="pb-3">Device Identity</th>
                      <th className="pb-3">Protocol Type</th>
                      <th className="pb-3">Status</th>
                      <th className="pb-3 text-right">Time</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-800/60 text-sm">
                    {recentLogs.map((log) => (
                      <tr key={log.id} className="hover:bg-slate-800/30 transition-all">
                        <td className="py-3.5 font-medium text-slate-200">{log.user}</td>
                        <td className="py-3.5 text-slate-400 text-xs">{log.device}</td>
                        <td className="py-3.5 text-xs">
                          <span className="px-2.5 py-1 rounded-md bg-slate-800 text-slate-300 font-mono">
                            {log.type}
                          </span>
                        </td>
                        <td className="py-3.5">
                          <span className={`px-2.5 py-0.5 rounded-full text-[11px] font-bold ${
                            log.status === 'SUCCESS' 
                              ? 'bg-emerald-500/10 text-emerald-400 border border-emerald-500/20' 
                              : 'bg-red-500/10 text-red-400 border border-red-500/20'
                          }`}>
                            {log.status}
                          </span>
                        </td>
                        <td className="py-3.5 text-right text-xs text-slate-500">{log.time}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>

            {/* Cryptographic Engine Status */}
            <div className="bg-slate-900/60 border border-slate-800/80 rounded-2xl p-6 space-y-6">
              <div>
                <h3 className="text-lg font-bold text-white">Engine Specifications</h3>
                <p className="text-xs text-slate-400">Cryptographic parameters & compliance</p>
              </div>

              <div className="space-y-4">
                <div className="p-4 bg-slate-800/40 rounded-xl border border-slate-700/40 space-y-2">
                  <div className="flex justify-between text-xs">
                    <span className="text-slate-400">Algorithm</span>
                    <span className="text-white font-mono font-bold">AES-256-GCM + HMAC-SHA256</span>
                  </div>
                  <div className="flex justify-between text-xs">
                    <span className="text-slate-400">Handshake Expiry Window</span>
                    <span className="text-emerald-400 font-semibold">30 Seconds</span>
                  </div>
                  <div className="flex justify-between text-xs">
                    <span className="text-slate-400">Replay Guard Registry</span>
                    <span className="text-blue-400 font-semibold">Active Nonce Registry</span>
                  </div>
                  <div className="flex justify-between text-xs">
                    <span className="text-slate-400">IMEI Access</span>
                    <span className="text-slate-400 italic">Disabled (Android 10+ compliant)</span>
                  </div>
                </div>

                <div className="p-4 bg-blue-950/40 border border-blue-500/20 rounded-xl">
                  <h4 className="text-xs font-bold text-blue-400 uppercase tracking-wider mb-1">Defense & Gov Ready</h4>
                  <p className="text-xs text-slate-300">
                    Supports high-security offline authentication vaults. Tokens cached on local Android devices automatically sync when network availability is restored.
                  </p>
                </div>
              </div>
            </div>
          </div>
        </main>
      </div>
    </div>
  );
}
