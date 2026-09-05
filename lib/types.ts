import type { DevotionId } from "@/lib/devotions";

export type DevotionProgress = {
  id: DevotionId;
  cycle: number;
  current: number;
  target: number;
  completedCycles: number;
  progressPercent: number;
};

export type IntentionOverview = {
  id: string;
  title: string;
  subtitle: string;
  salawatTarget: number;
  quran: {
    cycle: number;
    completedKhatms: number;
    completedAyahs: number;
    activeReaders: number;
    progressPercent: number;
  };
  salawat: {
    cycle: number;
    current: number;
    target: number;
    completedKhatms: number;
    progressPercent: number;
  };
  devotions: DevotionProgress[];
};

export type SiteState = {
  intentions: IntentionOverview[];
  updatedAt: string;
};

export type AyahContent = {
  globalNumber: number;
  surahNumber: number;
  surahName: string;
  surahEnglishName: string;
  numberInSurah: number;
  juz: number;
  page: number;
  arabic: string;
  persian: string;
  audioUrl: string;
};

export type QuranClaim = {
  claimId: string;
  expiresAt: string;
  ayah: AyahContent;
};
