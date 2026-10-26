"use client";

import React, { useState, useEffect, useMemo } from "react";
import Link from "next/link";
import {
  fetchLiveTripBySlug,
  createLiveExpense,
  subscribeToTripTables,
  computeLiveFinancials,
  LiveTripRecord,
  TripMemberRecord,
  ExpenseRecord,
  ItineraryPlaceRecord,
} from "@/lib/supabase/tripService";
import {
  minimizeCashFlow,
  generateOfficialWhatsAppSummary,
  SettlementTransaction,
  Traveler,
  Expense,
  MemberFinancials,
} from "@/lib/algorithms/debtMinimizer";
import { BudgetTile } from "@/components/bento/BudgetTile";
import { CameraSnapTile } from "@/components/bento/CameraSnapTile";
import { PollTile } from "@/components/bento/PollTile";
import { FeedTile } from "@/components/bento/FeedTile";
import { NextStopTile } from "@/components/bento/NextStopTile";
import { SettleTile } from "@/components/bento/SettleTile";
import { fireConfetti } from "@/lib/utils/confetti";
import {
  Compass,
  Share2,
  Copy,
  Check,
  Sparkles,
  Shield,
  ArrowRightLeft,
  Navigation,
  Vote,
  ExternalLink,
  Plus,
} from "lucide-react";

interface TripCockpitProps {
  slug: string;
}

export const TripCockpit: React.FC<TripCockpitProps> = ({ slug }) => {
  const [mounted, setMounted] = useState(false);
  const [loading, setLoading] = useState(true);
  const [trip, setTrip] = useState<LiveTripRecord | null>(null);
  const [activeMemberId, setActiveMemberId] = useState<string>("");
  const [copiedLink, setCopiedLink] = useState(false);
  const [toastMessage, setToastMessage] = useState<string | null>(null);

  const showToast = (msg: string) => {
    setToastMessage(msg);
    setTimeout(() => setToastMessage(null), 3000);
  };

  const loadTrip = async () => {
    try {
      const data = await fetchLiveTripBySlug(slug);
      if (data) {
        setTrip(data);
        // Load active persona from localStorage
        const storedMember = localStorage.getItem(`wanderledger_active_member_${slug}`);
        if (storedMember && data.members.some((m) => m.id === storedMember)) {
          setActiveMemberId(storedMember);
        } else if (data.members.length > 0) {
          setActiveMemberId(data.members[0].id);
          localStorage.setItem(`wanderledger_active_member_${slug}`, data.members[0].id);
        }
      }
    } catch (err) {
      console.error("Failed to load trip:", err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    setMounted(true);
    loadTrip();
  }, [slug]);

  // Realtime Postgres subscription
  useEffect(() => {
    if (!trip?.id) return;
    const unsubscribe = subscribeToTripTables(trip.id, () => {
      loadTrip();
    });
    return () => unsubscribe();
  }, [trip?.id]);

  const handleSelectPersona = (memberId: string) => {
    setActiveMemberId(memberId);
    localStorage.setItem(`wanderledger_active_member_${slug}`, memberId);
    const m = trip?.members.find((mem) => mem.id === memberId);
    showToast(`Viewing as ${m?.name || "Traveler"}`);
  };

  const handleCopyShareableLink = () => {
    if (typeof window === "undefined") return;
    const url = window.location.href;
    navigator.clipboard.writeText(url);
    setCopiedLink(true);
    fireConfetti();
    showToast("Shareable link copied to clipboard!");
    setTimeout(() => setCopiedLink(false), 2500);
  };

  // Convert live members to Traveler interface for existing bento components
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

  // Convert live expenses to Expense interface
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
      location: trip.destination,
    }));
  }, [trip?.expenses, trip?.destination]);

  // Convert live places to ItineraryStop interface
  const itineraryStops = useMemo(() => {
    if (!trip?.places || trip.places.length === 0) {
      return [
        {
          id: "stop-initial",
          title: `Arrival & Meetup in ${trip?.destination || "Town"}`,
          locationName: trip?.destination || "Scenic Point",
          mapsQuery: trip?.destination || "Destination",
          eta: "12:00 PM",
          status: "active" as const,
          category: "stay" as const,
          distanceKm: 0,
        },
      ];
    }
    return trip.places.map((p, idx) => ({
      id: p.id,
      title: p.place_name,
      locationName: p.place_name,
      mapsQuery: p.place_name,
      eta: p.time_label || `Stop ${idx + 1}`,
      status: (idx === 0 ? "active" : "upcoming") as "active" | "upcoming",
      category: "scenic" as const,
      notes: p.notes || undefined,
      distanceKm: (idx + 1) * 3.5,
    }));
  }, [trip?.places, trip?.destination]);

  // Compute live member financials
  const liveFinancialsMap = useMemo(() => {
    if (!trip?.members) return new Map();
    return computeLiveFinancials(trip.members, trip.expenses || []);
  }, [trip?.members, trip?.expenses]);

  const memberFinancialsForSettle: MemberFinancials[] = useMemo(() => {
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

  // Derive optimal pairwise settlement transactions
  const settlementTransactions: SettlementTransaction[] = useMemo(() => {
    if (!travelers.length) return [];
    const mapForMinimizer = new Map<string, MemberFinancials>();
    for (const fin of memberFinancialsForSettle) {
      mapForMinimizer.set(fin.travelerId, fin);
    }
    return minimizeCashFlow(travelers, mapForMinimizer, slug);
  }, [travelers, memberFinancialsForSettle, slug]);

  const totalSpent = useMemo(() => {
    return (trip?.expenses || []).reduce((sum, e) => sum + e.amount, 0);
  }, [trip?.expenses]);

  const totalPledged = useMemo(() => {
    return (trip?.members || []).reduce((sum, m) => sum + m.initial_budget, 0);
  }, [trip?.members]);

  // Handle adding expense directly to Supabase
  const handleAddExpense = async (expenseData: Omit<Expense, "id">) => {
    if (!trip?.id) return;
    try {
      await createLiveExpense({
        tripId: trip.id,
        payerId: expenseData.paidById,
        title: expenseData.title,
        amount: expenseData.amount,
        splitMemberIds: expenseData.splitAmongIds,
        receiptUrl: expenseData.receiptUrl,
      });
      showToast(`Added ₹${Math.round(expenseData.amount).toLocaleString("en-IN")} for ${expenseData.title}! 🧾`);
      await loadTrip();
    } catch (err: any) {
      console.error(err);
      showToast(err.message || "Failed to log expense");
    }
  };

  const activeTraveler = travelers.find((t) => t.id === activeMemberId) || travelers[0];

  if (!mounted || loading) {
    return (
      <div
        suppressHydrationWarning
        className="min-h-screen bg-[#FFEBAF] flex flex-col items-center justify-center p-6 text-[#173842]"
      >
        <div className="w-12 h-12 rounded-2xl bg-[#4C9DB0] flex items-center justify-center animate-bounce shadow-lg">
          <span className="text-xl">✈️</span>
        </div>
        <p className="mt-4 font-black text-sm tracking-wide">
          Connecting to Supabase Database...
        </p>
      </div>
    );
  }

  if (!trip) {
    return (
      <div className="min-h-screen bg-[#FFEBAF] flex flex-col items-center justify-center p-6 text-[#173842] text-center">
        <div className="w-16 h-16 rounded-3xl bg-white border-2 border-[#E6D090] flex items-center justify-center mx-auto text-3xl shadow-md mb-4">
          🏖️
        </div>
        <h2 className="text-2xl font-black text-[#173842]">Trip Not Found</h2>
        <p className="text-xs text-gray-600 max-w-sm mt-1 mb-5">
          No trip found with slug <strong className="font-mono">/t/{slug}</strong> in Supabase.
        </p>
        <Link
          href="/"
          className="px-5 py-3 rounded-2xl bg-[#173842] text-[#FFEBAF] font-bold text-xs shadow-md"
        >
          Create This Trip Now →
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
        <div className="fixed top-4 left-1/2 -translate-x-1/2 z-50 px-4 py-2 rounded-full bg-[#173842] text-[#FFEBAF] font-bold text-xs shadow-2xl border border-[#E6D090] animate-in fade-in slide-in-from-top-4 flex items-center gap-2">
          <Sparkles className="w-3.5 h-3.5 text-[#FFEBAF]" />
          <span>{toastMessage}</span>
        </div>
      )}

      {/* Sticky Header with Navigation & Persona Pill */}
      <header className="sticky top-0 z-40 bg-[#FFEBAF]/90 backdrop-blur-md border-b border-[#E6D090]/80 px-4 sm:px-6 py-3 transition-all">
        <div className="max-w-5xl mx-auto flex flex-col sm:flex-row sm:items-center justify-between gap-3">
          <div className="flex items-center gap-2.5">
            <Link
              href="/"
              className="w-10 h-10 rounded-2xl bg-[#4C9DB0] text-white flex items-center justify-center font-black shadow-md border border-[#2D6B78]/30 hover:scale-105 transition-transform"
              title="WanderLedger Home"
            >
              <Compass className="w-5 h-5 stroke-[2.5]" />
            </Link>
            <div>
              <h1 className="text-base sm:text-lg font-black text-[#173842] tracking-tight leading-none">
                {trip.title}
              </h1>
              <p className="text-[11px] font-semibold text-[#4F7682] truncate max-w-xs mt-0.5">
                {trip.destination} • /t/{trip.slug}
              </p>
            </div>
          </div>

          {/* Nav Links, Share Link & Active Persona Selector */}
          <div className="flex items-center gap-2 overflow-x-auto no-scrollbar py-0.5">
            <Link
              href={`/t/${slug}/plan`}
              className="px-3 py-1.5 rounded-xl bg-white/80 hover:bg-white text-[#173842] text-xs font-bold border border-[#E6D090] shadow-xs flex items-center gap-1.5 transition-all cursor-pointer shrink-0"
              title="View & Add Places"
            >
              <Navigation className="w-3.5 h-3.5 text-[#4C9DB0]" />
              <span className="hidden sm:inline">Places</span>
            </Link>

            <Link
              href={`/t/${slug}/vote`}
              className="px-3 py-1.5 rounded-xl bg-white/80 hover:bg-white text-[#173842] text-xs font-bold border border-[#E6D090] shadow-xs flex items-center gap-1.5 transition-all cursor-pointer shrink-0"
              title="Blind Consensus Polls"
            >
              <Vote className="w-3.5 h-3.5 text-[#4C9DB0]" />
              <span className="hidden sm:inline">Polls</span>
            </Link>

            <Link
              href={`/t/${slug}/settle`}
              className="px-3 py-1.5 rounded-xl bg-white/80 hover:bg-white text-[#173842] text-xs font-bold border border-[#E6D090] shadow-xs flex items-center gap-1.5 transition-all cursor-pointer shrink-0"
              title="Settlement Hub"
            >
              <ArrowRightLeft className="w-3.5 h-3.5 text-[#2D6B78]" />
              <span>Settle</span>
            </Link>

            {/* 1-Tap Copy Shareable Link */}
            <button
              type="button"
              onClick={handleCopyShareableLink}
              className="p-1.5 rounded-xl bg-white/80 hover:bg-white text-[#173842] border border-[#E6D090] shadow-xs transition-colors cursor-pointer shrink-0"
              title="Copy shareable link"
            >
              {copiedLink ? <Check className="w-4 h-4 text-emerald-600" /> : <Share2 className="w-4 h-4" />}
            </button>

            {/* Persona Dropdown/Pill */}
            <div className="flex items-center gap-1 bg-white/80 p-1 rounded-2xl border border-[#E6D090] shadow-xs shrink-0">
              <span className="text-[10px] font-extrabold uppercase text-[#4F7682] px-1.5 hidden md:inline">
                Viewing As:
              </span>
              {travelers.map((t) => {
                const isActive = t.id === activeMemberId;
                return (
                  <button
                    key={t.id}
                    onClick={() => handleSelectPersona(t.id)}
                    className={`flex items-center gap-1 px-2.5 py-1 rounded-xl text-xs font-bold transition-all cursor-pointer ${
                      isActive
                        ? "bg-[#173842] text-[#FFEBAF] shadow-xs scale-102"
                        : "text-[#173842] hover:bg-[#FFEBAF]/60"
                    }`}
                  >
                    <span>{t.avatar}</span>
                    <span className="truncate max-w-[75px]">{t.name.split(" ")[0]}</span>
                  </button>
                );
              })}
            </div>
          </div>
        </div>
      </header>

      {/* Main Cockpit Bento Grid */}
      <main className="max-w-5xl mx-auto px-4 sm:px-6 pt-5 sm:pt-6 space-y-6">
        {/* Active Viewer Persona Indicator Banner */}
        <div className="px-4 py-2 rounded-2xl bg-white/70 backdrop-blur-sm border border-[#E6D090] flex items-center justify-between text-xs">
          <div className="flex items-center gap-2">
            <span className="text-xl">{activeTraveler?.avatar}</span>
            <div>
              <span className="text-gray-500 font-medium">Logged in persona: </span>
              <strong className="text-[#173842] font-black">{activeTraveler?.name}</strong>
              <span className="text-gray-400 text-[11px] ml-1.5 font-mono">
                ({activeTraveler?.upiId})
              </span>
            </div>
          </div>
          <span className="px-2.5 py-0.5 rounded-full bg-[#4C9DB0]/15 text-[#2D6B78] text-[10px] font-black border border-[#4C9DB0]/20">
            Zero-Login Active
          </span>
        </div>

        {/* Bento Grid */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-5 sm:gap-6">
          {/* Tile 1: Span-2 Hero Escrow Meter */}
          <BudgetTile
            totalPledged={totalPledged}
            totalSpent={totalSpent}
            travelers={travelers}
            onTopUpPledge={() => {}}
          />

          {/* Tile 2: 1-Col Camera Snap & Expense Addition Modal */}
          <CameraSnapTile
            travelers={travelers}
            activeTravelerId={activeMemberId}
            onAddExpense={handleAddExpense}
          />

          {/* Tile 3: 1-Col Next Waypoint with 1-Tap Google Maps */}
          <NextStopTile stops={itineraryStops} />

          {/* Tile 4: 1-Col Group Voting Preview Tile */}
          <div className="bg-white rounded-3xl p-6 shadow-bento border border-[#E6D090] flex flex-col justify-between col-span-1">
            <div className="flex items-start justify-between">
              <div className="flex items-center gap-2">
                <div className="w-10 h-10 rounded-2xl bg-[#4C9DB0] text-white flex items-center justify-center font-bold shadow-md">
                  <Vote className="w-5 h-5 stroke-[2.2]" />
                </div>
                <div>
                  <span className="text-[10px] font-bold text-[#4C9DB0] uppercase tracking-wider block">
                    Group Consensus
                  </span>
                  <span className="text-xs font-semibold text-[#173842]">Sealed Voting</span>
                </div>
              </div>

              <Link
                href={`/t/${slug}/vote`}
                className="text-[11px] font-bold text-[#2D6B78] hover:underline"
              >
                All Polls →
              </Link>
            </div>

            <div className="my-4 space-y-1">
              <h4 className="text-sm font-extrabold text-[#173842]">
                Dinner &amp; Activities Ballot
              </h4>
              <p className="text-xs text-gray-500">
                Options stay masked until all {travelers.length} friends vote.
              </p>
            </div>

            <Link
              href={`/t/${slug}/vote`}
              className="w-full py-2.5 px-3 rounded-2xl bg-[#173842] hover:bg-[#235560] text-[#FFEBAF] font-bold text-xs text-center shadow-md active:scale-95 transition-all"
            >
              Cast Ballot 🔒
            </Link>
          </div>

          {/* Tile 5: 1-Col Settle & Debt Minimizer Tile */}
          <SettleTile
            transactions={settlementTransactions}
            netBalances={new Map()}
            financials={memberFinancialsForSettle}
            activeTravelerId={activeMemberId}
            travelers={travelers}
            tripSlug={slug}
            totalTripCost={totalSpent}
            totalInitialBudget={totalPledged}
            onCompleteSettlement={() => {}}
            onToast={showToast}
          />

          {/* Tile 6: Span-2 or Col-3 Live Activity Feed */}
          <FeedTile
            expenses={expenses}
            travelers={travelers}
          />
        </div>
      </main>
    </div>
  );
};
