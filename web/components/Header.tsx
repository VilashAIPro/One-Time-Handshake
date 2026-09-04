// web/components/Header.tsx
'use client';
import { Bell, Search, UserCheck } from 'lucide-react';

export function Header() {
  return (
    <header className="h-16 bg-slate-900/80 backdrop-blur-md border-b border-slate-800 px-8 flex items-center justify-between sticky top-0 z-10">
      {/* Search Input */}
      <div className="relative w-72">
        <Search className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
        <input
          type="text"
          placeholder="Search devices, hashes, users..."
          className="w-full bg-slate-800/60 text-slate-200 text-sm pl-9 pr-4 py-2 rounded-xl border border-slate-700/50 focus:outline-none focus:border-blue-500 focus:ring-1 focus:ring-blue-500 transition-all placeholder:text-slate-500"
        />
      </div>

      {/* Header Actions */}
      <div className="flex items-center space-x-4">
        {/* Environment Badge */}
        <span className="px-3 py-1 bg-emerald-500/10 text-emerald-400 border border-emerald-500/20 text-xs font-semibold rounded-full">
          GCP Production Vault
        </span>

        {/* Notifications */}
        <button className="relative p-2 text-slate-400 hover:text-slate-200 bg-slate-800/50 rounded-xl hover:bg-slate-800 transition-all">
          <Bell className="w-5 h-5" />
          <span className="absolute top-1 right-1 w-2 h-2 bg-blue-500 rounded-full"></span>
        </button>

        {/* Admin Profile */}
        <div className="flex items-center space-x-3 pl-4 border-l border-slate-800">
          <div className="w-9 h-9 bg-blue-600/20 border border-blue-500/30 rounded-xl flex items-center justify-center text-blue-400 font-semibold text-sm">
            <UserCheck className="w-5 h-5" />
          </div>
          <div>
            <p className="text-sm font-semibold text-white">Security Admin</p>
            <p className="text-xs text-slate-400">admin@oth-security.gov</p>
          </div>
        </div>
      </div>
    </header>
  );
}
