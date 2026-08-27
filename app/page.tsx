import KhatmExperience from "@/components/KhatmExperience";
import { getStats } from "@/lib/stats";

export const dynamic = "force-dynamic";

export default async function Home() {
  const initialStats = await getStats().catch(() => null);
  return <KhatmExperience initialStats={initialStats} />;
}
