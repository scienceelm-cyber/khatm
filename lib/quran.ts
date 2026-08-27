import type { AyahContent } from "@/lib/types";

const API_BASE = process.env.QURAN_API_BASE ?? "https://api.alquran.cloud/v1";
const ARABIC_EDITION = process.env.QURAN_ARABIC_EDITION ?? "quran-uthmani-quran-academy";
const PERSIAN_EDITION = process.env.QURAN_PERSIAN_EDITION ?? "fa.makarem";
const AUDIO_EDITION = process.env.QURAN_AUDIO_EDITION ?? "ar.alafasy";
const AUDIO_BITRATE = process.env.QURAN_AUDIO_BITRATE ?? "128";

type EditionAyah = {
  number: number;
  text: string;
  edition: { identifier: string };
  surah: {
    number: number;
    name: string;
    englishName: string;
  };
  numberInSurah: number;
  juz: number;
  page: number;
};

type ApiResponse = { code: number; status: string; data: EditionAyah[] };

export async function getAyah(globalNumber: number): Promise<AyahContent> {
  const editions = `${ARABIC_EDITION},${PERSIAN_EDITION}`;
  const url = `${API_BASE}/ayah/${globalNumber}/editions/${encodeURIComponent(editions)}`;
  const response = await fetch(url, {
    headers: { Accept: "application/json" },
    next: { revalidate: 60 * 60 * 24 * 30 }
  });
  if (!response.ok) throw new Error(`Quran API request failed: ${response.status}`);

  const payload = (await response.json()) as ApiResponse;
  const arabic = payload.data.find((item) => item.edition.identifier === ARABIC_EDITION);
  const persian = payload.data.find((item) => item.edition.identifier === PERSIAN_EDITION);
  if (!arabic || !persian) throw new Error("Quran API returned incomplete editions");

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
    audioUrl: `https://cdn.islamic.network/quran/audio/${AUDIO_BITRATE}/${AUDIO_EDITION}/${globalNumber}.mp3`
  };
}
