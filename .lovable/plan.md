
# FinSpark — Admin, Licensing & Versioning

## 1. Rebrand: Vault → FinSpark
- Replace "Vault" everywhere (landing, `__root.tsx` head, AppShell logo, sitemap, JSON-LD, PDF exports, meta descriptions).
- Rewrite landing page copy: hero, value props (Track • Budget • Grow), feature grid (Accounts, Transactions, Budgets, Bills, Goals, Net Worth, Reports), pricing teaser, FAQ, footer.
- Badge on landing/dashboard: *"AI-powered insights coming soon in v2"*.

## 2. Account-to-Account Transfer
- New "Transfer" button on Accounts page → dialog: From, To, Amount, Date, Note.
- One server fn inserts two linked transactions (expense on source, income on destination), category = system "Transfer", linked by a shared `transfer_id` so the existing balance trigger handles balances naturally.

## 3. Database (single migration)
```text
app_role          enum('admin','user')
user_roles        (user_id, role)              + has_role() SECURITY DEFINER
app_settings      (key, value jsonb)           — holds { app_version: 'v1' }
user_licenses     (user_id PK, trial_ends_at, license_ends_at, status 'active'|'blocked', notes)
profiles          (user_id PK, email, full_name, created_at)   — mirrored from auth via trigger
transactions      + transfer_id uuid nullable
```
- Trigger on `auth.users` insert → creates profile + user_license with `trial_ends_at = now() + 28 days`, status='active'.
- Trigger seeds admin role for `lvihan24@gmail.com` on signup (and one-time backfill for existing row).
- `is_app_writable(uid)` SECURITY DEFINER helper → false if blocked or both trial+license expired.
- RLS: regular users see only own data; admins see all profiles/licenses via `has_role`. Writes to transactions/accounts/budgets/bills/goals gated by `is_app_writable(auth.uid())` in WITH CHECK.

## 4. Admin Panel (`/_authenticated/admin`)
Visible only when `has_role(uid,'admin')`; AppShell hides the nav link otherwise.
- **Users tab**: table of all users (email, signup, trial end, license end, status). Actions: Block / Unblock, Grant license (days picker → extends `license_ends_at`), Reset trial, Make/Remove admin.
- **App Version tab**: radio `v1 (Free, no AI)` / `v2 (AI enabled)` → writes to `app_settings`.
- **Stats tab**: total users, active, blocked, on trial, paid, signups last 7/30 days.

## 5. Version Flag & AI Gating
- `useAppVersion()` hook queries `app_settings.app_version` (cached, public read).
- In v1: hide `Assistant` nav item & route guard redirects to `/dashboard`; hide AI Briefing card, anomaly alerts, receipt-scan button. Show "Upgrade to v2 for AI" upsell cards in their place.
- In v2: everything shows as today.

## 6. License Enforcement (Read-Only Mode)
- `useLicenseStatus()` hook → `{ status, daysLeft, readOnly }`.
- When `readOnly` (expired or blocked): banner at top of every page "Your access is read-only. Contact us to renew." All add/edit/delete buttons disabled with tooltip; mutations server fns also re-check via RLS.
- Blocked users: full-screen lock page with contact info, signout button.

## 7. Subscriptions Page (`/_authenticated/plans`)
Display-only pricing cards (Trial 28d free / Monthly / Quarterly / Yearly) with "Contact admin to activate" CTA + WhatsApp/email link. No payment integration.

## 8. Senior-friendly polish kept
All new UIs use existing large-text, high-contrast tokens. No Lovable references.

---

## Technical notes
- Server fns: `admin.functions.ts` (list/block/unblock/grant/setVersion/setRole) all `.middleware([requireSupabaseAuth])` + internal `has_role` check, else 403.
- `transfer.functions.ts` for atomic dual-insert.
- `appVersion.functions.ts` public read of `app_settings` (anon SELECT on that single key).
- Read-only check is enforced both client-side (UX) and DB-side (RLS WITH CHECK via `is_app_writable`).
- Admin seeded for `lvihan24@gmail.com`; trigger also catches if that email signs up later.

## Out of scope (deferred)
- Payment gateway integration.
- Email notifications on license expiry (can add later via cron).

Approve and I'll build it end-to-end.
