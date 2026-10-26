import { Suspense } from "react";
import { SettleCockpit } from "@/components/settle/SettleCockpit";
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
    title: `${formattedTitle} Settlements & Balance Matrix — WanderLedger`,
    description: `Optimal pairwise debt minimization, per-member budget tracking, and role-locked UPI settlements for ${formattedTitle}.`,
  };
}

async function SettleLoader({ params }: PageProps) {
  const { slug } = await params;
  return <SettleCockpit slug={slug} />;
}

export default function SettlePage(props: PageProps) {
  return (
    <Suspense
      fallback={
        <div
          suppressHydrationWarning
          className="min-h-screen bg-[#FFEBAF] flex flex-col items-center justify-center p-6 text-[#173842]"
        >
          <div className="w-12 h-12 rounded-2xl bg-[#4C9DB0] flex items-center justify-center animate-bounce shadow-lg">
            <span className="text-xl">🤝</span>
          </div>
          <p className="mt-4 font-black text-sm tracking-wide">
            Calculating Optimal Pairwise Settlements...
          </p>
        </div>
      }
    >
      <SettleLoader {...props} />
    </Suspense>
  );
}
