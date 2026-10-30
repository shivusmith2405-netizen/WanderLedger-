-- ==============================================================================
-- WanderLedger: Production PostgreSQL Schema for Supabase
-- Zero-Login Collaborative Travel Coordination & Expense Ledger
-- ==============================================================================

-- 1. Enable UUID Extension
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- 2. TRIPS TABLE
-- Master trip registry identified by public unique slug
CREATE TABLE IF NOT EXISTS public.trips (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    slug TEXT UNIQUE NOT NULL,
    title TEXT NOT NULL,
    destination TEXT NOT NULL,
    created_at TIMESTAMPTZ NOT NULL DEFAULT timezone('utc'::text, now())
);

-- 3. TRIP MEMBERS TABLE
-- Dynamic friends builder with committed starting budgets & UPI handles
CREATE TABLE IF NOT EXISTS public.trip_members (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    trip_id UUID NOT NULL REFERENCES public.trips(id) ON DELETE CASCADE,
    name TEXT NOT NULL,
    initial_budget NUMERIC(12, 2) NOT NULL DEFAULT 0.00,
    upi_id TEXT NOT NULL,
    created_at TIMESTAMPTZ NOT NULL DEFAULT timezone('utc'::text, now())
);

-- 4. EXPENSES TABLE
-- Live group bills paid out-of-pocket by a designated member
CREATE TABLE IF NOT EXISTS public.expenses (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    trip_id UUID NOT NULL REFERENCES public.trips(id) ON DELETE CASCADE,
    payer_id UUID NOT NULL REFERENCES public.trip_members(id) ON DELETE RESTRICT,
    amount NUMERIC(12, 2) NOT NULL,
    title TEXT NOT NULL,
    receipt_url TEXT,
    created_at TIMESTAMPTZ NOT NULL DEFAULT timezone('utc'::text, now())
);

-- 5. EXPENSE SPLITS TABLE
-- Exact member share deductions per logged bill
CREATE TABLE IF NOT EXISTS public.expense_splits (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    expense_id UUID NOT NULL REFERENCES public.expenses(id) ON DELETE CASCADE,
    member_id UUID NOT NULL REFERENCES public.trip_members(id) ON DELETE CASCADE,
    share_amount NUMERIC(12, 2) NOT NULL DEFAULT 0.00
);

-- 6. ITINERARY PLACES TABLE
-- Collaborative waypoints with direct Google Maps intent
CREATE TABLE IF NOT EXISTS public.itinerary_places (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    trip_id UUID NOT NULL REFERENCES public.trips(id) ON DELETE CASCADE,
    place_name TEXT NOT NULL,
    time_label TEXT,
    maps_url TEXT,
    notes TEXT,
    created_at TIMESTAMPTZ NOT NULL DEFAULT timezone('utc'::text, now())
);

-- 7. GROUP POLLS TABLE
-- Blind voting polls sealed until all active members vote
CREATE TABLE IF NOT EXISTS public.group_polls (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    trip_id UUID NOT NULL REFERENCES public.trips(id) ON DELETE CASCADE,
    question TEXT NOT NULL,
    options JSONB NOT NULL DEFAULT '[]'::jsonb, -- Array of { id, text }
    votes JSONB NOT NULL DEFAULT '{}'::jsonb,   -- Map of { [member_id]: option_id }
    is_revealed BOOLEAN NOT NULL DEFAULT false,
    created_at TIMESTAMPTZ NOT NULL DEFAULT timezone('utc'::text, now())
);

-- 8. INDEXES FOR HIGH-THROUGHPUT LOOKUPS
CREATE INDEX IF NOT EXISTS idx_trips_slug ON public.trips(slug);
CREATE INDEX IF NOT EXISTS idx_trip_members_trip ON public.trip_members(trip_id);
CREATE INDEX IF NOT EXISTS idx_expenses_trip ON public.expenses(trip_id);
CREATE INDEX IF NOT EXISTS idx_expense_splits_expense ON public.expense_splits(expense_id);
CREATE INDEX IF NOT EXISTS idx_itinerary_places_trip ON public.itinerary_places(trip_id);
CREATE INDEX IF NOT EXISTS idx_group_polls_trip ON public.group_polls(trip_id);

-- 9. ROW LEVEL SECURITY (RLS) POLICIES FOR ZERO-LOGIN SLUG ACCESS
-- Public anon read, insert, update, delete enabled for zero-login collaborative web access
ALTER TABLE public.trips ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.trip_members ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.expenses ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.expense_splits ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.itinerary_places ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.group_polls ENABLE ROW LEVEL SECURITY;

-- Trips RLS
CREATE POLICY "Public full access on trips"
    ON public.trips FOR ALL
    USING (true)
    WITH CHECK (true);

-- Trip Members RLS
CREATE POLICY "Public full access on trip_members"
    ON public.trip_members FOR ALL
    USING (true)
    WITH CHECK (true);

-- Expenses RLS
CREATE POLICY "Public full access on expenses"
    ON public.expenses FOR ALL
    USING (true)
    WITH CHECK (true);

-- Expense Splits RLS
CREATE POLICY "Public full access on expense_splits"
    ON public.expense_splits FOR ALL
    USING (true)
    WITH CHECK (true);

-- Itinerary Places RLS
CREATE POLICY "Public full access on itinerary_places"
    ON public.itinerary_places FOR ALL
    USING (true)
    WITH CHECK (true);

-- Group Polls RLS
CREATE POLICY "Public full access on group_polls"
    ON public.group_polls FOR ALL
    USING (true)
    WITH CHECK (true);

-- 10. REALTIME SUBSCRIPTION PUBLICATION
-- Enable Supabase Realtime broadcast on all collaborative tables
ALTER PUBLICATION supabase_realtime ADD TABLE public.trips;
ALTER PUBLICATION supabase_realtime ADD TABLE public.trip_members;
ALTER PUBLICATION supabase_realtime ADD TABLE public.expenses;
ALTER PUBLICATION supabase_realtime ADD TABLE public.expense_splits;
ALTER PUBLICATION supabase_realtime ADD TABLE public.itinerary_places;
ALTER PUBLICATION supabase_realtime ADD TABLE public.group_polls;
