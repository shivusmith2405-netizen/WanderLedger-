"use client";

import React, { useState, useEffect } from "react";
import Link from "next/link";
import {
  Compass,
  ArrowLeft,
  Navigation,
  MapPin,
  Clock,
  Plus,
  Trash2,
  ExternalLink,
  Sparkles,
  Share2,
  Check,
  X,
  Vote,
  ArrowRightLeft,
} from "lucide-react";
import {
  fetchLiveTripBySlug,
  createItineraryPlace,
  deleteItineraryPlace,
  subscribeToTripTables,
  LiveTripRecord,
  ItineraryPlaceRecord,
} from "@/lib/supabase/tripService";
import { fireConfetti } from "@/lib/utils/confetti";

interface ItineraryPlanViewProps {
  slug: string;
}

export const ItineraryPlanView: React.FC<ItineraryPlanViewProps> = ({ slug }) => {
  const [mounted, setMounted] = useState(false);
  const [loading, setLoading] = useState(true);
  const [trip, setTrip] = useState<LiveTripRecord | null>(null);
  const [activeMemberId, setActiveMemberId] = useState<string>("");

  // Modal State
  const [showAddModal, setShowAddModal] = useState(false);
  const [placeName, setPlaceName] = useState("");
  const [timeLabel, setTimeLabel] = useState("");
  const [notes, setNotes] = useState("");
  const [isSaving, setIsSaving] = useState(false);
  const [toastMessage, setToastMessage] = useState<string | null>(null);

  const showToast = (msg: string) => {
    setToastMessage(msg);
    setTimeout(() => setToastMessage(null), 3000);
  };

  const loadTripData = async () => {
    const data = await fetchLiveTripBySlug(slug);
    if (data) {
      setTrip(data);
      // Read persona from localStorage or pick first
      const storedMember = localStorage.getItem(`wanderledger_active_member_${slug}`);
      if (storedMember && data.members.some((m) => m.id === storedMember)) {
        setActiveMemberId(storedMember);
      } else if (data.members.length > 0) {
        setActiveMemberId(data.members[0].id);
        localStorage.setItem(`wanderledger_active_member_${slug}`, data.members[0].id);
      }
    }
    setLoading(false);
  };

  useEffect(() => {
    setMounted(true);
    loadTripData();
  }, [slug]);

  // Realtime Postgres subscription
  useEffect(() => {
    if (!trip?.id) return;
    const unsubscribe = subscribeToTripTables(trip.id, () => {
      loadTripData();
    });
    return () => unsubscribe();
  }, [trip?.id]);

  const handleSelectPersona = (memberId: string) => {
    setActiveMemberId(memberId);
    localStorage.setItem(`wanderledger_active_member_${slug}`, memberId);
    const mem = trip?.members.find((m) => m.id === memberId);
    showToast(`Viewing as ${mem?.name || "Traveler"}`);
  };

  const handleAddPlaceSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!trip?.id || !placeName.trim()) return;

    setIsSaving(true);
    try {
      await createItineraryPlace({
        tripId: trip.id,
        placeName: placeName.trim(),
        timeLabel: timeLabel.trim() || null,
        notes: notes.trim() || null,
      });

      setPlaceName("");
      setTimeLabel("");
      setNotes("");
      setShowAddModal(false);
      fireConfetti();
      showToast("Place saved to Supabase itinerary_places! 📍");
      await loadTripData();
    } catch (err: any) {
      console.error(err);
      showToast(err.message || "Failed to save place");
    } finally {
      setIsSaving(false);
    }
  };

  const handleDeletePlace = async (placeId: string, name: string) => {
    const ok = await deleteItineraryPlace(placeId);
    if (ok) {
      showToast(`Removed ${name}`);
      await loadTripData();
    }
  };

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
                <Navigation className="w-5 h-5 stroke-[2.5]" />
              </div>
              <div>
                <h1 className="text-base sm:text-lg font-black text-[#173842] tracking-tight">
                  Itinerary &amp; Waypoints
                </h1>
                <p className="text-[11px] font-semibold text-[#4F7682] truncate max-w-xs">
                  {trip?.title || slug} • {trip?.destination}
                </p>
              </div>
            </div>
          </div>

          {/* Quick Nav & Persona Selector */}
          <div className="flex items-center gap-2 overflow-x-auto no-scrollbar py-0.5">
            <Link
              href={`/t/${slug}/vote`}
              className="px-3 py-1.5 rounded-xl bg-white/80 hover:bg-white text-[#173842] text-xs font-bold border border-[#E6D090] shadow-xs flex items-center gap-1.5 transition-all cursor-pointer shrink-0"
            >
              <Vote className="w-3.5 h-3.5 text-[#4C9DB0]" />
              <span>Polls</span>
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
                  Viewing:
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
        {/* Banner with Add Place Trigger */}
        <div className="bg-white rounded-3xl p-6 shadow-bento border-2 border-[#E6D090] flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <div>
            <span className="text-[10px] font-black uppercase tracking-wider text-[#4C9DB0] block mb-0.5">
              Google Maps Live Waypoints
            </span>
            <h2 className="text-xl sm:text-2xl font-black text-[#173842] tracking-tight">
              Trip Places &amp; Chronology
            </h2>
            <p className="text-xs text-gray-500 mt-1">
              Add stops, trails, restaurants, or villas. Every waypoint includes a 1-tap Google Maps directions intent.
            </p>
          </div>

          <button
            type="button"
            onClick={() => setShowAddModal(true)}
            className="px-4 py-2.5 rounded-2xl bg-[#173842] hover:bg-[#235560] text-[#FFEBAF] font-black text-xs sm:text-sm shadow-md active:scale-95 transition-all flex items-center justify-center gap-1.5 cursor-pointer shrink-0"
          >
            <Plus className="w-4 h-4 stroke-[3]" />
            <span>Add Place</span>
          </button>
        </div>

        {/* Places List */}
        {loading ? (
          <div className="p-8 text-center bg-white/70 rounded-3xl border border-[#E6D090] text-xs font-bold text-gray-500">
            Syncing itinerary from Supabase...
          </div>
        ) : !trip?.places || trip.places.length === 0 ? (
          <div className="p-10 text-center bg-white rounded-3xl border-2 border-dashed border-[#E6D090] text-[#173842] space-y-3">
            <div className="w-12 h-12 rounded-2xl bg-[#FFEBAF] flex items-center justify-center mx-auto text-2xl shadow-sm">
              📍
            </div>
            <h3 className="text-base font-extrabold text-[#173842]">
              No places scheduled yet
            </h3>
            <p className="text-xs text-gray-500 max-w-sm mx-auto">
              Add your first destination, beach shack, viewpoint, or meetup spot to kick off the trip route.
            </p>
            <button
              type="button"
              onClick={() => setShowAddModal(true)}
              className="px-4 py-2 rounded-2xl bg-[#4C9DB0] text-white font-bold text-xs shadow-md transition-all cursor-pointer"
            >
              + Add First Place
            </button>
          </div>
        ) : (
          <div className="space-y-3">
            {trip.places.map((place, idx) => (
              <div
                key={place.id}
                className="bg-white rounded-3xl p-5 shadow-sm border border-gray-200 hover:border-[#4C9DB0] transition-all flex flex-col sm:flex-row sm:items-center justify-between gap-4 group"
              >
                <div className="flex items-start gap-3.5">
                  <span className="w-8 h-8 rounded-2xl bg-[#173842] text-[#FFEBAF] font-black text-xs flex items-center justify-center shrink-0 mt-0.5 shadow-sm">
                    {idx + 1}
                  </span>
                  <div>
                    <h4 className="text-base font-extrabold text-[#173842] group-hover:text-[#2D6B78] transition-colors">
                      {place.place_name}
                    </h4>

                    <div className="flex flex-wrap items-center gap-x-2 gap-y-0.5 text-xs text-gray-500 mt-1">
                      {place.time_label && (
                        <span className="flex items-center gap-1 font-semibold text-[#4C9DB0]">
                          <Clock className="w-3.5 h-3.5" />
                          {place.time_label}
                        </span>
                      )}
                      {place.notes && (
                        <>
                          <span>•</span>
                          <span className="italic text-gray-600">{place.notes}</span>
                        </>
                      )}
                    </div>
                  </div>
                </div>

                {/* 1-Tap Google Maps Intent */}
                <div className="flex items-center gap-2 shrink-0 self-end sm:self-auto">
                  <a
                    href={
                      place.maps_url ||
                      `https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(place.place_name)}`
                    }
                    target="_blank"
                    rel="noopener noreferrer"
                    className="px-3.5 py-2 rounded-2xl bg-[#173842] hover:bg-[#235560] text-[#FFEBAF] font-bold text-xs flex items-center gap-1.5 shadow-md active:scale-95 transition-all cursor-pointer"
                  >
                    <Navigation className="w-3.5 h-3.5 fill-current" />
                    <span>Navigate via Google Maps</span>
                    <ExternalLink className="w-3 h-3 opacity-70" />
                  </a>

                  <button
                    type="button"
                    onClick={() => handleDeletePlace(place.id, place.place_name)}
                    className="p-2 rounded-2xl hover:bg-rose-50 text-gray-400 hover:text-rose-600 border border-transparent hover:border-rose-200 transition-colors cursor-pointer"
                    title="Remove Waypoint"
                  >
                    <Trash2 className="w-4 h-4" />
                  </button>
                </div>
              </div>
            ))}
          </div>
        )}
      </main>

      {/* Add Place Modal */}
      {showAddModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-[#173842]/75 backdrop-blur-md animate-in fade-in duration-200">
          <div className="bg-white rounded-3xl max-w-md w-full p-6 shadow-2xl border-2 border-[#E6D090] text-[#173842] relative animate-in zoom-in-95 duration-200">
            <div className="flex items-center justify-between pb-3 border-b border-[#FFEBAF]">
              <div className="flex items-center gap-2">
                <MapPin className="w-5 h-5 text-[#4C9DB0]" />
                <h3 className="font-extrabold text-base text-[#173842]">
                  Add Waypoint to Itinerary
                </h3>
              </div>
              <button
                type="button"
                onClick={() => setShowAddModal(false)}
                className="w-8 h-8 rounded-full bg-gray-100 hover:bg-gray-200 flex items-center justify-center font-bold text-xs cursor-pointer"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <form onSubmit={handleAddPlaceSubmit} className="space-y-4 mt-4">
              <div>
                <label className="block text-xs font-bold text-[#173842] uppercase tracking-wider mb-1">
                  Place / Location Name *
                </label>
                <input
                  type="text"
                  required
                  placeholder="e.g. Curlies Beach Shack, Anjuna"
                  value={placeName}
                  onChange={(e) => setPlaceName(e.target.value)}
                  className="w-full px-3.5 py-2.5 rounded-2xl border-2 border-gray-200 focus:border-[#4C9DB0] text-sm font-bold text-[#173842] outline-none"
                />
              </div>

              <div>
                <label className="block text-xs font-bold text-[#173842] uppercase tracking-wider mb-1">
                  Time / Schedule Order
                </label>
                <input
                  type="text"
                  placeholder="e.g. Day 1, 05:30 PM (Sunset)"
                  value={timeLabel}
                  onChange={(e) => setTimeLabel(e.target.value)}
                  className="w-full px-3.5 py-2.5 rounded-2xl border-2 border-gray-200 focus:border-[#4C9DB0] text-sm text-[#173842] outline-none"
                />
              </div>

              <div>
                <label className="block text-xs font-bold text-[#173842] uppercase tracking-wider mb-1">
                  Notes / Activities
                </label>
                <textarea
                  rows={2}
                  placeholder="e.g. Pre-booked shack table, beach walk & seafood"
                  value={notes}
                  onChange={(e) => setNotes(e.target.value)}
                  className="w-full px-3.5 py-2 rounded-2xl border-2 border-gray-200 focus:border-[#4C9DB0] text-xs text-[#173842] outline-none"
                />
              </div>

              <div className="flex gap-2 pt-2">
                <button
                  type="button"
                  onClick={() => setShowAddModal(false)}
                  className="w-1/2 py-2.5 rounded-2xl bg-gray-100 hover:bg-gray-200 font-bold text-xs text-gray-700 transition-colors cursor-pointer"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={isSaving}
                  className="w-1/2 py-2.5 rounded-2xl bg-[#4C9DB0] hover:bg-[#3D8798] text-white font-extrabold text-xs shadow-md transition-all cursor-pointer disabled:opacity-50"
                >
                  {isSaving ? "Saving..." : "Save Place"}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};
