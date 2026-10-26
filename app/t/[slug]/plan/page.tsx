import { Suspense } from "react";
import type { Metadata } from "next";
import { ItineraryPlanView } from "@/components/plan/ItineraryPlanView";

export const dynamic = "force-dynamic";

interface PageProps {
  params: Promise<{ slug: string }>;
}

export async function generateMetadata({ params }: PageProps): Promise<Metadata> {
  const { slug } = await params;
  const formattedTitle = slug
    .split("-")
    .map((word) => word.charAt(0).toUpperCase() + word.slice(1))
    .join(" ");

  return {
    title: `${formattedTitle} Itinerary & Places — WanderLedger`,
    description: `Interactive places and 1-tap Google Maps navigation intents for ${formattedTitle}.`,
  };
}

async function PlanLoader({ params }: PageProps) {
  const { slug } = await params;
  return <ItineraryPlanView slug={slug} />;
}

export default function PlanPage(props: PageProps) {
  return (
    <Suspense
      fallback={
        <div
          suppressHydrationWarning
          className="min-h-screen bg-[#FFEBAF] flex flex-col items-center justify-center p-6 text-[#173842]"
        >
          <div className="w-12 h-12 rounded-2xl bg-[#4C9DB0] flex items-center justify-center animate-bounce shadow-lg">
            <span className="text-xl">📍</span>
          </div>
          <p className="mt-4 font-black text-sm tracking-wide">
            Loading Itinerary Waypoints...
          </p>
        </div>
      }
    >
      <PlanLoader {...props} />
    </Suspense>
  );
}
