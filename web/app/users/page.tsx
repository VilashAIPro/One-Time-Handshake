// web/app/users/page.tsx
'use client';
import { Sidebar } from '../../components/Sidebar';
import { Header } from '../../components/Header';
import { Users, Shield, Smartphone, MoreVertical } from 'lucide-react';

export default function UsersPage() {
  const usersList = [
    { id: 'usr_101', name: 'Officer Vikram Sharma', email: 'vikram.s@gov.in', phone: '+91 98765 43210', role: 'DEFENSE_OFFICER', devicesCount: 2, status: 'ACTIVE' },
    { id: 'usr_102', name: 'Dr. Priya Nair', email: 'priya.nair@bank.org', phone: '+91 98111 22334', role: 'BANK_ADMIN', devicesCount: 1, status: 'ACTIVE' },
    { id: 'usr_103', name: 'Rajesh Kumar', email: 'rajesh.k@rural.gov', phone: '+91 97222 33445', role: 'FIELD_WORKER', devicesCount: 1, status: 'OFFLINE_ONLY' },
    { id: 'usr_104', name: 'Amitabh Verma', email: 'averma@enterprise.com', phone: '+91 99000 11223', role: 'ENTERPRISE_USER', devicesCount: 3, status: 'SUSPENDED' },
  ];

  return (
    <div className="flex min-h-screen bg-slate-950 text-slate-100 font-sans">
      <Sidebar />
      <div className="flex-1 flex flex-col min-w-0">
        <Header />
        <main className="p-8 space-y-6 flex-1 overflow-y-auto">
          <div className="flex justify-between items-center">
            <div>
              <h2 className="text-2xl font-bold text-white">User Management</h2>
              <p className="text-slate-400 text-sm">Manage registered cryptographic identities and bound devices</p>
            </div>
            <button className="bg-blue-600 hover:bg-blue-500 text-white text-sm font-semibold px-4 py-2.5 rounded-xl transition-all shadow-lg shadow-blue-600/20">
              + Register New User
            </button>
          </div>

          <div className="bg-slate-900/60 border border-slate-800 rounded-2xl overflow-hidden">
            <table className="w-full text-left border-collapse">
              <thead>
                <tr className="bg-slate-800/40 text-xs font-semibold text-slate-400 border-b border-slate-800">
                  <th className="p-4">User Details</th>
                  <th className="p-4">Role</th>
                  <th className="p-4">Phone Number</th>
                  <th className="p-4">Bound Devices</th>
                  <th className="p-4">Status</th>
                  <th className="p-4 text-right">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-800/60 text-sm">
                {usersList.map((u) => (
                  <tr key={u.id} className="hover:bg-slate-800/30 transition-all">
                    <td className="p-4">
                      <div className="font-semibold text-white">{u.name}</div>
                      <div className="text-xs text-slate-400">{u.email}</div>
                    </td>
                    <td className="p-4">
                      <span className="px-2.5 py-1 rounded-lg bg-blue-500/10 text-blue-400 text-xs font-semibold border border-blue-500/20">
                        {u.role}
                      </span>
                    </td>
                    <td className="p-4 text-slate-300 font-mono text-xs">{u.phone}</td>
                    <td className="p-4">
                      <div className="flex items-center text-slate-300 text-xs font-medium">
                        <Smartphone className="w-4 h-4 mr-1 text-slate-400" />
                        {u.devicesCount} Registered
                      </div>
                    </td>
                    <td className="p-4">
                      <span className={`px-2.5 py-0.5 rounded-full text-xs font-bold ${
                        u.status === 'ACTIVE'
                          ? 'bg-emerald-500/10 text-emerald-400 border border-emerald-500/20'
                          : u.status === 'OFFLINE_ONLY'
                          ? 'bg-purple-500/10 text-purple-400 border border-purple-500/20'
                          : 'bg-red-500/10 text-red-400 border border-red-500/20'
                      }`}>
                        {u.status}
                      </span>
                    </td>
                    <td className="p-4 text-right">
                      <button className="p-2 text-slate-400 hover:text-white rounded-lg hover:bg-slate-800">
                        <MoreVertical className="w-4 h-4" />
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </main>
      </div>
    </div>
  );
}
