"use client";

import React, { useState, useEffect } from "react";
import Link from "next/link";
import {
  Compass,
  ArrowLeft,
  Vote,
  Lock,
  Unlock,
  CheckCircle2,
  Plus,
  Sparkles,
  Trophy,
  ArrowRightLeft,
  Navigation,
  Check,
  X,
  Users,
} from "lucide-react";
import { fetchLiveTripBySlug, LiveTripRecord } from "@/lib/supabase/tripService";
import { fireDoubleConfetti, fireConfetti } from "@/lib/utils/confetti";

interface PollOption {
  id: string;
  text: string;
  votes: string[]; // member IDs who voted for this option
}

interface Poll {
  id: string;
  question: string;
  options: PollOption[];
  createdAt: string;
}

interface BlindConsensusViewProps {
  slug: string;
}

export const BlindConsensusView: React.FC<BlindConsensusViewProps> = ({ slug }) => {
  const [mounted, setMounted] = useState(false);
  const [loading, setLoading] = useState(true);
  const [trip, setTrip] = useState<LiveTripRecord | null>(null);
  const [activeMemberId, setActiveMemberId] = useState<string>("");

  // Polls State
  const storageKey = `wanderledger_polls_${slug}`;
  const [polls, setPolls] = useState<Poll[]>([]);
  const [showAddPollModal, setShowAddPollModal] = useState(false);
  const [newQuestion, setNewQuestion] = useState("");
  const [optionInputs, setOptionInputs] = useState<string[]>([
    "Curlies Beach Shack, Anjuna",
    "Thalassa Mediterranean, Siolim",
  ]);

  const [toastMessage, setToastMessage] = useState<string | null>(null);

  const showToast = (msg: string) => {
    setToastMessage(msg);
    setTimeout(() => setToastMessage(null), 3000);
  };

  useEffect(() => {
    setMounted(true);
    fetchLiveTripBySlug(slug).then((data) => {
      if (data) {
        setTrip(data);
        const storedMember = localStorage.getItem(`wanderledger_active_member_${slug}`);
        if (storedMember && data.members.some((m) => m.id === storedMember)) {
          setActiveMemberId(storedMember);
        } else if (data.members.length > 0) {
          setActiveMemberId(data.members[0].id);
          localStorage.setItem(`wanderledger_active_member_${slug}`, data.members[0].id);
        }

        // Initialize polls
        try {
          const cached = localStorage.getItem(storageKey);
          if (cached) {
            setPolls(JSON.parse(cached));
          } else {
            // Starter default poll
            const starter: Poll[] = [
              {
                id: `poll-${Date.now()}`,
                question: `Where should we have dinner tonight in ${data.destination.split(",")[0]}?`,
                options: [
                  { id: "opt-1", text: "Curlies Beach Shack & Sunset Beats", votes: [] },
                  { id: "opt-2", text: "Thalassa Greek Taverna by the Cliffs", votes: [] },
                  { id: "opt-3", text: "Fisherman's Wharf Seafood Grill", votes: [] },
                ],
                createdAt: new Date().toISOString(),
              },
            ];
            setPolls(starter);
            localStorage.setItem(storageKey, JSON.stringify(starter));
          }
        } catch {
          // ignore
        }
      }
      setLoading(false);
    });
  }, [slug, storageKey]);

  // Persist polls to storage on change
  useEffect(() => {
    if (!mounted || polls.length === 0) return;
    try {
      localStorage.setItem(storageKey, JSON.stringify(polls));
    } catch {
      // ignore
    }
  }, [polls, storageKey, mounted]);

  const handleSelectPersona = (memberId: string) => {
    setActiveMemberId(memberId);
    localStorage.setItem(`wanderledger_active_member_${slug}`, memberId);
    const mem = trip?.members.find((m) => m.id === memberId);
    showToast(`Viewing voting as ${mem?.name || "Traveler"}`);
  };

  const handleVote = (pollId: string, optionId: string) => {
    if (!activeMemberId) return;

    setPolls((prev) =>
      prev.map((p) => {
        if (p.id !== pollId) return p;

        // Count unique voters before
        const votersBefore = new Set(p.options.flatMap((o) => o.votes));
        const wasAllVotedBefore = votersBefore.size >= (trip?.members.length || 1);

        const updatedOptions = p.options.map((opt) => {
          const filtered = opt.votes.filter((v) => v !== activeMemberId);
          if (opt.id === optionId) {
            return { ...opt, votes: [...filtered, activeMemberId] };
          }
          return { ...opt, votes: filtered };
        });

        // Count unique voters after
        const votersAfter = new Set(updatedOptions.flatMap((o) => o.votes));
        const isAllVotedNow = votersAfter.size >= (trip?.members.length || 1);

        if (!wasAllVotedBefore && isAllVotedNow) {
          fireDoubleConfetti();
          showToast("All members voted! Poll unmasked 🎉");
        } else {
          showToast("Ballot recorded in sealed poll 🔒");
        }

        return { ...p, options: updatedOptions };
      })
    );
  };

  const handleAddPoll = (e: React.FormEvent) => {
    e.preventDefault();
    const cleanQ = newQuestion.trim();
    const cleanOpts = optionInputs.map((o) => o.trim()).filter((o) => o.length > 0);

    if (!cleanQ || cleanOpts.length < 2) {
      showToast("Please provide question and at least 2 options");
      return;
    }

    const newPoll: Poll = {
      id: `poll-${Date.now()}`,
      question: cleanQ,
      options: cleanOpts.map((text, idx) => ({
        id: `opt-${Date.now()}-${idx}`,
        text,
        votes: [],
      })),
      createdAt: new Date().toISOString(),
    };

    setPolls([newPoll, ...polls]);
    setNewQuestion("");
    setOptionInputs(["", ""]);
    setShowAddPollModal(false);
    fireConfetti();
    showToast("New suggestion poll created 🔒");
  };

  const totalMembers = trip?.members.length || 1;
  const activeMember = trip?.members.find((m) => m.id === activeMemberId) || trip?.members[0];

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

      {/* Top Header */}
      <header className="sticky top-0 z-40 bg-[#FFEBAF]/90 backdrop-blur-md border-b border-[#E6D090]/80 px-4 sm:px-6 py-3">
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
                <Vote className="w-5 h-5 stroke-[2.5]" />
              </div>
              <div>
                <h1 className="text-base sm:text-lg font-black text-[#173842] tracking-tight">
                  Live Voting &amp; Consensus
                </h1>
                <p className="text-[11px] font-semibold text-[#4F7682] truncate max-w-xs">
                  {trip?.title || slug} • Blind Consensus Polls
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
              href={`/t/${slug}/settle`}
              className="px-3 py-1.5 rounded-xl bg-white/80 hover:bg-white text-[#173842] text-xs font-bold border border-[#E6D090] shadow-xs flex items-center gap-1.5 transition-all cursor-pointer shrink-0"
            >
              <ArrowRightLeft className="w-3.5 h-3.5 text-[#2D6B78]" />
              <span>Settle</span>
            </Link>

            {/* Persona Dropdown/Pill */}
            {trip?.members && trip.members.length > 0 && (
              <div className="flex items-center gap-1 bg-white/80 p-1 rounded-2xl border border-[#E6D090] shadow-xs shrink-0">
                <span className="text-[10px] font-extrabold uppercase text-[#4F7682] px-1.5 hidden md:inline">
                  Voting As:
                </span>
                {trip.members.map((m) => {
                  const isActive = m.id === activeMemberId;
                  return (
                    <button
                      key={m.id}
                      onClick={() => handleSelectPersona(m.id)}
                      className={`flex items-center gap-1 px-2 py-1 rounded-xl text-xs font-bold transition-all cursor-pointer ${
                        isActive
                          ? "bg-[#173842] text-[#FFEBAF] shadow-xs scale-102"
                          : "text-[#173842] hover:bg-[#FFEBAF]/60"
                      }`}
                    >
                      <span>{m.avatar}</span>
                      <span className="truncate max-w-[70px]">{m.name.split(" ")[0]}</span>
                    </button>
                  );
                })}
              </div>
            )}
          </div>
        </div>
      </header>

      {/* Main Container */}
      <main className="max-w-4xl mx-auto px-4 sm:px-6 pt-6 space-y-6">
        {/* Banner with Add Poll Button */}
        <div className="bg-white rounded-3xl p-6 shadow-bento border-2 border-[#E6D090] flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <div>
            <span className="text-[10px] font-black uppercase tracking-wider text-[#4C9DB0] block mb-0.5">
              Blind Consensus Mechanism
            </span>
            <h2 className="text-xl sm:text-2xl font-black text-[#173842] tracking-tight">
              Group Decisions &amp; Voting
            </h2>
            <p className="text-xs text-gray-500 mt-1">
              Options and vote tallies remain sealed and masked until all {totalMembers} active members cast their ballot, preventing herd bias!
            </p>
          </div>

          <button
            type="button"
            onClick={() => setShowAddPollModal(true)}
            className="px-4 py-2.5 rounded-2xl bg-[#173842] hover:bg-[#235560] text-[#FFEBAF] font-black text-xs sm:text-sm shadow-md active:scale-95 transition-all flex items-center justify-center gap-1.5 cursor-pointer shrink-0"
          >
            <Plus className="w-4 h-4 stroke-[3]" />
            <span>Create Poll</span>
          </button>
        </div>

        {/* Polls List */}
        {loading ? (
          <div className="p-8 text-center bg-white/70 rounded-3xl border border-[#E6D090] text-xs font-bold text-gray-500">
            Syncing polls...
          </div>
        ) : (
          <div className="space-y-5">
            {polls.map((poll) => {
              const uniqueVoters = new Set(poll.options.flatMap((o) => o.votes));
              const ballotsCast = uniqueVoters.size;
              const isFullyUnmasked = ballotsCast >= totalMembers;
              const pendingCount = Math.max(0, totalMembers - ballotsCast);

              // Find winner if unmasked
              let winningOptionId = "";
              let maxVotes = -1;
              if (isFullyUnmasked) {
                for (const opt of poll.options) {
                  if (opt.votes.length > maxVotes) {
                    maxVotes = opt.votes.length;
                    winningOptionId = opt.id;
                  }
                }
              }

              return (
                <div
                  key={poll.id}
                  className={`bg-white rounded-3xl p-6 shadow-bento border-2 transition-all ${
                    isFullyUnmasked ? "border-[#4C9DB0]" : "border-[#E6D090]"
                  }`}
                >
                  {/* Poll Header */}
                  <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 pb-4 border-b border-gray-100">
                    <div>
                      <span className="text-[10px] font-black uppercase tracking-wider text-[#4C9DB0] block mb-0.5">
                        {isFullyUnmasked ? "Consensus Reached 🏆" : "Blind Voting Active"}
                      </span>
                      <h3 className="text-lg font-black text-[#173842] tracking-tight">
                        {poll.question}
                      </h3>
                    </div>

                    <div className="flex items-center gap-2">
                      {isFullyUnmasked ? (
                        <span className="px-3 py-1 rounded-full bg-emerald-100 text-emerald-800 text-xs font-black border border-emerald-300 flex items-center gap-1">
                          <Unlock className="w-3.5 h-3.5" />
                          <span>Unmasked ({ballotsCast}/{totalMembers})</span>
                        </span>
                      ) : (
                        <span className="px-3 py-1 rounded-full bg-amber-100 text-amber-900 text-xs font-black border border-amber-300 flex items-center gap-1">
                          <Lock className="w-3.5 h-3.5" />
                          <span>Vote Sealed 🔒 ({ballotsCast}/{totalMembers} voted)</span>
                        </span>
                      )}
                    </div>
                  </div>

                  {/* Progress Indicator */}
                  {!isFullyUnmasked && (
                    <div className="my-3 p-3 rounded-2xl bg-amber-50/70 border border-amber-200 text-xs text-amber-900 flex items-center justify-between">
                      <span className="font-bold">
                        🔒 Results sealed until {pendingCount} more {pendingCount === 1 ? "friend votes" : "friends vote"}
                      </span>
                      <span className="font-bold text-[11px]">
                        {Math.round((ballotsCast / totalMembers) * 100)}% Complete
                      </span>
                    </div>
                  )}

                  {/* Options List */}
                  <div className="space-y-3 mt-4">
                    {poll.options.map((option) => {
                      const isVotedByMe = option.votes.includes(activeMemberId);
                      const isWinner = isFullyUnmasked && option.id === winningOptionId;
                      const percent =
                        totalMembers > 0
                          ? Math.round((option.votes.length / totalMembers) * 100)
                          : 0;

                      return (
                        <div
                          key={option.id}
                          onClick={() => handleVote(poll.id, option.id)}
                          className={`p-4 rounded-2xl border-2 transition-all cursor-pointer relative overflow-hidden ${
                            isWinner
                              ? "bg-emerald-50 border-emerald-400 ring-2 ring-emerald-300 shadow-md"
                              : isVotedByMe
                              ? "bg-[#4C9DB0]/10 border-[#4C9DB0] shadow-sm"
                              : "bg-gray-50/70 border-gray-200 hover:border-[#4C9DB0]"
                          }`}
                        >
                          {/* Unmasked Progress Bar */}
                          {isFullyUnmasked && (
                            <div
                              className="absolute top-0 bottom-0 left-0 bg-emerald-200/40 pointer-events-none transition-all duration-700"
                              style={{ width: `${percent}%` }}
                            />
                          )}

                          <div className="relative z-10 flex items-center justify-between gap-3">
                            <div className="flex items-center gap-3">
                              <div
                                className={`w-6 h-6 rounded-full border-2 flex items-center justify-center transition-all ${
                                  isVotedByMe
                                    ? "bg-[#173842] border-[#173842] text-[#FFEBAF]"
                                    : "border-gray-300 bg-white"
                                }`}
                              >
                                {isVotedByMe && <Check className="w-3.5 h-3.5 stroke-[3]" />}
                              </div>

                              <div>
                                <span className="font-bold text-sm text-[#173842] block">
                                  {option.text}
                                </span>
                                {isWinner && (
                                  <span className="text-[10px] font-black text-emerald-700 uppercase tracking-wider flex items-center gap-1 mt-0.5">
                                    <Trophy className="w-3 h-3 text-emerald-600" />
                                    Consensus Winner
                                  </span>
                                )}
                              </div>
                            </div>

                            <div className="text-right shrink-0">
                              {isFullyUnmasked ? (
                                <span className="font-black text-sm text-[#173842]">
                                  {option.votes.length} votes ({percent}%)
                                </span>
                              ) : (
                                <span className="text-xs font-bold text-gray-400 flex items-center gap-1">
                                  <Lock className="w-3 h-3" />
                                  <span>Masked</span>
                                </span>
                              )}
                            </div>
                          </div>
                        </div>
                      );
                    })}
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </main>

      {/* Create Poll Modal */}
      {showAddPollModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-[#173842]/75 backdrop-blur-md animate-in fade-in duration-200">
          <div className="bg-white rounded-3xl max-w-md w-full p-6 shadow-2xl border-2 border-[#E6D090] text-[#173842] relative animate-in zoom-in-95 duration-200">
            <div className="flex items-center justify-between pb-3 border-b border-[#FFEBAF]">
              <div className="flex items-center gap-2">
                <Vote className="w-5 h-5 text-[#4C9DB0]" />
                <h3 className="font-extrabold text-base text-[#173842]">
                  Create Suggestion Poll
                </h3>
              </div>
              <button
                type="button"
                onClick={() => setShowAddPollModal(false)}
                className="w-8 h-8 rounded-full bg-gray-100 hover:bg-gray-200 flex items-center justify-center font-bold text-xs cursor-pointer"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <form onSubmit={handleAddPoll} className="space-y-4 mt-4">
              <div>
                <label className="block text-xs font-bold text-[#173842] uppercase tracking-wider mb-1">
                  Poll Question / Topic *
                </label>
                <input
                  type="text"
                  required
                  placeholder="e.g. Which sunset cafe should we hit?"
                  value={newQuestion}
                  onChange={(e) => setNewQuestion(e.target.value)}
                  className="w-full px-3.5 py-2.5 rounded-2xl border-2 border-gray-200 focus:border-[#4C9DB0] text-sm font-bold text-[#173842] outline-none"
                />
              </div>

              <div>
                <label className="block text-xs font-bold text-[#173842] uppercase tracking-wider mb-1">
                  Options (at least 2)
                </label>
                <div className="space-y-2">
                  {optionInputs.map((opt, i) => (
                    <input
                      key={i}
                      type="text"
                      placeholder={`Option ${i + 1}`}
                      value={opt}
                      onChange={(e) => {
                        const copy = [...optionInputs];
                        copy[i] = e.target.value;
                        setOptionInputs(copy);
                      }}
                      className="w-full px-3 py-2 rounded-xl border-2 border-gray-200 focus:border-[#4C9DB0] text-xs font-semibold text-[#173842] outline-none"
                    />
                  ))}
                </div>

                {optionInputs.length < 5 && (
                  <button
                    type="button"
                    onClick={() => setOptionInputs([...optionInputs, ""])}
                    className="mt-2 text-xs font-bold text-[#4C9DB0] hover:underline flex items-center gap-1"
                  >
                    <Plus className="w-3.5 h-3.5" />
                    Add Another Option
                  </button>
                )}
              </div>

              <div className="flex gap-2 pt-2">
                <button
                  type="button"
                  onClick={() => setShowAddPollModal(false)}
                  className="w-1/2 py-2.5 rounded-2xl bg-gray-100 hover:bg-gray-200 font-bold text-xs text-gray-700 transition-colors cursor-pointer"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="w-1/2 py-2.5 rounded-2xl bg-[#4C9DB0] hover:bg-[#3D8798] text-white font-extrabold text-xs shadow-md transition-all cursor-pointer"
                >
                  Create Sealed Poll 🔒
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};
