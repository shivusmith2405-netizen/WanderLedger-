import { getSupabaseClient, safeSupabaseQuery } from "./client";
import { DEFAULT_TRIP_DATA } from "../data/initialTripData";

export interface TripMemberRecord {
  id: string;
  trip_id: string;
  name: string;
  initial_budget: number;
  upi_id: string;
  created_at: string;
  // Computed helpers for UI
  avatar: string;
  pledgedAmount: number; // alias for initial_budget
}

export interface ExpenseSplitRecord {
  id: string;
  expense_id: string;
  member_id: string;
  share_amount: number;
}

export interface ExpenseRecord {
  id: string;
  trip_id: string;
  payer_id: string;
  amount: number;
  title: string;
  receipt_url: string | null;
  created_at: string;
  // Hydrated helpers
  payerName?: string;
  payerAvatar?: string;
  splitMemberIds: string[];
  splits: ExpenseSplitRecord[];
}

export interface ItineraryPlaceRecord {
  id: string;
  trip_id: string;
  place_name: string;
  time_label: string | null;
  maps_url: string | null;
  notes: string | null;
  created_at: string;
}

export interface GroupPollRecord {
  id: string;
  trip_id: string;
  question: string;
  options: Array<{ id: string; text: string }>;
  votes: Record<string, string>; // member_id -> option_id
  is_revealed: boolean;
  created_at: string;
}

export interface LiveTripRecord {
  id: string;
  slug: string;
  title: string;
  destination: string;
  created_at: string;
  members: TripMemberRecord[];
  expenses: ExpenseRecord[];
  places: ItineraryPlaceRecord[];
  polls?: GroupPollRecord[];
}

const AVATAR_POOL = ["🏄‍♂️", "🌺", "🛵", "📸", "🏕️", "🧗", "⛵", "🎸", "🌅", "🤿", "☕", "🏂"];

export function getDeterministicAvatar(name: string, index: number = 0): string {
  if (!name) return AVATAR_POOL[index % AVATAR_POOL.length];
  let hash = 0;
  for (let i = 0; i < name.length; i++) {
    hash = (hash << 5) - hash + name.charCodeAt(i);
  }
  return AVATAR_POOL[Math.abs(hash) % AVATAR_POOL.length];
}

/**
 * Creates a brand new trip with dynamic members in Supabase tables `trips` & `trip_members`.
 * Gracefully persists to local cache if network/Supabase is offline or paused.
 */
export async function createLiveTrip(input: {
  slug: string;
  title: string;
  destination: string;
  members: Array<{
    name: string;
    initialBudget: number;
    upiId: string;
  }>;
}): Promise<LiveTripRecord> {
  const supabase = getSupabaseClient();
  const tripId = `trip-${Date.now()}-${Math.random().toString(36).slice(2, 7)}`;
  const now = new Date().toISOString();

  const preparedMembers: TripMemberRecord[] = input.members.map((m, idx) => ({
    id: `mem-${Date.now()}-${idx}-${Math.random().toString(36).slice(2, 6)}`,
    trip_id: tripId,
    name: m.name.trim() || `Traveler ${idx + 1}`,
    initial_budget: Number(m.initialBudget) || 0,
    upi_id: m.upiId.trim() || `${(m.name || "friend").toLowerCase().replace(/[^a-z0-9]/g, "")}@upi`,
    created_at: now,
    avatar: getDeterministicAvatar(m.name, idx),
    pledgedAmount: Number(m.initialBudget) || 0,
  }));

  const localTripRecord: LiveTripRecord = {
    id: tripId,
    slug: input.slug,
    title: input.title,
    destination: input.destination,
    created_at: now,
    members: preparedMembers,
    expenses: [],
    places: [],
  };

  // Always save to local cache for instant zero-latency resilience
  if (typeof window !== "undefined") {
    try {
      localStorage.setItem(`wanderledger_trip_${input.slug}`, JSON.stringify(localTripRecord));
    } catch {
      // ignore
    }
  }

  // Attempt Supabase insert if configured
  if (supabase) {
    try {
      const { data: tripData, error: tripErr } = await supabase
        .from("trips")
        .insert({
          slug: input.slug,
          title: input.title,
          destination: input.destination,
        })
        .select()
        .single();

      if (!tripErr && tripData) {
        const liveTripId = tripData.id;
        const membersToInsert = input.members.map((m) => ({
          trip_id: liveTripId,
          name: m.name.trim() || "Traveler",
          initial_budget: Number(m.initialBudget) || 0,
          upi_id: m.upiId.trim() || `${m.name.toLowerCase().replace(/[^a-z0-9]/g, "")}@upi`,
        }));

        const { data: insertedMembers } = await supabase
          .from("trip_members")
          .insert(membersToInsert)
          .select();

        const liveMembers: TripMemberRecord[] = (insertedMembers || []).map((m: any, idx: number) => ({
          id: m.id,
          trip_id: m.trip_id,
          name: m.name,
          initial_budget: Number(m.initial_budget) || 0,
          upi_id: m.upi_id || "",
          created_at: m.created_at,
          avatar: getDeterministicAvatar(m.name, idx),
          pledgedAmount: Number(m.initial_budget) || 0,
        }));

        const finalRecord: LiveTripRecord = {
          id: tripData.id,
          slug: tripData.slug,
          title: tripData.title,
          destination: tripData.destination,
          created_at: tripData.created_at,
          members: liveMembers.length > 0 ? liveMembers : preparedMembers,
          expenses: [],
          places: [],
        };

        if (typeof window !== "undefined") {
          try {
            localStorage.setItem(`wanderledger_trip_${input.slug}`, JSON.stringify(finalRecord));
          } catch {
            // ignore
          }
        }

        return finalRecord;
      }
    } catch (err) {
      console.warn("Supabase createLiveTrip caught error (using resilient fallback):", err);
    }
  }

  return localTripRecord;
}

/**
 * Loads a trip and all its members, expenses, splits, and itinerary places directly from Supabase.
 * If Supabase is offline or empty, resolves to locally saved trips or default sample trips.
 */
export async function fetchLiveTripBySlug(slug: string): Promise<LiveTripRecord | null> {
  const supabase = getSupabaseClient();

  // 1. Try Supabase query first with error boundaries
  if (supabase) {
    try {
      const { data: trip, error: tripErr } = await supabase
        .from("trips")
        .select("*")
        .eq("slug", slug)
        .maybeSingle();

      if (!tripErr && trip) {
        const tripId = trip.id;

        // Fetch members, expenses, and itinerary places
        const [membersRes, expensesRes, placesRes] = await Promise.all([
          safeSupabaseQuery<any[]>(
            supabase
              .from("trip_members")
              .select("*")
              .eq("trip_id", tripId)
              .order("created_at", { ascending: true }),
            []
          ),
          safeSupabaseQuery<any[]>(
            supabase
              .from("expenses")
              .select("*")
              .eq("trip_id", tripId)
              .order("created_at", { ascending: false }),
            []
          ),
          safeSupabaseQuery<any[]>(
            supabase
              .from("itinerary_places")
              .select("*")
              .eq("trip_id", tripId)
              .order("created_at", { ascending: true }),
            []
          ),
        ]);

        const memberMap = new Map<string, TripMemberRecord>();
        const members: TripMemberRecord[] = (membersRes.data || []).map((m: any, idx: number) => {
          const record: TripMemberRecord = {
            id: m.id,
            trip_id: m.trip_id,
            name: m.name,
            initial_budget: Number(m.initial_budget) || 0,
            upi_id: m.upi_id || "",
            created_at: m.created_at,
            avatar: getDeterministicAvatar(m.name, idx),
            pledgedAmount: Number(m.initial_budget) || 0,
          };
          memberMap.set(m.id, record);
          return record;
        });

        // Fetch splits
        const rawExpenses = expensesRes.data || [];
        const expenseIds = rawExpenses.map((e: any) => e.id);
        const splitsByExpenseId = new Map<string, ExpenseSplitRecord[]>();

        if (expenseIds.length > 0) {
          const { data: splitsData } = await safeSupabaseQuery<any[]>(
            supabase.from("expense_splits").select("*").in("expense_id", expenseIds),
            []
          );

          if (splitsData) {
            for (const s of splitsData) {
              const list = splitsByExpenseId.get(s.expense_id) || [];
              list.push({
                id: s.id,
                expense_id: s.expense_id,
                member_id: s.member_id,
                share_amount: Number(s.share_amount) || 0,
              });
              splitsByExpenseId.set(s.expense_id, list);
            }
          }
        }

        const expenses: ExpenseRecord[] = rawExpenses.map((e: any) => {
          const payer = memberMap.get(e.payer_id);
          const splits = splitsByExpenseId.get(e.id) || [];
          const splitMemberIds = splits.map((s) => s.member_id);

          return {
            id: e.id,
            trip_id: e.trip_id,
            payer_id: e.payer_id,
            payerName: payer?.name || "Unknown",
            payerAvatar: payer?.avatar || "🎒",
            amount: Number(e.amount) || 0,
            title: e.title || "Expense",
            receipt_url: e.receipt_url,
            created_at: e.created_at,
            splitMemberIds,
            splits,
          };
        });

        const places: ItineraryPlaceRecord[] = (placesRes.data || []).map((p: any) => ({
          id: p.id,
          trip_id: p.trip_id,
          place_name: p.place_name,
          time_label: p.time_label,
          maps_url:
            p.maps_url ||
            `https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(p.place_name)}`,
          notes: p.notes,
          created_at: p.created_at,
        }));

        const result: LiveTripRecord = {
          id: trip.id,
          slug: trip.slug,
          title: trip.title,
          destination: trip.destination,
          created_at: trip.created_at,
          members,
          expenses,
          places,
        };

        // Cache locally for offline backup
        if (typeof window !== "undefined") {
          try {
            localStorage.setItem(`wanderledger_trip_${slug}`, JSON.stringify(result));
          } catch {
            // ignore
          }
        }

        return result;
      }
    } catch (err) {
      console.warn("fetchLiveTripBySlug Supabase query notice (falling back gracefully):", err);
    }
  }

  // 2. Check LocalStorage Cache
  if (typeof window !== "undefined") {
    try {
      const cached = localStorage.getItem(`wanderledger_trip_${slug}`);
      if (cached) {
        const parsed = JSON.parse(cached);
        // Merge any locally added expenses or places
        const localExpensesKey = `wanderledger_expenses_${parsed.id || slug}`;
        const localExpenses = localStorage.getItem(localExpensesKey);
        if (localExpenses) {
          const extraExpenses = JSON.parse(localExpenses);
          parsed.expenses = [...extraExpenses, ...(parsed.expenses || [])];
        }

        const localPlacesKey = `wanderledger_places_${parsed.id || slug}`;
        const localPlaces = localStorage.getItem(localPlacesKey);
        if (localPlaces) {
          const extraPlaces = JSON.parse(localPlaces);
          parsed.places = [...(parsed.places || []), ...extraPlaces];
        }

        return parsed;
      }
    } catch {
      // ignore
    }
  }

  // 3. Fallback to DEFAULT_TRIP_DATA for starter slugs like 'goa-2026' or demo trips
  if (slug === DEFAULT_TRIP_DATA.slug || slug.includes("goa") || slug.includes("trek") || slug.includes("roadtrip")) {
    const defaultMembers: TripMemberRecord[] = DEFAULT_TRIP_DATA.travelers.map((t, idx) => ({
      id: t.id,
      trip_id: "trip-default-goa",
      name: t.name,
      initial_budget: t.pledgedAmount,
      upi_id: t.upiId || `${t.name.toLowerCase().replace(/[^a-z0-9]/g, "")}@upi`,
      created_at: "2026-10-24T00:00:00.000Z",
      avatar: t.avatar,
      pledgedAmount: t.pledgedAmount,
    }));

    const memberMap = new Map<string, TripMemberRecord>(defaultMembers.map((m) => [m.id, m]));

    const defaultExpenses: ExpenseRecord[] = DEFAULT_TRIP_DATA.expenses.map((e) => {
      const payer = memberMap.get(e.paidById);
      const splitMemberIds = e.splitAmongIds || [];
      const perShare = Math.round(e.amount / (splitMemberIds.length || 1));
      const splits: ExpenseSplitRecord[] = splitMemberIds.map((mid) => ({
        id: `split-${e.id}-${mid}`,
        expense_id: e.id,
        member_id: mid,
        share_amount: perShare,
      }));

      return {
        id: e.id,
        trip_id: "trip-default-goa",
        payer_id: e.paidById,
        payerName: payer?.name || "Traveler",
        payerAvatar: payer?.avatar || "🎒",
        amount: e.amount,
        title: e.title,
        receipt_url: e.receiptUrl || null,
        created_at: e.timestamp,
        splitMemberIds,
        splits,
      };
    });

    const defaultPlaces: ItineraryPlaceRecord[] = DEFAULT_TRIP_DATA.itinerary.map((it) => ({
      id: it.id,
      trip_id: "trip-default-goa",
      place_name: it.locationName,
      time_label: it.eta,
      maps_url: `https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(it.locationName)}`,
      notes: it.notes || null,
      created_at: "2026-10-24T00:00:00.000Z",
    }));

    const fallbackTrip: LiveTripRecord = {
      id: "trip-default-goa",
      slug: slug,
      title: DEFAULT_TRIP_DATA.title,
      destination: DEFAULT_TRIP_DATA.destination,
      created_at: "2026-10-24T00:00:00.000Z",
      members: defaultMembers,
      expenses: defaultExpenses,
      places: defaultPlaces,
    };

    // Check if user has added custom expenses or places to this fallback
    if (typeof window !== "undefined") {
      try {
        const localExpensesKey = `wanderledger_expenses_${fallbackTrip.id}`;
        const localExpenses = localStorage.getItem(localExpensesKey);
        if (localExpenses) {
          const extraExpenses = JSON.parse(localExpenses);
          fallbackTrip.expenses = [...extraExpenses, ...fallbackTrip.expenses];
        }

        const localPlacesKey = `wanderledger_places_${fallbackTrip.id}`;
        const localPlaces = localStorage.getItem(localPlacesKey);
        if (localPlaces) {
          const extraPlaces = JSON.parse(localPlaces);
          fallbackTrip.places = [...fallbackTrip.places, ...extraPlaces];
        }
      } catch {
        // ignore
      }
    }

    return fallbackTrip;
  }

  return null;
}

/**
 * Inserts a new live expense and its splits into `expenses` and `expense_splits`.
 */
export async function createLiveExpense(input: {
  tripId: string;
  payerId: string;
  title: string;
  amount: number;
  splitMemberIds: string[];
  receiptUrl?: string | null;
}): Promise<ExpenseRecord> {
  const supabase = getSupabaseClient();
  const cleanAmount = Math.round(Number(input.amount) || 0);
  if (cleanAmount <= 0) throw new Error("Amount must be greater than zero");

  const now = new Date().toISOString();
  const expId = `exp-${Date.now()}-${Math.random().toString(36).slice(2, 6)}`;
  const splitCount = input.splitMemberIds.length || 1;
  const perPersonShare = Math.round(cleanAmount / splitCount);

  const splits: ExpenseSplitRecord[] = input.splitMemberIds.map((mid) => ({
    id: `split-${expId}-${mid}`,
    expense_id: expId,
    member_id: mid,
    share_amount: perPersonShare,
  }));

  const expenseRecord: ExpenseRecord = {
    id: expId,
    trip_id: input.tripId,
    payer_id: input.payerId,
    amount: cleanAmount,
    title: input.title.trim() || "Group Bill",
    receipt_url: input.receiptUrl || null,
    created_at: now,
    splitMemberIds: input.splitMemberIds,
    splits,
  };

  // Local storage caching for zero-data-loss offline backup
  if (typeof window !== "undefined") {
    try {
      const key = `wanderledger_expenses_${input.tripId}`;
      const existing = JSON.parse(localStorage.getItem(key) || "[]");
      localStorage.setItem(key, JSON.stringify([expenseRecord, ...existing]));
    } catch {
      // ignore
    }
  }

  // Attempt Supabase insert
  if (supabase) {
    try {
      const { data: expenseData, error: expErr } = await supabase
        .from("expenses")
        .insert({
          trip_id: input.tripId,
          payer_id: input.payerId,
          title: input.title.trim() || "Group Bill",
          amount: cleanAmount,
          receipt_url: input.receiptUrl || null,
        })
        .select()
        .single();

      if (!expErr && expenseData) {
        const splitsToInsert = input.splitMemberIds.map((memberId) => ({
          expense_id: expenseData.id,
          member_id: memberId,
          share_amount: perPersonShare,
        }));

        await supabase.from("expense_splits").insert(splitsToInsert);

        return {
          id: expenseData.id,
          trip_id: expenseData.trip_id,
          payer_id: expenseData.payer_id,
          amount: cleanAmount,
          title: expenseData.title,
          receipt_url: expenseData.receipt_url,
          created_at: expenseData.created_at,
          splitMemberIds: input.splitMemberIds,
          splits,
        };
      }
    } catch (err) {
      console.warn("createLiveExpense Supabase notice (saved to local ledger):", err);
    }
  }

  return expenseRecord;
}

/**
 * Inserts a new place waypoint into `itinerary_places`.
 */
export async function createItineraryPlace(input: {
  tripId: string;
  placeName: string;
  timeLabel?: string | null;
  notes?: string | null;
  mapsUrl?: string | null;
}): Promise<ItineraryPlaceRecord> {
  const supabase = getSupabaseClient();
  const cleanName = input.placeName.trim();
  if (!cleanName) throw new Error("Place name is required");

  const mapsUrl =
    input.mapsUrl ||
    `https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(cleanName)}`;

  const now = new Date().toISOString();
  const placeRecord: ItineraryPlaceRecord = {
    id: `place-${Date.now()}-${Math.random().toString(36).slice(2, 6)}`,
    trip_id: input.tripId,
    place_name: cleanName,
    time_label: input.timeLabel?.trim() || null,
    maps_url: mapsUrl,
    notes: input.notes?.trim() || null,
    created_at: now,
  };

  // Local storage caching
  if (typeof window !== "undefined") {
    try {
      const key = `wanderledger_places_${input.tripId}`;
      const existing = JSON.parse(localStorage.getItem(key) || "[]");
      localStorage.setItem(key, JSON.stringify([...existing, placeRecord]));
    } catch {
      // ignore
    }
  }

  if (supabase) {
    try {
      const { data, error } = await supabase
        .from("itinerary_places")
        .insert({
          trip_id: input.tripId,
          place_name: cleanName,
          time_label: input.timeLabel?.trim() || null,
          notes: input.notes?.trim() || null,
          maps_url: mapsUrl,
        })
        .select()
        .single();

      if (!error && data) {
        return {
          id: data.id,
          trip_id: data.trip_id,
          place_name: data.place_name,
          time_label: data.time_label,
          maps_url: data.maps_url,
          notes: data.notes,
          created_at: data.created_at,
        };
      }
    } catch (err) {
      console.warn("createItineraryPlace Supabase notice (saved locally):", err);
    }
  }

  return placeRecord;
}

/**
 * Deletes an itinerary place.
 */
export async function deleteItineraryPlace(placeId: string, tripId?: string): Promise<boolean> {
  const supabase = getSupabaseClient();

  if (typeof window !== "undefined" && tripId) {
    try {
      const key = `wanderledger_places_${tripId}`;
      const existing: ItineraryPlaceRecord[] = JSON.parse(localStorage.getItem(key) || "[]");
      localStorage.setItem(key, JSON.stringify(existing.filter((p) => p.id !== placeId)));
    } catch {
      // ignore
    }
  }

  if (supabase) {
    try {
      const { error } = await supabase.from("itinerary_places").delete().eq("id", placeId);
      return !error;
    } catch {
      // ignore
    }
  }

  return true;
}

/**
 * Realtime subscription on trips, trip_members, expenses, expense_splits, itinerary_places.
 */
export function subscribeToTripTables(tripId: string, onUpdate: () => void) {
  const supabase = getSupabaseClient();
  if (!supabase) return () => {};

  try {
    const channel = supabase
      .channel(`live_trip_${tripId}`)
      .on(
        "postgres_changes",
        { event: "*", schema: "public", table: "expenses", filter: `trip_id=eq.${tripId}` },
        () => onUpdate()
      )
      .on(
        "postgres_changes",
        { event: "*", schema: "public", table: "trip_members", filter: `trip_id=eq.${tripId}` },
        () => onUpdate()
      )
      .on(
        "postgres_changes",
        { event: "*", schema: "public", table: "itinerary_places", filter: `trip_id=eq.${tripId}` },
        () => onUpdate()
      )
      .subscribe();

    return () => {
      try {
        supabase.removeChannel(channel);
      } catch {
        // ignore
      }
    };
  } catch {
    return () => {};
  }
}

/**
 * Computes live member financials directly from live TripMemberRecord and ExpenseRecord data.
 * Exact formula:
 * startingBudget = initial budget entered during trip creation.
 * totalShare = sum of all split amounts charged to this member.
 * paidAtBills = total cash paid out of pocket by this member.
 * budgetStillLeft = startingBudget - totalShare.
 */
export interface LiveMemberFinancials {
  memberId: string;
  name: string;
  avatar: string;
  upiId: string;
  initialBudget: number; // startingBudget
  shareUsed: number;     // totalShare
  paidOut: number;       // paidAtBills
  budgetLeft: number;    // budgetStillLeft = startingBudget - totalShare
  isOverBudget: boolean; // budgetStillLeft < 0
  overBudgetAmount: number; // Math.abs(budgetStillLeft)
  net: number;           // paidAtBills - totalShare (+ receive, - pay)
}

export function computeLiveFinancials(
  members: TripMemberRecord[],
  expenses: ExpenseRecord[]
): Map<string, LiveMemberFinancials> {
  const map = new Map<string, LiveMemberFinancials>();

  for (const m of members) {
    const initial = Math.round(Number(m.initial_budget) || 0);
    map.set(m.id, {
      memberId: m.id,
      name: m.name,
      avatar: m.avatar,
      upiId: m.upi_id,
      initialBudget: initial,
      shareUsed: 0,
      paidOut: 0,
      budgetLeft: initial,
      isOverBudget: false,
      overBudgetAmount: 0,
      net: 0,
    });
  }

  // Accumulate paid out and shares used
  for (const exp of expenses) {
    const payer = map.get(exp.payer_id);
    if (payer) {
      payer.paidOut += exp.amount;
    }

    if (exp.splits && exp.splits.length > 0) {
      for (const s of exp.splits) {
        const mem = map.get(s.member_id);
        if (mem) {
          mem.shareUsed += s.share_amount;
        }
      }
    } else if (exp.splitMemberIds && exp.splitMemberIds.length > 0) {
      const share = Math.round(exp.amount / exp.splitMemberIds.length);
      for (const mid of exp.splitMemberIds) {
        const mem = map.get(mid);
        if (mem) {
          mem.shareUsed += share;
        }
      }
    }
  }

  // Finalize computations with clean integer rounding
  for (const [, item] of map) {
    item.paidOut = Math.round(item.paidOut);
    item.shareUsed = Math.round(item.shareUsed);
    item.budgetLeft = Math.round(item.initialBudget - item.shareUsed);
    item.isOverBudget = item.budgetLeft < 0;
    item.overBudgetAmount = item.isOverBudget ? Math.abs(item.budgetLeft) : 0;
    item.net = Math.round(item.paidOut - item.shareUsed);
  }

  return map;
}
