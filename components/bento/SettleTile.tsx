"use client";

import React, { useState } from "react";
import Link from "next/link";
import {
  ArrowRightLeft,
  Lock,
  Unlock,
  CheckCircle2,
  QrCode,
  Copy,
  Send,
  Sparkles,
  ExternalLink,
  ShieldCheck,
  X,
  AlertTriangle,
  ArrowRight,
  Share2,
} from "lucide-react";
import {
  SettlementTransaction,
  NetBalance,
  Traveler,
  MemberFinancials,
  generateOfficialWhatsAppSummary,
  isUpiUnlockedForViewer,
} from "@/lib/algorithms/debtMinimizer";
import { fireDoubleConfetti, fireConfetti } from "@/lib/utils/confetti";

interface SettleTileProps {
  transactions: SettlementTransaction[];
  netBalances: Map<string, NetBalance>;
  financials?: MemberFinancials[];
  activeTravelerId: string;
  travelers: Traveler[];
  tripSlug?: string;
  totalTripCost?: number;
  totalInitialBudget?: number;
  onCompleteSettlement: (transaction: SettlementTransaction) => void;
  onToast?: (msg: string) => void;
}

export const SettleTile: React.FC<SettleTileProps> = ({
  transactions,
  netBalances,
  financials = [],
  activeTravelerId,
  travelers,
  tripSlug = "goa-2026",
  totalTripCost = 0,
  totalInitialBudget = 0,
  onCompleteSettlement,
  onToast,
}) => {
  const [selectedTx, setSelectedTx] = useState<SettlementTransaction | null>(null);
  const [copiedUpi, setCopiedUpi] = useState(false);
  const [showAllSettlementsModal, setShowAllSettlementsModal] = useState(false);

  // Active traveler's financial record
  const myFinancial = financials.find((f) => f.travelerId === activeTravelerId);
  const myNet = netBalances.get(activeTravelerId);
  const myBalance = myFinancial ? myFinancial.net : myNet ? myNet.balance : 0;

  // Active traveler's outgoing settlements (viewer owes money)
  const myDebts = transactions.filter((t) => t.fromId === activeTravelerId);
  // Active traveler's incoming settlements (someone owes viewer)
  const myCredits = transactions.filter((t) => t.toId === activeTravelerId);

  // Primary transaction to display on the tile
  const primaryTx = myDebts[0] || myCredits[0] || transactions[0];

  const isDebtor = myBalance < -0.01;
  const isCreditor = myBalance > 0.01;
  const isAllSquare = Math.abs(myBalance) <= 0.01;

  const perHeadCost = travelers.length > 0 ? Math.round(totalTripCost / travelers.length) : 0;
  const overBudgetMembers = financials.filter((f) => f.isOverBudget);

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
    const text = `Hey ${tx.fromName}! Reminder for WanderLedger group settlement: Please pay ₹${tx.amount.toLocaleString(
      "en-IN"
    )} to ${tx.toName} via UPI: ${tx.toUpiId}.`;
    const waUrl = `https://wa.me/?text=${encodeURIComponent(text)}`;
    window.open(waUrl, "_blank", "noopener,noreferrer");
  };

  const handleCopyWhatsAppSummary = () => {
    const summary = generateOfficialWhatsAppSummary({
      totalTripCost,
      perHeadCost,
      financials,
      transactions,
    });
    navigator.clipboard.writeText(summary);
    fireConfetti();
    if (onToast) onToast("Settlement WhatsApp Summary copied to clipboard!");
  };

  return (
    <>
      {/* 1-Col Settle Bento Tile */}
      <div className="relative overflow-hidden bg-white text-[#173842] rounded-3xl p-6 shadow-bento border border-[#E6D090] col-span-1 flex flex-col justify-between transition-all duration-300 hover:shadow-bento-hover group">
        {/* Top Header */}
        <div className="flex items-start justify-between">
          <div className="flex items-center gap-2">
            <div className="w-10 h-10 rounded-2xl bg-[#FFEBAF] text-[#173842] flex items-center justify-center font-bold shadow-sm">
              <ArrowRightLeft className="w-5 h-5 text-[#2D6B78]" />
            </div>
            <div>
              <span className="text-[10px] font-bold text-[#4C9DB0] uppercase tracking-wider block">
                Debt Minimizer &amp; Hub
              </span>
              <span className="text-xs font-semibold text-[#173842]">
                Pairwise Settlement
              </span>
            </div>
          </div>

          <Link
            href={`/t/${tripSlug}/settle`}
            className="text-[11px] font-bold text-[#2D6B78] hover:text-[#173842] flex items-center gap-0.5 cursor-pointer underline"
            title="Open Full Balance Matrix & Settlement Hub"
          >
            Full Matrix
            <ArrowRight className="w-3.5 h-3.5" />
          </Link>
        </div>

        {/* Per-Member Budget Status Notice */}
        {myFinancial && (
          <div className="mt-3">
            {myFinancial.isOverBudget ? (
              <div className="p-2.5 rounded-2xl bg-[#FFE4E1] border-2 border-rose-400 text-rose-950 flex items-center justify-between text-xs font-black shadow-sm">
                <span className="flex items-center gap-1.5" suppressHydrationWarning>
                  <AlertTriangle className="w-4 h-4 text-rose-600 shrink-0 stroke-[2.5]" />
                  ⚠️ Exceeded Budget by ₹{Math.round(myFinancial.overBudgetAmount).toLocaleString("en-IN")}
                </span>
                <span className="text-[10px] px-2 py-0.5 rounded-full bg-rose-600 text-white font-bold">
                  Alert
                </span>
              </div>
            ) : (
              <div className="p-2 rounded-2xl bg-gray-50 border border-gray-100 flex items-center justify-between text-[11px]">
                <span suppressHydrationWarning className="text-gray-600 font-medium">
                  Budget Still Left:{" "}
                  <strong className="text-[#173842]">
                    ₹{Math.round(myFinancial.remainingBalance).toLocaleString("en-IN")}
                  </strong>
                </span>
                <span className="text-[10px] text-[#2D6B78] font-bold">
                  {myFinancial.startingBudget > 0
                    ? Math.round((myFinancial.actualShare / myFinancial.startingBudget) * 100)
                    : 0}
                  % spent
                </span>
              </div>
            )}
          </div>
        )}

        {/* Dynamic Status Based on Active Viewer Position */}
        <div className="my-2.5 space-y-1">
          {isDebtor ? (
            <div>
              <div className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full bg-rose-100 text-rose-800 text-[10px] font-bold border border-rose-300">
                🔴 Needs to Pay ₹{Math.round(Math.abs(myBalance)).toLocaleString("en-IN")}
              </div>
              <div className="flex items-baseline gap-2 mt-1">
                <span
                  suppressHydrationWarning
                  className="text-2xl sm:text-3xl font-extrabold text-[#173842]"
                >
                  ₹{Math.round(Math.abs(myBalance)).toLocaleString("en-IN")}
                </span>
                <span className="text-xs text-gray-500 font-medium">net payable</span>
              </div>
              {primaryTx && (
                <p suppressHydrationWarning className="text-xs text-gray-600 truncate mt-0.5">
                  Instruction: Pay to{" "}
                  <strong className="text-[#173842]">{primaryTx.toName}</strong> (₹
                  {Math.round(primaryTx.amount).toLocaleString("en-IN")})
                </p>
              )}
            </div>
          ) : isCreditor ? (
            <div>
              <div className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full bg-emerald-100 text-emerald-800 text-[10px] font-bold border border-emerald-300">
                🟢 Will Receive ₹{Math.round(myBalance).toLocaleString("en-IN")}
              </div>
              <div className="flex items-baseline gap-2 mt-1">
                <span
                  suppressHydrationWarning
                  className="text-2xl sm:text-3xl font-extrabold text-[#2D6B78]"
                >
                  +₹{Math.round(myBalance).toLocaleString("en-IN")}
                </span>
                <span className="text-xs text-gray-500 font-medium">to receive</span>
              </div>
              {primaryTx && (
                <p suppressHydrationWarning className="text-xs text-gray-600 truncate mt-0.5">
                  Instruction: From{" "}
                  <strong className="text-[#173842]">{primaryTx.fromName}</strong> (₹
                  {Math.round(primaryTx.amount).toLocaleString("en-IN")})
                </p>
              )}
            </div>
          ) : (
            <div>
              <div className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full bg-[#FFEBAF] text-[#173842] text-[10px] font-bold border border-[#E6D090]">
                ✨ All Square
              </div>
              <div
                suppressHydrationWarning
                className="text-xl sm:text-2xl font-extrabold text-[#173842]"
              >
                ₹0 Pending
              </div>
              <p className="text-xs text-gray-500">
                Zero net dues. All group splits balanced out.
              </p>
            </div>
          )}
        </div>

        {/* Role-Locked UPI Trigger & Actions */}
        <div className="pt-2 border-t border-gray-100 space-y-2">
          {isDebtor && primaryTx ? (
            <div className="flex gap-2">
              <button
                type="button"
                onClick={() => handleTriggerUpi(primaryTx)}
                className="w-full py-2.5 px-3 rounded-2xl bg-[#4C9DB0] hover:bg-[#3D8798] text-white font-extrabold text-xs shadow-md active:scale-95 transition-all flex items-center justify-center gap-1.5 cursor-pointer"
                title="Trigger direct UPI payment app"
              >
                <Unlock className="w-3.5 h-3.5 text-[#FFEBAF]" />
                <span>Pay via UPI (Role-Unlocked)</span>
              </button>
              <button
                type="button"
                onClick={() => setSelectedTx(primaryTx)}
                className="p-2.5 rounded-2xl bg-gray-100 hover:bg-[#FFEBAF] text-[#173842] transition-colors"
                title="View QR & UPI details"
              >
                <QrCode className="w-4 h-4" />
              </button>
            </div>
          ) : isCreditor && primaryTx ? (
            <div className="flex gap-2">
              <button
                type="button"
                disabled
                className="w-2/3 py-2.5 px-3 rounded-2xl bg-gray-100 text-gray-400 font-semibold text-xs border border-gray-200 flex items-center justify-center gap-1.5 cursor-not-allowed"
                title="Only debtor can initiate UPI payment"
              >
                <Lock className="w-3.5 h-3.5 text-gray-400" />
                <span>Locked: {primaryTx.fromName.split(" ")[0]} Must Pay</span>
              </button>
              <button
                type="button"
                onClick={() => handleNudgeDebtor(primaryTx)}
                className="w-1/3 py-2.5 px-3 rounded-2xl bg-[#FFEBAF] hover:bg-[#FFF3D1] text-[#173842] font-bold text-xs flex items-center justify-center gap-1 cursor-pointer"
                title="Send reminder to debtor on WhatsApp"
              >
                <Send className="w-3.5 h-3.5 text-[#2D6B78]" />
                <span>Ping</span>
              </button>
            </div>
          ) : (
            <Link
              href={`/t/${tripSlug}/settle`}
              className="w-full py-2.5 px-3 rounded-2xl bg-gray-50 hover:bg-gray-100 text-[#173842] font-bold text-xs border border-gray-200 flex items-center justify-center gap-1.5 cursor-pointer"
            >
              <span>View Full Settlement Hub &amp; Matrix</span>
              <ArrowRight className="w-3.5 h-3.5 text-[#4C9DB0]" />
            </Link>
          )}

          {/* WhatsApp Export Quick Button */}
          <button
            type="button"
            onClick={handleCopyWhatsAppSummary}
            className="w-full py-2 px-3 rounded-2xl bg-[#FFEBAF]/50 hover:bg-[#FFEBAF] border border-[#E6D090] text-[#173842] font-bold text-[11px] flex items-center justify-center gap-1.5 transition-colors cursor-pointer"
          >
            <Share2 className="w-3 h-3 text-[#2D6B78]" />
            <span>Copy WhatsApp Summary</span>
          </button>
        </div>
      </div>

      {/* QR & UPI Payment Modal */}
      {selectedTx && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-[#173842]/75 backdrop-blur-md animate-in fade-in duration-200">
          <div className="bg-white rounded-3xl max-w-sm w-full p-6 shadow-2xl border-2 border-[#E6D090] text-[#173842] relative animate-in zoom-in-95 duration-200">
            <div className="flex justify-between items-center pb-3 border-b border-[#FFEBAF]">
              <div className="flex items-center gap-2">
                <QrCode className="w-5 h-5 text-[#4C9DB0]" />
                <h3 className="font-extrabold text-base text-[#173842]">
                  UPI Instant Settlement
                </h3>
              </div>
              <button
                onClick={() => setSelectedTx(null)}
                className="w-8 h-8 rounded-full bg-gray-100 hover:bg-gray-200 flex items-center justify-center text-sm font-bold"
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
                  ₹{selectedTx.amount.toLocaleString("en-IN")}
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
                  <Copy className="w-3 h-3" />
                  <span>{copiedUpi ? "Copied!" : "Copy"}</span>
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

      {/* All Pairwise Settlements Modal */}
      {showAllSettlementsModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-[#173842]/70 backdrop-blur-md animate-in fade-in duration-200">
          <div className="bg-white rounded-3xl max-w-lg w-full max-h-[90vh] overflow-y-auto p-6 shadow-2xl border border-[#E6D090] text-[#173842] relative animate-in zoom-in-95 duration-200">
            <div className="flex justify-between items-center pb-3 border-b border-[#FFEBAF]">
              <div className="flex items-center gap-2">
                <ArrowRightLeft className="w-5 h-5 text-[#4C9DB0]" />
                <div>
                  <h3 className="text-base sm:text-lg font-extrabold text-[#173842]">
                    Optimal Cash Flow Settlement
                  </h3>
                  <p className="text-[11px] text-[#2D6B78] font-semibold">
                    Two-pointer greedy algorithm • Circular debts eliminated
                  </p>
                </div>
              </div>
              <button
                onClick={() => setShowAllSettlementsModal(false)}
                className="w-8 h-8 rounded-full bg-gray-100 hover:bg-gray-200 flex items-center justify-center text-sm font-bold"
              >
                ✕
              </button>
            </div>

            <div className="my-4 space-y-2.5">
              {transactions.length === 0 ? (
                <div className="p-8 text-center text-gray-400 space-y-1">
                  <Sparkles className="w-8 h-8 mx-auto text-[#FFEBAF]" />
                  <p className="text-xs font-semibold">All debts are settled! Ledger is balanced.</p>
                </div>
              ) : (
                transactions.map((tx) => {
                  const isViewerDebtor = tx.fromId === activeTravelerId;
                  const isViewerCreditor = tx.toId === activeTravelerId;

                  return (
                    <div
                      key={tx.id}
                      className={`p-3.5 rounded-2xl border transition-all ${
                        isViewerDebtor
                          ? "border-red-200 bg-red-50/50"
                          : isViewerCreditor
                          ? "border-emerald-200 bg-emerald-50/50"
                          : "border-gray-200 bg-gray-50"
                      }`}
                    >
                      <div className="flex items-center justify-between gap-3">
                        <div className="flex items-center gap-2 text-xs">
                          <span className="font-bold text-[#173842]">{tx.fromName}</span>
                          <span className="text-gray-400 font-bold">➔</span>
                          <span className="font-bold text-[#2D6B78]">{tx.toName}</span>
                        </div>
                        <div
                          suppressHydrationWarning
                          className="font-extrabold text-sm text-[#173842]"
                        >
                          ₹{tx.amount.toLocaleString("en-IN")}
                        </div>
                      </div>

                      <div className="mt-2 pt-2 border-t border-gray-200/50 flex items-center justify-between text-[11px]">
                        <span className="font-mono text-gray-500 text-[10px] truncate max-w-[150px]">
                          {tx.toUpiId}
                        </span>

                        <div className="flex gap-1.5">
                          {isViewerDebtor ? (
                            <button
                              onClick={() => {
                                setShowAllSettlementsModal(false);
                                setSelectedTx(tx);
                              }}
                              className="px-2.5 py-1 rounded-xl bg-[#4C9DB0] text-white font-bold text-[10px] flex items-center gap-1 shadow-sm"
                            >
                              <Unlock className="w-3 h-3 text-[#FFEBAF]" />
                              <span>Pay Now</span>
                            </button>
                          ) : (
                            <button
                              onClick={() => handleNudgeDebtor(tx)}
                              className="px-2.5 py-1 rounded-xl bg-gray-100 hover:bg-[#FFEBAF] text-[#173842] font-semibold text-[10px] flex items-center gap-1"
                            >
                              <Send className="w-3 h-3 text-[#2D6B78]" />
                              <span>Remind</span>
                            </button>
                          )}

                          <button
                            onClick={() => {
                              onCompleteSettlement(tx);
                              fireDoubleConfetti();
                            }}
                            className="px-2.5 py-1 rounded-xl bg-[#FFEBAF] text-[#173842] font-bold text-[10px]"
                          >
                            Mark Paid
                          </button>
                        </div>
                      </div>
                    </div>
                  );
                })
              )}
            </div>

            <div className="pt-2 flex justify-between items-center border-t border-gray-100">
              <Link
                href={`/t/${tripSlug}/settle`}
                className="text-xs font-bold text-[#2D6B78] hover:underline flex items-center gap-1"
              >
                <span>Open Full Hub Matrix</span>
                <ArrowRight className="w-3.5 h-3.5" />
              </Link>
              <button
                onClick={() => setShowAllSettlementsModal(false)}
                className="px-4 py-2 rounded-2xl bg-gray-100 text-xs font-bold text-gray-700"
              >
                Close
              </button>
            </div>
          </div>
        </div>
      )}
    </>
  );
};
