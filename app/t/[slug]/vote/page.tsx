import { Suspense } from "react";
import type { Metadata } from "next";
import { BlindConsensusView } from "@/components/vote/BlindConsensusView";

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
    title: `${formattedTitle} Live Voting & Consensus — WanderLedger`,
    description: `Blind consensus polls and masked voting until everyone votes for ${formattedTitle}.`,
  };
}

async function VoteLoader({ params }: PageProps) {
  const { slug } = await params;
  return <BlindConsensusView slug={slug} />;
}

export default function VotePage(props: PageProps) {
  return (
    <Suspense
      fallback={
        <div
          suppressHydrationWarning
          className="min-h-screen bg-[#FFEBAF] flex flex-col items-center justify-center p-6 text-[#173842]"
        >
          <div className="w-12 h-12 rounded-2xl bg-[#4C9DB0] flex items-center justify-center animate-bounce shadow-lg">
            <span className="text-xl">🗳️</span>
          </div>
          <p className="mt-4 font-black text-sm tracking-wide">
            Syncing Live Group Polls...
          </p>
        </div>
      }
    >
      <VoteLoader {...props} />
    </Suspense>
  );
}
