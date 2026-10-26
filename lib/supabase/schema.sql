-- ========================================================
-- WanderLedger: Production PostgreSQL Schema for Supabase
-- Zero-Login Collaborative Travel Coordination & Ledger
-- ========================================================

-- Enable UUID extension
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- 1. TRIPS TABLE
CREATE TABLE IF NOT EXISTS public.trips (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    slug TEXT UNIQUE NOT NULL,
    title TEXT NOT NULL,
    destination TEXT NOT NULL,
    dates TEXT NOT NULL,
    total_pledged NUMERIC(12, 2) NOT NULL DEFAULT 0.00,
    created_at TIMESTAMPTZ NOT NULL DEFAULT timezone('utc'::text, now()),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT timezone('utc'::text, now())
);

-- 2. TRAVELERS TABLE
CREATE TABLE IF NOT EXISTS public.travelers (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    trip_id UUID NOT NULL REFERENCES public.trips(id) ON DELETE CASCADE,
    name TEXT NOT NULL,
    avatar TEXT NOT NULL DEFAULT '🎒',
    upi_id TEXT,
    phone TEXT,
    pledged_amount NUMERIC(12, 2) NOT NULL DEFAULT 0.00,
    created_at TIMESTAMPTZ NOT NULL DEFAULT timezone('utc'::text, now())
);

-- 3. EXPENSES TABLE
CREATE TABLE IF NOT EXISTS public.expenses (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    trip_id UUID NOT NULL REFERENCES public.trips(id) ON DELETE CASCADE,
    title TEXT NOT NULL,
    amount NUMERIC(12, 2) NOT NULL,
    paid_by_id UUID NOT NULL REFERENCES public.travelers(id) ON DELETE RESTRICT,
    split_among_ids JSONB NOT NULL DEFAULT '[]'::jsonb, -- array of traveler UUIDs
    category TEXT NOT NULL CHECK (category IN ('food', 'cab', 'stay', 'fuel', 'tickets', 'other')),
    timestamp TIMESTAMPTZ NOT NULL DEFAULT timezone('utc'::text, now()),
    location TEXT,
    receipt_url TEXT,
    notes TEXT,
    created_at TIMESTAMPTZ NOT NULL DEFAULT timezone('utc'::text, now())
);

-- 4. DIRECT SETTLEMENTS TABLE
CREATE TABLE IF NOT EXISTS public.settlements (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    trip_id UUID NOT NULL REFERENCES public.trips(id) ON DELETE CASCADE,
    from_id UUID NOT NULL REFERENCES public.travelers(id) ON DELETE CASCADE,
    to_id UUID NOT NULL REFERENCES public.travelers(id) ON DELETE CASCADE,
    amount NUMERIC(12, 2) NOT NULL,
    upi_txn_ref TEXT,
    status TEXT NOT NULL DEFAULT 'completed' CHECK (status IN ('completed', 'pending')),
    created_at TIMESTAMPTZ NOT NULL DEFAULT timezone('utc'::text, now())
);

-- 5. BLIND POLLS & VOTES
CREATE TABLE IF NOT EXISTS public.polls (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    trip_id UUID NOT NULL REFERENCES public.trips(id) ON DELETE CASCADE,
    question TEXT NOT NULL,
    options JSONB NOT NULL DEFAULT '[]'::jsonb, -- array of { id, text }
    total_voters_needed INT NOT NULL DEFAULT 4,
    is_sealed BOOLEAN NOT NULL DEFAULT true,
    created_at TIMESTAMPTZ NOT NULL DEFAULT timezone('utc'::text, now())
);

CREATE TABLE IF NOT EXISTS public.poll_votes (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    poll_id UUID NOT NULL REFERENCES public.polls(id) ON DELETE CASCADE,
    option_id TEXT NOT NULL,
    traveler_id UUID NOT NULL REFERENCES public.travelers(id) ON DELETE CASCADE,
    created_at TIMESTAMPTZ NOT NULL DEFAULT timezone('utc'::text, now()),
    UNIQUE(poll_id, traveler_id)
);

-- 6. ITINERARY STOPS
CREATE TABLE IF NOT EXISTS public.itinerary_stops (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    trip_id UUID NOT NULL REFERENCES public.trips(id) ON DELETE CASCADE,
    title TEXT NOT NULL,
    location_name TEXT NOT NULL,
    maps_query TEXT NOT NULL,
    eta TEXT NOT NULL,
    status TEXT NOT NULL DEFAULT 'upcoming' CHECK (status IN ('completed', 'active', 'upcoming')),
    category TEXT NOT NULL DEFAULT 'scenic' CHECK (category IN ('food', 'scenic', 'stay', 'activity')),
    notes TEXT,
    distance_km NUMERIC(6, 2) DEFAULT 0,
    sort_order INT NOT NULL DEFAULT 0,
    created_at TIMESTAMPTZ NOT NULL DEFAULT timezone('utc'::text, now())
);

-- 7. REALTIME ENABLEMENT
ALTER PUBLICATION supabase_realtime ADD TABLE public.trips;
ALTER PUBLICATION supabase_realtime ADD TABLE public.travelers;
ALTER PUBLICATION supabase_realtime ADD TABLE public.expenses;
ALTER PUBLICATION supabase_realtime ADD TABLE public.settlements;
ALTER PUBLICATION supabase_realtime ADD TABLE public.polls;
ALTER PUBLICATION supabase_realtime ADD TABLE public.poll_votes;
ALTER PUBLICATION supabase_realtime ADD TABLE public.itinerary_stops;

-- 8. STORAGE BUCKET FOR RECEIPTS
-- In Supabase Storage, create a public bucket named 'wanderledger-receipts'
-- INSERT INTO storage.buckets (id, name, public) VALUES ('wanderledger-receipts', 'wanderledger-receipts', true)
-- ON CONFLICT DO NOTHING;
