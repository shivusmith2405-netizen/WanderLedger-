"use client";

import React, { useState, useEffect, useMemo } from "react";
import Link from "next/link";
import {
  fetchLiveTripBySlug,
  subscribeToTripTables,
  computeLiveFinancials,
  LiveTripRecord,
} from "@/lib/supabase/tripService";
import {
  minimizeCashFlow,
  SettlementTransaction,
  Traveler,
  Expense,
  MemberFinancials,
} from "@/lib/algorithms/debtMinimizer";
import { TripCostSummary } from "@/components/settle/TripCostSummary";
import { MemberBalanceMatrix } from "@/components/settle/MemberBalanceMatrix";
import { fireDoubleConfetti } from "@/lib/utils/confetti";
import {
  Compass,
  ArrowLeft,
  Sparkles,
  Shield,
  AlertTriangle,
  Navigation,
  Vote,
} from "lucide-react";

interface SettleCockpitProps {
  slug: string;
}

export const SettleCockpit: React.FC<SettleCockpitProps> = ({ slug }) => {
  const [mounted, setMounted] = useState(false);
  const [loading, setLoading] = useState(true);
  const [trip, setTrip] = useState<LiveTripRecord | null>(null);
  const [activeMemberId, setActiveMemberId] = useState<string>("");
  const [toastMessage, setToastMessage] = useState<string | null>(null);

  const showToast = (msg: string) => {
    setToastMessage(msg);
    setTimeout(() => setToastMessage(null), 3000);
  };

  const loadData = async () => {
    try {
      const data = await fetchLiveTripBySlug(slug);
      if (data) {
        setTrip(data);
        const storedMember = localStorage.getItem(`wanderledger_active_member_${slug}`);
        if (storedMember && data.members.some((m) => m.id === storedMember)) {
          setActiveMemberId(storedMember);
        } else if (data.members.length > 0) {
          setActiveMemberId(data.members[0].id);
          localStorage.setItem(`wanderledger_active_member_${slug}`, data.members[0].id);
        }
      }
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    setMounted(true);
    loadData();
  }, [slug]);

  // Realtime subscription
  useEffect(() => {
    if (!trip?.id) return;
    const unsubscribe = subscribeToTripTables(trip.id, () => {
      loadData();
    });
    return () => unsubscribe();
  }, [trip?.id]);

  const handleSelectPersona = (memberId: string) => {
    setActiveMemberId(memberId);
    localStorage.setItem(`wanderledger_active_member_${slug}`, memberId);
    const m = trip?.members.find((mem) => mem.id === memberId);
    showToast(`Viewing settlements as ${m?.name || "Traveler"}`);
  };

  // Map to MemberFinancials format
  const liveFinancialsMap = useMemo(() => {
    if (!trip?.members) return new Map();
    return computeLiveFinancials(trip.members, trip.expenses || []);
  }, [trip?.members, trip?.expenses]);

  const financialsArray: MemberFinancials[] = useMemo(() => {
    const list: MemberFinancials[] = [];
    for (const [, fin] of liveFinancialsMap) {
      list.push({
        travelerId: fin.memberId,
        name: fin.name,
        avatar: fin.avatar,
        upiId: fin.upiId,
        startingBudget: fin.initialBudget,
        actualShare: fin.shareUsed,
        actualPaid: fin.paidOut,
        remainingBalance: fin.budgetLeft,
        isOverBudget: fin.isOverBudget,
        overBudgetAmount: fin.overBudgetAmount,
        net: fin.net,
      });
    }
    return list;
  }, [liveFinancialsMap]);

  // Map travelers
  const travelers: Traveler[] = useMemo(() => {
    if (!trip?.members) return [];
    return trip.members.map((m) => ({
      id: m.id,
      name: m.name,
      avatar: m.avatar,
      upiId: m.upi_id,
      pledgedAmount: m.initial_budget,
    }));
  }, [trip?.members]);

  // Map expenses for click-to-view bill history
  const expenses: Expense[] = useMemo(() => {
    if (!trip?.expenses) return [];
    return trip.expenses.map((e) => ({
      id: e.id,
      title: e.title,
      amount: e.amount,
      paidById: e.payer_id,
      splitAmongIds: e.splitMemberIds,
      category: "food" as const,
      timestamp: e.created_at,
      receiptUrl: e.receipt_url || undefined,
    }));
  }, [trip?.expenses]);

  // Derive optimal pairwise settlement transactions
  const settlementTransactions = useMemo(() => {
    if (!travelers.length) return [];
    const mapForMinimizer = new Map<string, MemberFinancials>();
    for (const fin of financialsArray) {
      mapForMinimizer.set(fin.travelerId, fin);
    }
    return minimizeCashFlow(travelers, mapForMinimizer, slug);
  }, [travelers, financialsArray, slug]);

  const totalTripCost = useMemo(() => {
    return (trip?.expenses || []).reduce((sum, e) => sum + e.amount, 0);
  }, [trip?.expenses]);

  const totalInitialBudget = useMemo(() => {
    return (trip?.members || []).reduce((sum, m) => sum + m.initial_budget, 0);
  }, [trip?.members]);

  const overBudgetMembers = useMemo(() => {
    return financialsArray.filter((m) => m.isOverBudget);
  }, [financialsArray]);

  const activeMember = trip?.members.find((m) => m.id === activeMemberId) || trip?.members[0];

  const handleCompleteSettlement = (tx: SettlementTransaction) => {
    showToast(`Settled ₹${Math.round(tx.amount).toLocaleString("en-IN")} between ${tx.fromName} and ${tx.toName}! 🎉`);
  };

  if (!mounted || loading) {
    return (
      <div
        suppressHydrationWarning
        className="min-h-screen bg-[#FFEBAF] flex flex-col items-center justify-center p-6 text-[#173842]"
      >
        <div className="w-12 h-12 rounded-2xl bg-[#4C9DB0] flex items-center justify-center animate-bounce shadow-lg">
          <span className="text-xl">💳</span>
        </div>
        <p className="mt-4 font-black text-sm tracking-wide">
          Syncing Settlements &amp; Balances...
        </p>
      </div>
    );
  }

  if (!trip) {
    return (
      <div className="min-h-screen bg-[#FFEBAF] flex flex-col items-center justify-center p-6 text-[#173842] text-center">
        <h2 className="text-xl font-black">Trip Not Found</h2>
        <Link href="/" className="mt-4 px-4 py-2 rounded-xl bg-[#173842] text-[#FFEBAF] text-xs font-bold">
          Go Home
        </Link>
      </div>
    );
  }

  return (
    <div
      suppressHydrationWarning
      className="min-h-screen bg-[#FFEBAF] text-[#173842] selection:bg-[#4C9DB0]/20 selection:text-[#173842] pb-16"
    >
      {/* Toast Notification */}
      {toastMessage && (
        <div className="fixed top-4 left-1/2 -translate-x-1/2 z-50 px-4 py-2.5 rounded-full bg-[#173842] text-[#FFEBAF] font-bold text-xs sm:text-sm shadow-2xl border border-[#E6D090] animate-in fade-in slide-in-from-top-4 flex items-center gap-2">
          <Sparkles className="w-4 h-4 text-[#FFEBAF]" />
          <span>{toastMessage}</span>
        </div>
      )}

      {/* Top Header */}
      <header className="sticky top-0 z-40 bg-[#FFEBAF]/90 backdrop-blur-md border-b border-[#E6D090]/80 px-4 sm:px-6 py-3 transition-all">
        <div className="max-w-5xl mx-auto flex flex-col sm:flex-row sm:items-center justify-between gap-3">
          <div className="flex items-center gap-3">
            <Link
              href={`/t/${slug}`}
              className="p-2.5 rounded-2xl bg-white/80 hover:bg-white text-[#173842] border border-[#E6D090] shadow-sm flex items-center justify-center transition-all cursor-pointer"
              title="Return to Cockpit"
            >
              <ArrowLeft className="w-4 h-4" />
            </Link>

            <div className="flex items-center gap-2.5">
              <div className="w-10 h-10 rounded-2xl bg-[#4C9DB0] text-white flex items-center justify-center font-black shadow-md border border-[#2D6B78]/30">
                <Compass className="w-5 h-5 stroke-[2.5]" />
              </div>
              <div>
                <h1 className="text-base sm:text-lg font-black text-[#173842] tracking-tight">
                  Settlement &amp; Balance Hub
                </h1>
                <p className="text-[11px] font-semibold text-[#4F7682] truncate max-w-xs">
                  {trip.title} • /t/{trip.slug}
                </p>
              </div>
            </div>
          </div>

          {/* Quick Nav & Persona Selector */}
          <div className="flex items-center gap-2 overflow-x-auto no-scrollbar py-0.5">
            <Link
              href={`/t/${slug}/plan`}
              className="px-3 py-1.5 rounded-xl bg-white/80 hover:bg-white text-[#173842] text-xs font-bold border border-[#E6D090] shadow-xs flex items-center gap-1.5 transition-all cursor-pointer shrink-0"
            >
              <Navigation className="w-3.5 h-3.5 text-[#4C9DB0]" />
              <span>Places</span>
            </Link>

            <Link
              href={`/t/${slug}/vote`}
              className="px-3 py-1.5 rounded-xl bg-white/80 hover:bg-white text-[#173842] text-xs font-bold border border-[#E6D090] shadow-xs flex items-center gap-1.5 transition-all cursor-pointer shrink-0"
            >
              <Vote className="w-3.5 h-3.5 text-[#4C9DB0]" />
              <span>Polls</span>
            </Link>

            {/* Persona Dropdown/Pill */}
            <div className="flex items-center gap-1 bg-white/80 p-1 rounded-2xl border border-[#E6D090] shadow-xs shrink-0">
              <span className="text-[10px] font-extrabold uppercase text-[#4F7682] px-1.5 hidden md:inline">
                Viewing As:
              </span>
              {trip.members.map((m) => {
                const isActive = m.id === activeMemberId;
                return (
                  <button
                    key={m.id}
                    onClick={() => handleSelectPersona(m.id)}
                    className={`flex items-center gap-1.5 px-2.5 py-1.5 rounded-xl text-xs font-bold transition-all cursor-pointer ${
                      isActive
                        ? "bg-[#173842] text-[#FFEBAF] shadow-xs scale-102"
                        : "text-[#173842] hover:bg-[#FFEBAF]/60"
                    }`}
                  >
                    <span>{m.avatar}</span>
                    <span className="truncate max-w-[80px]">{m.name.split(" ")[0]}</span>
                  </button>
                );
              })}
            </div>
          </div>
        </div>
      </header>

      {/* Main Content */}
      <main className="max-w-5xl mx-auto px-4 sm:px-6 pt-5 sm:pt-7 space-y-6">
        {/* Active Persona Banner */}
        <div
          suppressHydrationWarning
          className="px-4 py-2.5 rounded-2xl bg-white/70 backdrop-blur-sm border border-[#E6D090] flex items-center justify-between text-xs"
        >
          <div className="flex items-center gap-2">
            <span className="text-xl">{activeMember?.avatar}</span>
            <div>
              <span className="text-gray-500 font-medium">Viewing settlements as </span>
              <strong className="text-[#173842] font-black">{activeMember?.name}</strong>
              <span className="text-gray-400 text-[11px] ml-1.5 font-mono">
                ({activeMember?.upi_id})
              </span>
            </div>
          </div>
          <span className="px-2.5 py-0.5 rounded-full bg-[#4C9DB0]/15 text-[#2D6B78] text-[10px] font-black border border-[#4C9DB0]/20">
            Role-Lock Active
          </span>
        </div>

        {/* Over-Budget Alert Banner if any member exceeded starting budget */}
        {overBudgetMembers.length > 0 && (
          <div className="p-4 rounded-3xl bg-[#FFE4E1] border-2 border-rose-400 text-rose-950 shadow-md animate-pulse-glow flex items-start gap-3">
            <AlertTriangle className="w-6 h-6 text-rose-600 shrink-0 mt-0.5 stroke-[2.5]" />
            <div>
              <h4 className="font-extrabold text-sm sm:text-base tracking-tight">
                ⚠️ Over Budget Warning Notice
              </h4>
              <p className="text-xs text-rose-900 mt-0.5 font-medium leading-relaxed">
                {overBudgetMembers.map((m, i) => (
                  <span key={m.travelerId}>
                    <strong>{m.name}</strong> is over budget by{" "}
                    <strong>₹{Math.round(m.overBudgetAmount).toLocaleString("en-IN")}</strong>
                    {i < overBudgetMembers.length - 1 ? ", " : "."}
                  </span>
                ))}
              </p>
            </div>
          </div>
        )}

        {/* 1. Trip Cost & Per-Head Summary Card */}
        <TripCostSummary
          totalTripCost={totalTripCost}
          totalInitialBudget={totalInitialBudget}
          memberCount={trip.members.length}
          financials={financialsArray}
          transactions={settlementTransactions}
          onToast={showToast}
        />

        {/* 2. Member Balance Matrix & Final Settlement with Click-to-View Bill Ledger */}
        <MemberBalanceMatrix
          financials={financialsArray}
          transactions={settlementTransactions}
          activeTravelerId={activeMemberId}
          expenses={expenses}
          onCompleteSettlement={handleCompleteSettlement}
          onToast={showToast}
        />

        {/* Footer info */}
        <footer className="mt-8 text-center text-xs text-[#4F7682] space-y-1">
          <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-white/60 border border-[#E6D090]">
            <Shield className="w-3.5 h-3.5 text-[#2D6B78]" />
            <span>Optimal Pairwise Balance Calculation • NPCI UPI Intent Standard</span>
          </div>
        </footer>
      </main>
    </div>
  );
};
