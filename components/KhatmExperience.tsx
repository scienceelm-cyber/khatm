"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import type { ClaimPayload, KhatmStats } from "@/lib/types";

type ViewState = "loading" | "reading" | "completed" | "expired" | "error" | "waiting";
type Props = { initialStats: KhatmStats | null };

const fa = new Intl.NumberFormat("fa-IR");

function formatRemaining(totalSeconds: number | null) {
  if (totalSeconds === null) return "";
  const minutes = Math.floor(totalSeconds / 60);
  const seconds = totalSeconds % 60;
  return `${fa.format(minutes)}:${fa.format(seconds).padStart(2, "۰")}`;
}

export default function KhatmExperience({ initialStats }: Props) {
  const [stats, setStats] = useState<KhatmStats | null>(initialStats);
  const [claim, setClaim] = useState<ClaimPayload | null>(null);
  const [view, setView] = useState<ViewState>("loading");
  const [busy, setBusy] = useState(false);
  const [message, setMessage] = useState("");
  const [showAdmin, setShowAdmin] = useState(false);
  const [adminToken, setAdminToken] = useState("");
  const [intentionDraft, setIntentionDraft] = useState(initialStats?.intention ?? "");
  const [online, setOnline] = useState(true);
  const [khatmCelebration, setKhatmCelebration] = useState(false);
  const [remainingSeconds, setRemainingSeconds] = useState<number | null>(null);

  const refreshStats = useCallback(async () => {
    try {
      const response = await fetch("/api/state", { cache: "no-store" });
      if (!response.ok) return;
      setStats(await response.json());
    } catch {
      // Keep the last known good stats visible during short outages.
    }
  }, []);

  const claimAyah = useCallback(async () => {
    setBusy(true);
    setView("loading");
    setMessage("");
    try {
      const response = await fetch("/api/claim", { method: "POST" });
      const data = await response.json();
      if (response.status === 409) {
        if (data.stats) setStats(data.stats);
        setView("waiting");
        return;
      }
      if (!response.ok) throw new Error(data.error ?? "claim_failed");
      setClaim(data as ClaimPayload);
      setStats(data.stats);
      setView("reading");
    } catch {
      setMessage("دریافت آیه ممکن نشد. اتصال اینترنت یا سرور را بررسی کنید و دوباره بزنید.");
      setView("error");
    } finally {
      setBusy(false);
    }
  }, []);

  useEffect(() => {
    setOnline(navigator.onLine);
    const onOnline = () => {
      setOnline(true);
      void refreshStats();
    };
    const onOffline = () => setOnline(false);
    window.addEventListener("online", onOnline);
    window.addEventListener("offline", onOffline);
    void claimAyah();
    return () => {
      window.removeEventListener("online", onOnline);
      window.removeEventListener("offline", onOffline);
    };
  }, [claimAyah, refreshStats]);

  useEffect(() => {
    const refreshWhenVisible = () => {
      if (document.visibilityState === "visible" && navigator.onLine) void refreshStats();
    };
    const interval = window.setInterval(refreshWhenVisible, 20_000);
    document.addEventListener("visibilitychange", refreshWhenVisible);
    return () => {
      window.clearInterval(interval);
      document.removeEventListener("visibilitychange", refreshWhenVisible);
    };
  }, [refreshStats]);

  useEffect(() => {
    if (!claim || view !== "reading") {
      setRemainingSeconds(null);
      return;
    }

    const tick = () => {
      const seconds = Math.max(0, Math.ceil((new Date(claim.expiresAt).getTime() - Date.now()) / 1000));
      setRemainingSeconds(seconds);
      if (seconds === 0) {
        setClaim(null);
        setView("expired");
      }
    };

    tick();
    const interval = window.setInterval(tick, 1000);
    return () => window.clearInterval(interval);
  }, [claim, view]);

  useEffect(() => {
    if (!showAdmin && stats?.intention) setIntentionDraft(stats.intention);
  }, [showAdmin, stats?.intention]);

  useEffect(() => {
    if (!showAdmin) return;
    const onKey = (event: KeyboardEvent) => {
      if (event.key === "Escape") setShowAdmin(false);
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [showAdmin]);

  useEffect(() => {
    if (!message || view === "error" || view === "completed") return;
    const timeout = window.setTimeout(() => setMessage(""), 5000);
    return () => window.clearTimeout(timeout);
  }, [message, view]);

  const complete = async () => {
    if (!claim || busy) return;
    setBusy(true);
    setMessage("");
    try {
      const response = await fetch("/api/complete", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ claimId: claim.claimId })
      });
      const data = await response.json();
      if (!response.ok) {
        if (response.status === 409) {
          if (data.stats) setStats(data.stats);
          setClaim(null);
          setView("expired");
          return;
        }
        throw new Error(data.error ?? "complete_failed");
      }
      setStats(data.stats);
      setClaim(null);
      setKhatmCelebration(Boolean(data.completedKhatm));
      setView("completed");
    } catch {
      setMessage("ثبت خواندن آیه انجام نشد. دوباره تلاش کنید.");
    } finally {
      setBusy(false);
    }
  };

  const updateIntention = async (event: React.FormEvent) => {
    event.preventDefault();
    setBusy(true);
    setMessage("");
    try {
      const response = await fetch("/api/admin/intention", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ token: adminToken, intention: intentionDraft })
      });
      const data = await response.json();
      if (!response.ok) {
        if (response.status === 503 && data.error === "admin_not_configured") {
          throw new Error("admin_not_configured");
        }
        throw new Error(data.error ?? "update_failed");
      }
      setStats(data);
      setShowAdmin(false);
      setAdminToken("");
      setMessage("نیت ختم با موفقیت تغییر کرد.");
    } catch (error) {
      const code = error instanceof Error ? error.message : "";
      setMessage(code === "admin_not_configured"
        ? "رمز مدیریت هنوز روی سرور به‌صورت امن تنظیم نشده است."
        : "تغییر نیت انجام نشد. رمز مدیریت را بررسی کنید.");
    } finally {
      setBusy(false);
    }
  };

  const share = async () => {
    const text = `ختم گروهی قرآن${stats?.intention ? ` — نیت: ${stats.intention}` : ""}`;
    if (navigator.share) {
      await navigator.share({ title: "ختم گروهی قرآن", text, url: location.href }).catch(() => undefined);
      return;
    }

    const copied = await navigator.clipboard.writeText(location.href).then(() => true).catch(() => false);
    setMessage(copied ? "لینک ختم کپی شد." : "لینک صفحه را از نوار نشانی مرورگر کپی کنید.");
  };

  const progressStyle = useMemo(
    () => ({ "--progress": `${stats?.progressPercent ?? 0}%` } as React.CSSProperties),
    [stats?.progressPercent]
  );

  return (
    <main className="shell">
      <header className="topbar">
        <div className="brand" aria-label="ختم گروهی قرآن">
          <span className="brandMark" aria-hidden="true">۞</span>
          <div><strong>ختم گروهی قرآن</strong><small>هر آیه، یک سهم از یک نیت مشترک</small></div>
        </div>
        <div className="topActions">
          <span className={`connection ${online ? "online" : "offline"}`}>{online ? "آنلاین" : "آفلاین"}</span>
          <button className="iconButton" onClick={() => void share()} aria-label="اشتراک‌گذاری">↗</button>
          <button className="iconButton" onClick={() => setShowAdmin(true)} aria-label="تغییر نیت">⚙</button>
        </div>
      </header>

      <section className="intentionCard" aria-labelledby="intention-title">
        <span className="eyebrow">ختم شماره {fa.format(stats?.currentCycle ?? 1)} · نیت این ختم</span>
        <h1 id="intention-title">{stats?.intention ?? "ختم گروهی قرآن"}</h1>
        <p>با خواندن سهم کوچک خود، این ختم را همراه دوستان و آشنایان کامل می‌کنیم.</p>
      </section>

      <section className="statsGrid" aria-label="وضعیت ختم">
        <div className="progressVisual" style={progressStyle} aria-label={`پیشرفت ${stats?.progressPercent ?? 0} درصد`}>
          <div><strong>{fa.format(stats?.progressPercent ?? 0)}٪</strong><span>پیشرفت ختم جاری</span></div>
        </div>
        <div className="stat"><span>ختم‌های کامل</span><strong>{fa.format(stats?.completedKhatms ?? 0)}</strong></div>
        <div className="stat"><span>آیات خوانده‌شده</span><strong>{fa.format(stats?.completedAyahs ?? 0)} <small>از ۶۲۳۶</small></strong></div>
        <div className="stat"><span>در حال خواندن</span><strong>{fa.format(stats?.activeReaders ?? 0)} <small>نفر</small></strong></div>
      </section>

      <section className="readerCard" aria-live="polite">
        {view === "loading" && <Loading />}
        {view === "error" && (
          <EmptyState title="آیه دریافت نشد" text={message} action="دوباره تلاش کن" onAction={() => void claimAyah()} />
        )}
        {view === "waiting" && (
          <EmptyState title="همه آیاتِ باقی‌مانده در حال خواندن‌اند" text="به محض آزاد شدن یک سهم، می‌توانید ادامه دهید." action="بررسی دوباره" onAction={() => void claimAyah()} />
        )}
        {view === "expired" && (
          <EmptyState title="زمان این سهم تمام شد" text="برای اینکه آیه‌ای از ختم جا نماند، سهم منقضی دوباره در اختیار جمع قرار می‌گیرد." action="یک سهم تازه بگیر" onAction={() => void claimAyah()} />
        )}
        {view === "reading" && claim && (
          <>
            <div className="verseMeta">
              <span>سوره {claim.ayah.surahName}</span>
              <span>آیه {fa.format(claim.ayah.numberInSurah)}</span>
              <span>جزء {fa.format(claim.ayah.juz)}</span>
            </div>
            <div className="assignedBadge">این آیه سهم شماست</div>
            <p className="arabic" lang="ar">{claim.ayah.arabic}</p>
            <div className="separator" aria-hidden="true">۝</div>
            <p className="translation">{claim.ayah.persian}</p>
            <div className="audioBox">
              <div><strong>تلاوت آیه</strong><span>میشاری راشد العفاسی</span></div>
              <audio controls preload="none" src={claim.ayah.audioUrl}>مرورگر شما پخش صوت را پشتیبانی نمی‌کند.</audio>
            </div>
            <button className="primaryButton" onClick={() => void complete()} disabled={busy || remainingSeconds === 0}>
              {busy ? "در حال ثبت…" : "✓ خواندم"}
            </button>
            <p className="reserveNote">
              {remainingSeconds === null
                ? "این سهم برای مدت محدودی برای شما نگه داشته می‌شود."
                : `زمان باقی‌مانده این سهم: ${formatRemaining(remainingSeconds)}`}
            </p>
          </>
        )}
        {view === "completed" && (
          <div className="successState">
            <div className="successIcon">✓</div>
            <h2>{khatmCelebration ? "یک ختم کامل شد؛ قبول باشد" : "سهم شما ثبت شد؛ قبول باشد"}</h2>
            <p>{khatmCelebration ? "همه ۶۲۳۶ آیه خوانده شدند و ختم بعدی از ابتدای قرآن آغاز شده است." : "اگر مایلید، می‌توانید همین حالا یک آیه دیگر هم بخوانید."}</p>
            {message && <p className="notice">{message}</p>}
            <button className="primaryButton" onClick={() => { setKhatmCelebration(false); void claimAyah(); }} disabled={busy}>یک آیه دیگر می‌خوانم</button>
            <button className="ghostButton" onClick={() => void share()}>دعوت از دوستان</button>
          </div>
        )}
      </section>

      <section className="howItWorks">
        <span className="eyebrow">خیلی ساده</span>
        <h2>سه قدم تا سهم شما در ختم</h2>
        <div className="steps">
          <article><b>۱</b><div><strong>آیه‌ات را بگیر</strong><p>سامانه به‌ترتیب قرآن یک آیه آزاد را به شما می‌دهد.</p></div></article>
          <article><b>۲</b><div><strong>بخوان و گوش بده</strong><p>متن عربی، ترجمه فارسی و صوت همان آیه کنار هم است.</p></div></article>
          <article><b>۳</b><div><strong>«خواندم» را بزن</strong><p>آیه ثبت می‌شود و شمارنده جمعی جلو می‌رود.</p></div></article>
        </div>
      </section>

      <footer>ختم جمعی، بدون ثبت‌نام و بدون نمایش نام افراد · متن و صوت قرآن از منابع عمومی آنلاین دریافت می‌شود.</footer>

      {showAdmin && (
        <div className="modalBackdrop" role="presentation" onMouseDown={(e) => e.target === e.currentTarget && setShowAdmin(false)}>
          <form className="modal" onSubmit={updateIntention} role="dialog" aria-modal="true" aria-labelledby="admin-title">
            <button className="closeButton" type="button" onClick={() => setShowAdmin(false)} aria-label="بستن">×</button>
            <span className="eyebrow">مدیریت ختم</span>
            <h2 id="admin-title">تغییر نیت</h2>
            <label>نیت جدید<textarea autoFocus value={intentionDraft} onChange={(e) => setIntentionDraft(e.target.value)} maxLength={300} required /></label>
            <label>رمز مدیریت<input type="password" value={adminToken} onChange={(e) => setAdminToken(e.target.value)} autoComplete="current-password" required /></label>
            <p className="helper">تغییر نیت، پیشرفت ختم جاری را صفر نمی‌کند.</p>
            <button className="primaryButton" disabled={busy}>{busy ? "در حال ذخیره…" : "ذخیره نیت"}</button>
          </form>
        </div>
      )}

      {message && view !== "error" && view !== "completed" && <div className="toast" role="status">{message}</div>}
    </main>
  );
}

function Loading() {
  return <div className="loadingState"><div className="spinner"/><strong>در حال آماده‌کردن سهم شما…</strong><span>یک آیه آزاد از ختم جاری پیدا می‌کنیم.</span></div>;
}

function EmptyState({ title, text, action, onAction }: { title: string; text: string; action: string; onAction: () => void }) {
  return <div className="emptyState"><div className="emptyIcon">۞</div><h2>{title}</h2><p>{text}</p><button className="primaryButton" onClick={onAction}>{action}</button></div>;
}
