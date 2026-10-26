"use client";

import React, { useState } from "react";
import { Lock, Unlock, Vote, Sparkles, CheckCircle2, Eye, Plus, Check } from "lucide-react";
import { BlindPoll } from "@/lib/types/trip";
import { fireConfetti } from "@/lib/utils/confetti";

interface PollTileProps {
  poll: BlindPoll;
  activeTravelerId: string;
  onVote: (pollId: string, optionId: string, travelerId: string) => void;
  onToggleSeal: (pollId: string) => void;
  onCreatePoll?: (question: string, options: string[]) => void;
}

export const PollTile: React.FC<PollTileProps> = ({
  poll,
  activeTravelerId,
  onVote,
  onToggleSeal,
  onCreatePoll,
}) => {
  const [showNewPollModal, setShowNewPollModal] = useState(false);
  const [newQuestion, setNewQuestion] = useState("");
  const [newOptions, setNewOptions] = useState(["", ""]);

  // Calculate total votes cast
  const totalVotesCast = poll.options.reduce((sum, opt) => sum + opt.votes.length, 0);
  const isAllVoted = totalVotesCast >= poll.totalVotersNeeded;

  // Has current active traveler voted?
  const myVotedOption = poll.options.find((opt) => opt.votes.includes(activeTravelerId));

  // Determine if poll is revealed: if unsealed or all voted
  const isRevealed = !poll.isSealed;

  const handleVoteClick = (optionId: string) => {
    onVote(poll.id, optionId, activeTravelerId);
    fireConfetti();
  };

  const handleRevealToggle = () => {
    onToggleSeal(poll.id);
    if (poll.isSealed) {
      fireConfetti();
    }
  };

  const handleCreatePollSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    const cleanOptions = newOptions.map((o) => o.trim()).filter(Boolean);
    if (newQuestion.trim() && cleanOptions.length >= 2 && onCreatePoll) {
      onCreatePoll(newQuestion.trim(), cleanOptions);
      setNewQuestion("");
      setNewOptions(["", ""]);
      setShowNewPollModal(false);
      fireConfetti();
    }
  };

  return (
    <>
      <div className="relative overflow-hidden bg-white text-[#173842] rounded-3xl p-6 shadow-bento border border-[#E6D090] transition-all duration-300 hover:shadow-bento-hover col-span-1 flex flex-col justify-between group">
        {/* Top Header */}
        <div className="flex items-start justify-between gap-2">
          <div className="flex items-center gap-2">
            <div className="w-9 h-9 rounded-2xl bg-[#FFEBAF] text-[#173842] flex items-center justify-center font-bold shadow-sm">
              <Vote className="w-5 h-5 text-[#2D6B78]" />
            </div>
            <div>
              <span className="text-[10px] font-bold text-[#4C9DB0] uppercase tracking-wider block">
                Blind Group Poll
              </span>
              <span className="text-xs font-semibold text-[#173842]">Sealed Consensus</span>
            </div>
          </div>

          {/* Pulse Sealed Counter Badge */}
          <div
            className={`inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-extrabold shadow-sm transition-all ${
              isRevealed
                ? "bg-[#2D6B78] text-white border border-[#2D6B78]"
                : "bg-[#173842] text-[#FFEBAF] border border-[#FFEBAF]/40 animate-pulse-glow"
            }`}
          >
            {isRevealed ? (
              <>
                <Unlock className="w-3.5 h-3.5 text-[#FFEBAF]" />
                <span>Revealed</span>
              </>
            ) : (
              <>
                <Lock className="w-3.5 h-3.5 text-[#FFEBAF]" />
                <span>
                  {totalVotesCast}/{poll.totalVotersNeeded} Voted 🔒
                </span>
              </>
            )}
          </div>
        </div>

        {/* Question Title */}
        <div className="my-3">
          <h3 className="text-sm sm:text-base font-extrabold text-[#173842] leading-snug line-clamp-2">
            &ldquo;{poll.question}&rdquo;
          </h3>
        </div>

        {/* Options List */}
        <div className="space-y-2 my-1">
          {poll.options.map((opt) => {
            const isMyVote = myVotedOption?.id === opt.id;
            const voteCount = opt.votes.length;
            const percentage =
              totalVotesCast > 0 ? Math.round((voteCount / totalVotesCast) * 100) : 0;

            return (
              <button
                key={opt.id}
                type="button"
                onClick={() => handleVoteClick(opt.id)}
                className={`w-full relative overflow-hidden rounded-2xl p-2.5 sm:p-3 text-left transition-all cursor-pointer border flex flex-col justify-center ${
                  isMyVote
                    ? "border-[#4C9DB0] bg-[#4C9DB0]/10 shadow-sm"
                    : "border-gray-200 hover:border-gray-300 bg-white"
                }`}
              >
                {/* Visual percentage bar when revealed */}
                {isRevealed && (
                  <div
                    className="absolute inset-y-0 left-0 bg-[#4C9DB0]/20 rounded-2xl transition-all duration-500 ease-out"
                    style={{ width: `${percentage}%` }}
                  />
                )}

                <div className="relative z-10 flex items-center justify-between text-xs">
                  <div className="flex items-center gap-2 truncate pr-2">
                    <span
                      className={`w-4 h-4 rounded-full border flex items-center justify-center shrink-0 ${
                        isMyVote
                          ? "bg-[#4C9DB0] border-[#4C9DB0] text-white"
                          : "border-gray-300"
                      }`}
                    >
                      {isMyVote && <Check className="w-3 h-3 stroke-[3]" />}
                    </span>
                    <span
                      className={`truncate font-medium ${
                        isMyVote ? "font-bold text-[#173842]" : "text-gray-700"
                      }`}
                    >
                      {opt.text}
                    </span>
                  </div>

                  {/* Status: Sealed blur or revealed percentage */}
                  {isRevealed ? (
                    <span className="font-extrabold text-[#2D6B78] shrink-0 text-xs">
                      {percentage}% ({voteCount})
                    </span>
                  ) : (
                    <span className="text-[10px] px-2 py-0.5 rounded-full bg-gray-100 text-gray-500 font-semibold shrink-0">
                      🔒 Sealed
                    </span>
                  )}
                </div>
              </button>
            );
          })}
        </div>

        {/* Footer actions: Toggle Reveal or Quick info */}
        <div className="mt-3 pt-3 border-t border-gray-100 flex items-center justify-between text-xs">
          <button
            type="button"
            onClick={handleRevealToggle}
            className="flex items-center gap-1.5 font-bold text-[#2D6B78] hover:text-[#173842] transition-colors cursor-pointer"
          >
            {isRevealed ? (
              <>
                <Lock className="w-3.5 h-3.5" />
                <span>Re-seal Poll</span>
              </>
            ) : (
              <>
                <Eye className="w-3.5 h-3.5" />
                <span>{isAllVoted ? "Unseal Results 🎉" : "Reveal Early"}</span>
              </>
            )}
          </button>

          {onCreatePoll && (
            <button
              type="button"
              onClick={() => setShowNewPollModal(true)}
              className="text-[11px] font-semibold text-gray-500 hover:text-[#173842] flex items-center gap-1 cursor-pointer"
            >
              <Plus className="w-3 h-3" />
              New Poll
            </button>
          )}
        </div>
      </div>

      {/* New Poll Modal */}
      {showNewPollModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-[#173842]/70 backdrop-blur-md animate-in fade-in duration-200">
          <div className="bg-white rounded-3xl max-w-md w-full p-6 shadow-2xl border border-[#E6D090] text-[#173842] relative animate-in zoom-in-95 duration-200">
            <h3 className="text-lg font-extrabold text-[#173842] mb-3">Create Sealed Blind Poll</h3>
            <form onSubmit={handleCreatePollSubmit} className="space-y-3.5">
              <div>
                <label className="block text-xs font-bold text-[#173842] uppercase tracking-wider mb-1">
                  Poll Question
                </label>
                <input
                  type="text"
                  required
                  placeholder="e.g. Tomorrow Sunrise: 6 AM Trek or Sleep In?"
                  value={newQuestion}
                  onChange={(e) => setNewQuestion(e.target.value)}
                  className="w-full px-3.5 py-2.5 rounded-2xl border-2 border-gray-200 focus:border-[#4C9DB0] text-sm text-[#173842] outline-none"
                />
              </div>

              <div>
                <label className="block text-xs font-bold text-[#173842] uppercase tracking-wider mb-1">
                  Options
                </label>
                <div className="space-y-2">
                  {newOptions.map((opt, i) => (
                    <input
                      key={i}
                      type="text"
                      required
                      placeholder={`Option ${i + 1}`}
                      value={opt}
                      onChange={(e) => {
                        const copy = [...newOptions];
                        copy[i] = e.target.value;
                        setNewOptions(copy);
                      }}
                      className="w-full px-3.5 py-2 rounded-xl border border-gray-200 focus:border-[#4C9DB0] text-xs text-[#173842] outline-none"
                    />
                  ))}
                </div>
                {newOptions.length < 4 && (
                  <button
                    type="button"
                    onClick={() => setNewOptions([...newOptions, ""])}
                    className="mt-2 text-xs font-bold text-[#2D6B78] hover:underline"
                  >
                    + Add Option
                  </button>
                )}
              </div>

              <div className="flex gap-2 pt-2">
                <button
                  type="button"
                  onClick={() => setShowNewPollModal(false)}
                  className="w-1/2 py-2.5 rounded-2xl bg-gray-100 text-xs font-semibold text-gray-700"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="w-1/2 py-2.5 rounded-2xl bg-[#4C9DB0] hover:bg-[#3D8798] text-white text-xs font-bold shadow-md cursor-pointer"
                >
                  Create & Seal 🔒
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </>
  );
};
