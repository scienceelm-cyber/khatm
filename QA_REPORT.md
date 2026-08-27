# QA Report — Khatm v1.1.0

## ممیزی انجام‌شده پیش از GitHub

- ساختار Next.js App Router و مرز client/server
- schema و indexهای PostgreSQL
- تخصیص اتمیک و ترتیب جمعی آیات
- session ناشناس و رفتار refresh
- recycle رزروهای منقضی
- invariant ختم دقیقاً 6236 آیه
- history و افزایش شمارنده ختم
- مدیریت نیت و secret handling
- خطاهای شبکه و UI موبایل/RTL
- Docker/Compose و bootstrap دیتابیس
- GitHub Actions
- endpoint سلامت
- وابستگی runtime محتوای قرآن و صوت

## ایرادهای v1.0.0 که در v1.1.0 رفع شدند

1. **Expired completion bug:** در حالت خاصی claim منقضی‌شده تا قبل از cleanup بعدی می‌توانست با «خواندم» ثبت شود. اکنون زمان انقضا داخل تراکنش completion بررسی می‌شود و 409 برمی‌گردد.
2. **CI cache misconfiguration:** npm cache بدون lockfile می‌توانست setup-node را fail کند. cache حذف شد تا CI فعلی قطعی اجرا شود.
3. **Unsafe Compose defaults:** رمزهای نمونه شناخته‌شده از Compose حذف شدند و secretهای لازم اجباری شدند.
4. **DB init on standalone deploy:** Docker حالا قبل از start، schema idempotent را اجرا می‌کند.
5. **Managed PostgreSQL init:** اسکریپت init از `DATABASE_SSL=true` پشتیبانی می‌کند.
6. **Cross-site mutations:** claim/complete/admin درخواست‌های مرورگری cross-site را رد می‌کنند.
7. **Stale UX:** UI زمان واقعی باقی‌مانده claim را نشان می‌دهد و پس از انقضا دکمه ثبت را کنار می‌گذارد.
8. **Shared progress freshness:** آمار جمعی با cadence کم و فقط در صفحه visible به‌روز می‌شود.
9. **Admin configuration:** placeholder یا token خیلی کوتاه fail-closed می‌شود.

## CI smoke coverage

CI با PostgreSQL واقعی و Quran API mock محلی تست می‌کند:

- health 200
- first claim = ayah 1
- same session = same active claim
- completion increments count
- next claim = ayah 2
- forced expiry => completion 409
- expired ayah reclaimed at head of sequence
- wrong/correct admin token
- foreign Origin rejected
- 20 concurrent sessions => 20 unique claims exactly 1..20

## محدودیت محیط محلی این ممیزی

دسترسی npm registry در runner محلی timeout شد، بنابراین build کامل dependency-backed در همین container انجام نشد. به همین علت full typecheck/build/smoke به GitHub Actions منتقل شده تا روی runner واقعی با dependencies نصب‌شده اجرا شود. هیچ PASS ساختگی گزارش نشده است.

## Production gate

نسخه فقط زمانی release candidate سبز محسوب می‌شود که GitHub Actions روی commit نهایی PASS شود و سپس روی مقصد deployment نیز `/api/health`, HTTPS, audio playback و دو-browser concurrency smoke test تأیید شوند.
