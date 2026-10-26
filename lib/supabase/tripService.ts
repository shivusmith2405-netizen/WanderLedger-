import { getSupabaseClient } from "./client";

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

export interface LiveTripRecord {
  id: string;
  slug: string;
  title: string;
  destination: string;
  created_at: string;
  members: TripMemberRecord[];
  expenses: ExpenseRecord[];
  places: ItineraryPlaceRecord[];
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
}): Promise<LiveTripRecord | null> {
  const supabase = getSupabaseClient();
  if (!supabase) throw new Error("Supabase is not configured in .env.local");

  // 1. Insert into trips
  const { data: tripData, error: tripErr } = await supabase
    .from("trips")
    .insert({
      slug: input.slug,
      title: input.title,
      destination: input.destination,
    })
    .select()
    .single();

  if (tripErr || !tripData) {
    throw new Error(`Failed to create trip: ${tripErr?.message}`);
  }

  const tripId = tripData.id;

  // 2. Insert into trip_members
  const membersToInsert = input.members.map((m) => ({
    trip_id: tripId,
    name: m.name.trim() || "Traveler",
    initial_budget: Number(m.initialBudget) || 0,
    upi_id: m.upiId.trim() || `${m.name.toLowerCase().replace(/[^a-z0-9]/g, "")}@upi`,
  }));

  const { data: insertedMembers, error: membersErr } = await supabase
    .from("trip_members")
    .insert(membersToInsert)
    .select();

  if (membersErr) {
    console.error("Failed to insert trip members:", membersErr);
  }

  const members: TripMemberRecord[] = (insertedMembers || []).map((m: any, idx: number) => ({
    id: m.id,
    trip_id: m.trip_id,
    name: m.name,
    initial_budget: Number(m.initial_budget) || 0,
    upi_id: m.upi_id || "",
    created_at: m.created_at,
    avatar: getDeterministicAvatar(m.name, idx),
    pledgedAmount: Number(m.initial_budget) || 0,
  }));

  return {
    id: tripData.id,
    slug: tripData.slug,
    title: tripData.title,
    destination: tripData.destination,
    created_at: tripData.created_at,
    members,
    expenses: [],
    places: [],
  };
}

/**
 * Loads a trip and all its members, expenses, splits, and itinerary places directly from Supabase.
 */
export async function fetchLiveTripBySlug(slug: string): Promise<LiveTripRecord | null> {
  const supabase = getSupabaseClient();
  if (!supabase) return null;

  try {
    // 1. Fetch trip
    const { data: trip, error: tripErr } = await supabase
      .from("trips")
      .select("*")
      .eq("slug", slug)
      .maybeSingle();

    if (tripErr || !trip) return null;

    const tripId = trip.id;

    // 2. Fetch trip_members, expenses, and itinerary_places in parallel
    const [membersRes, expensesRes, placesRes] = await Promise.all([
      supabase
        .from("trip_members")
        .select("*")
        .eq("trip_id", tripId)
        .order("created_at", { ascending: true }),
      supabase
        .from("expenses")
        .select("*")
        .eq("trip_id", tripId)
        .order("created_at", { ascending: false }),
      supabase
        .from("itinerary_places")
        .select("*")
        .eq("trip_id", tripId)
        .order("created_at", { ascending: true }),
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

    // 3. Fetch all expense_splits for this trip's expenses
    const rawExpenses = expensesRes.data || [];
    const expenseIds = rawExpenses.map((e: any) => e.id);

    let splitsByExpenseId = new Map<string, ExpenseSplitRecord[]>();
    if (expenseIds.length > 0) {
      const { data: splitsData } = await supabase
        .from("expense_splits")
        .select("*")
        .in("expense_id", expenseIds);

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

    return {
      id: trip.id,
      slug: trip.slug,
      title: trip.title,
      destination: trip.destination,
      created_at: trip.created_at,
      members,
      expenses,
      places,
    };
  } catch (err) {
    console.error("fetchLiveTripBySlug error:", err);
    return null;
  }
}

/**
 * Uploads an image to Supabase Storage 'receipts' bucket.
 * Returns public URL or fallback.
 */
export async function uploadReceiptImage(file: File | Blob, tripSlug: string): Promise<string | null> {
  const supabase = getSupabaseClient();
  if (!supabase) return null;

  try {
    const filename = `${tripSlug}/${Date.now()}-${Math.random().toString(36).slice(2, 8)}.jpg`;
    const { data, error } = await supabase.storage.from("receipts").upload(filename, file, {
      cacheControl: "3600",
      upsert: true,
    });

    if (error) {
      console.warn("Storage upload warning (proceeding with base64/url):", error.message);
      return null;
    }

    const { data: publicData } = supabase.storage.from("receipts").getPublicUrl(filename);
    return publicData.publicUrl;
  } catch (err) {
    console.warn("Storage upload exception:", err);
    return null;
  }
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
}): Promise<ExpenseRecord | null> {
  const supabase = getSupabaseClient();
  if (!supabase) throw new Error("Supabase is not configured");

  const cleanAmount = Math.round(Number(input.amount) || 0);
  if (cleanAmount <= 0) throw new Error("Amount must be greater than zero");

  // 1. Insert into expenses
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

  if (expErr || !expenseData) {
    throw new Error(`Failed to save expense: ${expErr?.message}`);
  }

  // 2. Insert into expense_splits
  const splitCount = input.splitMemberIds.length || 1;
  const perPersonShare = Math.round(cleanAmount / splitCount);

  const splitsToInsert = input.splitMemberIds.map((memberId) => ({
    expense_id: expenseData.id,
    member_id: memberId,
    share_amount: perPersonShare,
  }));

  const { data: insertedSplits, error: splitErr } = await supabase
    .from("expense_splits")
    .insert(splitsToInsert)
    .select();

  if (splitErr) {
    console.error("Failed to insert splits:", splitErr);
  }

  return {
    id: expenseData.id,
    trip_id: expenseData.trip_id,
    payer_id: expenseData.payer_id,
    amount: cleanAmount,
    title: expenseData.title,
    receipt_url: expenseData.receipt_url,
    created_at: expenseData.created_at,
    splitMemberIds: input.splitMemberIds,
    splits: (insertedSplits || []).map((s: any) => ({
      id: s.id,
      expense_id: s.expense_id,
      member_id: s.member_id,
      share_amount: Number(s.share_amount) || perPersonShare,
    })),
  };
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
}): Promise<ItineraryPlaceRecord | null> {
  const supabase = getSupabaseClient();
  if (!supabase) throw new Error("Supabase is not configured");

  const cleanName = input.placeName.trim();
  if (!cleanName) throw new Error("Place name is required");

  const mapsUrl =
    input.mapsUrl ||
    `https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(cleanName)}`;

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

  if (error || !data) {
    throw new Error(`Failed to save place: ${error?.message}`);
  }

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

/**
 * Deletes an itinerary place from Supabase.
 */
export async function deleteItineraryPlace(placeId: string): Promise<boolean> {
  const supabase = getSupabaseClient();
  if (!supabase) return false;

  const { error } = await supabase.from("itinerary_places").delete().eq("id", placeId);
  return !error;
}

/**
 * Realtime subscription on trips, trip_members, expenses, expense_splits, itinerary_places.
 */
export function subscribeToTripTables(tripId: string, onUpdate: () => void) {
  const supabase = getSupabaseClient();
  if (!supabase) return () => {};

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
    supabase.removeChannel(channel);
  };
}

/**
 * Computes live member financials directly from live TripMemberRecord and ExpenseRecord data.
 */
export interface LiveMemberFinancials {
  memberId: string;
  name: string;
  avatar: string;
  upiId: string;
  initialBudget: number; // committed at trip start
  shareUsed: number;     // sum of their split shares
  paidOut: number;       // cash paid out of pocket
  budgetLeft: number;    // initialBudget - shareUsed
  isOverBudget: boolean;
  overBudgetAmount: number;
  net: number;           // paidOut - shareUsed (+ receive, - pay)
}

export function computeLiveFinancials(
  members: TripMemberRecord[],
  expenses: ExpenseRecord[]
): Map<string, LiveMemberFinancials> {
  const map = new Map<string, LiveMemberFinancials>();

  for (const m of members) {
    map.set(m.id, {
      memberId: m.id,
      name: m.name,
      avatar: m.avatar,
      upiId: m.upi_id,
      initialBudget: Math.round(m.initial_budget),
      shareUsed: 0,
      paidOut: 0,
      budgetLeft: Math.round(m.initial_budget),
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
