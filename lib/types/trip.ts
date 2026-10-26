import { Traveler, Expense, DirectSettlement, SettlementTransaction, NetBalance } from "../algorithms/debtMinimizer";

export type { Traveler, Expense, DirectSettlement, SettlementTransaction, NetBalance };

export interface PollOption {
  id: string;
  text: string;
  votes: string[]; // traveler IDs who voted for this option
}

export interface BlindPoll {
  id: string;
  tripSlug: string;
  question: string;
  options: PollOption[];
  totalVotersNeeded: number;
  isSealed: boolean;
  createdAt: string;
}

export interface ItineraryStop {
  id: string;
  title: string;
  locationName: string;
  mapsQuery: string;
  eta: string;
  status: "completed" | "active" | "upcoming";
  category: "food" | "scenic" | "stay" | "activity";
  notes?: string;
  distanceKm?: number;
}

export interface TripData {
  slug: string;
  title: string;
  destination: string;
  dates: string;
  totalPledged: number;
  travelers: Traveler[];
  expenses: Expense[];
  settlements: DirectSettlement[];
  polls: BlindPoll[];
  itinerary: ItineraryStop[];
}
