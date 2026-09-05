"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import {
  BookOpenText,
  Check,
  Clock3,
  Headphones,
  HeartHandshake,
  Plus,
  Save,
  Settings2,
  Share2,
  Sparkles,
  Trash2,
  Users,
} from "lucide-react";
import { toast } from "sonner";
import type { IntentionOverview, QuranClaim, SiteState } from "@/lib/types";
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle, AlertDialogTrigger } from "@/components/ui/alert-dialog";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Empty, EmptyContent, EmptyDescription, EmptyHeader, EmptyMedia, EmptyTitle } from "@/components/ui/empty";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Progress } from "@/components/ui/progress";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Skeleton } from "@/components/ui/skeleton";
import { Spinner } from "@/components/ui/spinner";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Textarea } from "@/components/ui/textarea";
import { Toaster } from "@/components/ui/sonner";
import type { DevotionDefinition, DevotionGuidance } from "@/lib/devotions";

type Mode = "quran" | "salawat" | "devotions";
type QuranStatus = "idle" | "loading" | "reading" | "success" | "waiting" | "expired" | "error";
type IntentionDraft = { title: string; subtitle: string; salawatTarget: number };

const fa = new Intl.NumberFormat("fa-IR");
const TOTAL_AYAHS = 6236;

function formatRemaining(totalSeconds: number | null) {
  if (totalSeconds === null) return "";
  const minutes = Math.floor(totalSeconds / 60);
  const seconds = totalSeconds % 60;
  return `${fa.format(minutes)}:${fa.format(seconds).padStart(2, "۰")}`;
}

function errorMessage(code: string) {
  if (code === "unauthorized") return "رمز مدیریت درست نیست.";
  if (code === "admin_not_configured") return "رمز مدیریت سایت هنوز تنظیم نشده است.";
  if (code === "last_intention") return "حداقل یک نیت باید در فهرست باقی بماند.";
  return "انجام این کار ممکن نشد. کمی بعد دوباره تلاش کنید.";
}

export default function KhatmApp() {
  const [siteState, setSiteState] = useState<SiteState | null>(null);
  const [selectedId, setSelectedId] = useState("");
  const [mode, setMode] = useState<Mode>("quran");
  const [claim, setClaim] = useState<QuranClaim | null>(null);
  const [quranStatus, setQuranStatus] = useState<QuranStatus>("idle");
  const [quranBusy, setQuranBusy] = useState(false);
  const [quranCelebration, setQuranCelebration] = useState(false);
  const [remainingSeconds, setRemainingSeconds] = useState<number | null>(null);
  const [salawatAmount, setSalawatAmount] = useState(1);
  const [salawatBusy, setSalawatBusy] = useState(false);
  const [salawatCelebration, setSalawatCelebration] = useState(false);
  const [selectedDevotionId, setSelectedDevotionId] = useState("ayat-kursi");
  const [devotionBusy, setDevotionBusy] = useState(false);
  const [devotionCelebration, setDevotionCelebration] = useState(false);
  const [devotionContent, setDevotionContent] = useState<{
    catalog: readonly DevotionDefinition[];
    guidance: readonly DevotionGuidance[];
  } | null>(null);
  const [online, setOnline] = useState(() => typeof navigator === "undefined" ? true : navigator.onLine);
  const [adminOpen, setAdminOpen] = useState(false);
  const [adminToken, setAdminToken] = useState("");
  const [adminBusy, setAdminBusy] = useState("");
  const [drafts, setDrafts] = useState<Record<string, IntentionDraft>>({});
  const [newIntention, setNewIntention] = useState<IntentionDraft>({ title: "", subtitle: "", salawatTarget: 14000 });

  const current = useMemo(
    () => siteState?.intentions.find((item) => item.id === selectedId) ?? siteState?.intentions[0] ?? null,
    [selectedId, siteState],
  );

  const loadState = useCallback(async () => {
    try {
      const response = await fetch("/api/state", { cache: "no-store" });
      if (!response.ok) throw new Error("state_failed");
      const next = (await response.json()) as SiteState;
      setSiteState(next);
      setSelectedId((value) => value && next.intentions.some((item) => item.id === value) ? value : next.intentions[0]?.id ?? "");
    } catch {
      toast.error("دریافت وضعیت ختم ممکن نشد.");
    }
  }, []);

  useEffect(() => {
    const onOnline = () => { setOnline(true); void loadState(); };
    const onOffline = () => setOnline(false);
    window.addEventListener("online", onOnline);
    window.addEventListener("offline", onOffline);
    const initialLoad = window.setTimeout(() => void loadState(), 0);
    return () => {
      window.clearTimeout(initialLoad);
      window.removeEventListener("online", onOnline);
      window.removeEventListener("offline", onOffline);
    };
  }, [loadState]);

  useEffect(() => {
    if (mode !== "devotions" || devotionContent) return;
    let active = true;
    void import("@/lib/devotions").then(({ DEVOTIONS, DECEASED_GUIDANCE }) => {
      if (active) setDevotionContent({ catalog: DEVOTIONS, guidance: DECEASED_GUIDANCE });
    });
    return () => { active = false; };
  }, [devotionContent, mode]);

  useEffect(() => {
    const timer = window.setInterval(() => {
      if (document.visibilityState === "visible" && navigator.onLine) void loadState();
    }, 30_000);
    return () => window.clearInterval(timer);
  }, [loadState]);

  const claimAyah = useCallback(async () => {
    if (!selectedId || quranBusy) return;
    setQuranBusy(true);
    setQuranStatus("loading");
    setQuranCelebration(false);
    try {
      const response = await fetch("/api/quran/claim", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ intentionId: selectedId }),
      });
      const data = await response.json();
      if (data.state) setSiteState(data.state as SiteState);
      if (response.status === 409) {
        setClaim(null);
        setQuranStatus("waiting");
        return;
      }
      if (!response.ok) throw new Error(data.error ?? "claim_failed");
      setClaim(data.claim as QuranClaim);
      setRemainingSeconds(Math.max(0, Math.ceil((new Date(data.claim.expiresAt).getTime() - Date.now()) / 1000)));
      setQuranStatus("reading");
    } catch {
      setClaim(null);
      setQuranStatus("error");
    } finally {
      setQuranBusy(false);
    }
  }, [quranBusy, selectedId]);

  useEffect(() => {
    if (!claim || quranStatus !== "reading") {
      return;
    }
    const tick = () => {
      const seconds = Math.max(0, Math.ceil((new Date(claim.expiresAt).getTime() - Date.now()) / 1000));
      setRemainingSeconds(seconds);
      if (seconds === 0) {
        setClaim(null);
        setRemainingSeconds(null);
        setQuranStatus("expired");
      }
    };
    tick();
    const timer = window.setInterval(tick, 1000);
    return () => window.clearInterval(timer);
  }, [claim, quranStatus]);

  const completeAyah = async () => {
    if (!claim || quranBusy) return;
    setQuranBusy(true);
    try {
      const response = await fetch("/api/quran/complete", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ claimId: claim.claimId }),
      });
      const data = await response.json();
      if (data.state) setSiteState(data.state as SiteState);
      if (response.status === 409) {
        setClaim(null);
        setRemainingSeconds(null);
        setQuranStatus("expired");
        return;
      }
      if (!response.ok) throw new Error(data.error ?? "complete_failed");
      setClaim(null);
      setRemainingSeconds(null);
      setQuranCelebration(Boolean(data.completedKhatm));
      setQuranStatus("success");
    } catch {
      toast.error("ثبت آیه انجام نشد؛ دوباره تلاش کنید.");
    } finally {
      setQuranBusy(false);
    }
  };

  const contributeSalawat = async () => {
    if (!selectedId || salawatBusy) return;
    setSalawatBusy(true);
    setSalawatCelebration(false);
    try {
      const response = await fetch("/api/salawat/contribute", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ intentionId: selectedId, amount: salawatAmount }),
      });
      const data = await response.json();
      if (!response.ok) throw new Error(data.error ?? "salawat_failed");
      setSiteState(data.state as SiteState);
      setSalawatCelebration(Boolean(data.completedKhatm));
      toast.success(data.completedKhatm ? "یک ختم صلوات کامل شد؛ قبول باشد." : "صلوات‌های شما ثبت شد؛ قبول باشد.");
    } catch {
      toast.error("ثبت صلوات انجام نشد؛ دوباره تلاش کنید.");
    } finally {
      setSalawatBusy(false);
    }
  };

  const contributeDevotion = async () => {
    if (!selectedId || devotionBusy) return;
    setDevotionBusy(true);
    setDevotionCelebration(false);
    try {
      const response = await fetch("/api/devotions/contribute", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ intentionId: selectedId, devotionId: selectedDevotionId }),
      });
      const data = await response.json();
      if (!response.ok) throw new Error(data.error ?? "devotion_failed");
      setSiteState(data.state as SiteState);
      setDevotionCelebration(Boolean(data.completedCycle));
      toast.success(data.completedCycle ? "این دور کامل شد؛ قبول باشد." : "قرائت شما ثبت شد؛ قبول باشد.");
    } catch {
      toast.error("ثبت قرائت انجام نشد؛ دوباره تلاش کنید.");
    } finally {
      setDevotionBusy(false);
    }
  };

  const share = async () => {
    const labels: Record<Mode, string> = { quran: "ختم جمعی قرآن", salawat: "ختم جمعی صلوات", devotions: "هدیه‌های معنوی جمعی" };
    const text = `${labels[mode]}${current ? ` — ${current.title}` : ""}`;
    if (navigator.share) {
      await navigator.share({ title: "ختم جمعی", text, url: location.href }).catch(() => undefined);
      return;
    }
    const copied = await navigator.clipboard.writeText(location.href).then(() => true).catch(() => false);
    toast.info(copied ? "لینک ختم کپی شد." : "لینک صفحه را از نوار نشانی مرورگر کپی کنید.");
  };

  const selectIntention = (value: string) => {
    setSelectedId(value);
    setClaim(null);
    setQuranStatus("idle");
    setQuranCelebration(false);
    setSalawatCelebration(false);
    setDevotionCelebration(false);
  };

  const openAdmin = () => {
    const nextDrafts: Record<string, IntentionDraft> = {};
    siteState?.intentions.forEach((item) => {
      nextDrafts[item.id] = { title: item.title, subtitle: item.subtitle, salawatTarget: item.salawatTarget };
    });
    setDrafts(nextDrafts);
    setAdminOpen(true);
  };

  const adminMutation = async (payload: Record<string, unknown>, busyKey: string) => {
    if (!adminToken) {
      toast.error("ابتدا رمز مدیریت را وارد کنید.");
      return null;
    }
    setAdminBusy(busyKey);
    try {
      const response = await fetch("/api/admin/intentions", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ ...payload, token: adminToken }),
      });
      const data = await response.json();
      if (!response.ok) throw new Error(data.error ?? "admin_update_failed");
      const next = data as SiteState;
      setSiteState(next);
      setSelectedId((value) => next.intentions.some((item) => item.id === value) ? value : next.intentions[0]?.id ?? "");
      const nextDrafts: Record<string, IntentionDraft> = {};
      next.intentions.forEach((item) => {
        nextDrafts[item.id] = { title: item.title, subtitle: item.subtitle, salawatTarget: item.salawatTarget };
      });
      setDrafts(nextDrafts);
      toast.success("فهرست نیت‌ها به‌روزرسانی شد.");
      return next;
    } catch (error) {
      toast.error(errorMessage(error instanceof Error ? error.message : ""));
      return null;
    } finally {
      setAdminBusy("");
    }
  };

  const addIntention = async (event: React.FormEvent) => {
    event.preventDefault();
    const result = await adminMutation({ action: "create", ...newIntention }, "new");
    if (result) setNewIntention({ title: "", subtitle: "", salawatTarget: 14000 });
  };

  if (!siteState || !current) return <InitialLoading />;

  return (
    <main className="site-shell">
      <Toaster position="bottom-center" richColors closeButton />

      <header className="topbar">
        <div className="brand" aria-label="ختم جمعی قرآن، صلوات و هدیه‌های معنوی">
          <span className="brand-mark" aria-hidden="true">۞</span>
          <div><strong>ختم جمعی</strong><small>هر سهم کوچک، برای یک نیت بزرگ</small></div>
        </div>
        <div className="top-actions">
          <Badge variant="outline" className={online ? "online-badge" : "offline-badge"}>{online ? "آنلاین" : "آفلاین"}</Badge>
          <Button variant="outline" size="icon" onClick={() => void share()} aria-label="اشتراک‌گذاری"><Share2 /></Button>
          <Button variant="outline" size="icon" onClick={openAdmin} aria-label="مدیریت نیت‌ها"><Settings2 /></Button>
        </div>
      </header>

      <section className="intention-panel" aria-labelledby="intention-title">
        <div className="intention-copy">
          <span className="eyebrow">نیت این همراهی</span>
          <h1 id="intention-title">{current.title}</h1>
          <p>{current.subtitle}</p>
        </div>
        <div className="intention-picker">
          <Label htmlFor="intention-select">انتخاب نیت</Label>
          <Select dir="rtl" value={current.id} onValueChange={selectIntention}>
            <SelectTrigger id="intention-select" className="intention-select" aria-label="انتخاب نیت"><SelectValue /></SelectTrigger>
            <SelectContent align="start">
              {siteState.intentions.map((item) => <SelectItem key={item.id} value={item.id}>{item.title}</SelectItem>)}
            </SelectContent>
          </Select>
        </div>
      </section>

      <Tabs value={mode} onValueChange={(value) => setMode(value as Mode)} className="experience-tabs" dir="rtl">
        <TabsList className="mode-tabs" aria-label="انتخاب نوع ختم">
          <TabsTrigger value="quran"><BookOpenText /> ختم قرآن</TabsTrigger>
          <TabsTrigger value="salawat"><Sparkles /> ختم صلوات</TabsTrigger>
          <TabsTrigger value="devotions"><HeartHandshake /> هدیه معنوی</TabsTrigger>
        </TabsList>

        <TabsContent value="quran" className="tab-content">
          <ProgressBlock
            label={`ختم قرآن شماره ${fa.format(current.quran.cycle)}`}
            value={current.quran.progressPercent}
            detail={`${fa.format(current.quran.completedAyahs)} از ${fa.format(TOTAL_AYAHS)} آیه`}
            stats={[
              { label: "ختم‌های کامل", value: fa.format(current.quran.completedKhatms), icon: <Check /> },
              { label: "در حال خواندن", value: `${fa.format(current.quran.activeReaders)} نفر`, icon: <Users /> },
            ]}
          />
          <QuranReader
            status={quranStatus}
            claim={claim}
            busy={quranBusy}
            celebration={quranCelebration}
            remainingSeconds={remainingSeconds}
            onComplete={() => void completeAyah()}
            onRetry={() => void claimAyah()}
            onNext={() => void claimAyah()}
            onShare={() => void share()}
          />
        </TabsContent>

        <TabsContent value="salawat" className="tab-content">
          <ProgressBlock
            label={`ختم صلوات شماره ${fa.format(current.salawat.cycle)}`}
            value={current.salawat.progressPercent}
            detail={`${fa.format(current.salawat.current)} از ${fa.format(current.salawat.target)} صلوات`}
            stats={[
              { label: "ختم‌های کامل", value: fa.format(current.salawat.completedKhatms), icon: <Check /> },
              { label: "باقی‌مانده", value: fa.format(Math.max(0, current.salawat.target - current.salawat.current)), icon: <HeartHandshake /> },
            ]}
          />
          <section className="salawat-card" aria-labelledby="salawat-title">
            {salawatCelebration && <div className="celebration-note"><Sparkles /> یک ختم صلوات کامل شد؛ قبول باشد.</div>}
            <span className="reader-kicker">ذکر نورانی</span>
            <h2 id="salawat-title" className="salawat-text" lang="ar">اللَّهُمَّ صَلِّ عَلَىٰ مُحَمَّدٍ وَ آلِ مُحَمَّدٍ وَ عَجِّلْ فَرَجَهُمْ</h2>
            <p className="salawat-help">تعداد صلوات‌هایی را که فرستادید انتخاب کنید و ثبت را بزنید.</p>
            <div className="amount-presets" aria-label="تعدادهای پیشنهادی">
              {[1, 14, 100].map((amount) => (
                <Button key={amount} type="button" variant={salawatAmount === amount ? "default" : "outline"} onClick={() => setSalawatAmount(amount)}>{fa.format(amount)} صلوات</Button>
              ))}
            </div>
            <div className="custom-amount">
              <Label htmlFor="salawat-amount">تعداد دلخواه</Label>
              <Input id="salawat-amount" type="number" inputMode="numeric" min={1} max={1000} value={salawatAmount} onChange={(event) => setSalawatAmount(Math.min(1000, Math.max(1, Number(event.target.value) || 1)))} />
            </div>
            <Button size="lg" className="main-action" onClick={() => void contributeSalawat()} disabled={salawatBusy}>
              {salawatBusy ? <><Spinner /> در حال ثبت…</> : <><Check /> ثبت صلوات‌ها</>}
            </Button>
            <p className="privacy-note">بدون نیاز به نام یا ثبت‌نام؛ فقط شمارنده جمعی به‌روزرسانی می‌شود.</p>
          </section>
        </TabsContent>

        <TabsContent value="devotions" className="tab-content">
          <DevotionsSection
            intention={current}
            catalog={devotionContent?.catalog ?? []}
            guidance={devotionContent?.guidance ?? []}
            selectedId={selectedDevotionId}
            busy={devotionBusy}
            celebration={devotionCelebration}
            onSelect={(id) => { setSelectedDevotionId(id); setDevotionCelebration(false); }}
            onContribute={() => void contributeDevotion()}
          />
        </TabsContent>
      </Tabs>

      <section className="simple-steps" aria-labelledby="steps-title">
        <div><span className="eyebrow">ساده و جمعی</span><h2 id="steps-title">چطور همراه شوم؟</h2></div>
        <div className="steps-grid">
          <article><b>۱</b><div><strong>نیت را انتخاب کنید</strong><p>هر نیت، شمارنده و ختم‌های مستقل خودش را دارد.</p></div></article>
          <article><b>۲</b><div><strong>عمل را انتخاب کنید</strong><p>قرآن پیش‌فرض است؛ صلوات و هدیه‌های معنوی هم در دسترس‌اند.</p></div></article>
          <article><b>۳</b><div><strong>سهمتان را ثبت کنید</strong><p>پس از خواندن، دکمه ثبت را بزنید تا شمارنده مشترک جلو برود.</p></div></article>
        </div>
      </section>

      <footer><span>بدون ثبت‌نام و نمایش نام افراد؛ همه شمارنده‌ها بین وب و اپ مشترک‌اند.</span><span>عدد هدف هدیه‌های معنوی فقط برای هماهنگی جمعی است و ادعای فضیلت عددی ویژه نیست.</span></footer>

      <AdminDialog
        open={adminOpen}
        onOpenChange={setAdminOpen}
        intentions={siteState.intentions}
        token={adminToken}
        onTokenChange={setAdminToken}
        drafts={drafts}
        onDraftChange={(id, draft) => setDrafts((value) => ({ ...value, [id]: draft }))}
        busy={adminBusy}
        onSave={(id) => void adminMutation({ action: "update", id, ...drafts[id] }, id)}
        onArchive={(id) => void adminMutation({ action: "archive", id }, `archive-${id}`)}
        newIntention={newIntention}
        onNewIntentionChange={setNewIntention}
        onAdd={addIntention}
      />
    </main>
  );
}

function InitialLoading() {
  return (
    <main className="site-shell loading-shell" aria-busy="true">
      <div className="loading-brand"><Skeleton className="h-12 w-12 rounded-2xl" /><div><Skeleton className="h-5 w-28" /><Skeleton className="mt-2 h-3 w-44" /></div></div>
      <Skeleton className="h-48 w-full rounded-[2rem]" />
      <Skeleton className="h-14 w-full rounded-2xl" />
      <Skeleton className="h-[28rem] w-full rounded-[2rem]" />
    </main>
  );
}

function ProgressBlock({ label, value, detail, stats }: { label: string; value: number; detail: string; stats: { label: string; value: string; icon: React.ReactNode }[] }) {
  return (
    <section className="progress-card" aria-label={label}>
      <div className="progress-heading"><div><span>{label}</span><strong>{fa.format(value)}٪</strong></div><small>{detail}</small></div>
      <Progress dir="ltr" value={value} className="khatm-progress" aria-label={`پیشرفت ${fa.format(value)} درصد`} />
      <div className="mini-stats">
        {stats.map((item) => <div key={item.label}><span className="mini-icon">{item.icon}</span><p><small>{item.label}</small><strong>{item.value}</strong></p></div>)}
      </div>
    </section>
  );
}

function QuranReader({ status, claim, busy, celebration, remainingSeconds, onComplete, onRetry, onNext, onShare }: {
  status: QuranStatus;
  claim: QuranClaim | null;
  busy: boolean;
  celebration: boolean;
  remainingSeconds: number | null;
  onComplete: () => void;
  onRetry: () => void;
  onNext: () => void;
  onShare: () => void;
}) {
  if (status === "loading") {
    return <section className="reader-card reader-loading" aria-busy="true"><Skeleton className="h-7 w-44" /><Skeleton className="mt-8 h-24 w-full" /><Skeleton className="mt-5 h-16 w-4/5" /><Skeleton className="mt-8 h-12 w-full" /></section>;
  }
  if (status === "idle") return <ReaderEmpty icon={<BookOpenText />} title="آماده‌اید یک آیه بخوانید؟" text="با زدن دکمه، نخستین آیه آزاد به‌ترتیب برای ۴۵ دقیقه به شما سپرده می‌شود؛ تا پیش از آن هیچ سهمی رزرو نمی‌شود." action="دریافت آیه من" onAction={onRetry} />;
  if (status === "error") return <ReaderEmpty icon={<BookOpenText />} title="آیه دریافت نشد" text="اتصال اینترنت یا منبع متن قرآن را بررسی کنید و دوباره تلاش کنید." action="دوباره تلاش می‌کنم" onAction={onRetry} />;
  if (status === "waiting") return <ReaderEmpty icon={<Clock3 />} title="آیات باقی‌مانده در حال خواندن‌اند" text="به محض آزاد شدن یک سهم، می‌توانید ادامه دهید." action="بررسی دوباره" onAction={onRetry} />;
  if (status === "expired") return <ReaderEmpty icon={<Clock3 />} title="زمان این سهم تمام شد" text="برای اینکه آیه‌ای جا نماند، این سهم دوباره به صف جمعی برگشته است." action="یک آیه تازه می‌گیرم" onAction={onRetry} />;
  if (status === "success") {
    return (
      <section className="reader-card">
        <Empty className="border-0 py-8">
          <EmptyHeader><EmptyMedia variant="icon" className="success-media"><Check /></EmptyMedia><EmptyTitle>{celebration ? "یک ختم کامل شد؛ قبول باشد" : "سهم شما ثبت شد؛ قبول باشد"}</EmptyTitle><EmptyDescription>{celebration ? "همه ۶۲۳۶ آیه خوانده شد و ختم بعدی از ابتدای قرآن آغاز شده است." : "اگر مایلید، می‌توانید همین حالا یک آیه دیگر هم بخوانید."}</EmptyDescription></EmptyHeader>
          <EmptyContent><Button size="lg" className="main-action" onClick={onNext}>یک آیه دیگر می‌خوانم</Button><Button variant="outline" onClick={onShare}><Share2 /> دعوت از دوستان</Button></EmptyContent>
        </Empty>
      </section>
    );
  }
  if (!claim) return null;
  return (
    <section className="reader-card" aria-live="polite">
      <div className="verse-meta">
        <Badge variant="secondary">سوره {claim.ayah.surahName}</Badge>
        <Badge variant="secondary">آیه {fa.format(claim.ayah.numberInSurah)}</Badge>
        <Badge variant="secondary">جزء {fa.format(claim.ayah.juz)}</Badge>
        <Badge variant="secondary">صفحه {fa.format(claim.ayah.page)}</Badge>
      </div>
      <span className="reader-kicker">این آیه سهم شماست</span>
      <p className="arabic-verse" lang="ar">{claim.ayah.arabic}</p>
      <div className="verse-divider" aria-hidden="true">۝</div>
      <p className="persian-translation">{claim.ayah.persian}</p>
      <div className="audio-panel"><div><Headphones /><p><strong>تلاوت آیه</strong><small>میشاری راشد العفاسی</small></p></div><audio controls preload="none" src={claim.ayah.audioUrl}>مرورگر شما پخش صوت را پشتیبانی نمی‌کند.</audio></div>
      <Button size="lg" className="main-action" onClick={onComplete} disabled={busy || remainingSeconds === 0}>{busy ? <><Spinner /> در حال ثبت…</> : <><Check /> خواندم</>}</Button>
      <p className="reserve-note"><Clock3 /> {remainingSeconds === null ? "این سهم برای مدت محدودی نگه داشته می‌شود." : `زمان باقی‌مانده: ${formatRemaining(remainingSeconds)}`}</p>
    </section>
  );
}

function ReaderEmpty({ icon, title, text, action, onAction }: { icon: React.ReactNode; title: string; text: string; action: string; onAction: () => void }) {
  return (
    <section className="reader-card">
      <Empty className="border-0 py-8"><EmptyHeader><EmptyMedia variant="icon">{icon}</EmptyMedia><EmptyTitle>{title}</EmptyTitle><EmptyDescription>{text}</EmptyDescription></EmptyHeader><EmptyContent><Button size="lg" className="main-action" onClick={onAction}>{action}</Button></EmptyContent></Empty>
    </section>
  );
}

function DevotionsSection({ intention, catalog, guidance, selectedId, busy, celebration, onSelect, onContribute }: {
  intention: IntentionOverview;
  catalog: readonly DevotionDefinition[];
  guidance: readonly DevotionGuidance[];
  selectedId: string;
  busy: boolean;
  celebration: boolean;
  onSelect: (id: string) => void;
  onContribute: () => void;
}) {
  const devotion = catalog.find((item) => item.id === selectedId) ?? catalog[0];
  if (!devotion) {
    return <section className="reader-card reader-loading" aria-busy="true"><Spinner /><p>متن‌های معتبر در حال آماده‌سازی است…</p></section>;
  }
  const progress = intention.devotions.find((item) => item.id === devotion.id);
  if (!progress) return null;

  return (
    <>
      <nav className="devotion-picker" aria-label="انتخاب هدیه معنوی">
        {catalog.map((item) => (
          <button
            key={item.id}
            type="button"
            className={item.id === devotion.id ? "is-active" : ""}
            aria-pressed={item.id === devotion.id}
            onClick={() => onSelect(item.id)}
          >
            <span>{item.shortTitle}</span>
            <small>{item.id === "ziyarat-ashura" ? "متن کامل" : "قرائت کوتاه"}</small>
          </button>
        ))}
      </nav>

      <ProgressBlock
        label={`دور ${fa.format(progress.cycle)} — ${devotion.title}`}
        value={progress.progressPercent}
        detail={`${fa.format(progress.current)} از ${fa.format(progress.target)} ${devotion.unitLabel}`}
        stats={[
          { label: "دورهای کامل", value: fa.format(progress.completedCycles), icon: <Check /> },
          { label: "باقی‌مانده", value: fa.format(Math.max(0, progress.target - progress.current)), icon: <HeartHandshake /> },
        ]}
      />

      <section className="devotion-card" aria-labelledby="devotion-title">
        {celebration && <div className="celebration-note"><Sparkles /> این دور کامل شد؛ قبول باشد.</div>}
        <span className="reader-kicker">برای قرائت و اهدای ثواب</span>
        <h2 id="devotion-title">{devotion.title}</h2>
        <p className="devotion-description">{devotion.description}</p>
        <div className="evidence-note">
          <strong>یادآوری دقیق</strong>
          <p>{devotion.evidenceNote}</p>
        </div>

        <div className="devotion-texts">
          {devotion.blocks.map((block, index) => {
            const content = (
              <>
                {block.repeat && <Badge variant="secondary">این فراز {fa.format(block.repeat)} مرتبه</Badge>}
                <p className="devotion-arabic" lang="ar">{block.arabic}</p>
                <p className="devotion-meaning"><strong>معنای روان:</strong> {block.meaning}</p>
              </>
            );
            if (devotion.blocks.length === 1) return <article className="devotion-block" key={block.heading ?? index}>{content}</article>;
            return (
              <details className="devotion-block devotion-details" key={block.heading ?? index} open={index === 0}>
                <summary>{block.heading ?? `بخش ${fa.format(index + 1)}`}</summary>
                <div>{content}</div>
              </details>
            );
          })}
        </div>

        <a className="source-link" href={devotion.sourceUrl} target="_blank" rel="noreferrer">
          منبع متن: {devotion.sourceLabel} <span aria-hidden="true">↗</span>
        </a>
        <Button size="lg" className="main-action" onClick={onContribute} disabled={busy}>
          {busy ? <><Spinner /> در حال ثبت…</> : <><Check /> خواندم؛ ثبت یک {devotion.unitLabel}</>}
        </Button>
        <p className="privacy-note">ثبت فقط شمارنده مشترک این نیت را به‌روزرسانی می‌کند و هیچ اطلاعات شخصی دریافت نمی‌شود.</p>
      </section>

      <section className="guidance-section" aria-labelledby="guidance-title">
        <div className="guidance-heading">
          <span className="eyebrow">با منبع روشن</span>
          <h2 id="guidance-title">چه کارهایی برای درگذشته بهتر است؟</h2>
          <p>پیشنهادهای زیر بر قرآن و فتاوای رسمی تکیه دارند؛ برای جزئیات هر مورد، منبع اصلی را باز کنید.</p>
        </div>
        <div className="guidance-grid">
          {guidance.map((item) => (
            <article key={item.title}>
              <span aria-hidden="true">✦</span>
              <h3>{item.title}</h3>
              <p>{item.text}</p>
              <a href={item.sourceUrl} target="_blank" rel="noreferrer">مشاهده منبع رسمی ↗</a>
            </article>
          ))}
        </div>
      </section>
    </>
  );
}

function AdminDialog({ open, onOpenChange, intentions, token, onTokenChange, drafts, onDraftChange, busy, onSave, onArchive, newIntention, onNewIntentionChange, onAdd }: {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  intentions: IntentionOverview[];
  token: string;
  onTokenChange: (value: string) => void;
  drafts: Record<string, IntentionDraft>;
  onDraftChange: (id: string, draft: IntentionDraft) => void;
  busy: string;
  onSave: (id: string) => void;
  onArchive: (id: string) => void;
  newIntention: IntentionDraft;
  onNewIntentionChange: (value: IntentionDraft) => void;
  onAdd: (event: React.FormEvent) => void;
}) {
  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="admin-dialog max-h-[92vh] overflow-y-auto sm:max-w-2xl [&>[data-slot=dialog-close]]:right-auto [&>[data-slot=dialog-close]]:left-4">
        <DialogHeader className="text-right sm:text-right"><DialogTitle>مدیریت نیت‌ها</DialogTitle><DialogDescription>نیت‌ها را اضافه، ویرایش یا از فهرست عمومی حذف کنید. پیشرفت‌های قبلی محفوظ می‌ماند.</DialogDescription></DialogHeader>
        <div className="admin-password"><Label htmlFor="admin-token">رمز مدیریت</Label><Input id="admin-token" type="password" value={token} onChange={(event) => onTokenChange(event.target.value)} autoComplete="current-password" placeholder="رمز مدیریت سایت" /></div>
        <div className="admin-list">
          {intentions.map((item) => {
            const draft = drafts[item.id];
            if (!draft) return null;
            return (
              <article className="admin-item" key={item.id}>
                <div className="admin-fields">
                  <Label htmlFor={`title-${item.id}`}>عنوان نیت</Label><Input id={`title-${item.id}`} value={draft.title} onChange={(event) => onDraftChange(item.id, { ...draft, title: event.target.value })} maxLength={160} />
                  <Label htmlFor={`subtitle-${item.id}`}>توضیح کوتاه</Label><Textarea id={`subtitle-${item.id}`} value={draft.subtitle} onChange={(event) => onDraftChange(item.id, { ...draft, subtitle: event.target.value })} maxLength={240} />
                  <Label htmlFor={`target-${item.id}`}>هدف هر ختم صلوات</Label><Input id={`target-${item.id}`} type="number" min={100} max={10000000} value={draft.salawatTarget} onChange={(event) => onDraftChange(item.id, { ...draft, salawatTarget: Number(event.target.value) || 100 })} />
                </div>
                <div className="admin-actions">
                  <Button type="button" onClick={() => onSave(item.id)} disabled={Boolean(busy)}>{busy === item.id ? <Spinner /> : <Save />} ذخیره</Button>
                  <AlertDialog>
                    <AlertDialogTrigger asChild><Button type="button" variant="outline" className="remove-button" disabled={Boolean(busy)}><Trash2 /> حذف از فهرست</Button></AlertDialogTrigger>
                    <AlertDialogContent dir="rtl"><AlertDialogHeader className="text-right sm:text-right"><AlertDialogTitle>این نیت از فهرست حذف شود؟</AlertDialogTitle><AlertDialogDescription>اطلاعات و سابقه حذف نمی‌شود؛ فقط دیگر برای کاربران نمایش داده نخواهد شد.</AlertDialogDescription></AlertDialogHeader><AlertDialogFooter className="sm:justify-start"><AlertDialogCancel>انصراف</AlertDialogCancel><AlertDialogAction variant="destructive" onClick={() => onArchive(item.id)}>حذف از فهرست</AlertDialogAction></AlertDialogFooter></AlertDialogContent>
                  </AlertDialog>
                </div>
              </article>
            );
          })}
        </div>
        <form className="new-intention" onSubmit={onAdd}>
          <div className="new-title"><Plus /><div><strong>افزودن نیت جدید</strong><small>پس از ذخیره، فوراً در فهرست انتخاب کاربران قرار می‌گیرد.</small></div></div>
          <Label htmlFor="new-title">عنوان نیت</Label><Input id="new-title" value={newIntention.title} onChange={(event) => onNewIntentionChange({ ...newIntention, title: event.target.value })} maxLength={160} required />
          <Label htmlFor="new-subtitle">توضیح کوتاه</Label><Textarea id="new-subtitle" value={newIntention.subtitle} onChange={(event) => onNewIntentionChange({ ...newIntention, subtitle: event.target.value })} maxLength={240} />
          <Label htmlFor="new-target">هدف هر ختم صلوات</Label><Input id="new-target" type="number" min={100} max={10000000} value={newIntention.salawatTarget} onChange={(event) => onNewIntentionChange({ ...newIntention, salawatTarget: Number(event.target.value) || 100 })} required />
          <Button type="submit" size="lg" disabled={Boolean(busy)}>{busy === "new" ? <Spinner /> : <Plus />} افزودن نیت</Button>
        </form>
      </DialogContent>
    </Dialog>
  );
}
