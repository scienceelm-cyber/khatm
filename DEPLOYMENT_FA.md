# راهنمای استقرار عملیاتی

## Docker / Coolify

این repository با Dockerfile آماده است. در Coolify یک سرویس از GitHub repository بسازید و Dockerfile را روش build انتخاب کنید.

Environment variables ضروری:

```dotenv
DATABASE_URL=postgresql://...
DATABASE_SSL=true
ADMIN_TOKEN=<a-long-random-secret>
CLAIM_TTL_MINUTES=45
QURAN_API_BASE=https://api.alquran.cloud/v1
QURAN_ARABIC_EDITION=quran-uthmani-quran-academy
QURAN_PERSIAN_EDITION=fa.makarem
QURAN_AUDIO_EDITION=ar.alafasy
QURAN_AUDIO_BITRATE=128
```

اگر PostgreSQL داخل همان شبکه و بدون TLS است، `DATABASE_SSL=false` بگذارید.

Container قبل از اجرای Next.js، `scripts/init-db.mjs` را اجرا می‌کند؛ schema idempotent است.

## قبل از انتشار لینک برای دوستان

- GitHub Actions سبز باشد.
- `/api/health` پاسخ 200 بدهد.
- با دو مرورگر متفاوت هم‌زمان سایت را باز کنید و مطمئن شوید آیات متفاوت و متوالی می‌گیرند.
- یک آیه را «خواندم» بزنید و افزایش شمارنده را ببینید.
- تغییر نیت را با رمز صحیح و رمز اشتباه تست کنید.
- صوت روی Android/iPhone و مرورگر دسکتاپ تست شود.
- Backup دیتابیس فعال باشد.
- HTTPS فعال باشد.

## مانیتورینگ ساده

برای uptime monitoring همین endpoint کافی است:

`GET /api/health`

اگر 503 شد، ابتدا اتصال PostgreSQL را بررسی کنید.
