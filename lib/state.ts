import type { IntentionOverview, SiteState } from "@/lib/types";

export const TOTAL_AYAHS = 6236;

const defaults = [
  {
    id: "imam-mahdi",
    title: "برای سلامتی و تعجیل در فرج امام زمان (عج)",
    subtitle: "هدیه‌ای جمعی برای ظهور و سلامتی حضرت ولی‌عصر (عج)",
    order: 10,
  },
  {
    id: "mohammad-ali-ramesh",
    title: "به نیت مرحوم محمدعلی رامش",
    subtitle: "هدیه‌ای از نور قرآن و ذکر صلوات برای شادی روح آن مرحوم",
    order: 20,
  },
  {
    id: "fourteen-infallibles",
    title: "به نیت چهارده معصوم (ع)",
    subtitle: "اهدای ثواب این عمل جمعی به ساحت مقدس چهارده معصوم (ع)",
    order: 30,
  },
];

export async function ensureDefaultIntentions(database: D1Database) {
  await database.batch(
    defaults.map((item) =>
      database
        .prepare(
          `INSERT OR IGNORE INTO intentions
           (id, title, subtitle, active, sort_order, salawat_target)
           VALUES (?, ?, ?, 1, ?, 14000)`,
        )
        .bind(item.id, item.title, item.subtitle, item.order),
    ),
  );
}

export async function expireOldClaims(database: D1Database, now = Math.floor(Date.now() / 1000)) {
  await database
    .prepare("UPDATE quran_claims SET status = 'expired' WHERE status = 'assigned' AND expires_at <= ?")
    .bind(now)
    .run();
}

type OverviewRow = {
  id: string;
  title: string;
  subtitle: string;
  quran_cycle: number;
  completed_quran_khatms: number;
  salawat_cycle: number;
  salawat_current: number;
  salawat_target: number;
  completed_salawat_khatms: number;
  quran_completed_ayahs: number;
  active_readers: number;
};

export async function getSiteState(database: D1Database): Promise<SiteState> {
  const now = Math.floor(Date.now() / 1000);
  const result = await database
    .prepare(
      `SELECT
        i.id,
        i.title,
        i.subtitle,
        i.quran_cycle,
        i.completed_quran_khatms,
        i.salawat_cycle,
        i.salawat_current,
        i.salawat_target,
        i.completed_salawat_khatms,
        (SELECT COUNT(*) FROM quran_claims c
          WHERE c.intention_id = i.id AND c.cycle = i.quran_cycle AND c.status = 'completed') AS quran_completed_ayahs,
        (SELECT COUNT(*) FROM quran_claims c
          WHERE c.intention_id = i.id AND c.cycle = i.quran_cycle AND c.status = 'assigned' AND c.expires_at > ?) AS active_readers
      FROM intentions i
      WHERE i.active = 1
      ORDER BY i.sort_order ASC, i.created_at ASC`,
    )
    .bind(now)
    .all<OverviewRow>();

  const intentions: IntentionOverview[] = result.results.map((row) => {
    const completedAyahs = Number(row.quran_completed_ayahs ?? 0);
    const salawatCurrent = Number(row.salawat_current ?? 0);
    const salawatTarget = Math.max(1, Number(row.salawat_target ?? 14000));
    return {
      id: row.id,
      title: row.title,
      subtitle: row.subtitle,
      salawatTarget,
      quran: {
        cycle: Number(row.quran_cycle),
        completedKhatms: Number(row.completed_quran_khatms),
        completedAyahs,
        activeReaders: Number(row.active_readers ?? 0),
        progressPercent: Math.min(100, Math.round((completedAyahs / TOTAL_AYAHS) * 10_000) / 100),
      },
      salawat: {
        cycle: Number(row.salawat_cycle),
        current: salawatCurrent,
        target: salawatTarget,
        completedKhatms: Number(row.completed_salawat_khatms),
        progressPercent: Math.min(100, Math.round((salawatCurrent / salawatTarget) * 10_000) / 100),
      },
    };
  });

  return { intentions, updatedAt: new Date().toISOString() };
}

export async function intentionExists(database: D1Database, intentionId: string) {
  const row = await database
    .prepare("SELECT id, quran_cycle FROM intentions WHERE id = ? AND active = 1")
    .bind(intentionId)
    .first<{ id: string; quran_cycle: number }>();
  return row ?? null;
}
