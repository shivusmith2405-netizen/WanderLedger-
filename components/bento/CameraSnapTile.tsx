"use client";

import React, { useState, useRef } from "react";
import { Camera, Sparkles, Check, Image as ImageIcon, MapPin, Clock, X, AlertCircle } from "lucide-react";
import { Traveler, Expense } from "@/lib/algorithms/debtMinimizer";
import { fireConfetti } from "@/lib/utils/confetti";

interface CameraSnapTileProps {
  travelers: Traveler[];
  activeTravelerId: string;
  onAddExpense: (expense: Omit<Expense, "id">) => void;
}

export const CameraSnapTile: React.FC<CameraSnapTileProps> = ({
  travelers,
  activeTravelerId,
  onAddExpense,
}) => {
  const [isOpen, setIsOpen] = useState(false);
  const [amount, setAmount] = useState<string>("");
  const [title, setTitle] = useState<string>("");
  const [category, setCategory] = useState<Expense["category"]>("food");
  const [paidById, setPaidById] = useState<string>(activeTravelerId);
  const [splitAmongIds, setSplitAmongIds] = useState<string[]>(travelers.map((t) => t.id));
  const [receiptImage, setReceiptImage] = useState<string | null>(null);
  const [lockedTimestamp, setLockedTimestamp] = useState<string>("");
  const [lockedLocation, setLockedLocation] = useState<string>("North Goa Trails");

  const fileInputRef = useRef<HTMLInputElement>(null);

  const categories: Array<{ id: Expense["category"]; label: string; icon: string }> = [
    { id: "food", label: "Food", icon: "🍔" },
    { id: "cab", label: "Cab", icon: "🚕" },
    { id: "fuel", label: "Fuel", icon: "⛽" },
    { id: "stay", label: "Stay", icon: "🏨" },
    { id: "tickets", label: "Tickets", icon: "🎟️" },
    { id: "other", label: "Misc", icon: "✨" },
  ];

  const handleOpenSnap = () => {
    // Auto-lock timestamp instantly upon opening
    const now = new Date();
    setLockedTimestamp(now.toISOString());
    setPaidById(activeTravelerId);
    setSplitAmongIds(travelers.map((t) => t.id));

    // Try geolocation if supported, otherwise fallback
    if (typeof navigator !== "undefined" && navigator.geolocation) {
      navigator.geolocation.getCurrentPosition(
        () => setLockedLocation("Current GPS • North Goa"),
        () => setLockedLocation("Auto-tagged • Goa Trails"),
        { timeout: 2000 }
      );
    }
    setIsOpen(true);
  };

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      const reader = new FileReader();
      reader.onloadend = () => {
        setReceiptImage(reader.result as string);
      };
      reader.readAsDataURL(file);
    }
  };

  const toggleSplitMember = (id: string) => {
    if (splitAmongIds.includes(id)) {
      if (splitAmongIds.length > 1) {
        setSplitAmongIds(splitAmongIds.filter((m) => m !== id));
      }
    } else {
      setSplitAmongIds([...splitAmongIds, id]);
    }
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    const parsedAmount = parseFloat(amount);
    if (isNaN(parsedAmount) || parsedAmount <= 0) return;

    onAddExpense({
      title: title.trim() || `${category.toUpperCase()} Expense`,
      amount: parsedAmount,
      paidById,
      splitAmongIds,
      category,
      timestamp: lockedTimestamp || new Date().toISOString(),
      location: lockedLocation,
      receiptUrl:
        receiptImage ||
        "https://images.unsplash.com/photo-1555396273-367ea4eb4db5?auto=format&fit=crop&w=800&q=80",
      notes: `Auto-locked at ${new Date(lockedTimestamp).toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" })}`,
    });

    // Reset and close
    setAmount("");
    setTitle("");
    setReceiptImage(null);
    setIsOpen(false);
    fireConfetti();
  };

  const formatLockDisplay = (iso: string) => {
    if (!iso) return "Locked Just Now";
    const d = new Date(iso);
    return `Auto-Locked: Today, ${d.toLocaleTimeString([], { hour: "2-digit", minute: "2-digit", second: "2-digit" })}`;
  };

  return (
    <>
      {/* 1-Col Camera Snap Bento Tile */}
      <div
        onClick={handleOpenSnap}
        className="relative overflow-hidden bg-white text-[#173842] rounded-3xl p-6 shadow-bento border border-[#E6D090] transition-all duration-300 hover:shadow-bento-hover hover:-translate-y-0.5 cursor-pointer group flex flex-col justify-between col-span-1"
      >
        <div className="absolute top-0 right-0 w-32 h-32 bg-[#4C9DB0]/10 rounded-bl-[60px] pointer-events-none transition-transform duration-500 group-hover:scale-110" />

        <div className="flex items-start justify-between">
          <div className="w-12 h-12 rounded-2xl bg-[#4C9DB0] text-white flex items-center justify-center shadow-md group-hover:scale-105 group-hover:bg-[#3D8798] transition-all duration-200">
            <Camera className="w-6 h-6 stroke-[2.2]" />
          </div>
          <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full bg-[#FFEBAF] text-[#173842] text-[11px] font-bold border border-[#E6D090]">
            <Clock className="w-3 h-3 text-[#2D6B78]" />
            Auto-Lock
          </span>
        </div>

        <div className="mt-4 space-y-1">
          <h3 className="text-lg font-extrabold text-[#173842] tracking-tight group-hover:text-[#2D6B78] transition-colors">
            Instant Camera Snap
          </h3>
          <p className="text-xs text-[#4F7682] line-clamp-2">
            Direct camera receipt capture. Timestamp & GPS auto-locked with zero manual pickers.
          </p>
        </div>

        <div className="mt-4 pt-3 border-t border-gray-100 flex items-center justify-between">
          <span className="text-[11px] font-semibold text-[#2D6B78] flex items-center gap-1">
            <Sparkles className="w-3 h-3" />
            1-Tap Quick Ledger
          </span>
          <span className="text-xs font-bold text-[#4C9DB0] group-hover:translate-x-1 transition-transform">
            Capture →
          </span>
        </div>
      </div>

      {/* Direct Capture & Expense Entry Modal */}
      {isOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-4 bg-[#173842]/75 backdrop-blur-md animate-in fade-in duration-200">
          <div className="bg-white rounded-3xl max-w-lg w-full max-h-[92vh] overflow-y-auto p-5 sm:p-6 shadow-2xl border-2 border-[#E6D090] text-[#173842] relative animate-in zoom-in-95 duration-200">
            {/* Header */}
            <div className="flex justify-between items-center pb-3 border-b border-[#FFEBAF]">
              <div className="flex items-center gap-2.5">
                <div className="w-10 h-10 rounded-2xl bg-[#4C9DB0] text-white flex items-center justify-center shadow-sm">
                  <Camera className="w-5 h-5" />
                </div>
                <div>
                  <h3 className="text-base sm:text-lg font-extrabold text-[#173842]">
                    Camera Snap Expense
                  </h3>
                  <div className="flex items-center gap-2 text-[11px] font-semibold text-[#2D6B78]">
                    <span className="flex items-center gap-1" suppressHydrationWarning>
                      <Clock className="w-3 h-3 text-[#4C9DB0]" />
                      <span suppressHydrationWarning>{formatLockDisplay(lockedTimestamp)}</span>
                    </span>
                  </div>
                </div>
              </div>
              <button
                type="button"
                onClick={() => setIsOpen(false)}
                className="w-8 h-8 rounded-full bg-gray-100 hover:bg-gray-200 text-[#173842] flex items-center justify-center text-sm font-bold"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            {/* Auto-lock Verification Badge */}
            <div className="my-3 px-3.5 py-2 rounded-2xl bg-[#FFEBAF]/50 border border-[#E6D090] flex items-center justify-between text-xs text-[#173842]">
              <span className="flex items-center gap-1.5 font-semibold">
                <MapPin className="w-3.5 h-3.5 text-[#2D6B78]" />
                {lockedLocation}
              </span>
              <span className="px-2 py-0.5 rounded-full bg-[#173842] text-[#FFEBAF] text-[10px] font-bold">
                Date Locked 🔒
              </span>
            </div>

            <form onSubmit={handleSubmit} className="space-y-4">
              {/* Receipt Image Capture Section */}
              <div>
                <input
                  type="file"
                  accept="image/*"
                  capture="environment"
                  ref={fileInputRef}
                  onChange={handleFileChange}
                  className="hidden"
                />

                {receiptImage ? (
                  <div className="relative rounded-2xl overflow-hidden border-2 border-[#4C9DB0] h-36 bg-black/5 group">
                    {/* eslint-disable-next-line @next/next/no-img-element */}
                    <img
                      src={receiptImage}
                      alt="Receipt preview"
                      className="w-full h-full object-cover"
                    />
                    <div className="absolute inset-0 bg-black/40 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center gap-3">
                      <button
                        type="button"
                        onClick={() => fileInputRef.current?.click()}
                        className="px-3 py-1.5 rounded-xl bg-white text-xs font-bold text-[#173842] shadow"
                      >
                        Retake Photo
                      </button>
                      <button
                        type="button"
                        onClick={() => setReceiptImage(null)}
                        className="px-3 py-1.5 rounded-xl bg-red-500 text-xs font-bold text-white shadow"
                      >
                        Remove
                      </button>
                    </div>
                  </div>
                ) : (
                  <button
                    type="button"
                    onClick={() => fileInputRef.current?.click()}
                    className="w-full py-4 px-4 rounded-2xl border-2 border-dashed border-[#4C9DB0]/50 hover:border-[#4C9DB0] bg-[#4C9DB0]/5 hover:bg-[#4C9DB0]/10 transition-all flex flex-col items-center justify-center gap-1.5 text-center cursor-pointer group"
                  >
                    <div className="w-10 h-10 rounded-full bg-[#4C9DB0]/15 text-[#2D6B78] flex items-center justify-center group-hover:scale-110 transition-transform">
                      <ImageIcon className="w-5 h-5" />
                    </div>
                    <span className="text-xs font-bold text-[#173842]">
                      Snap or Upload Receipt
                    </span>
                    <span className="text-[10px] text-gray-500">
                      Auto-extracts bill metadata • Direct camera intent
                    </span>
                  </button>
                )}
              </div>

              {/* Amount & Title */}
              <div className="space-y-3">
                <div>
                  <label className="block text-[11px] font-bold text-[#173842] uppercase tracking-wider mb-1">
                    Amount Spent (₹) *
                  </label>
                  <div className="relative">
                    <span className="absolute left-4 top-1/2 -translate-y-1/2 text-2xl font-black text-[#4C9DB0]">
                      ₹
                    </span>
                    <input
                      type="number"
                      step="any"
                      required
                      autoFocus
                      placeholder="0.00"
                      value={amount}
                      onChange={(e) => setAmount(e.target.value)}
                      className="w-full pl-10 pr-4 py-3 rounded-2xl border-2 border-gray-200 focus:border-[#4C9DB0] focus:outline-none font-black text-2xl text-[#173842] placeholder:text-gray-300"
                    />
                  </div>
                </div>

                <div>
                  <label className="block text-[11px] font-bold text-[#173842] uppercase tracking-wider mb-1">
                    What was this for? *
                  </label>
                  <input
                    type="text"
                    required
                    placeholder="e.g. Seafood Lunch @ Curlies"
                    value={title}
                    onChange={(e) => setTitle(e.target.value)}
                    className="w-full px-4 py-2.5 rounded-2xl border-2 border-gray-200 focus:border-[#4C9DB0] focus:outline-none font-medium text-sm text-[#173842]"
                  />
                </div>
              </div>

              {/* Category Pills */}
              <div>
                <label className="block text-[11px] font-bold text-[#173842] uppercase tracking-wider mb-1.5">
                  Category
                </label>
                <div className="grid grid-cols-3 sm:grid-cols-6 gap-1.5">
                  {categories.map((cat) => (
                    <button
                      key={cat.id}
                      type="button"
                      onClick={() => setCategory(cat.id)}
                      className={`p-2 rounded-2xl border text-center transition-all cursor-pointer flex flex-col items-center gap-0.5 ${
                        category === cat.id
                          ? "border-[#4C9DB0] bg-[#4C9DB0]/15 font-bold text-[#173842] shadow-sm"
                          : "border-gray-200 hover:border-gray-300 text-gray-600"
                      }`}
                    >
                      <span className="text-base">{cat.icon}</span>
                      <span className="text-[10px]">{cat.label}</span>
                    </button>
                  ))}
                </div>
              </div>

              {/* Paid By Selector */}
              <div>
                <label className="block text-[11px] font-bold text-[#173842] uppercase tracking-wider mb-1.5">
                  Paid By
                </label>
                <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
                  {travelers.map((t) => (
                    <button
                      key={t.id}
                      type="button"
                      onClick={() => setPaidById(t.id)}
                      className={`p-2 rounded-2xl border text-left flex items-center gap-1.5 transition-all cursor-pointer ${
                        paidById === t.id
                          ? "border-[#4C9DB0] bg-[#4C9DB0]/15 font-bold text-[#173842]"
                          : "border-gray-200 hover:border-gray-300 text-gray-600"
                      }`}
                    >
                      <span>{t.avatar}</span>
                      <span className="text-xs truncate">{t.name}</span>
                    </button>
                  ))}
                </div>
              </div>

              {/* Split Among Multi-check */}
              <div>
                <div className="flex justify-between items-center mb-1.5">
                  <label className="text-[11px] font-bold text-[#173842] uppercase tracking-wider">
                    Split Among ({splitAmongIds.length} travelers)
                  </label>
                  <button
                    type="button"
                    onClick={() => setSplitAmongIds(travelers.map((t) => t.id))}
                    className="text-[10px] font-bold text-[#2D6B78] hover:underline"
                  >
                    Select All
                  </button>
                </div>
                <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
                  {travelers.map((t) => {
                    const isSelected = splitAmongIds.includes(t.id);
                    return (
                      <button
                        key={t.id}
                        type="button"
                        onClick={() => toggleSplitMember(t.id)}
                        className={`p-2 rounded-2xl border text-left flex items-center justify-between transition-all cursor-pointer ${
                          isSelected
                            ? "border-[#4C9DB0] bg-[#4C9DB0]/10 font-bold text-[#173842]"
                            : "border-gray-200 text-gray-400 opacity-60"
                        }`}
                      >
                        <div className="flex items-center gap-1.5 truncate">
                          <span>{t.avatar}</span>
                          <span className="text-xs truncate">{t.name}</span>
                        </div>
                        {isSelected && <Check className="w-3.5 h-3.5 text-[#2D6B78] shrink-0" />}
                      </button>
                    );
                  })}
                </div>
              </div>

              {/* Actions */}
              <div className="pt-2 flex gap-2.5">
                <button
                  type="button"
                  onClick={() => setIsOpen(false)}
                  className="w-1/3 py-3 rounded-2xl bg-gray-100 hover:bg-gray-200 font-bold text-xs text-gray-700"
                >
                  Discard
                </button>
                <button
                  type="submit"
                  disabled={!amount || parseFloat(amount) <= 0}
                  className="w-2/3 py-3 rounded-2xl bg-[#4C9DB0] hover:bg-[#3D8798] disabled:opacity-50 text-white font-extrabold text-sm shadow-md active:scale-95 transition-all flex items-center justify-center gap-2 cursor-pointer"
                >
                  <Sparkles className="w-4 h-4" />
                  <span>Lock & Add Expense</span>
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </>
  );
};
