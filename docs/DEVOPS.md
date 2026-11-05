# DevOps Runbook

Last updated: 2026-11-05

This is the operating guide for shipping and running Newman Stores Collections.
It covers CI, deployments, database changes, backups, monitoring, security, and
incidents.

## Stack and ownership

| Layer           | Service                                   |
| --------------- | ----------------------------------------- |
| Source control  | GitHub (`main` is production)             |
| Hosting         | Vercel                                    |
| Database / Auth | Supabase project `sluzncmaxzkscumfoinw`   |
| Package manager | Bun (text `bun.lock`)                     |
| Public site     | https://newmanstorescollection.vercel.app |

Do not commit `.env`, `env.txt`, service-role keys, database passwords, or
Paystack secret keys. The repository ignores those files.

## Environments

| Environment | Frontend                 | Database                         | Purpose                  |
| ----------- | ------------------------ | -------------------------------- | ------------------------ |
| Local       | `bun run dev`            | Local `.env`                     | Development              |
| Preview     | Vercel PR/branch deploy  | Currently the production project | Review UI before merging |
| Production  | Vercel `main` deployment | Supabase `sluzncmaxzkscumfoinw`  | Live customers           |

A staging Supabase project is recommended before database migrations are
automated. Preview deployments currently share the production database, so do
not run destructive tests from a preview URL.

## CI

Workflow: `.github/workflows/ci.yml`

It runs on pushes to `main`, pull requests, and manual dispatch:

1. `bun install --frozen-lockfile`
2. `bun run typecheck`
3. `bun run lint`
4. `bun run format:check`
5. `bun run build`

CI uses Bun `1.4.4` and public Supabase values from repository variables. If the
variables are missing, safe placeholders keep the build green. The placeholders
are only for compilation checks; Vercel injects the real values when deploying.

Configure the public values in **GitHub → Settings → Secrets and variables →
Actions → Variables**:

- `VITE_SUPABASE_URL`
- `VITE_SUPABASE_PUBLISHABLE_KEY`

Do not put the service-role key in GitHub Actions variables or in client code.

### Required branch protection (manual)

In **GitHub → Settings → Branches**, protect `main`:

- Require the `Verify` status check to pass
- Require at least one pull request review
- Block force pushes
- Block deletions

The workflow cannot enable branch protection by itself.

## Deployments and rollback

Vercel deploys `main` automatically after a push. Pull requests get preview URLs.

Production environment variables live in **Vercel → Project → Settings →
Environment Variables**. Required values:

| Name                            | Exposure      | Notes                                      |
| ------------------------------- | ------------- | ------------------------------------------ |
| `VITE_SUPABASE_URL`             | Browser       | Public Supabase project URL                |
| `VITE_SUPABASE_PUBLISHABLE_KEY` | Browser       | Public anon/publishable key                |
| `SUPABASE_URL`                  | Server        | Optional server-side alias                 |
| `SUPABASE_PUBLISHABLE_KEY`      | Server        | Optional server-side alias                 |
| `SUPABASE_SERVICE_ROLE_KEY`     | Server only   | Bypasses RLS. Never expose to the browser. |
| `VITE_PAYSTACK_PUBLIC_KEY`      | Browser       | Paystack public key                        |
| `BRAND_LOGO_URL`                | Server/public | Optional receipt logo URL                  |

The server code accepts the non-`VITE_` service-role name first. Set
`SUPABASE_SERVICE_ROLE_KEY` in Vercel and remove `VITE_SUPABASE_SERVICE_ROLE_KEY`
after verifying server functions still work. Vite exposes `VITE_` variables to
the client bundle, so the non-`VITE_` name is safer.

### Rollback

1. Open **Vercel → Deployments**.
2. Find the last known-good production deployment.
3. Use **Promote to Production** / **Rollback**.
4. Verify the storefront and admin login.
5. If the incident involved a database migration, check that the old app version
   is still compatible with the current schema.

Keep database migrations backward-compatible (expand, then contract) so a
frontend rollback does not break the database.

## Database migrations

SQL migrations live in `supabase/migrations/`. The linked project is configured
in `supabase/config.toml`.

```bash
bunx supabase login
bunx supabase link --project-ref sluzncmaxzkscumfoinw
bunx supabase db push
```

Rules:

- Add a new timestamped migration; do not edit migrations that have already
  been applied to production.
- Review generated SQL before pushing.
- Take a backup before destructive changes (`DROP`, data rewrites, type changes).
- If you use the Supabase SQL Editor for an emergency fix, add an equivalent
  migration file to the repository immediately afterward.
- Do not copy customer orders, reviews, or personal data into a staging project
  without explicit approval.

Automated production migrations are intentionally not enabled yet. They require
a `SUPABASE_ACCESS_TOKEN`, a database password, a protected GitHub Environment,
and a staging project for rehearsal.

## Backups and recovery

In **Supabase → Database → Backups**:

- Confirm the current backup retention for the project plan.
- Enable point-in-time recovery (PITR) if the plan supports it.
- Record the retention period in this document after checking the dashboard.

Recommended periodic exports:

- `products`
- `orders`
- `site_settings`
- `user_roles`
- Storage objects in the private `media` bucket

Store exports encrypted and access-controlled. Orders contain customer data;
follow the shop's privacy and retention policy.

Test a restore at least quarterly. A backup that has never been restored is only
a hope.

## Monitoring

Current:

- Vercel deployment status and build logs
- Supabase logs for API, Auth, Postgres, and Storage

Recommended:

- **Uptime monitor** for the live site, `/shop`, and `/auth` with alerts to
  `newmanstorescollections@gmail.com`.
- **Sentry** (or equivalent) for frontend and server errors.
- **Vercel Analytics / Speed Insights** for traffic and Core Web Vitals.
- Supabase alerts for failed auth spikes, database CPU/connections, and storage
  errors.
- A lightweight health endpoint that checks Supabase reachability.

## Security

- Keep Row Level Security enabled on every exposed table and review policies
  when adding tables.
- The service-role key is server-only and must never be prefixed with `VITE_`.
- Security headers are set in `vercel.json`:
  - `Strict-Transport-Security`
  - `X-Content-Type-Options`
  - `X-Frame-Options`
  - `Referrer-Policy`
  - `Permissions-Policy`
- Content-Security-Policy is intentionally deferred until the app's Supabase,
  payment, image, and inline-style requirements are audited. Add it in
  report-only mode first.
- Enable MFA for admin accounts where Supabase Auth supports it.
- Review `user_roles` regularly and remove unused admin/staff accounts.
- Dependabot runs weekly for Bun dependencies and GitHub Actions. Merge only
  after CI passes and the app has been smoke-tested.
- Use GitHub secret scanning and rotate any key that is ever exposed.
- Never commit `.env`, `env.txt`, or exported customer data.

## Release checklist

- [ ] Pull request uses the repository template
- [ ] CI is green
- [ ] Migration reviewed (if any)
- [ ] Backup taken before destructive database work
- [ ] Vercel preview checked on mobile and desktop
- [ ] Merge to `main`
- [ ] Vercel production deployment succeeds
- [ ] Smoke test: shop loads, product page opens, cart works, admin login works,
      order tracking works
- [ ] Tag the release if the change is significant

## Incident checklist

1. Confirm impact: frontend only, database, auth, payments, or storage?
2. Roll back the Vercel deployment if the regression is frontend-only.
3. If data is affected, pause writes and identify the last known-good backup.
4. Restore only after confirming the blast radius and notifying the owner.
5. Communicate status and expected resolution time.
6. Record a short timeline and root cause.
7. Add a CI check or test that would have caught the issue.

## Manual setup still required

- [ ] Enable branch protection on `main`
- [ ] Enable Dependabot alerts and security updates in GitHub settings
- [ ] Add GitHub Actions repository variables
- [ ] Set the non-`VITE_` service-role key in Vercel
- [ ] Configure an uptime monitor
- [ ] Verify Supabase backup retention / PITR
- [ ] Add Sentry or another error tracker
- [ ] Create a staging Supabase project
- [ ] Add `SUPABASE_ACCESS_TOKEN` and database credentials for migration
      automation (only after staging exists)
- [ ] Add automated tests (unit and end-to-end)
