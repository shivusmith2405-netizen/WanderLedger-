"use client";

import React, { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import {
  Compass,
  ArrowRight,
  Plus,
  Trash2,
  Users,
  Wallet,
  Sparkles,
  MapPin,
  Share2,
  Copy,
  Check,
  ShieldCheck,
  Zap,
} from "lucide-react";
import { createLiveTrip } from "@/lib/supabase/tripService";
import { fireConfetti } from "@/lib/utils/confetti";

interface MemberInput {
  id: string;
  name: string;
  initialBudget: number;
  upiId: string;
}

export default function Home() {
  const router = useRouter();
  const [mounted, setMounted] = useState(false);
  const [step, setStep] = useState<1 | 2>(1);

  // Form Fields
  const [title, setTitle] = useState("Goa Roadtrip 2026");
  const [destination, setDestination] = useState("Vagator & Palolem, Goa");
  const [slug, setSlug] = useState("goa-roadtrip-2026");
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  // Members Builder
  const [members, setMembers] = useState<MemberInput[]>([
    { id: "1", name: "Aryan Mehta", initialBudget: 15000, upiId: "aryan@okaxis" },
    { id: "2", name: "Simran Kaur", initialBudget: 12000, upiId: "simran@icici" },
    { id: "3", name: "Kabir Joshi", initialBudget: 10000, upiId: "kabir@paytm" },
  ]);

  // Existing Trip Slug Navigation
  const [existingSlug, setExistingSlug] = useState("");
  const [copiedLink, setCopiedLink] = useState(false);

  useEffect(() => {
    setMounted(true);
  }, []);

  const generateSlugFromTitle = (text: string) => {
    const cleaned = text
      .toLowerCase()
      .trim()
      .replace(/[^a-z0-9]+/g, "-")
      .replace(/^-+|-+$/g, "");
    return cleaned || `trip-${Date.now().toString().slice(-6)}`;
  };

  const handleTitleChange = (val: string) => {
    setTitle(val);
    setSlug(generateSlugFromTitle(val));
  };

  const addMember = () => {
    if (members.length >= 10) return;
    const newId = String(Date.now());
    setMembers([
      ...members,
      {
        id: newId,
        name: "",
        initialBudget: 8000,
        upiId: "",
      },
    ]);
  };

  const removeMember = (id: string) => {
    if (members.length <= 2) return;
    setMembers(members.filter((m) => m.id !== id));
  };

  const updateMember = (id: string, field: keyof MemberInput, value: any) => {
    setMembers(
      members.map((m) => {
        if (m.id !== id) return m;
        const updated = { ...m, [field]: value };
        if (field === "name" && !m.upiId) {
          updated.upiId = `${String(value).toLowerCase().replace(/[^a-z0-9]/g, "")}@upi`;
        }
        return updated;
      })
    );
  };

  const loadPreset = (preset: "gokarna" | "goa" | "manali") => {
    if (preset === "gokarna") {
      setTitle("Gokarna Beach Trek");
      setDestination("Om Beach & Kudle Trails");
      setSlug("gokarna-trek");
      setMembers([
        { id: "1", name: "Rohan Varma", initialBudget: 8000, upiId: "rohan@okhdfc" },
        { id: "2", name: "Devika Nair", initialBudget: 8000, upiId: "devika@okaxis" },
        { id: "3", name: "Aditya Roy", initialBudget: 7000, upiId: "aditya@sbi" },
      ]);
    } else if (preset === "goa") {
      setTitle("Goa Sun & Silt 2026");
      setDestination("Anjuna & Morjim Beach");
      setSlug("goa-2026");
      setMembers([
        { id: "1", name: "Aryan Mehta", initialBudget: 20000, upiId: "aryan@okaxis" },
        { id: "2", name: "Simran Kaur", initialBudget: 15000, upiId: "simran@icici" },
        { id: "3", name: "Kabir Joshi", initialBudget: 15000, upiId: "kabir@paytm" },
        { id: "4", name: "Zoya Akhtar", initialBudget: 10000, upiId: "zoya@oksbi" },
      ]);
    } else {
      setTitle("Manali Snow Drift");
      setDestination("Solang Valley & Spiti Trails");
      setSlug("manali-snow");
      setMembers([
        { id: "1", name: "Tenzin Dorje", initialBudget: 25000, upiId: "tenzin@oksbi" },
        { id: "2", name: "Ananya Sen", initialBudget: 20000, upiId: "ananya@icici" },
        { id: "3", name: "Vikram Rathore", initialBudget: 18000, upiId: "vikram@paytm" },
      ]);
    }
  };

  const totalCommittedBudget = members.reduce(
    (sum, m) => sum + (Number(m.initialBudget) || 0),
    0
  );

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setErrorMessage(null);

    const cleanSlug = generateSlugFromTitle(slug || title);
    if (!title.trim() || !destination.trim()) {
      setErrorMessage("Please specify trip title and destination");
      return;
    }

    const validMembers = members.filter((m) => m.name.trim().length > 0);
    if (validMembers.length < 2) {
      setErrorMessage("Add at least 2 members with names to split expenses");
      return;
    }

    setIsSubmitting(true);
    try {
      await createLiveTrip({
        slug: cleanSlug,
        title: title.trim(),
        destination: destination.trim(),
        members: validMembers.map((m) => ({
          name: m.name.trim(),
          initialBudget: Number(m.initialBudget) || 0,
          upiId: m.upiId.trim() || `${m.name.toLowerCase().replace(/[^a-z0-9]/g, "")}@upi`,
        })),
      });

      fireConfetti();
      router.push(`/t/${cleanSlug}`);
    } catch (err: any) {
      console.error(err);
      setErrorMessage(err.message || "Failed to create trip in Supabase. Check your connection.");
      setIsSubmitting(false);
    }
  };

  const handleCopyShareablePreview = () => {
    if (typeof window === "undefined") return;
    const cleanSlug = generateSlugFromTitle(slug || title);
    const link = `${window.location.origin}/t/${cleanSlug}`;
    navigator.clipboard.writeText(link);
    setCopiedLink(true);
    setTimeout(() => setCopiedLink(false), 2500);
  };

  const handleJoinExisting = (e: React.FormEvent) => {
    e.preventDefault();
    if (!existingSlug.trim()) return;
    const clean = generateSlugFromTitle(existingSlug);
    router.push(`/t/${clean}`);
  };

  return (
    <div
      suppressHydrationWarning
      className="min-h-screen bg-[#FFEBAF] text-[#173842] flex flex-col justify-between selection:bg-[#4C9DB0]/20 selection:text-[#173842]"
    >
      {/* Top Header */}
      <header className="px-6 py-5 max-w-4xl mx-auto w-full flex items-center justify-between">
        <div className="flex items-center gap-3">
          <div className="w-11 h-11 rounded-2xl bg-[#4C9DB0] text-white flex items-center justify-center font-black shadow-md border border-[#2D6B78]/30">
            <Compass className="w-6 h-6 stroke-[2.5]" />
          </div>
          <div>
            <h1 className="text-xl font-black text-[#173842] tracking-tight">WanderLedger</h1>
            <p className="text-xs font-semibold text-[#4F7682]">
              Zero-Login Live Collaborative Travel Ledger
            </p>
          </div>
        </div>

        {/* Existing Slug Lookup */}
        <form onSubmit={handleJoinExisting} className="hidden sm:flex items-center gap-1.5">
          <input
            type="text"
            placeholder="Enter trip slug..."
            value={existingSlug}
            onChange={(e) => setExistingSlug(e.target.value)}
            className="px-3.5 py-1.5 rounded-xl border border-[#E6D090] bg-white/80 text-xs text-[#173842] focus:bg-white outline-none w-36 focus:w-48 transition-all"
          />
          <button
            type="submit"
            className="p-1.5 rounded-xl bg-[#173842] hover:bg-[#235560] text-[#FFEBAF] text-xs font-bold transition-colors cursor-pointer"
            title="Open Trip"
          >
            <ArrowRight className="w-4 h-4" />
          </button>
        </form>
      </header>

      {/* Main Content: Multi-Step Trip Creator */}
      <main className="max-w-3xl mx-auto px-4 sm:px-6 py-6 w-full flex-1">
        {/* Hero Card */}
        <div className="bg-white rounded-3xl p-6 sm:p-8 shadow-bento border-2 border-[#E6D090] text-[#173842]">
          {/* Quick Preset Selector */}
          <div className="flex flex-wrap items-center justify-between gap-2 pb-5 border-b border-gray-100">
            <div>
              <span className="text-[10px] font-black uppercase tracking-wider text-[#4C9DB0] block mb-0.5">
                Onboarding &amp; Registration
              </span>
              <h2 className="text-xl sm:text-2xl font-black text-[#173842] tracking-tight">
                Create a New Trip Ledger
              </h2>
            </div>

            <div className="flex items-center gap-1.5">
              <span className="text-[11px] font-bold text-gray-500 mr-1 hidden sm:inline">
                Quick Fill:
              </span>
              <button
                type="button"
                onClick={() => loadPreset("goa")}
                className="px-2.5 py-1 rounded-xl bg-[#FFEBAF]/50 hover:bg-[#FFEBAF] text-[#173842] text-xs font-bold border border-[#E6D090] transition-colors cursor-pointer"
              >
                🌴 Goa
              </button>
              <button
                type="button"
                onClick={() => loadPreset("gokarna")}
                className="px-2.5 py-1 rounded-xl bg-[#FFEBAF]/50 hover:bg-[#FFEBAF] text-[#173842] text-xs font-bold border border-[#E6D090] transition-colors cursor-pointer"
              >
                🏖️ Gokarna
              </button>
              <button
                type="button"
                onClick={() => loadPreset("manali")}
                className="px-2.5 py-1 rounded-xl bg-[#FFEBAF]/50 hover:bg-[#FFEBAF] text-[#173842] text-xs font-bold border border-[#E6D090] transition-colors cursor-pointer"
              >
                🏔️ Manali
              </button>
            </div>
          </div>

          {/* Error Banner */}
          {errorMessage && (
            <div className="mt-4 p-3 rounded-2xl bg-rose-100 border border-rose-300 text-rose-900 text-xs font-bold">
              {errorMessage}
            </div>
          )}

          {/* Form */}
          <form onSubmit={handleSubmit} className="mt-6 space-y-6">
            {/* Step 1: Trip Essentials */}
            <div className="space-y-4">
              <div className="flex items-center gap-2">
                <span className="w-6 h-6 rounded-full bg-[#173842] text-[#FFEBAF] font-black text-xs flex items-center justify-center">
                  1
                </span>
                <h3 className="text-sm font-extrabold text-[#173842] uppercase tracking-wider">
                  Trip Essentials
                </h3>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs font-bold text-[#173842] uppercase tracking-wider mb-1">
                    Trip Name *
                  </label>
                  <input
                    type="text"
                    required
                    placeholder="e.g. Goa Roadtrip 2026"
                    value={title}
                    onChange={(e) => handleTitleChange(e.target.value)}
                    className="w-full px-4 py-2.5 rounded-2xl border-2 border-gray-200 focus:border-[#4C9DB0] text-sm text-[#173842] font-semibold outline-none transition-colors"
                  />
                </div>

                <div>
                  <label className="block text-xs font-bold text-[#173842] uppercase tracking-wider mb-1">
                    Destination *
                  </label>
                  <input
                    type="text"
                    required
                    placeholder="e.g. Vagator & Palolem, Goa"
                    value={destination}
                    onChange={(e) => setDestination(e.target.value)}
                    className="w-full px-4 py-2.5 rounded-2xl border-2 border-gray-200 focus:border-[#4C9DB0] text-sm text-[#173842] font-semibold outline-none transition-colors"
                  />
                </div>
              </div>

              {/* Unique Slug Preview & Shareable Link */}
              <div className="p-3.5 rounded-2xl bg-gray-50 border border-gray-200 flex flex-col sm:flex-row sm:items-center justify-between gap-2 text-xs">
                <div>
                  <span className="text-gray-500 font-medium">Permanent Zero-Login URL: </span>
                  <span className="font-mono font-bold text-[#2D6B78]">
                    /t/{slug || "your-trip-slug"}
                  </span>
                </div>

                <button
                  type="button"
                  onClick={handleCopyShareablePreview}
                  className="px-3 py-1.5 rounded-xl bg-white border border-gray-300 hover:bg-[#FFEBAF] text-[#173842] font-bold text-xs flex items-center gap-1.5 transition-colors cursor-pointer shrink-0"
                >
                  {copiedLink ? (
                    <>
                      <Check className="w-3.5 h-3.5 text-emerald-600" />
                      <span>Copied Share Link!</span>
                    </>
                  ) : (
                    <>
                      <Copy className="w-3.5 h-3.5" />
                      <span>Copy Shareable Link</span>
                    </>
                  )}
                </button>
              </div>
            </div>

            {/* Step 2: Dynamic Member Builder & Committed Initial Budgets */}
            <div className="space-y-4 pt-2 border-t border-gray-100">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <span className="w-6 h-6 rounded-full bg-[#173842] text-[#FFEBAF] font-black text-xs flex items-center justify-center">
                    2
                  </span>
                  <div>
                    <h3 className="text-sm font-extrabold text-[#173842] uppercase tracking-wider">
                      Trip Members &amp; Committed Budgets
                    </h3>
                    <p className="text-xs text-gray-500">
                      Add friends, their committed starting budgets (₹), and UPI IDs
                    </p>
                  </div>
                </div>

                <button
                  type="button"
                  onClick={addMember}
                  className="px-3 py-1.5 rounded-xl bg-[#4C9DB0] hover:bg-[#3D8798] text-white font-bold text-xs flex items-center gap-1 shadow-sm transition-colors cursor-pointer"
                >
                  <Plus className="w-3.5 h-3.5 stroke-[3]" />
                  <span>Add Friend</span>
                </button>
              </div>

              {/* Members Input Rows */}
              <div className="space-y-3">
                {members.map((m, idx) => (
                  <div
                    key={m.id}
                    className="p-3.5 rounded-2xl bg-gray-50/80 border border-gray-200 flex flex-col sm:flex-row items-stretch sm:items-center gap-2.5"
                  >
                    <span className="w-7 h-7 rounded-xl bg-white border border-gray-200 flex items-center justify-center text-xs font-black text-[#173842] shrink-0">
                      {idx + 1}
                    </span>

                    {/* Member Name */}
                    <div className="flex-1">
                      <input
                        type="text"
                        required
                        placeholder="Friend's Name"
                        value={m.name}
                        onChange={(e) => updateMember(m.id, "name", e.target.value)}
                        className="w-full px-3 py-2 rounded-xl bg-white border border-gray-200 focus:border-[#4C9DB0] text-xs font-bold text-[#173842] outline-none"
                      />
                    </div>

                    {/* Committed Budget */}
                    <div className="w-full sm:w-36">
                      <div className="relative">
                        <span className="absolute left-3 top-1/2 -translate-y-1/2 text-xs font-bold text-gray-400">
                          ₹
                        </span>
                        <input
                          type="number"
                          min="0"
                          step="500"
                          required
                          placeholder="Budget"
                          value={m.initialBudget}
                          onChange={(e) => updateMember(m.id, "initialBudget", e.target.value)}
                          className="w-full pl-6 pr-3 py-2 rounded-xl bg-white border border-gray-200 focus:border-[#4C9DB0] text-xs font-bold text-[#173842] outline-none"
                        />
                      </div>
                    </div>

                    {/* UPI ID */}
                    <div className="w-full sm:w-44">
                      <input
                        type="text"
                        placeholder="UPI ID (e.g. name@okhdfc)"
                        value={m.upiId}
                        onChange={(e) => updateMember(m.id, "upiId", e.target.value)}
                        className="w-full px-3 py-2 rounded-xl bg-white border border-gray-200 focus:border-[#4C9DB0] text-xs font-mono text-[#2D6B78] outline-none"
                      />
                    </div>

                    {/* Remove Member */}
                    {members.length > 2 && (
                      <button
                        type="button"
                        onClick={() => removeMember(m.id)}
                        className="p-2 rounded-xl hover:bg-rose-100 text-gray-400 hover:text-rose-600 transition-colors shrink-0 self-end sm:self-auto cursor-pointer"
                        title="Remove Member"
                      >
                        <Trash2 className="w-4 h-4" />
                      </button>
                    )}
                  </div>
                ))}
              </div>

              {/* Total Escrow Calculation Pill */}
              <div className="p-4 rounded-2xl bg-gradient-to-r from-[#4C9DB0]/15 to-[#FFEBAF]/50 border border-[#E6D090] flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <Wallet className="w-4 h-4 text-[#2D6B78]" />
                  <span className="text-xs font-extrabold text-[#173842]">
                    Total Committed Group Escrow:
                  </span>
                </div>
                <span
                  suppressHydrationWarning
                  className="text-base sm:text-lg font-black text-[#173842]"
                >
                  ₹{totalCommittedBudget.toLocaleString("en-IN")}
                </span>
              </div>
            </div>

            {/* Launch Button */}
            <div className="pt-3">
              <button
                type="submit"
                disabled={isSubmitting}
                className="w-full py-4 rounded-2xl bg-[#173842] hover:bg-[#235560] active:scale-[0.99] text-[#FFEBAF] font-black text-sm sm:text-base shadow-xl flex items-center justify-center gap-2 transition-all cursor-pointer disabled:opacity-50"
              >
                {isSubmitting ? (
                  <span>Saving to Supabase Database...</span>
                ) : (
                  <>
                    <Zap className="w-5 h-5 fill-current text-[#FFEBAF]" />
                    <span>Launch Live Trip Ledger</span>
                    <ArrowRight className="w-4 h-4" />
                  </>
                )}
              </button>
            </div>
          </form>
        </div>
      </main>

      {/* Footer */}
      <footer className="py-4 text-center text-xs text-[#4F7682] border-t border-[#E6D090]/60">
        <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-white/50 border border-[#E6D090]">
          <ShieldCheck className="w-3.5 h-3.5 text-[#2D6B78]" />
          <span>PostgreSQL Realtime • Zero Login Access • NPCI UPI Deep Intents</span>
        </div>
      </footer>
    </div>
  );
}
