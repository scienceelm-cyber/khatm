# Security notes

- Never commit `.env`, `ADMIN_TOKEN`, deployment credentials, database exports, or backups.
- Keep `ADMIN_TOKEN` as a hosting secret with at least 20 characters.
- The public interface stores no reader name, phone number, or account.
- Browser mutation requests from foreign origins are rejected.
- Production responses set HSTS, frame blocking, MIME-sniffing protection, a strict referrer policy, and a restrictive permissions policy.
- Android blocks cleartext networking, excludes all app data from backup/transfer, and never persists the admin password.
- Intention removal is non-destructive; historical counters remain in D1.
- Review dependency and GitHub Actions updates from Dependabot.
- Quran text, translation, and audio rely on external providers; monitor provider availability and licensing.
