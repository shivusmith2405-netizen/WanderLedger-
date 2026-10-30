"use client";

import React, { useState } from "react";
import {
  MemberFinancials,
  SettlementTransaction,
  Expense,
  isUpiUnlockedForViewer,
} from "@/lib/algorithms/debtMinimizer";
import {
  AlertTriangle,
  CheckCircle2,
  Lock,
  Unlock,
  ArrowRight,
  QrCode,
  Send,
  Sparkles,
  Copy,
  Check,
  X,
  CreditCard,
  ShieldCheck,
  Receipt,
  Clock,
  MapPin,
  Users,
  Image as ImageIcon,
  ExternalLink,
  ChevronRight,
  Coffee,
} from "lucide-react";
import { fireDoubleConfetti } from "@/lib/utils/confetti";

interface MemberBalanceMatrixProps {
  financials: MemberFinancials[];
  transactions: SettlementTransaction[];
  activeTravelerId: string;
  expenses?: Expense[];
  onCompleteSettlement: (transaction: SettlementTransaction) => void;
  onToast?: (msg: string) => void;
}

export const MemberBalanceMatrix: React.FC<MemberBalanceMatrixProps> = ({
  financials,
  transactions,
  activeTravelerId,
  expenses = [],
  onCompleteSettlement,
  onToast,
}) => {
  const [selectedTx, setSelectedTx] = useState<SettlementTransaction | null>(null);
  const [copiedUpi, setCopiedUpi] = useState(false);
  const [selectedMemberForHistory, setSelectedMemberForHistory] =
    useState<MemberFinancials | null>(null);
  const [activeLightboxReceipt, setActiveLightboxReceipt] = useState<string | null>(null);

  const handleCopyUpi = (upiId: string) => {
    navigator.clipboard.writeText(upiId);
    setCopiedUpi(true);
    if (onToast) onToast(`Copied UPI ID: ${upiId}`);
    setTimeout(() => setCopiedUpi(false), 2000);
  };

  const handleTriggerUpi = (tx: SettlementTransaction) => {
    window.location.href = tx.upiLink;
  };

  const handleNudgeDebtor = (tx: SettlementTransaction) => {
    const text = `Hey ${tx.fromName}! Reminder for WanderLedger group settlement: Please pay ₹${Math.round(
      tx.amount
    ).toLocaleString("en-IN")} to ${tx.toName} via UPI: ${tx.toUpiId}.`;
    const waUrl = `https://wa.me/?text=${encodeURIComponent(text)}`;
    window.open(waUrl, "_blank", "noopener,noreferrer");
  };

  const formatExpenseDate = (isoString?: string) => {
    if (!isoString) return "Recently logged";
    try {
      const d = new Date(isoString);
      return d.toLocaleDateString("en-IN", {
        month: "short",
        day: "numeric",
        hour: "2-digit",
        minute: "2-digit",
      });
    } catch {
      return "Recently logged";
    }
  };

  const getCategoryEmoji = (category: string) => {
    switch (category) {
      case "food":
        return "🍔";
      case "cab":
        return "🚕";
      case "fuel":
        return "⛽";
      case "stay":
        return "🏨";
      case "tickets":
        return "🎟️";
      default:
        return "✨";
    }
  };

  // Filter bills paid by the selected member in the history drawer
  const selectedMemberExpenses = selectedMemberForHistory
    ? expenses.filter((e) => e.paidById === selectedMemberForHistory.travelerId)
    : [];

  return (
    <div className="space-y-6">
      {/* 1. Member Balance Matrix & Per-Member Budget Tracker */}
      <div className="bg-white rounded-3xl p-6 sm:p-7 shadow-bento border border-[#E6D090] text-[#173842]">
        <div className="flex items-center justify-between pb-4 border-b border-gray-100">
          <div>
            <span className="text-[10px] font-black uppercase tracking-wider text-[#4C9DB0] block mb-0.5">
              Individual Ledger Breakdown
            </span>
            <h3 className="text-xl font-black text-[#173842] tracking-tight">
              Member Balance &amp; Budget Matrix
            </h3>
          </div>
          <span className="px-3 py-1 rounded-full bg-[#4C9DB0]/15 text-[#2D6B78] text-xs font-bold border border-[#4C9DB0]/20">
            {financials.length} Active Members
          </span>
        </div>

        {/* Member Cards Grid (Interactive Click-to-View Bills Paid) */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mt-5">
          {financials.map((member) => {
            const isViewer = member.travelerId === activeTravelerId;
            const startingBudget = Math.round(member.startingBudget);
            const actualShare = Math.round(member.actualShare);
            const actualPaid = Math.round(member.actualPaid);
            const remainingBalance = Math.round(startingBudget - actualShare);
            const isExceeded = remainingBalance < 0;
            const exceededAmount = Math.abs(remainingBalance);
            const netAmount = Math.round(member.net);

            const consumedPercent =
              startingBudget > 0
                ? Math.round((actualShare / startingBudget) * 100)
                : 0;

            return (
              <div
                key={member.travelerId}
                onClick={() => setSelectedMemberForHistory(member)}
                role="button"
                tabIndex={0}
                onKeyDown={(e) => {
                  if (e.key === "Enter" || e.key === " ") {
                    setSelectedMemberForHistory(member);
                  }
                }}
                className={`p-5 rounded-3xl border-2 transition-all duration-200 cursor-pointer hover:border-[#4C9DB0] hover:shadow-lg flex flex-col justify-between group text-left ${
                  isExceeded
                    ? "bg-[#FFF5F5] border-rose-300 shadow-sm ring-1 ring-rose-200"
                    : "bg-white border-gray-200 shadow-sm"
                }`}
                title={`Click to inspect out-of-pocket bills paid by ${member.name}`}
              >
                {/* Header: Member Avatar, Name & Settlement Status Badge */}
                <div>
                  <div className="flex items-start justify-between gap-2">
                    <div className="flex items-center gap-3">
                      <div className="w-12 h-12 rounded-2xl bg-gray-100 border border-gray-200 flex items-center justify-center text-2xl shrink-0 shadow-sm group-hover:scale-105 transition-transform">
                        {member.avatar}
                      </div>
                      <div>
                        <div className="flex items-center gap-1.5">
                          <h4 className="text-base font-black text-[#173842] group-hover:text-[#2D6B78] transition-colors">
                            {member.name}
                          </h4>
                          {isViewer && (
                            <span className="px-2 py-0.5 rounded-full bg-[#173842] text-[#FFEBAF] text-[10px] font-bold">
                              You
                            </span>
                          )}
                        </div>
                        <span className="text-[11px] font-mono text-gray-500 block truncate max-w-[170px]">
                          {member.upiId}
                        </span>
                      </div>
                    </div>

                    {/* Settlement Badges: 🟢 Will Receive / 🔴 Needs to Pay */}
                    <div className="text-right shrink-0">
                      {netAmount > 0 ? (
                        <span
                          suppressHydrationWarning
                          className="inline-block px-2.5 py-1 rounded-full bg-emerald-100 text-emerald-800 text-xs font-bold border border-emerald-300 shadow-xs"
                        >
                          🟢 Will Receive ₹{netAmount.toLocaleString("en-IN")}
                        </span>
                      ) : netAmount < 0 ? (
                        <span
                          suppressHydrationWarning
                          className="inline-block px-2.5 py-1 rounded-full bg-rose-100 text-rose-800 text-xs font-bold border border-rose-300 shadow-xs"
                        >
                          🔴 Needs to Pay ₹{Math.abs(netAmount).toLocaleString("en-IN")}
                        </span>
                      ) : (
                        <span className="inline-block px-2.5 py-1 rounded-full bg-gray-100 text-gray-700 text-xs font-bold">
                          ✨ All Square
                        </span>
                      )}
                    </div>
                  </div>

                  {/* Financial Breakdown Grid with Plain English Terms */}
                  <div className="grid grid-cols-3 gap-2 my-4 pt-3 border-t border-gray-100 text-xs">
                    <div className="p-2 rounded-xl bg-gray-50 border border-gray-100">
                      <div className="text-[10px] text-gray-500 font-bold uppercase">
                        Starting Budget
                      </div>
                      <div
                        suppressHydrationWarning
                        className="font-extrabold text-[#173842] mt-0.5"
                      >
                        ₹{startingBudget.toLocaleString("en-IN")}
                      </div>
                    </div>

                    <div className="p-2 rounded-xl bg-gray-50 border border-gray-100">
                      <div className="text-[10px] text-gray-500 font-bold uppercase truncate" title="Total Share">
                        Total Share
                      </div>
                      <div
                        suppressHydrationWarning
                        className="font-extrabold text-[#2D6B78] mt-0.5"
                      >
                        ₹{actualShare.toLocaleString("en-IN")}
                      </div>
                    </div>

                    <div className="p-2 rounded-xl bg-gray-50 border border-gray-100">
                      <div className="text-[10px] text-gray-500 font-bold uppercase truncate" title="Paid at Bills">
                        Paid at Bills
                      </div>
                      <div
                        suppressHydrationWarning
                        className="font-extrabold text-gray-800 mt-0.5"
                      >
                        ₹{actualPaid.toLocaleString("en-IN")}
                      </div>
                    </div>
                  </div>
                </div>

                {/* Per-Member Budget Status: Over Budget Alert vs. Budget Still Left */}
                <div className="mt-1 pt-3 border-t border-gray-200/60">
                  {isExceeded ? (
                    /* Soft coral/warning bold alert badge: Over Budget by */
                    <div className="p-3 rounded-2xl bg-[#FFE4E1] border-2 border-rose-400 text-rose-950 flex items-center justify-between shadow-sm animate-pulse-glow">
                      <div className="flex items-center gap-2">
                        <AlertTriangle className="w-5 h-5 text-rose-600 shrink-0 stroke-[2.5]" />
                        <span
                          suppressHydrationWarning
                          className="text-xs sm:text-sm font-black tracking-tight"
                        >
                          ⚠️ Over Budget by ₹{exceededAmount.toLocaleString("en-IN")}
                        </span>
                      </div>
                      <span className="text-[11px] font-black px-2 py-0.5 rounded-full bg-rose-600 text-white shrink-0">
                        {consumedPercent}% Used
                      </span>
                    </div>
                  ) : (
                    /* Budget Still Left Normal Progress */
                    <div className="space-y-1.5">
                      <div className="flex justify-between items-center text-xs">
                        <span
                          suppressHydrationWarning
                          className="font-bold text-[#173842]"
                        >
                          Budget Still Left: ₹{remainingBalance.toLocaleString("en-IN")}
                        </span>
                        <span className="text-[11px] font-semibold text-gray-500">
                          {consumedPercent}% consumed
                        </span>
                      </div>
                      <div className="h-2.5 w-full bg-gray-100 rounded-full overflow-hidden p-0.5 border border-gray-200">
                        <div
                          className="h-full rounded-full bg-gradient-to-r from-[#4C9DB0] to-[#2D6B78] transition-all duration-500"
                          style={{ width: `${Math.min(100, consumedPercent)}%` }}
                        />
                      </div>
                    </div>
                  )}

                  {/* Interactive affordance footer */}
                  <div className="mt-3 flex items-center justify-between text-[11px] text-[#4F7682] group-hover:text-[#4C9DB0] font-bold transition-colors">
                    <span className="flex items-center gap-1.5">
                      <Receipt className="w-3.5 h-3.5 text-[#4C9DB0]" />
                      <span>Inspect Bills Paid</span>
                    </span>
                    <span className="group-hover:translate-x-1 transition-transform">
                      View details →
                    </span>
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      </div>

      {/* 2. Final Settlement ("Who Needs to Pay Whom") */}
      <div className="bg-white rounded-3xl p-6 sm:p-7 shadow-bento border border-[#E6D090] text-[#173842]">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 pb-4 border-b border-gray-100">
          <div>
            <span className="text-[10px] font-black uppercase tracking-wider text-[#4C9DB0] block mb-0.5">
              Optimal Two-Pointer Greedy Settlement
            </span>
            <h3 className="text-xl font-black text-[#173842] tracking-tight">
              Final Settlement (Who Needs to Pay Whom)
            </h3>
          </div>
          <span className="text-xs font-semibold text-gray-500">
            {transactions.length === 0
              ? "All debts resolved"
              : `${transactions.length} direct transfers required`}
          </span>
        </div>

        {/* Transactions List */}
        <div className="space-y-3 mt-5">
          {transactions.length === 0 ? (
            <div className="p-8 text-center bg-gray-50 rounded-3xl border border-gray-200 text-gray-500 space-y-2">
              <Sparkles className="w-8 h-8 mx-auto text-[#FFEBAF]" />
              <h4 className="font-extrabold text-sm text-[#173842]">
                All Square! Zero Pending Payments 🎉
              </h4>
              <p className="text-xs text-gray-500">
                All pairwise debts have been minimized and completely balanced out.
              </p>
            </div>
          ) : (
            transactions.map((tx) => {
              const isViewerPayer = isUpiUnlockedForViewer(tx, activeTravelerId);
              const isViewerReceiver = tx.toId === activeTravelerId;
              const roundedTxAmount = Math.round(tx.amount);

              return (
                <div
                  key={tx.id}
                  className={`p-4 sm:p-5 rounded-3xl border-2 transition-all flex flex-col sm:flex-row sm:items-center justify-between gap-4 ${
                    isViewerPayer
                      ? "bg-amber-50/70 border-amber-300 shadow-md ring-1 ring-amber-200"
                      : isViewerReceiver
                      ? "bg-emerald-50/60 border-emerald-300 shadow-sm"
                      : "bg-gray-50 border-gray-200"
                  }`}
                >
                  {/* Settlement Instruction Header: [Payer Name] ➔ [Receiver Name]: ₹[Amount] */}
                  <div className="space-y-1">
                    <div className="flex items-center gap-2 text-sm sm:text-base font-black text-[#173842]">
                      <span className="flex items-center gap-1.5">
                        <span className="text-xl">{tx.fromAvatar}</span>
                        <span>{tx.fromName}</span>
                      </span>
                      <ArrowRight className="w-4 h-4 text-[#4C9DB0] stroke-[3]" />
                      <span className="flex items-center gap-1.5 text-[#2D6B78]">
                        <span className="text-xl">{tx.toAvatar}</span>
                        <span>{tx.toName}</span>
                      </span>
                      <span className="text-gray-400 font-bold">:</span>
                      <span
                        suppressHydrationWarning
                        className="text-lg sm:text-xl font-black text-[#173842] ml-1"
                      >
                        ₹{roundedTxAmount.toLocaleString("en-IN")}
                      </span>
                    </div>

                    <div className="flex items-center gap-2 text-xs text-gray-500 font-mono">
                      <span>UPI: {tx.toUpiId}</span>
                      {isViewerPayer && (
                        <span className="px-2 py-0.5 rounded-full bg-amber-200 text-amber-900 font-bold text-[10px] font-sans">
                          You are Payer
                        </span>
                      )}
                      {isViewerReceiver && (
                        <span className="px-2 py-0.5 rounded-full bg-emerald-200 text-emerald-900 font-bold text-[10px] font-sans">
                          You are Receiver
                        </span>
                      )}
                    </div>
                  </div>

                  {/* Role-Locked Action Buttons */}
                  <div className="flex items-center gap-2 shrink-0">
                    {isViewerPayer ? (
                      /* UNLOCKED for Verified Debtor / Payer */
                      <>
                        <button
                          type="button"
                          onClick={() => handleTriggerUpi(tx)}
                          className="px-4 py-2.5 rounded-2xl bg-[#4C9DB0] hover:bg-[#3D8798] text-white font-black text-xs shadow-md active:scale-95 transition-all flex items-center gap-1.5 cursor-pointer"
                          title="Launch UPI Intent"
                        >
                          <Unlock className="w-3.5 h-3.5 text-[#FFEBAF]" />
                          <span>Pay via UPI</span>
                        </button>

                        <button
                          type="button"
                          onClick={() => setSelectedTx(tx)}
                          className="p-2.5 rounded-2xl bg-white border border-gray-300 hover:bg-[#FFEBAF] text-[#173842] shadow-sm transition-colors cursor-pointer"
                          title="View QR Code"
                        >
                          <QrCode className="w-4 h-4" />
                        </button>
                      </>
                    ) : (
                      /* ROLE-LOCKED for non-payer with Nudge option */
                      <>
                        <button
                          type="button"
                          disabled
                          className="px-3.5 py-2.5 rounded-2xl bg-gray-100 border border-gray-300 text-gray-400 font-bold text-xs flex items-center gap-1.5 cursor-not-allowed"
                          title="Role-locked: Only payer can trigger UPI"
                        >
                          <Lock className="w-3.5 h-3.5" />
                          <span>Locked: {tx.fromName.split(" ")[0]} Must Pay</span>
                        </button>

                        <button
                          type="button"
                          onClick={() => handleNudgeDebtor(tx)}
                          className="px-3 py-2.5 rounded-2xl bg-[#FFEBAF] hover:bg-[#FFF3D1] text-[#173842] font-bold text-xs flex items-center gap-1 shadow-sm transition-all cursor-pointer"
                          title="Send reminder on WhatsApp"
                        >
                          <Send className="w-3.5 h-3.5 text-[#2D6B78]" />
                          <span>Ping</span>
                        </button>
                      </>
                    )}

                    <button
                      type="button"
                      onClick={() => {
                        onCompleteSettlement(tx);
                        fireDoubleConfetti();
                      }}
                      className="px-3.5 py-2.5 rounded-2xl bg-emerald-600 hover:bg-emerald-700 text-white font-bold text-xs shadow-sm active:scale-95 transition-all flex items-center gap-1 cursor-pointer"
                      title="Mark transaction as settled in ledger"
                    >
                      <CheckCircle2 className="w-3.5 h-3.5" />
                      <span>Mark Paid</span>
                    </button>
                  </div>
                </div>
              );
            })
          )}
        </div>
      </div>

      {/* 3. Bills Paid Drill-down Slide-up Drawer / Modal */}
      {selectedMemberForHistory && (
        <div className="fixed inset-0 z-50 flex items-end sm:items-center justify-center bg-[#173842]/75 backdrop-blur-md animate-in fade-in duration-200 p-0 sm:p-4">
          <div className="bg-white rounded-t-[32px] sm:rounded-3xl max-w-2xl w-full max-h-[90vh] overflow-hidden flex flex-col shadow-2xl border-2 border-[#E6D090] text-[#173842] relative animate-in slide-in-from-bottom-8 sm:zoom-in-95 duration-200">
            {/* Drawer Header */}
            <div className="p-5 sm:p-6 border-b border-[#FFEBAF] flex items-start justify-between bg-gradient-to-r from-[#FFEBAF]/40 to-transparent">
              <div className="flex items-center gap-3">
                <div className="w-14 h-14 rounded-2xl bg-white border-2 border-[#E6D090] flex items-center justify-center text-3xl shadow-md">
                  {selectedMemberForHistory.avatar}
                </div>
                <div>
                  <div className="flex items-center gap-2">
                    <h3 className="text-lg sm:text-xl font-black text-[#173842]">
                      {selectedMemberForHistory.name}
                    </h3>
                    {selectedMemberForHistory.travelerId === activeTravelerId && (
                      <span className="px-2 py-0.5 rounded-full bg-[#173842] text-[#FFEBAF] text-[10px] font-bold">
                        You
                      </span>
                    )}
                  </div>
                  <p className="text-xs font-mono text-[#2D6B78] mt-0.5">
                    UPI: {selectedMemberForHistory.upiId}
                  </p>
                </div>
              </div>

              <button
                type="button"
                onClick={() => setSelectedMemberForHistory(null)}
                className="w-9 h-9 rounded-full bg-gray-100 hover:bg-gray-200 text-[#173842] flex items-center justify-center font-bold text-sm transition-colors cursor-pointer"
                title="Close drawer"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            {/* Summary Pills: Total Spent at Counters vs Personal Consumed Share */}
            <div className="p-4 sm:p-5 bg-gray-50/80 border-b border-gray-100 grid grid-cols-2 sm:grid-cols-3 gap-2 sm:gap-3 text-xs">
              <div className="p-3 rounded-2xl bg-white border border-gray-200 shadow-xs">
                <span className="text-[10px] font-bold text-gray-500 uppercase block">
                  Paid at Counters / Bills
                </span>
                <span
                  suppressHydrationWarning
                  className="text-base sm:text-lg font-black text-[#173842] mt-0.5 block"
                >
                  ₹{Math.round(selectedMemberForHistory.actualPaid).toLocaleString("en-IN")}
                </span>
              </div>

              <div className="p-3 rounded-2xl bg-white border border-gray-200 shadow-xs">
                <span className="text-[10px] font-bold text-gray-500 uppercase block">
                  Personal Consumed Share
                </span>
                <span
                  suppressHydrationWarning
                  className="text-base sm:text-lg font-black text-[#2D6B78] mt-0.5 block"
                >
                  ₹{Math.round(selectedMemberForHistory.actualShare).toLocaleString("en-IN")}
                </span>
              </div>

              <div className="col-span-2 sm:col-span-1 p-3 rounded-2xl bg-white border border-gray-200 shadow-xs">
                <span className="text-[10px] font-bold text-gray-500 uppercase block">
                  Settlement Balance
                </span>
                <span
                  suppressHydrationWarning
                  className={`text-base sm:text-lg font-black mt-0.5 block ${
                    Math.round(selectedMemberForHistory.net) > 0
                      ? "text-emerald-700"
                      : Math.round(selectedMemberForHistory.net) < 0
                      ? "text-rose-700"
                      : "text-gray-700"
                  }`}
                >
                  {Math.round(selectedMemberForHistory.net) > 0
                    ? `🟢 Gets back ₹${Math.round(selectedMemberForHistory.net).toLocaleString("en-IN")}`
                    : Math.round(selectedMemberForHistory.net) < 0
                    ? `🔴 Owes ₹${Math.round(Math.abs(selectedMemberForHistory.net)).toLocaleString("en-IN")}`
                    : "✨ All Square"}
                </span>
              </div>
            </div>

            {/* Filtered List of Bills Paid */}
            <div className="p-5 sm:p-6 overflow-y-auto flex-1 space-y-3.5">
              <div className="flex items-center justify-between">
                <h4 className="text-xs font-black text-[#4F7682] uppercase tracking-wider flex items-center gap-1.5">
                  <Receipt className="w-4 h-4 text-[#4C9DB0]" />
                  <span>Bills Paid by {selectedMemberForHistory.name} ({selectedMemberExpenses.length})</span>
                </h4>
                <span className="text-[11px] text-gray-500">
                  {selectedMemberExpenses.length === 1 ? "1 bill logged" : `${selectedMemberExpenses.length} bills logged`}
                </span>
              </div>

              {selectedMemberExpenses.length === 0 ? (
                /* Friendly note when no out-of-pocket bills paid */
                <div className="p-8 text-center bg-gray-50/90 rounded-3xl border border-gray-200 text-gray-500 space-y-2.5 my-3">
                  <div className="w-12 h-12 rounded-2xl bg-[#FFEBAF] text-[#173842] flex items-center justify-center mx-auto text-xl shadow-sm">
                    🌴
                  </div>
                  <h5 className="font-extrabold text-sm sm:text-base text-[#173842]">
                    No out-of-pocket bills paid yet.
                  </h5>
                  <p className="text-xs text-gray-600 max-w-sm mx-auto leading-relaxed">
                    Others covered their expenses! Their consumed share of{" "}
                    <strong className="text-[#173842]">
                      ₹{Math.round(selectedMemberForHistory.actualShare).toLocaleString("en-IN")}
                    </strong>{" "}
                    is calculated in the final settlement above.
                  </p>
                </div>
              ) : (
                /* List of bills paid */
                <div className="space-y-2.5">
                  {selectedMemberExpenses.map((exp) => (
                    <div
                      key={exp.id}
                      className="p-3.5 sm:p-4 rounded-2xl border border-gray-200 bg-white hover:border-[#4C9DB0] transition-colors flex flex-col sm:flex-row sm:items-center justify-between gap-3 shadow-xs"
                    >
                      <div className="flex items-start gap-3">
                        <div className="w-10 h-10 rounded-xl bg-gray-100 flex items-center justify-center text-lg shrink-0 mt-0.5 border border-gray-200">
                          {getCategoryEmoji(exp.category)}
                        </div>
                        <div>
                          <h5 className="font-extrabold text-sm text-[#173842] leading-tight">
                            {exp.title}
                          </h5>
                          <div className="flex flex-wrap items-center gap-x-2 gap-y-0.5 text-[11px] text-gray-500 mt-1">
                            <span className="flex items-center gap-1 font-medium">
                              <Clock className="w-3 h-3 text-[#4C9DB0]" />
                              {formatExpenseDate(exp.timestamp)}
                            </span>
                            <span>•</span>
                            <span className="flex items-center gap-1 font-medium">
                              <Users className="w-3 h-3 text-[#2D6B78]" />
                              Split among {exp.splitAmongIds?.length || 1} members
                            </span>
                            {exp.location && (
                              <>
                                <span>•</span>
                                <span className="flex items-center gap-1 font-medium truncate max-w-[150px]">
                                  <MapPin className="w-3 h-3 text-[#4C9DB0]" />
                                  {exp.location}
                                </span>
                              </>
                            )}
                          </div>
                        </div>
                      </div>

                      <div className="flex items-center justify-between sm:justify-end gap-3 shrink-0 pt-2 sm:pt-0 border-t sm:border-t-0 border-gray-100">
                        <div className="text-left sm:text-right">
                          <span
                            suppressHydrationWarning
                            className="text-base sm:text-lg font-black text-[#173842] block"
                          >
                            ₹{Math.round(exp.amount).toLocaleString("en-IN")}
                          </span>
                          <span className="text-[10px] text-gray-400 font-medium">
                            Paid at counter
                          </span>
                        </div>

                        {/* Clickable receipt photo thumbnail */}
                        {exp.receiptUrl && (
                          <button
                            type="button"
                            onClick={() => setActiveLightboxReceipt(exp.receiptUrl!)}
                            className="relative w-11 h-11 rounded-xl overflow-hidden border-2 border-[#E6D090] hover:border-[#4C9DB0] shadow-sm transition-all shrink-0 group cursor-pointer"
                            title="Click to view receipt photo"
                          >
                            {/* eslint-disable-next-line @next/next/no-img-element */}
                            <img
                              src={exp.receiptUrl}
                              alt={exp.title}
                              className="w-full h-full object-cover group-hover:scale-110 transition-transform"
                            />
                            <div className="absolute inset-0 bg-black/30 flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity">
                              <ImageIcon className="w-3.5 h-3.5 text-white" />
                            </div>
                          </button>
                        )}
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>

            {/* Drawer Footer */}
            <div className="p-4 bg-gray-50 border-t border-gray-200 flex justify-end">
              <button
                type="button"
                onClick={() => setSelectedMemberForHistory(null)}
                className="px-5 py-2.5 rounded-2xl bg-[#173842] hover:bg-[#235560] text-[#FFEBAF] font-bold text-xs shadow-md transition-colors cursor-pointer"
              >
                Close Bills Drawer
              </button>
            </div>
          </div>
        </div>
      )}

      {/* 4. Fullscreen Receipt Lightbox Modal */}
      {activeLightboxReceipt && (
        <div
          onClick={() => setActiveLightboxReceipt(null)}
          className="fixed inset-0 z-60 bg-black/85 backdrop-blur-md flex items-center justify-center p-4 animate-in fade-in duration-200 cursor-zoom-out"
        >
          <div
            onClick={(e) => e.stopPropagation()}
            className="relative max-w-lg w-full bg-[#173842] rounded-3xl p-3 shadow-2xl border border-white/20 animate-in zoom-in-95 duration-200 text-white"
          >
            <div className="flex justify-between items-center pb-2.5 px-2">
              <span className="text-xs font-bold text-[#FFEBAF] flex items-center gap-1.5">
                <Receipt className="w-4 h-4" />
                Receipt Proof Photo
              </span>
              <button
                type="button"
                onClick={() => setActiveLightboxReceipt(null)}
                className="w-7 h-7 rounded-full bg-white/20 hover:bg-white/30 text-white flex items-center justify-center text-xs font-bold transition-colors cursor-pointer"
              >
                ✕
              </button>
            </div>
            <div className="rounded-2xl overflow-hidden bg-black/40 flex items-center justify-center max-h-[75vh]">
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img
                src={activeLightboxReceipt}
                alt="Receipt proof"
                className="w-full h-auto max-h-[75vh] object-contain"
              />
            </div>
            <div className="pt-2 px-2 text-center text-[11px] text-white/60">
              Auto-locked receipt proof with timestamp &amp; location metadata
            </div>
          </div>
        </div>
      )}

      {/* 5. QR Code Settlement Modal */}
      {selectedTx && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-[#173842]/75 backdrop-blur-md animate-in fade-in duration-200">
          <div className="bg-white rounded-3xl max-w-sm w-full p-6 shadow-2xl border-2 border-[#E6D090] text-[#173842] relative animate-in zoom-in-95 duration-200">
            <div className="flex justify-between items-center pb-3 border-b border-[#FFEBAF]">
              <div className="flex items-center gap-2">
                <QrCode className="w-5 h-5 text-[#4C9DB0]" />
                <h3 className="font-extrabold text-base text-[#173842]">
                  UPI QR Settlement
                </h3>
              </div>
              <button
                type="button"
                onClick={() => setSelectedTx(null)}
                className="w-8 h-8 rounded-full bg-gray-100 hover:bg-gray-200 flex items-center justify-center text-sm font-bold cursor-pointer"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <div className="my-4 text-center space-y-3">
              <div className="p-4 rounded-3xl bg-[#FFEBAF]/30 border border-[#E6D090] inline-block shadow-inner">
                <div className="w-44 h-44 bg-white rounded-2xl p-2.5 border-2 border-[#173842] shadow-sm flex flex-col items-center justify-center relative">
                  {/* eslint-disable-next-line @next/next/no-img-element */}
                  <img
                    src={`https://api.qrserver.com/v1/create-qr-code/?size=180x180&data=${encodeURIComponent(
                      selectedTx.upiLink
                    )}`}
                    alt="UPI Payment QR Code"
                    className="w-full h-full object-contain"
                  />
                  <div className="absolute inset-0 flex items-center justify-center pointer-events-none">
                    <div className="w-8 h-8 rounded-full bg-[#173842] text-white flex items-center justify-center text-[10px] font-bold shadow-md">
                      UPI
                    </div>
                  </div>
                </div>
              </div>

              <div>
                <div
                  suppressHydrationWarning
                  className="text-2xl font-black text-[#173842]"
                >
                  ₹{Math.round(selectedTx.amount).toLocaleString("en-IN")}
                </div>
                <p className="text-xs text-gray-500 font-medium">
                  Transfer to <strong className="text-[#173842]">{selectedTx.toName}</strong>
                </p>
              </div>

              <div className="p-2.5 rounded-2xl bg-gray-50 border border-gray-200 flex items-center justify-between text-xs">
                <span className="font-mono text-[#2D6B78] truncate pr-2 font-bold">
                  {selectedTx.toUpiId}
                </span>
                <button
                  type="button"
                  onClick={() => handleCopyUpi(selectedTx.toUpiId)}
                  className="px-2.5 py-1 rounded-xl bg-white border border-gray-300 hover:bg-gray-100 font-bold text-[11px] text-[#173842] flex items-center gap-1 cursor-pointer"
                >
                  {copiedUpi ? <Check className="w-3 h-3 text-emerald-600" /> : <Copy className="w-3 h-3" />}
                  <span>{copiedUpi ? "Copied" : "Copy"}</span>
                </button>
              </div>
            </div>

            <div className="space-y-2 pt-1">
              <button
                type="button"
                onClick={() => handleTriggerUpi(selectedTx)}
                className="w-full py-3 rounded-2xl bg-[#4C9DB0] hover:bg-[#3D8798] text-white font-extrabold text-xs shadow-md flex items-center justify-center gap-1.5 cursor-pointer"
              >
                <Unlock className="w-4 h-4 text-[#FFEBAF]" />
                <span>Launch UPI App (GPay/PhonePe/Paytm)</span>
              </button>

              <button
                type="button"
                onClick={() => {
                  onCompleteSettlement(selectedTx);
                  setSelectedTx(null);
                  fireDoubleConfetti();
                }}
                className="w-full py-2.5 rounded-2xl bg-[#FFEBAF] hover:bg-[#FFF3D1] text-[#173842] font-bold text-xs flex items-center justify-center gap-1.5 cursor-pointer"
              >
                <CheckCircle2 className="w-4 h-4 text-emerald-600" />
                <span>Mark Paid &amp; Rebalance Ledger</span>
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
