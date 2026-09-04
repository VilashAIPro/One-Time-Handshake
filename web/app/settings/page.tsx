// web/app/settings/page.tsx
'use client';
import { Sidebar } from '../../components/Sidebar';
import { Header } from '../../components/Header';
import { Settings, Shield, Sliders } from 'lucide-react';

export default function SettingsPage() {
  return (
    <div className="flex min-h-screen bg-slate-950 text-slate-100 font-sans">
      <Sidebar />
      <div className="flex-1 flex flex-col min-w-0">
        <Header />
        <main className="p-8 space-y-6 flex-1 overflow-y-auto">
          <div>
            <h2 className="text-2xl font-bold text-white">System Settings</h2>
            <p className="text-slate-400 text-sm">Configure cryptographic skew tolerances, Firestore sync, and Gemini AI risk bounds</p>
          </div>

          <div className="bg-slate-900/60 border border-slate-800 rounded-2xl p-6 space-y-6">
            <div className="border-b border-slate-800 pb-4">
              <h3 className="text-base font-bold text-white mb-1">Cryptographic Window</h3>
              <p className="text-xs text-slate-400 mb-3">Maximum timestamp skew allowed for OTH tokens</p>
              <select className="bg-slate-800 text-white text-sm px-4 py-2 rounded-xl border border-slate-700">
                <option>30 Seconds (Strict Defense Standard)</option>
                <option>60 Seconds (Standard Enterprise)</option>
                <option>120 Seconds (High Latency Rural)</option>
              </select>
            </div>

            <div className="border-b border-slate-800 pb-4">
              <h3 className="text-base font-bold text-white mb-1">AI Fraud Risk Threshold</h3>
              <p className="text-xs text-slate-400 mb-3">Gemini API sensitivity for anomalous auth scoring</p>
              <input type="range" className="w-64 accent-blue-500" defaultValue={85} />
              <p className="text-xs text-blue-400 mt-1 font-mono">Current: 85% Confidence</p>
            </div>

            <div>
              <button className="bg-blue-600 hover:bg-blue-500 text-white text-sm font-semibold px-6 py-2.5 rounded-xl transition-all">
                Save Configurations
              </button>
            </div>
          </div>
        </main>
      </div>
    </div>
  );
}
