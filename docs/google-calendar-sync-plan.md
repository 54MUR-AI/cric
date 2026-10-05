# Google Calendar Two-Way Sync — Scope

> **Status:** Scope document only. Nothing in this file has been implemented,
> and no schema has been applied to Supabase. All SQL below is illustrative and
> must go through the normal migration review (see `supabase/migrations/`)
> before anything is created.

## 0. What "family" means here

The original request was for a shared *family* calendar. CRIC Manager is not a
household app. It is the private member app for **Chair Rock Island
Corporation (CRIC)**, so in this document:

| Request wording | CRIC meaning |
| --- | --- |
| "family" | **All authenticated CRIC members**: every `profiles` row backed by `auth.users` |
| "family calendar" | **One org-wide shared calendar** (`shared_calendars` row with slug `cric`) |
| "family member" | A CRIC member (`profiles.id`) |
| "parent / admin" | A CRIC admin: `profiles.is_admin = true` **or** JWT `app_metadata.role = 'super_admin'` (the same check used in `20261005000001_rls_p0_tighten.sql` and `supabase/functions/_shared/auth.ts`) |

The app has a single tenant today: there is no `organizations` table, and every
authenticated user is a member. The calendar keeps that model. Events are keyed
to a `shared_calendars` row instead of a household or user, which leaves room
for more org calendars later (for example a Board-only calendar) without a
schema rewrite.

## Scope

**In scope:** Google Calendar only.

1. Supabase schema: `calendar_links` plus an org-keyed events table and its sync tables.
2. RLS: every member can read; only the creator or an admin can create, update, or delete.
3. Google OAuth in the app: link and unlink, the `calendar.events` scope, and server-side refresh-token storage.
4. Two-way sync: app events go to every connected Google calendar, and Google changes come back into the shared calendar.
5. Background work: token health, watch-channel renewal, and a reconnect prompt when access is revoked or expired.
6. UI: calendar events inside Schedule, with synced and local events marked differently.
7. Edge cases: duplicates, timezones, cancelled or rescheduled events, recurring events, and unlink.

**Out of scope**

- **Proton Calendar.** It is out of scope and not planned here. Only Google is covered.
- Apple/iCloud, Outlook/Microsoft 365, and generic CalDAV.
- "Sign in with Google" as an app login method. Linking a calendar does **not** change how members log in (Supabase email/password stays as is).
- Pushing existing `bookings`, `boat_trips`, or `meetings` to Google (see §8 and Open Questions).
- Any implementation, migration, Edge Function, or UI code. This document is the only deliverable.

---

## 1. Supabase schema

Five new objects. All live in `public` except the Vault secrets.

### 1.1 `shared_calendars`: the org key

```sql
create table shared_calendars (
  id          uuid primary key default gen_random_uuid(),
  slug        text not null unique,              -- 'cric'
  name        text not null,                     -- 'CRIC Shared Calendar'
  time_zone   text not null default 'America/New_York', -- island local time
  created_at  timestamptz not null default now()
);
-- seed: insert into shared_calendars (slug, name) values ('cric', 'CRIC Shared Calendar');
```

### 1.2 `calendar_links`: one Google link per member

Holds per-user Google OAuth state. **The refresh token itself is never stored in
this table.** It goes in Supabase Vault, and the table keeps only the Vault
secret id (see §3.3).

```sql
create type calendar_link_status as enum ('active', 'needs_reconnect', 'revoked', 'error');

create table calendar_links (
  id                       uuid primary key default gen_random_uuid(),
  profile_id               uuid not null unique references profiles(id) on delete cascade,
  provider                 text not null default 'google' check (provider = 'google'),
  google_sub               text not null,          -- stable Google account id (from id_token)
  google_email             text,                   -- display only
  refresh_token_secret_id  uuid not null,          -- vault.secrets.id; NEVER the token itself
  granted_scopes           text[] not null,
  target_calendar_id       text not null default 'primary', -- or the id of an app-created "CRIC" calendar
  sync_token               text,                   -- Google incremental sync token
  watch_channel_id         text,                   -- events.watch channel
  watch_resource_id        text,
  watch_token_hash         text,                   -- hash of X-Goog-Channel-Token we issued
  watch_expires_at         timestamptz,
  status                   calendar_link_status not null default 'active',
  last_error               text,
  last_synced_at           timestamptz,
  created_at               timestamptz not null default now(),
  updated_at               timestamptz not null default now()
);
```

### 1.3 `calendar_events`: the shared, org-keyed events

The app's copy is the **canonical** record. Google copies are projections of it.

```sql
create table calendar_events (
  id                uuid primary key default gen_random_uuid(),
  calendar_id       uuid not null references shared_calendars(id) on delete restrict,

  -- core fields
  title             text not null check (length(title) between 1 and 300),
  description       text,
  location          text,                         -- optional
  all_day           boolean not null default false,
  start_at          timestamptz,                  -- timed events (stored UTC)
  end_at            timestamptz,
  start_date        date,                         -- all-day events (inclusive)
  end_date          date,                         -- inclusive; Google's exclusive end = end_date + 1
  time_zone         text not null default 'America/New_York', -- IANA zone the event was authored in
  created_by        uuid references profiles(id) on delete set null,
  created_at        timestamptz not null default now(),
  updated_at        timestamptz not null default now(),

  -- sync fields
  source            text not null default 'app' check (source in ('app', 'google')),
  origin_link_id    uuid references calendar_links(id) on delete set null, -- link it was imported from (source='google')
  google_event_id   text unique,                  -- shared Google event id used in every member calendar (see §4.2)
  ical_uid          text,
  status            text not null default 'confirmed' check (status in ('confirmed', 'tentative', 'cancelled')),
  sequence          int not null default 0,       -- bumped on every canonical change
  google_updated_at timestamptz,                  -- `updated` of last accepted Google change
  deleted_at        timestamptz,                  -- soft-delete tombstone so deletes can propagate

  constraint calendar_events_time_shape check (
    (all_day and start_date is not null and end_date is not null and end_date >= start_date
             and start_at is null and end_at is null)
    or
    (not all_day and start_at is not null and end_at is not null and end_at > start_at
             and start_date is null and end_date is null)
  )
);

create index on calendar_events (calendar_id, start_at);
create index on calendar_events (calendar_id, start_date);
create index on calendar_events (created_by);
```

### 1.4 `calendar_event_copies`: per-member Google copies

One row per (event, linked member). This holds per-calendar state (`etag`,
whether the member deleted their copy, errors). A single `google_event_id`
column on the event can't capture that across N calendars.

```sql
create table calendar_event_copies (
  event_id          uuid not null references calendar_events(id) on delete cascade,
  link_id           uuid not null references calendar_links(id) on delete cascade,
  google_event_id   text not null,
  etag              text,
  google_updated_at timestamptz,
  state             text not null default 'pending'
                    check (state in ('pending', 'synced', 'error', 'removed_by_user', 'deleted')),
  last_pushed_at    timestamptz,
  last_error        text,
  primary key (event_id, link_id)
);
```

### 1.5 `calendar_sync_outbox`: push queue (service only)

```sql
create table calendar_sync_outbox (
  id              bigserial primary key,
  event_id        uuid not null references calendar_events(id) on delete cascade,
  op              text not null check (op in ('upsert', 'delete')),
  target_link_id  uuid references calendar_links(id) on delete cascade, -- null = all active links
  attempts        int not null default 0,
  next_attempt_at timestamptz not null default now(),
  last_error      text,
  created_at      timestamptz not null default now()
);
```

An `AFTER INSERT/UPDATE` trigger on `calendar_events` enqueues an outbox row
whenever a user-visible field changes. Inserting a new `calendar_links` row
enqueues a backfill of upcoming events for that link.

### 1.6 Offline cache

`src/lib/db.ts` (Dexie) would get a `calendar_events` store in a new version,
plus support for `pending_changes` with `table = 'calendar_events'`. That keeps
event creation offline-friendly like bookings. Google sync always runs on the
server, after the write reaches Supabase.

---

## 2. Row Level Security

These follow the conventions in `20261005000001_rls_p0_tighten.sql`: inlined
admin check and no new `SECURITY DEFINER` helpers.

### 2.1 `calendar_events`: all members read; creator or admin writes

```sql
alter table calendar_events enable row level security;

create policy "Calendar events readable by members"
  on calendar_events for select
  using (auth.role() = 'authenticated');

create policy "Members create own calendar events"
  on calendar_events for insert
  with check (auth.uid() = created_by and source = 'app');

create policy "Creator or admin updates calendar events"
  on calendar_events for update
  using (
    auth.uid() = created_by
    or exists (select 1 from profiles where id = auth.uid() and is_admin = true)
    or (auth.jwt() -> 'app_metadata' ->> 'role') = 'super_admin'
  )
  with check (
    auth.uid() = created_by
    or exists (select 1 from profiles where id = auth.uid() and is_admin = true)
    or (auth.jwt() -> 'app_metadata' ->> 'role') = 'super_admin'
  );

create policy "Creator or admin deletes calendar events"
  on calendar_events for delete
  using (
    auth.uid() = created_by
    or exists (select 1 from profiles where id = auth.uid() and is_admin = true)
    or (auth.jwt() -> 'app_metadata' ->> 'role') = 'super_admin'
  );
```

RLS can't restrict individual columns, so a `BEFORE UPDATE` trigger (or
column-level `REVOKE UPDATE`) stops `authenticated` callers from changing
`created_by`, `source`, `origin_link_id`, `google_event_id`, `ical_uid`,
`sequence`, `google_updated_at`, and `calendar_id`. Only the service role
(Edge Functions) writes those. Client "delete" should set `deleted_at` (a soft
delete) so the outbox can propagate the deletion. A scheduled job hard-deletes
tombstones later.

Google-originated writes (pulls) run as the service role and bypass RLS. The
sync worker enforces the same creator-or-admin rule itself (see §4.4).

### 2.2 `calendar_links`: owner sees own status, never the secret

```sql
alter table calendar_links enable row level security;

create policy "Members read own calendar link"
  on calendar_links for select
  using (auth.uid() = profile_id);
-- No insert/update/delete policies: only Edge Functions (service role) write.

revoke select (refresh_token_secret_id, sync_token, watch_channel_id,
               watch_resource_id, watch_token_hash)
  on calendar_links from authenticated, anon;
```

The UI reads `status`, `google_email`, `last_synced_at`, and `last_error`. An
alternative is a `my_calendar_link` view that exposes only those columns.

Admins get no read access to other members' links by default. A count of linked
members could come from a narrow RPC if wanted.

### 2.3 Other tables

- `calendar_event_copies`: `select` own rows only (`link_id` belongs to `auth.uid()`). This drives the "in your Google Calendar" badge. No client writes.
- `calendar_sync_outbox`: RLS enabled with **no policies**, so it is service-role only (same pattern as `sent_nws_alerts`).
- `shared_calendars`: `select` for authenticated; writes admin only.

---

## 3. Google OAuth (link / unlink)

### 3.1 Scopes

| Scope | Why |
| --- | --- |
| `https://www.googleapis.com/auth/calendar.events` | **Required.** Read and write events in the member's calendar |
| `openid email` | Get `sub` and email to identify the linked Google account |
| `https://www.googleapis.com/auth/calendar.app.created` | *Optional, recommended (open question).* Lets the app create and own a dedicated "CRIC" secondary calendar in each member's account, so CRIC events stay separate from personal events and there is a clear place for creating events in Google that should come back into CRIC |

`calendar.events` is a **sensitive** scope. Google requires OAuth app
verification for production use. In "Testing" publishing status, refresh tokens
**expire after 7 days** and users are capped at 100, which would show up as
constant "reconnect" prompts. Verification (or a Workspace-internal app, if CRIC
uses Google Workspace) is a prerequisite for this feature working well.

### 3.2 Flow: server-side authorization code with PKCE

1. The member taps **Connect Google Calendar** (Schedule → calendar settings).
2. The app calls Edge Function `google-calendar-oauth-start` with the member's Supabase JWT (validated with `_shared/auth.ts#authenticate`).
3. The function creates a PKCE verifier and a signed, short-lived `state` (HMAC with `OAUTH_STATE_SECRET`; binds `profile_id`, nonce, expiry ≤10 min, return path). It stores the verifier and nonce server-side, then returns the Google consent URL with `access_type=offline`, `prompt=consent`, and `include_granted_scopes=true`.
4. Google redirects to Edge Function `google-calendar-oauth-callback`. That function checks `state`, exchanges the code (using the client secret held **only** in Edge Function secrets), and verifies the `id_token` audience and issuer. It confirms `calendar.events` was actually granted, because users can untick scopes on the consent screen.
5. It writes the refresh token to Vault (`vault.create_secret`) and upserts `calendar_links` with the secret id. Optionally it creates the dedicated CRIC calendar, then enqueues a backfill of upcoming events and starts an `events.watch` channel.
6. It redirects to `https://chairrock.app/schedule?calendar=linked` (or `?calendar=error&reason=...`).

Relinking with a different Google account replaces the old link: the old
token is revoked, the old Vault secret deleted, and old copies cleaned up per
the unlink rules.

### 3.3 Secure storage: hard rules

- **Never** put the Google client secret, refresh tokens, access tokens, or the state signing key in any `VITE_*` variable, the Vite bundle, the Dexie cache, `localStorage`, logs, or error messages returned to the client.
- Refresh tokens live in **Supabase Vault**. Only the service role (Edge Functions) reads `vault.decrypted_secrets`. `calendar_links` stores only `refresh_token_secret_id`.
- Access tokens are short-lived (~1h). Hold them in memory in the Edge Function for the length of a run, or cache them encrypted in Vault with an expiry. Don't put them in a plain table.
- New Edge Function secrets: `GOOGLE_CLIENT_ID`, `GOOGLE_CLIENT_SECRET`, `GOOGLE_OAUTH_REDIRECT_URI`, `OAUTH_STATE_SECRET`, `GOOGLE_WEBHOOK_TOKEN_SECRET`. Reuse `CRON_SECRET` for scheduled calls (as `check-and-push` does). Nothing new is added to `.env.example`'s `VITE_` block.
- Restrict CORS for `oauth-start` and `unlink` to `chairrock.app` via `_shared/cors.ts`. The callback and webhook are server-to-server or redirect-only.

### 3.4 Unlink

Edge Function `google-calendar-unlink` (member's own link, or admin acting on
any link):

1. Stop the `events.watch` channel (`channels.stop`).
2. Clean up that member's Google copies (default: delete the dedicated CRIC calendar if one was used, otherwise delete each event in `calendar_event_copies`). Whether to keep or remove copies is an open question; the UI should state the behavior clearly.
3. Revoke the token at `https://oauth2.googleapis.com/revoke`.
4. Delete the Vault secret and the `calendar_links` row. Copies cascade away.
5. **Events the member created in CRIC remain** in the shared calendar. They are org data, not the member's Google data. Other members' Google copies keep syncing.

---

## 4. Two-way sync

### 4.1 Model

- **CRIC (`calendar_events`) is the source of truth.** Every connected member's Google calendar holds a copy of each shared event.
- Push goes app → every active `calendar_links` row, through `calendar_sync_outbox`.
- Pull goes Google → CRIC through `events.watch` push notifications plus incremental sync (`syncToken`), with periodic polling as a fallback.

### 4.2 Push (app → Google)

- A trigger on `calendar_events` writes outbox rows. Edge Function `google-calendar-sync` (called by `pg_net` right after enqueue, and by cron as a sweep) drains the outbox.
- For each active link it uses `events.insert` with a **client-supplied event id** that is the same in every calendar. Google event ids are base32hex (`a-v0-9`, 5–1024 chars) and unique **per calendar**, so `'cric' || replace(id::text, '-', '')` works for every member's calendar and is stored once in `calendar_events.google_event_id`.
- Each Google event carries `extendedProperties.private.cric_event_id = <uuid>` and `cric_calendar = 'cric'` so the worker can recognize its own events when pulling.
- For updates, it uses `events.patch` with `If-Match: <etag>`. On 412 (a concurrent Google edit) it pulls that copy first, then decides (§4.4).
- For deletes (soft delete in CRIC), it uses `events.delete` on every copy and marks the copy `state='deleted'`.
- **No attendees** are added. Copies are plain events in each member's own calendar, so Google never emails invitations and member emails aren't exposed to each other.
- Retries use exponential backoff on 429/5xx. A 401 or `invalid_grant` sets the link to `needs_reconnect` (§5).

### 4.3 Pull (Google → app)

- Edge Function `google-calendar-webhook` receives `events.watch` notifications. It checks `X-Goog-Channel-ID`, `X-Goog-Resource-ID`, and `X-Goog-Channel-Token` (hash compared with `watch_token_hash`), then does an incremental `events.list?syncToken=...` for that link only. The webhook payload carries no event data, so it is only a trigger.
- If the API returns `410 Gone` (the sync token expired), the worker does a full resync of the link's window (for example, now −30 days to +18 months) and stores the new `nextSyncToken`.
- **Which Google events are pulled:**
  - Events with `extendedProperties.private.cric_event_id`: changes to existing shared events.
  - New events with no CRIC marker are imported **only** if created in the member's dedicated CRIC calendar (when `calendar.app.created` is in use). With `primary`-only linking, new Google-originated events are never imported, so a member's personal appointments don't leak to the whole org. This is a firm privacy rule.
- An imported event gets `source='google'`, `origin_link_id=<link>`, and `created_by=<link owner>`. Then it is pushed to every *other* linked member like any app event.

### 4.4 Conflicts and authority

- A change pulled from Google is accepted **only if the copy's owner may edit the event under §2 RLS** (creator or admin). If a non-creator edits their own Google copy, the worker re-pushes the canonical version to that copy, overwriting the edit. A private notice to that member is optional.
- Last writer wins between the CRIC app and the creator's Google copy, compared by `updated_at` vs Google `updated`. `sequence` is bumped on every accepted change.
- **Echo suppression:** after a push, the worker stores the returned `etag` and `updated` on the copy. A pulled change with the same etag is ignored, so a push never triggers a pull that re-pushes.

---

## 5. Background jobs: token health and reconnect

Scheduled with `pg_cron` + `pg_net` calling Edge Functions with
`Authorization: Bearer ${CRON_SECRET}`. The commented `cron.schedule` example
in `20260705000002_push_subscriptions.sql` shows the pattern.

| Job | Cadence (suggested) | What it does |
| --- | --- | --- |
| Outbox sweep | every 1–2 min | Drains `calendar_sync_outbox` rows past `next_attempt_at`; dead-letters after N attempts (`copy.state='error'`) |
| Pull fallback | every 10–15 min | Incremental sync for links whose watch channel is missing or expired, or with no notification in X min |
| Watch renewal | hourly | Renews `events.watch` channels expiring within 24h (Google caps channel lifetime, about a week for events) |
| Token health | daily | Uses each refresh token to get an access token. On `invalid_grant` (revoked, password change, 6 months unused, or the 7-day Testing-mode expiry) it sets `status='needs_reconnect'` and records `last_error` |
| Tombstone cleanup | daily | Hard-deletes `calendar_events` with `deleted_at` older than 30 days once every copy is `deleted` |

Refresh tokens don't need routine "refreshing"; access tokens do. If Google ever
returns a new refresh token, the worker overwrites the Vault secret
immediately.

**Reconnect prompt:**

- When a link becomes `needs_reconnect` or `revoked`, it gets a one-time web push through the existing push infrastructure (`trigger-push` / `push_subscriptions`): *"Google Calendar disconnected — tap to reconnect."*
- A persistent banner shows on Schedule (and on Dashboard) while `calendar_links.status <> 'active'`, with a **Reconnect** button that reruns §3.2.
- Outbox rows for that link pause, not fail. After reconnect, a reconciliation pass pushes anything missed and does a full pull.

---

## 6. UI

**Recommendation: fold into Schedule.** No new top-level tab. `SchedulePage.jsx`
already renders a `react-big-calendar` month/week view for cabin bookings, with
the Dr Fun pontoon schedule below it. A third layer keeps "what's happening on
the island" in one place.

- **Layer toggles** above the calendar: `Cabins` · `Pontoon` · `Events`, using the existing cabin color legend style. A member's choice persists in local storage.
- **Event rendering:** shared events get their own color and an icon, distinct from cabin colors and the dashed "requested" booking style. Timed events show in week view. All-day events go in the all-day row.
- **Synced vs local**, as badges in the event detail modal and a small icon on the calendar chip:
  - **Local:** exists only in CRIC. Either it hasn't been pushed yet, or the viewer has no Google link. Pending or offline (Dexie `pending_changes`) shows "Saving…".
  - **Synced:** "In your Google Calendar ✓" when the viewer's `calendar_event_copies.state='synced'`. "Added from Google by ⟨name⟩" when `source='google'`.
  - **Error:** "Couldn't sync to your Google Calendar". It links to calendar settings.
- **Create/edit modal:** title, all-day toggle, start and end (date or date-time), time zone (default from the shared calendar, `America/New_York`), optional location and description. Edit and delete buttons show only for the creator or an admin, mirroring RLS.
- **Calendar settings panel** (a sheet from Schedule, and optionally on the profile area): link status (Not connected / Connected as ⟨email⟩ / Needs reconnect), Connect / Reconnect / Disconnect, last synced time, and a plain-language note on what gets shared ("CRIC events will be added to your Google Calendar. Edits you make to events you created in CRIC sync back. Your personal events are never shared.").
- A desktop **New** button and the existing mobile floating action button offer *Booking*, *Boat trip*, or *Event*.

---

## 7. Edge cases

### Duplicates across members' calendars
- Every member's copy uses the **same deterministic `google_event_id`** and carries `cric_event_id` in private extended properties. A pull that finds an existing marker maps to that event and never creates a second CRIC row.
- If two members have the same Google calendar shared into both accounts, the copy in a calendar the link doesn't own shows up as a duplicate *in that member's Google UI*. CRIC itself still has one row. Document the dedicated CRIC calendar as the fix.
- **Re-creating after delete:** Google won't reuse an event id that was deleted in the same calendar (409). If an event is restored, the worker undeletes the existing copy (`status='confirmed'` patch) and doesn't insert.
- A Google-originated import is matched on `(origin_link_id, original Google id)` or `iCalUID` before insert. Pushing it to other members reuses its id when it is valid base32hex. Otherwise the worker issues a `cric…` id and records both.

### Timezones
- Timed events are stored as UTC `timestamptz` plus the IANA `time_zone` they were authored in. Google gets `dateTime` + `timeZone`, so each member's Google client renders local time correctly, including members who live outside New York.
- All-day events use Google `date` fields. The **exclusive** Google end date converts to the app's **inclusive** `end_date` (−1 day on pull, +1 on push). This matches how bookings use inclusive `daterange(..., '[]')`.
- DST: the worker never does wall-clock arithmetic in UTC. Conversions go through the stored IANA zone.
- Events pulled from Google with a floating or missing time zone default to the Google calendar's zone, then the shared calendar's zone.

### Cancelled / rescheduled Google events
- **Rescheduled** (start/end/title/location changed in the creator's or an admin's copy): the change is accepted and pushed to every other copy. **Non-creator edits** are reverted (§4.4).
- **Cancelled by the creator or an admin** (`status: cancelled` in incremental sync, or deleted): the CRIC event is soft-deleted and every other copy deleted.
- **Cancelled by a non-creator** in their own calendar: treated as "remove from *my* calendar only". The copy becomes `state='removed_by_user'` and is **not** re-pushed unless the event changes materially or the member chooses "Add back to my Google Calendar". The shared event stays.
- **Recurring events:** CRIC events don't support recurrence at first. A recurring event created in the dedicated Google calendar is either skipped with a visible notice or imported as individual instances in a bounded window (`singleEvents=true`). This is an open question. Edits to a single instance are matched by `recurringEventId` + `originalStartTime`.

### Member unlink, reconnect, and removal
- **Unlink:** §3.4. The member's created events stay. Their Google copies are cleaned up (default) and the token is revoked.
- **Reconnect** with the same Google account (`google_sub` matches): existing copies are re-adopted by id, not duplicated.
- **Reconnect with a different Google account:** treated as unlink + new link.
- **Member removed from CRIC** (profile deleted): `calendar_links` cascades. The worker should revoke the token and clean up copies *before* deletion (admin-operations hook). `calendar_events.created_by` becomes `null`, so only admins can then edit those events.
- **Revoked in Google's security settings** (outside the app): detected on the next API call or the daily health check, which triggers the reconnect prompt (§5).

### Other
- **Rate limits / large backfills:** link backfill only covers upcoming events (for example, the next 18 months) and is throttled per link.
- **Clock skew / ordering:** compare Google `updated` and etag, never local clocks alone.
- **Webhook spoofing:** reject notifications whose channel id/token pair isn't on file (§4.3).

---

## 8. Relationship to existing `bookings` and `boat_trips`

| Concern | `bookings` | `boat_trips` | `calendar_events` (new) |
| --- | --- | --- | --- |
| Purpose | Cabin occupancy with approval (`requested` → `confirmed`/`rejected` via booking authority) | Dr Fun pontoon trips (date + departure/return time, passengers, gas fee) | General org events (work weekends, meetings, regattas, deliveries, etc.) |
| Time model | `date` range, inclusive, exclusion constraint per cabin | `date` + local `time` (no zone) | `timestamptz` + IANA zone, or all-day inclusive dates |
| Write rules | Own insert; authority/admin status; P0 RLS | Own rows (`created_by`) | Creator or admin (§2) |
| Google sync | **No** (not in this scope) | **No** (not in this scope) | **Yes**, two-way |

- `calendar_events` **does not replace or change** `bookings` or `boat_trips`. No foreign keys, triggers, or constraints touch those tables.
- Schedule shows all three as layers (§6). They share a view, not a table.
- Future option: *confirmed* bookings and boat trips could be pushed one way to Google as read-only events (a projection keyed by `booking_id` / `trip_id`, never pulled back), because their approval and conflict rules can't be edited from Google. Listed under Open Questions; not part of this scope.
- `meetings` (date + Zoom location) could be a one-way projection the same way. Also an open question.

---

## 9. Security notes (refresh tokens and related)

- **Refresh tokens are long-lived credentials** with write access to a member's calendar. They are stored only in Supabase Vault and read only by Edge Functions using the service role. They never appear in the Vite bundle, any `VITE_*` var, Dexie, client responses, or logs.
- **Least privilege:** only `calendar.events` (+ `openid email`, optionally `calendar.app.created`). Never the full `calendar` scope, and never Gmail or Drive scopes.
- **CSRF and code interception:** signed, expiring, user-bound `state` + PKCE. The redirect URI is pinned in the Google Cloud console to the Supabase functions URL.
- **Scope verification:** after the code exchange, confirm the granted scopes include `calendar.events`. Otherwise mark the link `error` and prompt again.
- **Revocation on unlink and member removal:** always call Google's revoke endpoint, then delete the Vault secret.
- **Webhook authentication:** a per-channel random token, stored hashed. Unknown channels are rejected and stopped.
- **Privacy:** never import a member's personal (unmarked) events from `primary`. Never add attendees or expose member emails to other members through Google.
- **Admin visibility:** admins can manage events but can't read other members' tokens or Google email unless a narrow RPC is deliberately added.
- **Service role key:** stays an Edge Function / tooling secret, per the README. The new Google secrets follow the same handling.
- **Audit:** log link, unlink, reconnect, and sync errors (without token values) for troubleshooting.
- **Google app verification:** required for production (§3.1). It also brings Google's policy obligations (privacy policy URL on chairrock.app, limited use of Google user data).

---

## 10. Open questions

1. **Dedicated CRIC calendar vs `primary`:** request `calendar.app.created` so each member gets a separate "CRIC" calendar (cleaner, allows Google-originated events, easy cleanup on unlink), or write into `primary` only (fewer scopes, but no Google-side creation of new shared events)?
2. **Simpler alternative:** would a single org-owned Google calendar that members *subscribe to* (one service account or one owner token) be enough? It needs far less per-member token handling but limits who can edit from Google. This document assumes per-member links because that was requested.
3. **Google OAuth app verification:** who owns the Google Cloud project, and is CRIC on Google Workspace (an internal app avoids verification)? Until verified, Testing mode means 7-day token expiry.
4. **Unlink behavior:** delete the member's Google copies (default) or leave them in place, stale?
5. **Non-creator edits in Google:** silently revert (default) or notify the member?
6. **Recurring events:** skip, expand into instances, or add real recurrence support to `calendar_events`?
7. **Should confirmed `bookings`, `boat_trips`, and/or `meetings` also push (one way) to Google?** If yes, should it be opt-in per member?
8. **Who can create events:** every member (as specified), or should some categories be limited to officers?
9. **Default time zone:** confirm `America/New_York` (Cranberry Lake, NY) as the shared calendar zone.
10. **Opt-in granularity:** should a linked member be able to mute some event types from their Google calendar?
11. **Member offboarding:** when a member is removed, should their created events move to an admin or the Secretary instead of `created_by = null`?
12. **Notifications:** should new shared events also send a web push to members without Google linked?

---

## Appendix: proposed Edge Functions (names only, not implemented)

| Function | Caller | Purpose |
| --- | --- | --- |
| `google-calendar-oauth-start` | App (member JWT) | Build the consent URL with state + PKCE |
| `google-calendar-oauth-callback` | Google redirect | Exchange the code, store the token in Vault, create the link, start the watch |
| `google-calendar-unlink` | App (member/admin JWT) | Stop the watch, clean up copies, revoke, delete the secret and link |
| `google-calendar-webhook` | Google push | Validate the channel and trigger incremental pull for that link |
| `google-calendar-sync` | `pg_net` / cron (`CRON_SECRET`) | Drain the outbox, pull fallback, reconcile |
| `google-calendar-maintenance` | cron (`CRON_SECRET`) | Watch renewal, token health, tombstone cleanup |
