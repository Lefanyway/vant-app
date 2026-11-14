import { PandaScoreAdapter } from "./pandascore/adapter";
import { PandaScoreClient } from "./pandascore/client";
import { withSupabaseStore } from "./supabase/read";
import type { EsportsDataProvider } from "./types";

export function getConfiguredProvider(): { provider: EsportsDataProvider | null; name: string | null; configured: boolean } {
  if (process.env.PANDASCORE_API_TOKEN) return { provider: withSupabaseStore(new PandaScoreAdapter(new PandaScoreClient(process.env.PANDASCORE_API_TOKEN))), name: "pandascore", configured: true };
  return { provider: null, name: null, configured: false };
}
