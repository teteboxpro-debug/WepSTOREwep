import { useState, useEffect } from 'react';
import { apiRequest } from '../api';
import {
  Gamepad2,
  Dice5,
  Package,
  CircleDot,
  Clock,
  User,
  ShieldCheck
} from 'lucide-react';

export default function GamesView() {
  const [logs, setLogs] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  const fetchGames = async () => {
    try {
      setLoading(true);
      // We can query logs or stats
      const res = await apiRequest('/admin/logs');
      setLogs(res.logs || []);
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchGames();
  }, []);

  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-xl sm:text-2xl font-bold text-white tracking-tight">Mini-Games & Achievements</h2>
        <p className="text-xs sm:text-sm text-slate-400 mt-0.5">
          Non-wagering games available inside the bot under &quot;🎮 Games&quot;. Wagering/betting is strictly prohibited.
        </p>
      </div>

      <div className="p-4 rounded-xl bg-indigo-500/10 border border-indigo-500/20 text-xs sm:text-sm text-indigo-300 flex items-start gap-2.5">
        <ShieldCheck className="w-5 h-5 flex-shrink-0 text-indigo-400" />
        <span>
          <strong>Strict Policy:</strong> All 3 games (Lucky Dice, Mystery Box, Lucky Wheel) are non-wagering engagement features that award fixed daily achievements or entertainment. Users never stake or risk their Stars.
        </span>
      </div>

      {/* 3 Games Info Cards */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <div className="p-5 rounded-2xl bg-slate-900 border border-slate-800 space-y-3">
          <div className="w-10 h-10 rounded-xl bg-purple-500/10 border border-purple-500/20 flex items-center justify-center text-purple-400">
            <Dice5 className="w-6 h-6" />
          </div>
          <div>
            <h3 className="font-bold text-white text-base">🎲 Lucky Dice</h3>
            <p className="text-xs text-slate-400 mt-1">
              Roll the digital dice to test your luck. Rolling a 5 or 6 unlocks the daily &quot;Lucky Roll&quot; achievement badge (+1 Star).
            </p>
          </div>
          <div className="text-[11px] font-mono text-emerald-400 bg-slate-950 p-2 rounded-lg border border-slate-800">
            Reward: Achievement / +1 Star
          </div>
        </div>

        <div className="p-5 rounded-2xl bg-slate-900 border border-slate-800 space-y-3">
          <div className="w-10 h-10 rounded-xl bg-amber-500/10 border border-amber-500/20 flex items-center justify-center text-amber-400">
            <Package className="w-6 h-6" />
          </div>
          <div>
            <h3 className="font-bold text-white text-base">📦 Mystery Box</h3>
            <p className="text-xs text-slate-400 mt-1">
              Open a daily mystery loot surprise. Contains exclusive VIP flair, funny perks, or celebratory badges.
            </p>
          </div>
          <div className="text-[11px] font-mono text-emerald-400 bg-slate-950 p-2 rounded-lg border border-slate-800">
            Reward: VIP Badge / Flair
          </div>
        </div>

        <div className="p-5 rounded-2xl bg-slate-900 border border-slate-800 space-y-3">
          <div className="w-10 h-10 rounded-xl bg-pink-500/10 border border-pink-500/20 flex items-center justify-center text-pink-400">
            <CircleDot className="w-6 h-6" />
          </div>
          <div>
            <h3 className="font-bold text-white text-base">🎡 Lucky Wheel</h3>
            <p className="text-xs text-slate-400 mt-1">
              Spin the daily bonus wheel. Lands on fun achievements and boosts engagement without risking user funds.
            </p>
          </div>
          <div className="text-[11px] font-mono text-emerald-400 bg-slate-950 p-2 rounded-lg border border-slate-800">
            Reward: Daily Spin Boost
          </div>
        </div>
      </div>
    </div>
  );
}
