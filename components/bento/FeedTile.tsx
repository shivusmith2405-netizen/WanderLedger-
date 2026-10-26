"use client";

import React, { useState, useEffect } from "react";
import { Receipt, Search, Filter, ZoomIn, X, Clock, MapPin, User, Check, Download } from "lucide-react";
import { Expense, Traveler } from "@/lib/algorithms/debtMinimizer";

interface FeedTileProps {
  expenses: Expense[];
  travelers: Traveler[];
}

export const FeedTile: React.FC<FeedTileProps> = ({ expenses, travelers }) => {
  const [mounted, setMounted] = useState(false);
  const [selectedReceipt, setSelectedReceipt] = useState<Expense | null>(null);
  const [activeCategory, setActiveCategory] = useState<string>("all");
  const [searchQuery, setSearchQuery] = useState<string>("");

  useEffect(() => {
    setMounted(true);
  }, []);

  const travelerMap = new Map<string, Traveler>(travelers.map((t) => [t.id, t]));

  const categoryIcons: Record<string, string> = {
    food: "🍔",
    cab: "🚕",
    fuel: "⛽",
    stay: "🏨",
    tickets: "🎟️",
    other: "✨",
  };

  const filteredExpenses = expenses
    .filter((exp) => (activeCategory === "all" ? true : exp.category === activeCategory))
    .filter(
      (exp) =>
        exp.title.toLowerCase().includes(searchQuery.toLowerCase()) ||
        (exp.location && exp.location.toLowerCase().includes(searchQuery.toLowerCase()))
    )
    .sort((a, b) => new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime());

  const totalFilteredAmount = filteredExpenses.reduce((sum, e) => sum + e.amount, 0);

  const formatTimestamp = (iso: string) => {
    try {
      const date = new Date(iso);
      if (!mounted) {
        // Safe deterministic format during initial render
        return date.toISOString().slice(5, 10);
      }
      return date.toLocaleDateString("en-US", {
        month: "short",
        day: "numeric",
        hour: "numeric",
        minute: "2-digit",
      });
    } catch {
      return iso;
    }
  };

  return (
    <>
      {/* Span-2 Bento Feed Tile */}
      <div className="relative bg-white text-[#173842] rounded-3xl p-6 shadow-bento border border-[#E6D090] col-span-1 md:col-span-2 flex flex-col justify-between transition-all duration-300 hover:shadow-bento-hover">
        {/* Header */}
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pb-4 border-b border-gray-100">
          <div>
            <div className="flex items-center gap-2">
              <div className="w-9 h-9 rounded-2xl bg-[#4C9DB0]/15 text-[#2D6B78] flex items-center justify-center font-bold">
                <Receipt className="w-5 h-5" />
              </div>
              <div>
                <h3 className="text-base sm:text-lg font-extrabold text-[#173842]">
                  Live Trip Expense Feed
                </h3>
                <span className="text-xs text-[#4F7682]">
                  {filteredExpenses.length} items logged • Total ₹{totalFilteredAmount.toLocaleString("en-IN")}
                </span>
              </div>
            </div>
          </div>

          {/* Search & Filter pills */}
          <div className="flex items-center gap-2">
            <div className="relative">
              <Search className="w-3.5 h-3.5 absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" />
              <input
                type="text"
                placeholder="Search bills..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="pl-8 pr-3 py-1.5 rounded-2xl bg-gray-50 border border-gray-200 text-xs text-[#173842] focus:outline-none focus:border-[#4C9DB0] w-32 sm:w-40"
              />
            </div>
          </div>
        </div>

        {/* Category Pills */}
        <div className="flex items-center gap-1.5 overflow-x-auto py-3 no-scrollbar text-xs">
          {["all", "food", "fuel", "stay", "tickets", "cab", "other"].map((cat) => (
            <button
              key={cat}
              onClick={() => setActiveCategory(cat)}
              className={`px-3 py-1.5 rounded-full capitalize whitespace-nowrap transition-all font-semibold cursor-pointer ${
                activeCategory === cat
                  ? "bg-[#173842] text-[#FFEBAF] shadow-sm"
                  : "bg-gray-100 hover:bg-gray-200 text-gray-600"
              }`}
            >
              {cat === "all" ? "All Receipts" : `${categoryIcons[cat] || "🏷️"} ${cat}`}
            </button>
          ))}
        </div>

        {/* Expenses List */}
        <div className="space-y-3 max-h-[380px] overflow-y-auto pr-1">
          {filteredExpenses.length === 0 ? (
            <div className="py-12 text-center text-gray-400 space-y-2">
              <Receipt className="w-10 h-10 mx-auto stroke-1" />
              <p className="text-xs font-medium">No expenses match this filter.</p>
            </div>
          ) : (
            filteredExpenses.map((expense) => {
              const payer = travelerMap.get(expense.paidById);
              const splitCount = expense.splitAmongIds?.length || travelers.length;
              const perPersonShare = Math.round(expense.amount / splitCount);

              return (
                <div
                  key={expense.id}
                  className="group relative flex items-center justify-between p-3.5 rounded-2xl bg-gray-50/70 hover:bg-[#FFEBAF]/20 border border-gray-100 hover:border-[#E6D090] transition-all"
                >
                  <div className="flex items-center gap-3 min-w-0 pr-3">
                    {/* Category Icon Badge */}
                    <div className="w-11 h-11 rounded-2xl bg-white border border-gray-200 flex items-center justify-center text-xl shrink-0 shadow-sm">
                      {categoryIcons[expense.category] || "🧾"}
                    </div>

                    <div className="min-w-0">
                      <h4 className="font-bold text-xs sm:text-sm text-[#173842] truncate">
                        {expense.title}
                      </h4>
                      <div className="flex flex-wrap items-center gap-x-2 gap-y-0.5 text-[11px] text-gray-500 mt-0.5">
                        <span className="flex items-center gap-1 font-medium text-[#2D6B78]">
                          <span>{payer?.avatar || "👤"}</span>
                          <span>Paid by {payer?.name?.split(" ")[0]}</span>
                        </span>
                        <span>•</span>
                        <span className="flex items-center gap-1" suppressHydrationWarning>
                          <Clock className="w-3 h-3 text-gray-400" />
                          <span suppressHydrationWarning>{formatTimestamp(expense.timestamp)}</span>
                        </span>
                        {expense.location && (
                          <>
                            <span>•</span>
                            <span className="truncate max-w-[120px]">{expense.location}</span>
                          </>
                        )}
                      </div>
                      <div className="mt-1">
                        <span className="inline-block px-2 py-0.5 rounded-full bg-[#4C9DB0]/10 text-[#2D6B78] text-[10px] font-bold">
                          Split {splitCount} ways (₹{perPersonShare}/ea)
                        </span>
                      </div>
                    </div>
                  </div>

                  {/* Right side: Amount & Receipt Thumbnail */}
                  <div className="flex items-center gap-3 shrink-0">
                    <div className="text-right">
                      <div className="text-sm sm:text-base font-extrabold text-[#173842]">
                        ₹{expense.amount.toLocaleString("en-IN")}
                      </div>
                      <div className="text-[10px] font-semibold text-gray-400 uppercase">
                        {expense.category}
                      </div>
                    </div>

                    {/* Receipt Thumbnail with Lightbox trigger */}
                    {expense.receiptUrl ? (
                      <button
                        type="button"
                        onClick={() => setSelectedReceipt(expense)}
                        className="relative w-12 h-12 rounded-2xl overflow-hidden border-2 border-white shadow-sm hover:border-[#4C9DB0] group/img shrink-0 cursor-pointer transition-all"
                        title="Click to view full-screen receipt"
                      >
                        {/* eslint-disable-next-line @next/next/no-img-element */}
                        <img
                          src={expense.receiptUrl}
                          alt="Receipt thumbnail"
                          className="w-full h-full object-cover group-hover/img:scale-110 transition-transform duration-300"
                        />
                        <div className="absolute inset-0 bg-black/30 opacity-0 group-hover/img:opacity-100 transition-opacity flex items-center justify-center">
                          <ZoomIn className="w-4 h-4 text-white" />
                        </div>
                      </button>
                    ) : (
                      <div className="w-12 h-12 rounded-2xl bg-gray-100 flex items-center justify-center text-gray-400 text-xs">
                        No snap
                      </div>
                    )}
                  </div>
                </div>
              );
            })
          )}
        </div>
      </div>

      {/* Full-Screen Receipt Lightbox Modal */}
      {selectedReceipt && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-6 bg-[#173842]/90 backdrop-blur-md animate-in fade-in duration-200"
          onClick={() => setSelectedReceipt(null)}
        >
          <div
            className="relative bg-white rounded-3xl max-w-2xl w-full overflow-hidden shadow-2xl border-2 border-[#E6D090] text-[#173842] animate-in zoom-in-95 duration-200"
            onClick={(e) => e.stopPropagation()}
          >
            {/* Lightbox Header */}
            <div className="flex items-center justify-between p-4 sm:p-5 border-b border-gray-100 bg-[#FFEBAF]/30">
              <div className="flex items-center gap-2.5">
                <div className="w-10 h-10 rounded-2xl bg-[#4C9DB0] text-white flex items-center justify-center shadow-sm text-lg">
                  {categoryIcons[selectedReceipt.category] || "🧾"}
                </div>
                <div>
                  <h3 className="font-extrabold text-base sm:text-lg text-[#173842]">
                    {selectedReceipt.title}
                  </h3>
                  <div className="flex items-center gap-2 text-xs text-[#2D6B78] font-semibold">
                    <span>₹{selectedReceipt.amount.toLocaleString("en-IN")}</span>
                    <span>•</span>
                    <span>Paid by {travelerMap.get(selectedReceipt.paidById)?.name}</span>
                  </div>
                </div>
              </div>

              <button
                onClick={() => setSelectedReceipt(null)}
                className="w-9 h-9 rounded-full bg-white hover:bg-gray-100 text-[#173842] shadow-sm flex items-center justify-center cursor-pointer font-bold"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            {/* Lightbox Image Preview with Watermark */}
            <div className="relative bg-neutral-900 flex items-center justify-center max-h-[60vh] overflow-hidden">
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img
                src={selectedReceipt.receiptUrl}
                alt={selectedReceipt.title}
                className="w-full h-auto max-h-[60vh] object-contain"
              />

              {/* Verified Auto-locked Watermark Stamp */}
              <div className="absolute bottom-3 left-3 px-3 py-1.5 rounded-xl bg-black/60 backdrop-blur-md text-white text-[10px] font-mono border border-white/20 flex items-center gap-2">
                <Clock className="w-3 h-3 text-[#FFEBAF]" />
                <span suppressHydrationWarning>
                  WanderLedger Verified • {new Date(selectedReceipt.timestamp).toLocaleString()}
                </span>
              </div>
            </div>

            {/* Lightbox Footer Details */}
            <div className="p-4 sm:p-5 space-y-3 bg-white">
              <div className="grid grid-cols-2 sm:grid-cols-3 gap-3 text-xs">
                <div className="p-2.5 rounded-xl bg-gray-50 border border-gray-100">
                  <div className="text-gray-400 text-[10px] uppercase font-bold">Location</div>
                  <div className="font-bold text-[#173842] truncate">
                    {selectedReceipt.location || "North Goa"}
                  </div>
                </div>

                <div className="p-2.5 rounded-xl bg-gray-50 border border-gray-100">
                  <div className="text-gray-400 text-[10px] uppercase font-bold">Split Count</div>
                  <div className="font-bold text-[#173842]">
                    {selectedReceipt.splitAmongIds?.length || travelers.length} travelers
                  </div>
                </div>

                <div className="col-span-2 sm:col-span-1 p-2.5 rounded-xl bg-gray-50 border border-gray-100">
                  <div className="text-gray-400 text-[10px] uppercase font-bold">Notes</div>
                  <div className="font-bold text-[#173842] truncate">
                    {selectedReceipt.notes || "Auto-locked receipt"}
                  </div>
                </div>
              </div>

              <div className="flex justify-end gap-2 pt-2">
                <button
                  type="button"
                  onClick={() => setSelectedReceipt(null)}
                  className="px-5 py-2.5 rounded-2xl bg-[#4C9DB0] hover:bg-[#3D8798] text-white font-bold text-xs shadow-md transition-all cursor-pointer"
                >
                  Close Lightbox
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </>
  );
};
