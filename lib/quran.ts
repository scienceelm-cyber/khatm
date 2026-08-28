import type { AyahContent } from "@/lib/types";

const API_BASE = "https://api.alquran.cloud/v1";
const ARABIC_EDITION = "quran-uthmani-quran-academy";
const PERSIAN_EDITION = "fa.makarem";
const AUDIO_EDITION = "ar.alafasy";

type EditionAyah = {
  number: number;
  text: string;
  edition: { identifier: string };
  surah: { number: number; name: string; englishName: string };
  numberInSurah: number;
  juz: number;
  page: number;
};

type ApiResponse = { code: number; status: string; data: EditionAyah[] };

export async function getAyah(globalNumber: number): Promise<AyahContent> {
  const editions = `${ARABIC_EDITION},${PERSIAN_EDITION}`;
  const response = await fetch(
    `${API_BASE}/ayah/${globalNumber}/editions/${encodeURIComponent(editions)}`,
    { headers: { Accept: "application/json" } },
  );
  if (!response.ok) throw new Error("quran_content_unavailable");

  const payload = (await response.json()) as ApiResponse;
  const arabic = payload.data.find((item) => item.edition.identifier === ARABIC_EDITION);
  const persian = payload.data.find((item) => item.edition.identifier === PERSIAN_EDITION);
  if (!arabic || !persian) throw new Error("quran_content_incomplete");

  return {
    globalNumber,
    surahNumber: arabic.surah.number,
    surahName: arabic.surah.name,
    surahEnglishName: arabic.surah.englishName,
    numberInSurah: arabic.numberInSurah,
    juz: arabic.juz,
    page: arabic.page,
    arabic: arabic.text,
    persian: persian.text,
    audioUrl: `https://cdn.islamic.network/quran/audio/128/${AUDIO_EDITION}/${globalNumber}.mp3`,
  };
}
