"use client";

import React, { useState } from "react";
import { Vault, TrendingDown, Clock, Plus, ShieldCheck, Sparkles, ChevronRight, Users } from "lucide-react";
import { Traveler } from "@/lib/algorithms/debtMinimizer";
import { fireConfetti } from "@/lib/utils/confetti";

interface BudgetTileProps {
  totalPledged: number;
  totalSpent: number;
  travelers: Traveler[];
  onTopUpPledge: (travelerId: string, amount: number) => void;
}

export const BudgetTile: React.FC<BudgetTileProps> = ({
  totalPledged,
  totalSpent,
  travelers,
  onTopUpPledge,
}) => {
  const [showTopUpModal, setShowTopUpModal] = useState(false);
  const [selectedTravelerId, setSelectedTravelerId] = useState(travelers[0]?.id || "");
  const [pledgeAmount, setPledgeAmount] = useState<number>(5000);
  const [showBreakdown, setShowBreakdown] = useState(false);

  const moneyLeft = Math.max(0, totalPledged - totalSpent);
  const percentLeft = totalPledged > 0 ? Math.min(100, Math.max(0, (moneyLeft / totalPledged) * 100)) : 0;
  const spentPercent = 100 - percentLeft;

  // Simple burn rate metrics (assuming 4-day trip segment)
  const daysTraveled = 2.5;
  const burnRatePerDay = totalSpent > 0 ? Math.round(totalSpent / daysTraveled) : 0;
  const daysRunway = burnRatePerDay > 0 ? (moneyLeft / burnRatePerDay).toFixed(1) : "—";

  const handleTopUpSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (pledgeAmount > 0 && selectedTravelerId) {
      onTopUpPledge(selectedTravelerId, pledgeAmount);
      setShowTopUpModal(false);
      fireConfetti();
    }
  };

  return (
    <>
      <div className="relative overflow-hidden bg-gradient-to-br from-[#4C9DB0] via-[#3E8D9F] to-[#2D6B78] text-white rounded-3xl p-6 sm:p-7 shadow-bento-teal border border-[#2D6B78]/40 transition-all duration-300 hover:shadow-2xl col-span-1 md:col-span-2 flex flex-col justify-between group">
        {/* Decorative background aura */}
        <div className="absolute -right-16 -top-16 w-56 h-56 bg-white/10 rounded-full blur-2xl pointer-events-none group-hover:scale-110 transition-transform duration-700" />
        <div className="absolute -left-12 -bottom-12 w-48 h-48 bg-[#FFEBAF]/15 rounded-full blur-2xl pointer-events-none" />

        {/* Top Header Row */}
        <div className="relative z-10 flex items-start justify-between gap-4">
          <div className="space-y-1">
            <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-[#173842]/30 backdrop-blur-md border border-white/20 text-[#FFEBAF] text-xs font-semibold uppercase tracking-wider">
              <Vault className="w-3.5 h-3.5 text-[#FFEBAF]" />
              <span>Virtual Escrow • Fixed Deposit Meter</span>
            </div>
            <h2 className="text-sm font-medium text-white/80">Trip Capital Available</h2>
            <div className="flex items-baseline gap-2">
              <span suppressHydrationWarning className="text-3xl sm:text-4xl lg:text-5xl font-extrabold tracking-tight text-white drop-shadow-sm">
                ₹{moneyLeft.toLocaleString("en-IN")}
              </span>
              <span suppressHydrationWarning className="text-xs sm:text-sm font-semibold px-2 py-0.5 rounded-full bg-white/20 text-[#FFEBAF] border border-white/15">
                {percentLeft.toFixed(1)}% Left
              </span>
            </div>
          </div>

          <button
            onClick={() => setShowTopUpModal(true)}
            className="flex items-center gap-1.5 px-3.5 py-2 sm:px-4 sm:py-2.5 rounded-2xl bg-[#FFEBAF] hover:bg-[#FFF3D1] text-[#173842] font-bold text-xs sm:text-sm shadow-md hover:shadow-lg active:scale-95 transition-all duration-200 cursor-pointer"
            title="Pledge additional capital to virtual escrow"
          >
            <Plus className="w-4 h-4 stroke-[3]" />
            <span>Top Up Pledge</span>
          </button>
        </div>

        {/* Progress Escrow Gauge */}
        <div className="relative z-10 my-5 space-y-2.5">
          <div className="flex justify-between items-center text-xs font-medium text-white/90">
            <span suppressHydrationWarning className="flex items-center gap-1">
              <span className="w-2 h-2 rounded-full bg-[#FFEBAF]" />
              Spent: ₹{totalSpent.toLocaleString("en-IN")} ({spentPercent.toFixed(1)}%)
            </span>
            <span suppressHydrationWarning className="flex items-center gap-1">
              <span className="w-2 h-2 rounded-full bg-white" />
              Total Pledged: ₹{totalPledged.toLocaleString("en-IN")}
            </span>
          </div>

          <div className="h-4 sm:h-5 w-full bg-[#173842]/40 rounded-full p-0.5 backdrop-blur-sm border border-white/20 overflow-hidden shadow-inner">
            <div
              className="h-full rounded-full bg-gradient-to-r from-[#FFEBAF] via-[#FCE395] to-white shadow-md transition-all duration-700 ease-out"
              style={{ width: `${percentLeft}%` }}
            />
          </div>
        </div>

        {/* Bottom Metrics Pill Bar */}
        <div className="relative z-10 pt-2 border-t border-white/15 grid grid-cols-2 sm:grid-cols-3 gap-2 sm:gap-4 text-xs">
          <div className="bg-[#173842]/25 backdrop-blur-sm rounded-2xl p-2.5 border border-white/10 flex items-center gap-2.5">
            <div className="p-2 rounded-xl bg-white/10 text-[#FFEBAF]">
              <TrendingDown className="w-4 h-4" />
            </div>
            <div>
              <div className="text-white/70 text-[10px] font-medium uppercase">Burn Rate</div>
              <div className="text-white font-bold text-xs sm:text-sm">₹{burnRatePerDay.toLocaleString("en-IN")}/day</div>
            </div>
          </div>

          <div className="bg-[#173842]/25 backdrop-blur-sm rounded-2xl p-2.5 border border-white/10 flex items-center gap-2.5">
            <div className="p-2 rounded-xl bg-white/10 text-white">
              <Clock className="w-4 h-4" />
            </div>
            <div>
              <div className="text-white/70 text-[10px] font-medium uppercase">Runway Left</div>
              <div className="text-white font-bold text-xs sm:text-sm">{daysRunway} days</div>
            </div>
          </div>

          <button
            onClick={() => setShowBreakdown(!showBreakdown)}
            className="col-span-2 sm:col-span-1 bg-[#173842]/25 hover:bg-[#173842]/40 backdrop-blur-sm rounded-2xl p-2.5 border border-white/10 flex items-center justify-between gap-2 transition-all cursor-pointer text-left"
          >
            <div className="flex items-center gap-2.5">
              <div className="p-2 rounded-xl bg-white/10 text-[#FFEBAF]">
                <Users className="w-4 h-4" />
              </div>
              <div>
                <div className="text-white/70 text-[10px] font-medium uppercase">Pledged Stakes</div>
                <div className="text-white font-bold text-xs sm:text-sm">{travelers.length} Travelers</div>
              </div>
            </div>
            <ChevronRight className={`w-4 h-4 text-white/70 transition-transform ${showBreakdown ? "rotate-90" : ""}`} />
          </button>
        </div>

        {/* Expandable Stake Breakdown */}
        {showBreakdown && (
          <div className="relative z-10 mt-3 pt-3 border-t border-white/15 grid grid-cols-2 sm:grid-cols-4 gap-2 animate-in fade-in slide-in-from-top-2 duration-200">
            {travelers.map((t) => (
              <div key={t.id} className="bg-black/20 rounded-xl p-2 text-[11px] border border-white/10">
                <div className="flex items-center gap-1 font-medium text-white/90 truncate">
                  <span>{t.avatar}</span>
                  <span className="truncate">{t.name}</span>
                </div>
                <div className="font-bold text-[#FFEBAF] mt-0.5">₹{t.pledgedAmount.toLocaleString("en-IN")}</div>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Top Up Pledge Modal */}
      {showTopUpModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-[#173842]/70 backdrop-blur-md animate-in fade-in duration-200">
          <div className="bg-white rounded-3xl max-w-md w-full p-6 shadow-2xl border border-[#E6D090] text-[#173842] relative animate-in zoom-in-95 duration-200">
            <div className="flex justify-between items-center pb-3 border-b border-[#FFEBAF]">
              <div className="flex items-center gap-2">
                <div className="p-2 rounded-2xl bg-[#4C9DB0]/15 text-[#2D6B78]">
                  <Vault className="w-5 h-5" />
                </div>
                <h3 className="text-lg font-bold text-[#173842]">Pledge Capital to Escrow</h3>
              </div>
              <button
                onClick={() => setShowTopUpModal(false)}
                className="w-8 h-8 rounded-full bg-[#FFEBAF]/50 hover:bg-[#FFEBAF] text-[#173842] flex items-center justify-center font-bold text-sm"
              >
                ✕
              </button>
            </div>

            <form onSubmit={handleTopUpSubmit} className="space-y-4 mt-4">
              <div>
                <label className="block text-xs font-bold text-[#173842] uppercase tracking-wider mb-1.5">
                  Who is pledging?
                </label>
                <div className="grid grid-cols-2 gap-2">
                  {travelers.map((t) => (
                    <button
                      key={t.id}
                      type="button"
                      onClick={() => setSelectedTravelerId(t.id)}
                      className={`p-2.5 rounded-2xl border text-left flex items-center gap-2 transition-all cursor-pointer ${
                        selectedTravelerId === t.id
                          ? "border-[#4C9DB0] bg-[#4C9DB0]/10 font-bold text-[#173842] shadow-sm"
                          : "border-gray-200 hover:border-gray-300 text-gray-700"
                      }`}
                    >
                      <span className="text-lg">{t.avatar}</span>
                      <span className="text-xs truncate">{t.name}</span>
                    </button>
                  ))}
                </div>
              </div>

              <div>
                <label className="block text-xs font-bold text-[#173842] uppercase tracking-wider mb-1.5">
                  Pledge Amount (₹)
                </label>
                <div className="relative">
                  <span className="absolute left-3.5 top-1/2 -translate-y-1/2 text-lg font-bold text-gray-400">₹</span>
                  <input
                    type="number"
                    min="500"
                    step="500"
                    value={pledgeAmount}
                    onChange={(e) => setPledgeAmount(Number(e.target.value))}
                    className="w-full pl-8 pr-4 py-3 rounded-2xl border-2 border-gray-200 focus:border-[#4C9DB0] focus:outline-none font-bold text-xl text-[#173842]"
                  />
                </div>
                <div className="flex gap-2 mt-2">
                  {[2000, 5000, 10000].map((preset) => (
                    <button
                      key={preset}
                      type="button"
                      onClick={() => setPledgeAmount(preset)}
                      className="px-3 py-1 rounded-xl bg-gray-100 hover:bg-[#FFEBAF] text-xs font-semibold text-[#173842] transition-colors cursor-pointer"
                    >
                      +₹{preset.toLocaleString("en-IN")}
                    </button>
                  ))}
                </div>
              </div>

              <div className="p-3 rounded-2xl bg-[#4C9DB0]/10 border border-[#4C9DB0]/20 flex items-start gap-2.5 text-xs text-[#2D6B78]">
                <ShieldCheck className="w-4 h-4 shrink-0 mt-0.5" />
                <span>
                  Capital is recorded in WanderLedger escrow. It will immediately expand group runway and adjust settlement balances.
                </span>
              </div>

              <div className="flex gap-3 pt-2">
                <button
                  type="button"
                  onClick={() => setShowTopUpModal(false)}
                  className="w-1/2 py-3 rounded-2xl bg-gray-100 hover:bg-gray-200 font-semibold text-xs text-gray-700"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="w-1/2 py-3 rounded-2xl bg-[#4C9DB0] hover:bg-[#3D8798] text-white font-bold text-xs shadow-md active:scale-95 transition-all flex items-center justify-center gap-1.5 cursor-pointer"
                >
                  <Sparkles className="w-4 h-4" />
                  <span>Confirm Pledge</span>
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </>
  );
};
