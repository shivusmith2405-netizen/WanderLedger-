"use client";

import React, { useState } from "react";
import {
  Wallet,
  Users,
  TrendingDown,
  TrendingUp,
  Share2,
  Copy,
  Check,
  AlertTriangle,
  Sparkles,
} from "lucide-react";
import { MemberFinancials, SettlementTransaction, generateOfficialWhatsAppSummary } from "@/lib/algorithms/debtMinimizer";
import { fireConfetti } from "@/lib/utils/confetti";

interface TripCostSummaryProps {
  totalTripCost: number;
  totalInitialBudget: number;
  memberCount: number;
  financials: MemberFinancials[];
  transactions: SettlementTransaction[];
  onToast?: (msg: string) => void;
}

export const TripCostSummary: React.FC<TripCostSummaryProps> = ({
  totalTripCost,
  totalInitialBudget,
  memberCount,
  financials,
  transactions,
  onToast,
}) => {
  const [copied, setCopied] = useState(false);

  const perHeadCost = memberCount > 0 ? Math.round(totalTripCost / memberCount) : 0;
  const budgetDifference = totalInitialBudget - totalTripCost;
  const isOverallOverBudget = budgetDifference < 0;
  const budgetSpentPercent =
    totalInitialBudget > 0
      ? Math.min(100, Math.round((totalTripCost / totalInitialBudget) * 100))
      : 0;

  const handleCopyWhatsApp = () => {
    const text = generateOfficialWhatsAppSummary({
      totalTripCost,
      perHeadCost,
      financials,
      transactions,
    });

    navigator.clipboard.writeText(text);
    setCopied(true);
    fireConfetti();
    if (onToast) {
      onToast("WhatsApp Summary copied! Ready to paste into group chat.");
    }
    setTimeout(() => setCopied(false), 2500);
  };

  return (
    <div className="bg-white rounded-3xl p-6 sm:p-7 shadow-bento border border-[#E6D090] text-[#173842]">
      {/* Top Header Row with WhatsApp Button */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-5 border-b border-gray-100">
        <div>
          <span className="text-[10px] font-black uppercase tracking-wider text-[#4C9DB0] block mb-1">
            Trip Financial Overview
          </span>
          <h2 className="text-xl sm:text-2xl font-black text-[#173842] tracking-tight">
            Trip Summary &amp; Per-Head Cost
          </h2>
        </div>

        <button
          type="button"
          onClick={handleCopyWhatsApp}
          className="flex items-center justify-center gap-2 px-4 py-2.5 rounded-2xl bg-[#173842] hover:bg-[#235560] text-[#FFEBAF] font-bold text-xs sm:text-sm shadow-md active:scale-95 transition-all cursor-pointer shrink-0"
          title="1-tap Copy WhatsApp Summary"
        >
          {copied ? (
            <>
              <Check className="w-4 h-4 text-[#FFEBAF]" />
              <span>Copied WhatsApp Summary!</span>
            </>
          ) : (
            <>
              <Share2 className="w-4 h-4 text-[#FFEBAF]" />
              <span>Copy WhatsApp Summary</span>
            </>
          )}
        </button>
      </div>

      {/* Metrics Row */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 mt-5">
        {/* Metric 1: Total Trip Cost */}
        <div className="bg-[#4C9DB0]/10 border border-[#4C9DB0]/30 rounded-2xl p-4 flex flex-col justify-between">
          <div className="flex items-center justify-between mb-2">
            <span className="text-xs font-bold uppercase tracking-wider text-[#2D6B78]">
              Total Trip Cost
            </span>
            <div className="w-8 h-8 rounded-xl bg-[#4C9DB0] text-white flex items-center justify-center shadow-sm">
              <Wallet className="w-4 h-4" />
            </div>
          </div>
          <div>
            <div
              suppressHydrationWarning
              className="text-2xl sm:text-3xl font-black text-[#173842]"
            >
              ₹{totalTripCost.toLocaleString("en-IN")}
            </div>
            <span className="text-[11px] text-[#4F7682] font-medium">
              Sum of all group expenditures
            </span>
          </div>
        </div>

        {/* Metric 2: Per-Head Cost */}
        <div className="bg-[#FFEBAF]/40 border border-[#E6D090] rounded-2xl p-4 flex flex-col justify-between">
          <div className="flex items-center justify-between mb-2">
            <span className="text-xs font-bold uppercase tracking-wider text-[#173842]">
              Cost Per Head
            </span>
            <div className="w-8 h-8 rounded-xl bg-[#173842] text-[#FFEBAF] flex items-center justify-center shadow-sm">
              <Users className="w-4 h-4" />
            </div>
          </div>
          <div>
            <div
              suppressHydrationWarning
              className="text-2xl sm:text-3xl font-black text-[#173842]"
            >
              ₹{perHeadCost.toLocaleString("en-IN")}
            </div>
            <span className="text-[11px] text-[#4F7682] font-medium">
              Split across {memberCount} active travelers
            </span>
          </div>
        </div>

        {/* Metric 3: Total Budget vs Spent */}
        <div
          className={`rounded-2xl p-4 border flex flex-col justify-between ${
            isOverallOverBudget
              ? "bg-red-50/80 border-red-200"
              : "bg-emerald-50/80 border-emerald-200"
          }`}
        >
          <div className="flex items-center justify-between mb-2">
            <span
              className={`text-xs font-bold uppercase tracking-wider ${
                isOverallOverBudget ? "text-red-800" : "text-emerald-800"
              }`}
            >
              Budget vs Spent
            </span>
            <div
              className={`w-8 h-8 rounded-xl flex items-center justify-center shadow-sm ${
                isOverallOverBudget
                  ? "bg-red-600 text-white"
                  : "bg-emerald-600 text-white"
              }`}
            >
              {isOverallOverBudget ? (
                <AlertTriangle className="w-4 h-4" />
              ) : (
                <TrendingDown className="w-4 h-4" />
              )}
            </div>
          </div>
          <div>
            <div
              suppressHydrationWarning
              className={`text-xl sm:text-2xl font-black ${
                isOverallOverBudget ? "text-red-700" : "text-emerald-800"
              }`}
            >
              {isOverallOverBudget
                ? `Deficit: ₹${Math.abs(budgetDifference).toLocaleString("en-IN")}`
                : `Surplus: ₹${budgetDifference.toLocaleString("en-IN")}`}
            </div>
            <span className="text-[11px] text-gray-500 font-medium">
              Budget: ₹{totalInitialBudget.toLocaleString("en-IN")} ({budgetSpentPercent}% used)
            </span>
          </div>
        </div>
      </div>

      {/* Progress Bar */}
      <div className="mt-4 pt-4 border-t border-gray-100 space-y-2">
        <div className="flex justify-between items-center text-xs font-semibold text-gray-600">
          <span>Escrow Consumption</span>
          <span suppressHydrationWarning>
            {budgetSpentPercent}% Spent ({isOverallOverBudget ? "Over Budget" : "Within Budget"})
          </span>
        </div>
        <div className="h-3 w-full bg-gray-100 rounded-full overflow-hidden p-0.5 border border-gray-200 shadow-inner">
          <div
            className={`h-full rounded-full transition-all duration-700 ease-out ${
              isOverallOverBudget
                ? "bg-gradient-to-r from-red-500 to-rose-600"
                : "bg-gradient-to-r from-[#4C9DB0] to-[#2D6B78]"
            }`}
            style={{ width: `${Math.min(100, budgetSpentPercent)}%` }}
          />
        </div>
      </div>
    </div>
  );
};
