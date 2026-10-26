import { Suspense } from "react";
import { TripCockpit } from "@/components/cockpit/TripCockpit";
import type { Metadata } from "next";

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
    title: `${formattedTitle} — WanderLedger Cockpit`,
    description: `Zero-login collaborative ledger and travel coordination for ${formattedTitle}. Real-time escrow tracking, direct camera snaps, sealed voting, and optimal debt settlements.`,
  };
}

async function TripLoader({ params }: PageProps) {
  const { slug } = await params;
  return <TripCockpit slug={slug} />;
}

export default function TripSlugPage(props: PageProps) {
  return (
    <Suspense
      fallback={
        <div suppressHydrationWarning className="min-h-screen bg-[#FFEBAF] flex flex-col items-center justify-center p-6 text-[#173842]">
          <div className="w-12 h-12 rounded-2xl bg-[#4C9DB0] flex items-center justify-center animate-bounce shadow-lg">
            <span className="text-xl">✈️</span>
          </div>
          <p className="mt-4 font-black text-sm tracking-wide">
            Syncing WanderLedger Cockpit...
          </p>
        </div>
      }
    >
      <TripLoader {...props} />
    </Suspense>
  );
}
