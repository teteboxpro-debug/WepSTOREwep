import { useState, useEffect } from 'react';
import { apiRequest } from '../api';
import {
  Users,
  Search,
  Star,
  ShieldAlert,
  ShieldCheck,
  Plus,
  Minus,
  Clock,
  ShoppingBag,
  Share2,
  X,
  AlertCircle
} from 'lucide-react';
import type { UserItem, StarTx, FilePurchaseItem } from '../types';

export default function UsersView() {
  const [users, setUsers] = useState<UserItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedUser, setSelectedUser] = useState<UserItem | null>(null);
  const [userDetails, setUserDetails] = useState<{
    transactions: StarTx[];
    purchases: FilePurchaseItem[];
    referrals: any[];
  } | null>(null);
  const [loadingDetails, setLoadingDetails] = useState(false);

  // Balance adjust state
  const [adjustModalOpen, setAdjustModalOpen] = useState(false);
  const [adjustAmount, setAdjustAmount] = useState<string>('50');
  const [adjustType, setAdjustType] = useState<'add' | 'deduct'>('add');
  const [adjustReason, setAdjustReason] = useState('');
  const [submittingAdjust, setSubmittingAdjust] = useState(false);

  // Ban state
  const [banModalOpen, setBanModalOpen] = useState(false);
  const [banReason, setBanReason] = useState('');

  const fetchUsers = async () => {
    try {
      setLoading(true);
      const res = await apiRequest<{ users: UserItem[] }>(`/admin/users?q=${encodeURIComponent(searchQuery)}`);
      setUsers(res.users);
    } catch (err) {
      console.error('Error fetching users:', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    const timeout = setTimeout(() => {
      fetchUsers();
    }, 300);
    return () => clearTimeout(timeout);
  }, [searchQuery]);

  const openUserDetails = async (u: UserItem) => {
    setSelectedUser(u);
    setLoadingDetails(true);
    try {
      const res = await apiRequest(`/admin/users/${u.id}`);
      setUserDetails({
        transactions: res.transactions || [],
        purchases: res.purchases || [],
        referrals: res.referrals || []
      });
    } catch (err) {
      console.error('Error loading details:', err);
    } finally {
      setLoadingDetails(false);
    }
  };

  const handleAdjustBalance = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedUser) return;
    const num = parseInt(adjustAmount, 10);
    if (isNaN(num) || num <= 0) return;

    setSubmittingAdjust(true);
    try {
      const finalAmount = adjustType === 'add' ? num : -num;
      await apiRequest(`/admin/users/${selectedUser.id}/adjust-balance`, {
        method: 'POST',
        body: JSON.stringify({ amount: finalAmount, reason: adjustReason })
      });

      setAdjustModalOpen(false);
      setAdjustReason('');
      await fetchUsers();
      if (selectedUser) {
        await openUserDetails(selectedUser);
      }
    } catch (err: any) {
      alert(err.message || 'Error adjusting balance');
    } finally {
      setSubmittingAdjust(false);
    }
  };

  const handleToggleBan = async () => {
    if (!selectedUser) return;
    const isBanning = !selectedUser.is_banned;

    try {
      if (isBanning) {
        await apiRequest(`/admin/users/${selectedUser.id}/ban`, {
          method: 'POST',
          body: JSON.stringify({ reason: banReason })
        });
      } else {
        await apiRequest(`/admin/users/${selectedUser.id}/unban`, {
          method: 'POST'
        });
      }

      setBanModalOpen(false);
      setBanReason('');
      await fetchUsers();
      setSelectedUser((prev) => (prev ? { ...prev, is_banned: isBanning } : null));
    } catch (err: any) {
      alert(err.message || 'Error updating ban status');
    }
  };

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h2 className="text-xl sm:text-2xl font-bold text-white tracking-tight">User Management</h2>
          <p className="text-xs sm:text-sm text-slate-400 mt-0.5">
            View profiles, adjust Star balances, check transactions, referrals, and verification status.
          </p>
        </div>

        {/* Search Input */}
        <div className="relative w-full sm:w-72">
          <Search className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-500" />
          <input
            type="text"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            placeholder="Search Telegram ID or username..."
            className="w-full pl-10 pr-4 py-2 bg-slate-900 border border-slate-800 rounded-xl text-xs sm:text-sm text-slate-100 placeholder-slate-500 focus:outline-none focus:border-indigo-500"
          />
        </div>
      </div>

      {/* Users List / Table */}
      <div className="bg-slate-900 border border-slate-800 rounded-2xl overflow-hidden">
        {loading ? (
          <div className="p-8 text-center text-slate-400 text-sm">Loading users...</div>
        ) : users.length === 0 ? (
          <div className="p-8 text-center text-slate-500 text-sm">
            No registered users found. When users interact with the bot, their records are created automatically.
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs sm:text-sm">
              <thead className="bg-slate-950/80 border-b border-slate-800 text-slate-400 uppercase tracking-wider text-[11px]">
                <tr>
                  <th className="py-3 px-4">Telegram ID</th>
                  <th className="py-3 px-4">User</th>
                  <th className="py-3 px-4">Balance</th>
                  <th className="py-3 px-4">Referrals</th>
                  <th className="py-3 px-4">Status</th>
                  <th className="py-3 px-4">Last Active</th>
                  <th className="py-3 px-4 text-right">Action</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-800/60">
                {users.map((u) => (
                  <tr key={u.id} className="hover:bg-slate-800/40 transition">
                    <td className="py-3 px-4 font-mono font-medium text-indigo-400">
                      {u.id}
                    </td>
                    <td className="py-3 px-4">
                      <div className="font-medium text-white">{u.first_name || 'User'}</div>
                      <div className="text-[11px] text-slate-500">{u.username ? `@${u.username}` : 'No username'}</div>
                    </td>
                    <td className="py-3 px-4">
                      <span className="inline-flex items-center gap-1 font-mono font-semibold text-amber-400">
                        ⭐ {u.balance}
                      </span>
                    </td>
                    <td className="py-3 px-4 font-mono text-slate-300">
                      {u.referral_count}
                    </td>
                    <td className="py-3 px-4">
                      {u.is_banned ? (
                        <span className="px-2 py-0.5 rounded-full text-[10px] font-semibold bg-rose-500/20 text-rose-400 border border-rose-500/30">
                          Banned
                        </span>
                      ) : (
                        <span className="px-2 py-0.5 rounded-full text-[10px] font-semibold bg-emerald-500/20 text-emerald-400 border border-emerald-500/30">
                          Active
                        </span>
                      )}
                    </td>
                    <td className="py-3 px-4 text-slate-400 text-xs">
                      {new Date(u.last_activity_at).toLocaleDateString()}
                    </td>
                    <td className="py-3 px-4 text-right">
                      <button
                        onClick={() => openUserDetails(u)}
                        className="px-3 py-1.5 bg-slate-800 hover:bg-slate-700 text-slate-200 rounded-lg text-xs font-medium border border-slate-700 transition"
                      >
                        Manage →
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* User Details Drawer / Modal */}
      {selectedUser && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/70 backdrop-blur-sm">
          <div className="bg-slate-900 border border-slate-800 rounded-2xl w-full max-w-2xl max-h-[90vh] flex flex-col shadow-2xl overflow-hidden">
            {/* Header */}
            <div className="p-4 sm:p-5 border-b border-slate-800 flex items-center justify-between bg-slate-950/60">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-xl bg-indigo-600/20 border border-indigo-500/30 flex items-center justify-center text-indigo-400">
                  <Users className="w-5 h-5" />
                </div>
                <div>
                  <h3 className="font-bold text-white text-base">
                    {selectedUser.first_name || 'User'} {selectedUser.username ? `(@${selectedUser.username})` : ''}
                  </h3>
                  <div className="text-xs font-mono text-indigo-400">ID: {selectedUser.id}</div>
                </div>
              </div>
              <button
                onClick={() => setSelectedUser(null)}
                className="p-1.5 text-slate-400 hover:text-white rounded-lg hover:bg-slate-800"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            {/* Content scroll */}
            <div className="p-4 sm:p-6 overflow-y-auto space-y-6 flex-1">
              {/* Balance & Stat Cards */}
              <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
                <div className="p-3 bg-slate-950/60 border border-slate-800 rounded-xl">
                  <span className="text-[11px] text-slate-500 uppercase">Balance</span>
                  <div className="text-lg font-bold text-amber-400 mt-0.5">⭐ {selectedUser.balance}</div>
                </div>
                <div className="p-3 bg-slate-950/60 border border-slate-800 rounded-xl">
                  <span className="text-[11px] text-slate-500 uppercase">Total Earned</span>
                  <div className="text-lg font-bold text-emerald-400 mt-0.5">+{selectedUser.total_earned}</div>
                </div>
                <div className="p-3 bg-slate-950/60 border border-slate-800 rounded-xl">
                  <span className="text-[11px] text-slate-500 uppercase">Total Spent</span>
                  <div className="text-lg font-bold text-rose-400 mt-0.5">-{selectedUser.total_spent}</div>
                </div>
                <div className="p-3 bg-slate-950/60 border border-slate-800 rounded-xl">
                  <span className="text-[11px] text-slate-500 uppercase">Referrals</span>
                  <div className="text-lg font-bold text-purple-400 mt-0.5">{selectedUser.referral_count}</div>
                </div>
              </div>

              {/* Action Buttons */}
              <div className="flex flex-wrap gap-2">
                <button
                  onClick={() => {
                    setAdjustType('add');
                    setAdjustModalOpen(true);
                  }}
                  className="flex items-center gap-1.5 px-3 py-2 bg-emerald-600/20 hover:bg-emerald-600/30 text-emerald-300 border border-emerald-500/30 rounded-xl text-xs font-medium transition cursor-pointer"
                >
                  <Plus className="w-3.5 h-3.5" />
                  <span>Add Stars</span>
                </button>
                <button
                  onClick={() => {
                    setAdjustType('deduct');
                    setAdjustModalOpen(true);
                  }}
                  className="flex items-center gap-1.5 px-3 py-2 bg-rose-600/20 hover:bg-rose-600/30 text-rose-300 border border-rose-500/30 rounded-xl text-xs font-medium transition cursor-pointer"
                >
                  <Minus className="w-3.5 h-3.5" />
                  <span>Deduct Stars</span>
                </button>
                <button
                  onClick={() => setBanModalOpen(true)}
                  className={`flex items-center gap-1.5 px-3 py-2 rounded-xl text-xs font-medium border transition cursor-pointer ${
                    selectedUser.is_banned
                      ? 'bg-emerald-600/20 text-emerald-300 border-emerald-500/30 hover:bg-emerald-600/30'
                      : 'bg-rose-600/20 text-rose-300 border-rose-500/30 hover:bg-rose-600/30'
                  }`}
                >
                  {selectedUser.is_banned ? (
                    <>
                      <ShieldCheck className="w-3.5 h-3.5" />
                      <span>Unban User</span>
                    </>
                  ) : (
                    <>
                      <ShieldAlert className="w-3.5 h-3.5" />
                      <span>Ban User</span>
                    </>
                  )}
                </button>
              </div>

              {/* Transaction History */}
              <div className="space-y-3">
                <h4 className="text-xs font-semibold text-slate-400 uppercase tracking-wider flex items-center gap-1.5">
                  <Star className="w-3.5 h-3.5 text-amber-400" />
                  <span>Star Transaction History</span>
                </h4>
                {loadingDetails ? (
                  <div className="text-xs text-slate-500">Loading history...</div>
                ) : userDetails?.transactions && userDetails.transactions.length > 0 ? (
                  <div className="space-y-1.5 max-h-48 overflow-y-auto">
                    {userDetails.transactions.map((tx) => (
                      <div
                        key={tx.id}
                        className="p-2.5 rounded-xl bg-slate-950/60 border border-slate-800 text-xs flex items-center justify-between"
                      >
                        <div>
                          <div className="text-slate-200 font-medium">{tx.description}</div>
                          <div className="text-[10px] text-slate-500">{new Date(tx.timestamp).toLocaleString()}</div>
                        </div>
                        <div
                          className={`font-mono font-semibold ${
                            tx.amount > 0 ? 'text-emerald-400' : 'text-rose-400'
                          }`}
                        >
                          {tx.amount > 0 ? `+${tx.amount}` : tx.amount} ⭐
                        </div>
                      </div>
                    ))}
                  </div>
                ) : (
                  <div className="text-xs text-slate-500 p-3 bg-slate-950/40 rounded-xl border border-slate-800/60 text-center">
                    No transactions yet.
                  </div>
                )}
              </div>

              {/* Purchases */}
              <div className="space-y-3">
                <h4 className="text-xs font-semibold text-slate-400 uppercase tracking-wider flex items-center gap-1.5">
                  <ShoppingBag className="w-3.5 h-3.5 text-indigo-400" />
                  <span>File Purchases</span>
                </h4>
                {userDetails?.purchases && userDetails.purchases.length > 0 ? (
                  <div className="space-y-1.5 max-h-36 overflow-y-auto">
                    {userDetails.purchases.map((p) => (
                      <div
                        key={p.id}
                        className="p-2.5 rounded-xl bg-slate-950/60 border border-slate-800 text-xs flex items-center justify-between"
                      >
                        <div>
                          <div className="text-white font-medium">{p.file_name}</div>
                          <div className="text-[10px] text-slate-500">
                            Code: <span className="font-mono text-indigo-300">{p.file_code}</span> • Paid: {p.price_paid} ⭐
                          </div>
                        </div>
                        <div className="text-[10px] text-slate-400">
                          {new Date(p.purchased_at).toLocaleDateString()}
                        </div>
                      </div>
                    ))}
                  </div>
                ) : (
                  <div className="text-xs text-slate-500 p-3 bg-slate-950/40 rounded-xl border border-slate-800/60 text-center">
                    No purchases recorded.
                  </div>
                )}
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Adjust Balance Modal */}
      {adjustModalOpen && selectedUser && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-sm">
          <div className="bg-slate-900 border border-slate-800 rounded-2xl w-full max-w-md p-5 shadow-2xl">
            <h3 className="font-bold text-white text-base mb-1">
              {adjustType === 'add' ? 'Add Stars to User' : 'Deduct Stars from User'}
            </h3>
            <p className="text-xs text-slate-400 mb-4">
              Target User: <span className="font-mono text-indigo-300">{selectedUser.id}</span> (Current: ⭐ {selectedUser.balance})
            </p>

            <form onSubmit={handleAdjustBalance} className="space-y-4">
              <div>
                <label className="block text-xs font-medium text-slate-300 mb-1">Amount (Stars)</label>
                <input
                  type="number"
                  min="1"
                  value={adjustAmount}
                  onChange={(e) => setAdjustAmount(e.target.value)}
                  className="w-full px-3.5 py-2 bg-slate-950 border border-slate-700 rounded-xl text-white text-sm"
                  required
                />
              </div>

              <div>
                <label className="block text-xs font-medium text-slate-300 mb-1">Reason / Admin Note</label>
                <input
                  type="text"
                  value={adjustReason}
                  onChange={(e) => setAdjustReason(e.target.value)}
                  placeholder="e.g. VIP promotional grant or refund"
                  className="w-full px-3.5 py-2 bg-slate-950 border border-slate-700 rounded-xl text-white text-sm"
                  required
                />
              </div>

              <div className="flex items-center justify-end gap-2 pt-2">
                <button
                  type="button"
                  onClick={() => setAdjustModalOpen(false)}
                  className="px-4 py-2 bg-slate-800 hover:bg-slate-700 text-slate-300 rounded-xl text-xs font-medium"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={submittingAdjust}
                  className="px-4 py-2 bg-indigo-600 hover:bg-indigo-500 text-white rounded-xl text-xs font-medium"
                >
                  Confirm Adjustment
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Ban / Unban Modal */}
      {banModalOpen && selectedUser && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-sm">
          <div className="bg-slate-900 border border-slate-800 rounded-2xl w-full max-w-md p-5 shadow-2xl">
            <h3 className="font-bold text-white text-base mb-1">
              {selectedUser.is_banned ? 'Unban User' : 'Ban User Account'}
            </h3>
            <p className="text-xs text-slate-400 mb-4">
              Telegram ID: <span className="font-mono text-indigo-300">{selectedUser.id}</span>
            </p>

            {!selectedUser.is_banned && (
              <div className="mb-4">
                <label className="block text-xs font-medium text-slate-300 mb-1">Ban Reason</label>
                <input
                  type="text"
                  value={banReason}
                  onChange={(e) => setBanReason(e.target.value)}
                  placeholder="e.g. Spamming or abusive behavior"
                  className="w-full px-3.5 py-2 bg-slate-950 border border-slate-700 rounded-xl text-white text-sm"
                />
              </div>
            )}

            <div className="flex items-center justify-end gap-2 pt-2">
              <button
                type="button"
                onClick={() => setBanModalOpen(false)}
                className="px-4 py-2 bg-slate-800 hover:bg-slate-700 text-slate-300 rounded-xl text-xs font-medium"
              >
                Cancel
              </button>
              <button
                type="button"
                onClick={handleToggleBan}
                className={`px-4 py-2 rounded-xl text-xs font-medium text-white ${
                  selectedUser.is_banned ? 'bg-emerald-600 hover:bg-emerald-500' : 'bg-rose-600 hover:bg-rose-500'
                }`}
              >
                {selectedUser.is_banned ? 'Confirm Unban' : 'Confirm Ban'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
