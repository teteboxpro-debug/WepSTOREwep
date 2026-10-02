import React, { useEffect, useState } from 'react';
import { apiRequest } from '../api';
import type { UserItem } from '../types';
import {
  Users,
  Search,
  Coins,
  Ban,
  ShieldCheck,
  RefreshCw,
  Plus,
  Minus,
  CheckCircle2,
  AlertTriangle,
  X
} from 'lucide-react';

export default function UsersView() {
  const [users, setUsers] = useState<UserItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [selectedUser, setSelectedUser] = useState<UserItem | null>(null);
  const [adjustAmount, setAdjustAmount] = useState(10);
  const [adjustReason, setAdjustReason] = useState('Admin compensation');
  const [adjusting, setAdjusting] = useState(false);
  const [message, setMessage] = useState<{ type: 'success' | 'error'; text: string } | null>(null);

  const fetchUsers = async () => {
    try {
      setLoading(true);
      const data = await apiRequest<UserItem[]>('/admin/users');
      setUsers(data);
    } catch (err: any) {
      setMessage({ type: 'error', text: err.message || 'Failed to load users' });
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchUsers();
  }, []);

  const handleAdjustBalance = async (isPositive: boolean) => {
    if (!selectedUser) return;
    setAdjusting(true);
    setMessage(null);

    const amount = isPositive ? Math.abs(adjustAmount) : -Math.abs(adjustAmount);

    try {
      await apiRequest(`/admin/users/${selectedUser.id}/adjust-balance`, {
        method: 'POST',
        body: JSON.stringify({ amount, reason: adjustReason })
      });

      setMessage({ type: 'success', text: `Adjusted ${amount > 0 ? `+${amount}` : amount} Stars for user ${selectedUser.id}` });
      setSelectedUser(null);
      fetchUsers();
    } catch (err: any) {
      setMessage({ type: 'error', text: err.message || 'Adjustment failed' });
    } finally {
      setAdjusting(false);
    }
  };

  const handleToggleBan = async (user: UserItem) => {
    const action = user.is_banned ? 'unban' : 'ban';
    if (!confirm(`Are you sure you want to ${action} user ${user.id}?`)) return;

    try {
      await apiRequest(`/admin/users/${user.id}/toggle-ban`, {
        method: 'POST',
        body: JSON.stringify({ banned: !user.is_banned })
      });
      setMessage({ type: 'success', text: `User ${user.id} ${action}ned successfully` });
      fetchUsers();
    } catch (err: any) {
      setMessage({ type: 'error', text: err.message || 'Failed to update user status' });
    }
  };

  const filteredUsers = users.filter(u => {
    const q = search.toLowerCase();
    return (
      u.id.includes(q) ||
      (u.username && u.username.toLowerCase().includes(q)) ||
      (u.first_name && u.first_name.toLowerCase().includes(q))
    );
  });

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-xl sm:text-2xl font-bold text-white tracking-tight">Telegram Users Directory</h1>
          <p className="text-xs text-slate-400 mt-1">
            Permanent user accounts mapped by Telegram User ID in Supabase PostgreSQL.
          </p>
        </div>

        <div className="flex items-center gap-2">
          <div className="relative">
            <Search className="w-3.5 h-3.5 absolute left-3 top-1/2 -translate-y-1/2 text-slate-500" />
            <input
              type="text"
              placeholder="Search by ID or @username..."
              value={search}
              onChange={e => setSearch(e.target.value)}
              className="pl-9 pr-3 py-2 bg-slate-900 border border-slate-800 rounded-xl text-xs text-white focus:outline-none focus:border-indigo-500 w-52 sm:w-64"
            />
          </div>

          <button
            onClick={fetchUsers}
            className="p-2 bg-slate-900 hover:bg-slate-800 text-slate-300 rounded-xl border border-slate-800 transition cursor-pointer"
            title="Refresh"
          >
            <RefreshCw className="w-4 h-4" />
          </button>
        </div>
      </div>

      {message && (
        <div
          className={`p-4 rounded-2xl text-xs flex items-center gap-2.5 ${
            message.type === 'success'
              ? 'bg-emerald-500/10 border border-emerald-500/20 text-emerald-300'
              : 'bg-rose-500/10 border border-rose-500/20 text-rose-300'
          }`}
        >
          {message.type === 'success' ? <CheckCircle2 className="w-4 h-4 flex-shrink-0" /> : <AlertTriangle className="w-4 h-4 flex-shrink-0" />}
          <span>{message.text}</span>
        </div>
      )}

      {/* Users Table */}
      <div className="bg-slate-900 border border-slate-800 rounded-2xl p-5 shadow-sm overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs">
            <thead>
              <tr className="border-b border-slate-800 text-slate-400">
                <th className="pb-3 font-medium">Telegram ID</th>
                <th className="pb-3 font-medium">User Profile</th>
                <th className="pb-3 font-medium text-right">Stars Balance</th>
                <th className="pb-3 font-medium text-right">Total Earned</th>
                <th className="pb-3 font-medium text-right">Total Spent</th>
                <th className="pb-3 font-medium text-center">Referrals</th>
                <th className="pb-3 font-medium text-center">Status</th>
                <th className="pb-3 font-medium text-right">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-800/60">
              {loading ? (
                <tr>
                  <td colSpan={8} className="py-8 text-center text-slate-500">
                    Loading users...
                  </td>
                </tr>
              ) : filteredUsers.length === 0 ? (
                <tr>
                  <td colSpan={8} className="py-8 text-center text-slate-500">
                    No users matching criteria
                  </td>
                </tr>
              ) : (
                filteredUsers.map(user => (
                  <tr key={user.id} className="hover:bg-slate-800/30 transition">
                    <td className="py-3 font-mono font-semibold text-indigo-300">
                      {user.id}
                    </td>
                    <td className="py-3">
                      <div className="font-semibold text-white">{user.first_name || 'Anonymous'}</div>
                      <div className="text-[11px] text-slate-400">
                        {user.username ? `@${user.username}` : 'No username'}
                      </div>
                    </td>
                    <td className="py-3 text-right font-bold text-amber-400 font-mono">
                      {user.balance} ⭐
                    </td>
                    <td className="py-3 text-right text-emerald-400 font-mono">
                      +{user.total_earned}
                    </td>
                    <td className="py-3 text-right text-slate-400 font-mono">
                      -{user.total_spent}
                    </td>
                    <td className="py-3 text-center text-sky-400 font-semibold">
                      {user.referral_count || 0}
                    </td>
                    <td className="py-3 text-center">
                      <span
                        className={`px-2 py-0.5 rounded-full text-[10px] font-semibold border ${
                          user.is_banned
                            ? 'bg-rose-500/10 text-rose-400 border-rose-500/20'
                            : 'bg-emerald-500/10 text-emerald-400 border-emerald-500/20'
                        }`}
                      >
                        {user.is_banned ? 'Banned' : 'Active'}
                      </span>
                    </td>
                    <td className="py-3 text-right">
                      <div className="flex items-center justify-end gap-1.5">
                        <button
                          onClick={() => setSelectedUser(user)}
                          className="px-2.5 py-1 bg-slate-800 hover:bg-slate-700 text-amber-300 rounded-lg text-[11px] font-semibold transition cursor-pointer flex items-center gap-1"
                          title="Adjust Stars"
                        >
                          <Coins className="w-3 h-3" />
                          <span>Stars</span>
                        </button>
                        <button
                          onClick={() => handleToggleBan(user)}
                          className={`p-1.5 rounded-lg transition cursor-pointer ${
                            user.is_banned
                              ? 'text-emerald-400 hover:bg-emerald-500/10'
                              : 'text-rose-400 hover:bg-rose-500/10'
                          }`}
                          title={user.is_banned ? 'Unban User' : 'Ban User'}
                        >
                          <Ban className="w-3.5 h-3.5" />
                        </button>
                      </div>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* ADJUST BALANCE MODAL */}
      {selectedUser && (
        <div className="fixed inset-0 z-50 bg-black/70 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="bg-slate-900 border border-slate-800 rounded-3xl max-w-sm w-full p-6 shadow-2xl space-y-4">
            <div className="flex items-center justify-between border-b border-slate-800 pb-3">
              <div>
                <h3 className="text-sm font-bold text-white">Adjust User Stars</h3>
                <p className="text-[11px] text-slate-400">Telegram ID: {selectedUser.id}</p>
              </div>
              <button onClick={() => setSelectedUser(null)} className="text-slate-400 hover:text-white">
                <X className="w-5 h-5" />
              </button>
            </div>

            <div className="p-3 bg-slate-950 rounded-xl border border-slate-800 flex justify-between items-center text-xs">
              <span className="text-slate-400">Current Balance:</span>
              <span className="font-bold text-amber-400 font-mono text-sm">{selectedUser.balance} Stars ⭐</span>
            </div>

            <div className="space-y-3">
              <div>
                <label className="block text-xs font-medium text-slate-300 mb-1">
                  Amount of Stars
                </label>
                <input
                  type="number"
                  min="1"
                  max="10000"
                  value={adjustAmount}
                  onChange={e => setAdjustAmount(parseInt(e.target.value, 10) || 1)}
                  className="w-full px-3 py-2 bg-slate-950 border border-slate-800 rounded-xl text-xs text-white focus:outline-none focus:border-indigo-500 font-mono font-bold"
                />
              </div>

              <div>
                <label className="block text-xs font-medium text-slate-300 mb-1">
                  Reason for Adjustment
                </label>
                <input
                  type="text"
                  value={adjustReason}
                  onChange={e => setAdjustReason(e.target.value)}
                  placeholder="e.g., Promotion, Support, Refund"
                  className="w-full px-3 py-2 bg-slate-950 border border-slate-800 rounded-xl text-xs text-white focus:outline-none focus:border-indigo-500"
                />
              </div>
            </div>

            <div className="grid grid-cols-2 gap-2 pt-2">
              <button
                type="button"
                onClick={() => handleAdjustBalance(true)}
                disabled={adjusting}
                className="py-2.5 bg-emerald-600 hover:bg-emerald-500 text-white rounded-xl text-xs font-semibold flex items-center justify-center gap-1 cursor-pointer"
              >
                <Plus className="w-3.5 h-3.5" />
                <span>Credit (+{adjustAmount})</span>
              </button>

              <button
                type="button"
                onClick={() => handleAdjustBalance(false)}
                disabled={adjusting}
                className="py-2.5 bg-rose-600 hover:bg-rose-500 text-white rounded-xl text-xs font-semibold flex items-center justify-center gap-1 cursor-pointer"
              >
                <Minus className="w-3.5 h-3.5" />
                <span>Debit (-{adjustAmount})</span>
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
