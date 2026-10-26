"use client";

import React, { useState } from "react";
import { Navigation, MapPin, Clock, ExternalLink, CheckCircle, ChevronRight, Plus, Sparkles, X } from "lucide-react";
import { ItineraryStop } from "@/lib/types/trip";
import { fireConfetti } from "@/lib/utils/confetti";

interface NextStopTileProps {
  stops: ItineraryStop[];
  onAdvanceStop?: (stopId: string) => void;
  onAddStop?: (stop: Omit<ItineraryStop, "id">) => void;
}

export const NextStopTile: React.FC<NextStopTileProps> = ({
  stops,
  onAdvanceStop,
  onAddStop,
}) => {
  const [showTimelineModal, setShowTimelineModal] = useState(false);
  const [showAddModal, setShowAddModal] = useState(false);
  const [newTitle, setNewTitle] = useState("");
  const [newLocation, setNewLocation] = useState("");
  const [newEta, setNewEta] = useState("");
  const [newCategory, setNewCategory] = useState<ItineraryStop["category"]>("scenic");

  // Current active stop is the first one with status 'active', or first 'upcoming'
  const activeStop = stops.find((s) => s.status === "active") || stops.find((s) => s.status === "upcoming") || stops[0];

  const handleLaunchMaps = (query: string) => {
    const url = `https://www.google.com/maps/dir/?api=1&destination=${encodeURIComponent(query)}`;
    window.open(url, "_blank", "noopener,noreferrer");
  };

  const handleAddStopSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (newTitle.trim() && newLocation.trim() && onAddStop) {
      onAddStop({
        title: newTitle.trim(),
        locationName: newLocation.trim(),
        mapsQuery: newLocation.trim(),
        eta: newEta || "TBD",
        status: "upcoming",
        category: newCategory,
        notes: "Added to trip stops",
        distanceKm: 5.0,
      });
      setNewTitle("");
      setNewLocation("");
      setNewEta("");
      setShowAddModal(false);
      fireConfetti();
    }
  };

  return (
    <>
      {/* 1-Col Next Stop Bento Tile */}
      <div className="relative overflow-hidden bg-white text-[#173842] rounded-3xl p-6 shadow-bento border border-[#E6D090] col-span-1 flex flex-col justify-between transition-all duration-300 hover:shadow-bento-hover group">
        <div className="flex items-start justify-between">
          <div className="flex items-center gap-2">
            <div className="w-10 h-10 rounded-2xl bg-[#4C9DB0] text-white flex items-center justify-center shadow-md group-hover:scale-105 transition-transform">
              <Navigation className="w-5 h-5 stroke-[2.2]" />
            </div>
            <div>
              <span className="text-[10px] font-bold text-[#4C9DB0] uppercase tracking-wider block">
                Next Destination
              </span>
              <span className="text-xs font-semibold text-[#173842]">Live Itinerary</span>
            </div>
          </div>

          <button
            onClick={() => setShowTimelineModal(true)}
            className="text-[11px] font-bold text-[#2D6B78] hover:text-[#173842] flex items-center gap-0.5 cursor-pointer"
          >
            All Stops ({stops.length})
            <ChevronRight className="w-3.5 h-3.5" />
          </button>
        </div>

        {/* Current Stop Content */}
        {activeStop ? (
          <div className="my-4 space-y-2">
            <div className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full bg-[#FFEBAF] text-[#173842] text-[10px] font-bold border border-[#E6D090]">
              <Clock className="w-3 h-3 text-[#2D6B78]" />
              ETA: {activeStop.eta} • {activeStop.distanceKm || 4.2} km
            </div>

            <h3 className="text-base sm:text-lg font-extrabold text-[#173842] leading-tight line-clamp-2">
              {activeStop.title}
            </h3>

            <p className="text-xs text-gray-500 flex items-center gap-1 truncate">
              <MapPin className="w-3.5 h-3.5 text-[#4C9DB0] shrink-0" />
              <span className="truncate">{activeStop.locationName}</span>
            </p>
          </div>
        ) : (
          <div className="my-4 text-xs text-gray-400">No stops scheduled yet.</div>
        )}

        {/* 1-Tap Google Maps Intent Button */}
        <div className="pt-2 border-t border-gray-100 flex gap-2">
          {activeStop && (
            <button
              type="button"
              onClick={() => handleLaunchMaps(activeStop.mapsQuery || activeStop.locationName)}
              className="w-full py-2.5 px-4 rounded-2xl bg-[#173842] hover:bg-[#235560] text-[#FFEBAF] font-bold text-xs shadow-md active:scale-95 transition-all flex items-center justify-center gap-2 cursor-pointer"
            >
              <Navigation className="w-4 h-4 fill-current" />
              <span>1-Tap Google Maps</span>
              <ExternalLink className="w-3.5 h-3.5 opacity-70" />
            </button>
          )}
        </div>
      </div>

      {/* Timeline Modal */}
      {showTimelineModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-[#173842]/70 backdrop-blur-md animate-in fade-in duration-200">
          <div className="bg-white rounded-3xl max-w-lg w-full max-h-[90vh] overflow-y-auto p-6 shadow-2xl border border-[#E6D090] text-[#173842] relative animate-in zoom-in-95 duration-200">
            <div className="flex justify-between items-center pb-3 border-b border-[#FFEBAF]">
              <div className="flex items-center gap-2">
                <Navigation className="w-5 h-5 text-[#4C9DB0]" />
                <h3 className="text-lg font-extrabold text-[#173842]">Trip Chronology & Routing</h3>
              </div>
              <button
                onClick={() => setShowTimelineModal(false)}
                className="w-8 h-8 rounded-full bg-gray-100 hover:bg-gray-200 text-[#173842] flex items-center justify-center font-bold text-sm"
              >
                ✕
              </button>
            </div>

            <div className="my-4 space-y-3">
              {stops.map((stop, idx) => (
                <div
                  key={stop.id}
                  className={`p-3.5 rounded-2xl border transition-all ${
                    stop.status === "active"
                      ? "border-[#4C9DB0] bg-[#4C9DB0]/10 shadow-sm"
                      : stop.status === "completed"
                      ? "border-gray-200 bg-gray-50 opacity-60"
                      : "border-gray-200 hover:border-gray-300"
                  }`}
                >
                  <div className="flex items-start justify-between gap-2">
                    <div className="flex items-start gap-2.5">
                      <span className="w-6 h-6 rounded-full bg-[#173842] text-[#FFEBAF] font-bold text-xs flex items-center justify-center shrink-0 mt-0.5">
                        {idx + 1}
                      </span>
                      <div>
                        <h4 className="font-bold text-sm text-[#173842]">{stop.title}</h4>
                        <div className="flex items-center gap-2 text-xs text-gray-500 mt-0.5">
                          <span className="flex items-center gap-1">
                            <Clock className="w-3 h-3 text-[#4C9DB0]" />
                            {stop.eta}
                          </span>
                          <span>•</span>
                          <span>{stop.locationName}</span>
                        </div>
                      </div>
                    </div>

                    <div className="flex items-center gap-1.5 shrink-0">
                      <button
                        onClick={() => handleLaunchMaps(stop.mapsQuery || stop.locationName)}
                        className="p-2 rounded-xl bg-gray-100 hover:bg-[#FFEBAF] text-[#173842] transition-colors"
                        title="Open in Maps"
                      >
                        <ExternalLink className="w-4 h-4" />
                      </button>

                      {onAdvanceStop && stop.status !== "completed" && (
                        <button
                          onClick={() => {
                            onAdvanceStop(stop.id);
                            fireConfetti();
                          }}
                          className="px-2.5 py-1.5 rounded-xl bg-[#4C9DB0] hover:bg-[#3D8798] text-white text-xs font-bold"
                        >
                          Mark Done
                        </button>
                      )}
                    </div>
                  </div>
                </div>
              ))}
            </div>

            <div className="pt-2 flex justify-between items-center border-t border-gray-100">
              <button
                onClick={() => {
                  setShowTimelineModal(false);
                  setShowAddModal(true);
                }}
                className="text-xs font-bold text-[#2D6B78] hover:underline flex items-center gap-1"
              >
                <Plus className="w-3.5 h-3.5" />
                Add New Stop
              </button>
              <button
                onClick={() => setShowTimelineModal(false)}
                className="px-4 py-2 rounded-2xl bg-gray-100 text-xs font-bold text-gray-700"
              >
                Close
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Add Stop Modal */}
      {showAddModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-[#173842]/70 backdrop-blur-md animate-in fade-in duration-200">
          <div className="bg-white rounded-3xl max-w-md w-full p-6 shadow-2xl border border-[#E6D090] text-[#173842] relative animate-in zoom-in-95 duration-200">
            <h3 className="text-lg font-extrabold text-[#173842] mb-3">Add Itinerary Stop</h3>
            <form onSubmit={handleAddStopSubmit} className="space-y-3.5">
              <div>
                <label className="block text-xs font-bold text-[#173842] uppercase tracking-wider mb-1">
                  Destination Title
                </label>
                <input
                  type="text"
                  required
                  placeholder="e.g. Curlies Beach Shack"
                  value={newTitle}
                  onChange={(e) => setNewTitle(e.target.value)}
                  className="w-full px-3.5 py-2.5 rounded-2xl border-2 border-gray-200 focus:border-[#4C9DB0] text-sm text-[#173842] outline-none"
                />
              </div>

              <div>
                <label className="block text-xs font-bold text-[#173842] uppercase tracking-wider mb-1">
                  Location / Maps Address
                </label>
                <input
                  type="text"
                  required
                  placeholder="e.g. Anjuna Beach, Goa"
                  value={newLocation}
                  onChange={(e) => setNewLocation(e.target.value)}
                  className="w-full px-3.5 py-2.5 rounded-2xl border-2 border-gray-200 focus:border-[#4C9DB0] text-sm text-[#173842] outline-none"
                />
              </div>

              <div className="grid grid-cols-2 gap-2">
                <div>
                  <label className="block text-xs font-bold text-[#173842] uppercase tracking-wider mb-1">
                    ETA Time
                  </label>
                  <input
                    type="text"
                    placeholder="e.g. 08:30 PM"
                    value={newEta}
                    onChange={(e) => setNewEta(e.target.value)}
                    className="w-full px-3.5 py-2.5 rounded-2xl border-2 border-gray-200 focus:border-[#4C9DB0] text-sm text-[#173842] outline-none"
                  />
                </div>
                <div>
                  <label className="block text-xs font-bold text-[#173842] uppercase tracking-wider mb-1">
                    Category
                  </label>
                  <select
                    value={newCategory}
                    onChange={(e) => setNewCategory(e.target.value as ItineraryStop["category"])}
                    className="w-full px-3 py-2.5 rounded-2xl border-2 border-gray-200 focus:border-[#4C9DB0] text-xs text-[#173842] outline-none"
                  >
                    <option value="scenic">Scenic 🌅</option>
                    <option value="food">Food & Drinks 🍤</option>
                    <option value="activity">Adventure / Activity 🏄</option>
                    <option value="stay">Stay / Villa 🏨</option>
                  </select>
                </div>
              </div>

              <div className="flex gap-2 pt-2">
                <button
                  type="button"
                  onClick={() => setShowAddModal(false)}
                  className="w-1/2 py-2.5 rounded-2xl bg-gray-100 text-xs font-semibold text-gray-700"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="w-1/2 py-2.5 rounded-2xl bg-[#4C9DB0] hover:bg-[#3D8798] text-white text-xs font-bold shadow-md cursor-pointer"
                >
                  Save Stop
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </>
  );
};
