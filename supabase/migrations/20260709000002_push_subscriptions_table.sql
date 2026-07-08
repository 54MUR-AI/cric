-- The push_subscriptions table was referenced by RLS/view migrations but never
-- created. Create it idempotently so push notifications work in production.
create table if not exists push_subscriptions (
  id uuid primary key default gen_random_uuid(),
  user_id uuid references auth.users(id) on delete cascade,
  endpoint text not null unique,
  p256dh_key text not null,
  auth_key text not null,
  user_agent text,
  created_at timestamptz default now()
);

alter table push_subscriptions enable row level security;
