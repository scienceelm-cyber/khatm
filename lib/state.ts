import type { IntentionOverview, SiteState } from "@/lib/types";
import { DEVOTIONS } from "@/lib/devotions";

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
  const present = await database
    .prepare(`SELECT COUNT(*) AS count FROM intentions WHERE id IN (${defaults.map(() => "?").join(",")})`)
    .bind(...defaults.map((item) => item.id))
    .first<{ count: number }>();
  if (Number(present?.count ?? 0) === defaults.length) return;

  await database.batch(defaults.map((item) =>
    database
      .prepare(
        `INSERT OR IGNORE INTO intentions
         (id, title, subtitle, active, sort_order, salawat_target)
         VALUES (?, ?, ?, 1, ?, 14000)`,
      )
      .bind(item.id, item.title, item.subtitle, item.order),
  ));
}

export async function ensureDevotionalProgress(database: D1Database) {
  const active = await database
    .prepare("SELECT id FROM intentions WHERE active = 1")
    .all<{ id: string }>();
  if (active.results.length === 0) return;

  const present = await database
    .prepare(
      `SELECT COUNT(*) AS count
       FROM devotional_progress p
       JOIN intentions i ON i.id = p.intention_id
       WHERE i.active = 1
         AND p.devotion_id IN (${DEVOTIONS.map(() => "?").join(",")})`,
    )
    .bind(...DEVOTIONS.map((item) => item.id))
    .first<{ count: number }>();
  if (Number(present?.count ?? 0) === active.results.length * DEVOTIONS.length) return;

  await database.batch(
    active.results.flatMap((intention) =>
      DEVOTIONS.map((devotion) =>
        database
          .prepare(
            `INSERT OR IGNORE INTO devotional_progress
             (id, intention_id, devotion_id, target)
             VALUES (?, ?, ?, ?)`,
          )
          .bind(`${intention.id}:${devotion.id}`, intention.id, devotion.id, devotion.target),
      ),
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

type DevotionRow = {
  intention_id: string;
  devotion_id: string;
  cycle: number;
  current: number;
  target: number;
  completed_cycles: number;
};

export async function getSiteState(database: D1Database): Promise<SiteState> {
  const now = Math.floor(Date.now() / 1000);
  await ensureDevotionalProgress(database);
  const [result, devotionResult] = await Promise.all([
    database.prepare(
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
    ).bind(now).all<OverviewRow>(),
    database
      .prepare(
        `SELECT intention_id, devotion_id, cycle, current, target, completed_cycles
         FROM devotional_progress
         ORDER BY intention_id, devotion_id`,
      )
      .all<DevotionRow>(),
  ]);

  const devotionsByIntention = new Map<string, DevotionRow[]>();
  for (const row of devotionResult.results) {
    const list = devotionsByIntention.get(row.intention_id) ?? [];
    list.push(row);
    devotionsByIntention.set(row.intention_id, list);
  }

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
      devotions: DEVOTIONS.map((definition) => {
        const progressRow = devotionsByIntention
          .get(row.id)
          ?.find((item) => item.devotion_id === definition.id);
        const current = Number(progressRow?.current ?? 0);
        const target = Math.max(1, Number(progressRow?.target ?? definition.target));
        return {
          id: definition.id,
          cycle: Number(progressRow?.cycle ?? 1),
          current,
          target,
          completedCycles: Number(progressRow?.completed_cycles ?? 0),
          progressPercent: Math.min(100, Math.round((current / target) * 10_000) / 100),
        };
      }),
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
