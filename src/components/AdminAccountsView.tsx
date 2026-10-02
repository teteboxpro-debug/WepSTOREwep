import React, { useEffect, useState } from 'react';
import { apiRequest } from '../api';
import type { AdminAccountItem, AdminLogItem } from '../types';
import { ShieldCheck, ShieldAlert, History, UserCheck, RefreshCw } from 'lucide-react';

export default function AdminAccountsView() {
  const [logs, setLogs] = useState<AdminLogItem[]>([]);
  const [admins, setAdmins] = useState<AdminAccountItem[]>([]);
  const [loading, setLoading] = useState(true);

  const fetchData = async () => {
    try {
      setLoading(true);
      const [l, a] = await Promise.all([
        apiRequest<AdminLogItem[]>('/admin/logs'),
        apiRequest<AdminAccountItem[]>('/admin/accounts')
      ]);
      setLogs(l);
      setAdmins(a);
    } catch {} finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchData();
  }, []);

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-xl sm:text-2xl font-bold text-white tracking-tight">Audit Logs & Administrators</h1>
          <p className="text-xs text-slate-400 mt-1">
            Immutable audit record of all configuration edits, package modifications, and star balances.
          </p>
        </div>

        <button onClick={fetchData} className="p-2 bg-slate-900 hover:bg-slate-800 text-slate-300 rounded-xl border border-slate-800">
          <RefreshCw className="w-4 h-4" />
        </button>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Admin Accounts */}
        <div className="bg-slate-900 border border-slate-800 rounded-2xl p-5 shadow-sm space-y-3">
          <h2 className="text-sm font-bold text-white flex items-center gap-2">
            <UserCheck className="w-4 h-4 text-indigo-400" />
            <span>Master Administrators</span>
          </h2>

          <div className="space-y-2">
            {admins.map(a => (
              <div key={a.id} className="p-3 bg-slate-950 rounded-xl border border-slate-800 text-xs flex justify-between items-center">
                <div>
                  <p className="font-bold text-white">{a.username}</p>
                  <p className="text-[11px] text-slate-400">Permissions: {Array.isArray(a.permissions) ? a.permissions.join(', ') : 'all'}</p>
                </div>
                <span className="px-2 py-0.5 rounded-full text-[10px] font-semibold bg-emerald-500/10 text-emerald-400 border border-emerald-500/20">
                  {a.status}
                </span>
              </div>
            ))}
          </div>
        </div>

        {/* Audit Log Table */}
        <div className="lg:col-span-2 bg-slate-900 border border-slate-800 rounded-2xl p-5 shadow-sm">
          <h2 className="text-sm font-bold text-white mb-3 flex items-center gap-2">
            <History className="w-4 h-4 text-violet-400" />
            <span>System Audit Trail</span>
          </h2>

          <div className="overflow-x-auto max-h-[500px]">
            <table className="w-full text-left text-xs">
              <thead className="sticky top-0 bg-slate-900 border-b border-slate-800 text-slate-400">
                <tr>
                  <th className="pb-2 font-medium">Timestamp</th>
                  <th className="pb-2 font-medium">Admin</th>
                  <th className="pb-2 font-medium">Action</th>
                  <th className="pb-2 font-medium">Target</th>
                  <th className="pb-2 font-medium">Details</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-800/60">
                {logs.map(l => (
                  <tr key={l.id} className="hover:bg-slate-800/30">
                    <td className="py-2.5 text-slate-500 font-mono text-[11px]">
                      {new Date(l.timestamp).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', second: '2-digit' })}
                    </td>
                    <td className="py-2.5 font-semibold text-slate-300">{l.admin_username}</td>
                    <td className="py-2.5">
                      <span className="px-2 py-0.5 rounded text-[10px] font-semibold bg-slate-950 border border-slate-800 text-indigo-300">
                        {l.action}
                      </span>
                    </td>
                    <td className="py-2.5 text-slate-400 truncate max-w-[120px]">{l.target || '—'}</td>
                    <td className="py-2.5 text-slate-400 truncate max-w-[200px]">{l.details || '—'}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      </div>
    </div>
  );
}
