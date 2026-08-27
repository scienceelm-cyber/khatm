# Security notes

- Never commit `.env`, database credentials, `ADMIN_TOKEN`, deployment tokens, or backups.
- Use HTTPS in production.
- Set `ADMIN_TOKEN` to a unique random secret of at least 20 characters; 32+ random bytes is preferred.
- Put the app behind reverse-proxy rate limiting if it is exposed to the public internet. The application prevents browser cross-site mutation requests, but application-level logic is not a substitute for edge rate limiting against scripted abuse.
- Back up PostgreSQL and periodically verify restore procedures.
- Keep Next.js on a currently supported patched release and review Dependabot/security advisories.
- Quran text, translation and audio are fetched from configured external providers; provider compromise/outage is an external dependency risk.
