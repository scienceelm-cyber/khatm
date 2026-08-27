export type KhatmStats = {
  intention: string;
  currentCycle: number;
  completedKhatms: number;
  completedAyahs: number;
  activeReaders: number;
  progressPercent: number;
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

export type ClaimPayload = {
  claimId: string;
  expiresAt: string;
  ayah: AyahContent;
  stats: KhatmStats;
};
